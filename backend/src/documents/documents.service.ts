import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  DocumentStatus,
  PermissionRole,
  Prisma,
} from "@prisma/client";
import type {
  DocumentItem,
  DocumentStatus as PublicDocumentStatus,
  DocumentType as PublicDocumentType,
} from "@share";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from "./dto/permission.dto";

import { StorageService } from "../storage/storage.service";

type DocumentScope = "all" | "shared" | "trash";

interface OnlyOfficeTicket {
  type: "onlyoffice-callback";
  documentId: string;
  userId: string;
}

const contentTypes: Record<string, string> = {
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  PDF: "application/pdf",
};

const publicType = (value: string): PublicDocumentType =>
  value.toLowerCase() as PublicDocumentType;

const publicStatus = (value: string): PublicDocumentStatus =>
  value.toLowerCase() as PublicDocumentStatus;

function getDocumentType(filename: string): "word" | "cell" | "slide" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["xlsx", "xls", "csv", "ods"].includes(ext)) return "cell";
  if (["pptx", "ppt", "odp"].includes(ext)) return "slide";
  return "word";
}

function formatBytes(value: bigint | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 102.4) / 10} KB`;
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 104857.6) / 10} MB`;
  return `${Math.round(bytes / 107374182.4) / 10} GB`;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async list(
    scope: DocumentScope,
    user: AuthenticatedUser,
    folderId?: string,
    search?: string,
    limit = 100,
  ): Promise<DocumentItem[]> {
    const where: Prisma.DocumentWhereInput = {
      ...(scope === "trash"
        ? { deletedAt: { not: null } }
        : { deletedAt: null }),
      ...(folderId ? { folderId } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
      ...(scope === "shared"
        ? {
            ownerId: { not: user.id },
            permissions: { some: this.permissionWhere(user) },
          }
        : this.accessWhere(user)),
    };

    const documents = await this.prisma.document.findMany({
      where,
      include: this.publicInclude(user),
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return documents.map((document) => this.toPublicItem(document, user.id));
  }

  async getById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, ...this.accessWhere(user) },
      include: this.publicInclude(user),
    });

    if (!document) throw new NotFoundException("Document not found");
    return this.toPublicItem(document, user.id);
  }

  async update(
    id: string,
    input: UpdateDocumentDto,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const ownedDocument = await this.ensureOwnedDocument(id, user);
    if (input.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: input.folderId, ownerId: ownedDocument.ownerId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException("Destination folder not found");
    }
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.folderId === undefined ? {} : { folderId: input.folderId }),
        ...(input.starred === undefined ? {} : { starred: input.starred }),
      },
      include: this.publicInclude(user),
    });

    return this.toPublicItem(document, user.id);
  }

  async softDelete(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ id: string; status: "deleted" }> {
    await this.ensureOwnedDocument(id, user);
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), status: DocumentStatus.DELETED },
    });
    return { id, status: "deleted" };
  }

  async restore(id: string, user: AuthenticatedUser): Promise<DocumentItem> {
    await this.ensureOwnedDocument(id, user);
    const document = await this.prisma.document.update({
      where: { id },
      data: { deletedAt: null, status: DocumentStatus.READY },
      include: this.publicInclude(user),
    });
    return this.toPublicItem(document, user.id);
  }

  async permanentDelete(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: { not: null },
        ...this.ownerWhere(user),
      },
      select: {
        id: true,
        versions: { select: { objectKey: true } },
      },
    });
    if (!document) throw new NotFoundException("Trashed document not found");
    await this.storage.deleteObjects(
      document.versions.map((version) => version.objectKey),
    );
    await this.prisma.document.delete({ where: { id } });
    return { id, status: "deleted_permanently" as const };
  }

  async emptyTrash(user: AuthenticatedUser) {
    const documents = await this.prisma.document.findMany({
      where: {
        deletedAt: { not: null },
        ownerId: user.id,
      },
      select: {
        id: true,
        versions: { select: { objectKey: true } },
      },
    });
    await this.storage.deleteObjects(
      documents.flatMap((document) =>
        document.versions.map((version) => version.objectKey),
      ),
    );
    const deleted = await this.prisma.document.deleteMany({
      where: {
        id: { in: documents.map((document) => document.id) },
        ownerId: user.id,
        deletedAt: { not: null },
      },
    });
    return { status: "trash_emptied" as const, count: deleted.count };
  }

  async toggleStar(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const current = await this.prisma.document.findFirst({
      where: { id, ...this.ownerWhere(user) },
      select: { starred: true },
    });
    if (!current) throw new NotFoundException("Document not found");

    const document = await this.prisma.document.update({
      where: { id },
      data: { starred: !current.starred },
      include: this.publicInclude(user),
    });
    return this.toPublicItem(document, user.id);
  }

  async getEditorConfig(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, ...this.accessWhere(user) },
      include: {
        permissions: {
          where: this.permissionWhere(user),
          take: 1,
          select: { role: true },
        },
      },
    });

    if (!document) throw new NotFoundException("Document not found");

    const permission =
      document.ownerId === user.id
        ? PermissionRole.OWNER
        : document.permissions[0]?.role;

    const canEdit = permission === PermissionRole.OWNER || permission === PermissionRole.EDITOR;
    const documentType = getDocumentType(document.name);
    const fileExt = document.name.split(".").pop()?.toLowerCase() || "docx";

    const apiPublicUrl = this.config.get<string>("API_PUBLIC_URL");
    const onlyofficeServerUrl = this.config.get<string>("ONLYOFFICE_SERVER_URL");
    const jwtSecret = this.config.get<string>("ONLYOFFICE_JWT_SECRET");
    if (!apiPublicUrl || !onlyofficeServerUrl || !jwtSecret) {
      throw new ServiceUnavailableException(
        "ONLYOFFICE_SERVER_URL, ONLYOFFICE_JWT_SECRET and API_PUBLIC_URL must be configured",
      );
    }
    const currentVersion = await this.prisma.documentVersion.findFirst({
      where: {
        documentId: document.id,
        ...(document.currentVersionId
          ? { id: document.currentVersionId }
          : {}),
      },
      orderBy: { version: "desc" },
      select: { objectKey: true },
    });
    if (!currentVersion) {
      throw new NotFoundException("Document has no uploaded version");
    }
    const documentUrl = (await this.storage.createDownloadUrl(
      currentVersion.objectKey,
    )).url;
    const callbackTicket = await this.jwt.signAsync<OnlyOfficeTicket>(
      {
        type: "onlyoffice-callback",
        documentId: document.id,
        userId: user.id,
      },
      { secret: jwtSecret, expiresIn: "24h" },
    );
    const callbackUrl = `${apiPublicUrl.replace(/\/$/, "")}/documents/${document.id}/onlyoffice-callback?ticket=${encodeURIComponent(callbackTicket)}`;

    const configPayload = {
      documentType,
      document: {
        fileType: fileExt,
        key: `${document.id}_${document.updatedAt.getTime()}`,
        title: document.name,
        url: documentUrl,
        permissions: {
          edit: canEdit,
          download: true,
          print: true,
          comment: canEdit,
        },
      },
      editorConfig: {
        mode: canEdit ? "edit" : "view",
        lang: "vi",
        callbackUrl,
        user: {
          id: user.id,
          name: user.name,
        },
        customization: {
          chat: false,
          comments: true,
          zoom: 100,
        },
      },
    };

    const token = this.jwt.sign(configPayload, { secret: jwtSecret });

    return {
      onlyofficeServerUrl,
      config: {
        ...configPayload,
        token,
      },
    };
  }

  async handleOnlyOfficeCallback(
    id: string,
    ticket: string,
    body: Record<string, unknown>,
  ) {
    const jwtSecret = this.config.get<string>("ONLYOFFICE_JWT_SECRET");
    if (!jwtSecret || !ticket) {
      throw new UnauthorizedException("ONLYOFFICE callback ticket is required");
    }

    let principal: OnlyOfficeTicket;
    try {
      principal = await this.jwt.verifyAsync<OnlyOfficeTicket>(ticket, {
        secret: jwtSecret,
      });
    } catch {
      throw new UnauthorizedException("ONLYOFFICE callback ticket is invalid");
    }
    if (
      principal.type !== "onlyoffice-callback" ||
      principal.documentId !== id
    ) {
      throw new UnauthorizedException("ONLYOFFICE callback ticket is invalid");
    }

    if (body.status !== 2 && body.status !== 6) return { error: 0 };
    if (typeof body.url !== "string") {
      throw new BadRequestException("ONLYOFFICE callback URL is missing");
    }

    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, ownerId: true, type: true },
    });
    if (!document) throw new NotFoundException("Document not found");

    const configuredOnlyOfficeUrl =
      this.config.get<string>("ONLYOFFICE_INTERNAL_URL") ??
      this.config.get<string>("ONLYOFFICE_SERVER_URL");
    if (!configuredOnlyOfficeUrl) {
      throw new ServiceUnavailableException("ONLYOFFICE server is not configured");
    }

    let sourceUrl: URL;
    try {
      sourceUrl = new URL(body.url);
    } catch {
      throw new BadRequestException("ONLYOFFICE callback URL is invalid");
    }
    if (sourceUrl.origin !== new URL(configuredOnlyOfficeUrl).origin) {
      throw new BadRequestException("ONLYOFFICE callback URL is not trusted");
    }

    const maxBytes = this.readPositiveNumber(
      this.config.get<string>("ONLYOFFICE_MAX_DOWNLOAD_BYTES"),
      104_857_600,
    );
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `ONLYOFFICE returned HTTP ${response.status}`,
      );
    }
    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
      throw new BadRequestException("Edited document exceeds the size limit");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > maxBytes) {
      throw new BadRequestException("Edited document has an invalid size");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (lastVersion?.version ?? 0) + 1;
      const objectKey = `documents/${document.ownerId}/${document.id}/onlyoffice-${nextVersion}-${Date.now()}`;
      await this.storage.putObject(
        objectKey,
        buffer,
        contentTypes[document.type] ?? "application/octet-stream",
      );
      const created = await tx.documentVersion.create({
        data: {
          documentId: id,
          version: nextVersion,
          objectKey,
          sizeBytes: BigInt(buffer.length),
          authorId: principal.userId,
        },
        select: { id: true, version: true },
      });
      await tx.document.update({
        where: { id },
        data: { currentVersionId: created.id },
      });
      return created;
    });

    return { error: 0, version: result.version };
  }

  async addPermission(
    id: string,
    input: CreatePermissionDto,
    user: AuthenticatedUser,
  ) {
    await this.ensureOwnedDocument(id, user);

    const targetUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    const permission = await this.prisma.documentPermission.upsert({
      where: {
        documentId_email: {
          documentId: id,
          email: input.email,
        },
      },
      create: {
        documentId: id,
        email: input.email,
        userId: targetUser?.id,
        role: input.role,
        grantedById: user.id,
      },
      update: {
        userId: targetUser?.id,
        role: input.role,
        grantedById: user.id,
      },
      include: { user: { select: { name: true } } },
    });

    return this.toPermissionEntry(permission);
  }

  async listPermissions(id: string, user: AuthenticatedUser) {
    await this.ensureOwnedDocument(id, user);
    const permissions = await this.prisma.documentPermission.findMany({
      where: { documentId: id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return permissions.map((permission) => this.toPermissionEntry(permission));
  }

  async updatePermission(
    id: string,
    permissionId: string,
    input: UpdatePermissionDto,
    user: AuthenticatedUser,
  ) {
    await this.ensureOwnedDocument(id, user);
    const updated = await this.prisma.documentPermission.updateMany({
      where: { id: permissionId, documentId: id },
      data: { role: input.role, grantedById: user.id },
    });
    if (updated.count !== 1) throw new NotFoundException("Permission not found");
    const permission = await this.prisma.documentPermission.findUniqueOrThrow({
      where: { id: permissionId },
      include: { user: { select: { name: true } } },
    });
    return this.toPermissionEntry(permission);
  }

  async removePermission(
    id: string,
    permissionId: string,
    user: AuthenticatedUser,
  ) {
    await this.ensureOwnedDocument(id, user);
    const removed = await this.prisma.documentPermission.deleteMany({
      where: { id: permissionId, documentId: id },
    });
    if (removed.count !== 1) throw new NotFoundException("Permission not found");
    return { id: permissionId, status: "removed" };
  }

  async getVersions(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, ...this.accessWhere(user) },
      select: { id: true },
    });
    if (!document) throw new NotFoundException("Document not found");

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId: id },
      include: { author: { select: { name: true } } },
      orderBy: { version: "desc" },
    });

    return versions.map((v) => ({
      id: v.id,
      version: v.version,
      versionLabel: `v${v.version}.0`,
      modifiedAt: v.createdAt.toISOString(),
      author: v.author.name,
      size: formatBytes(v.sizeBytes),
    }));
  }

  async restoreVersion(
    id: string,
    versionNumber: number,
    user: AuthenticatedUser,
  ) {
    await this.ensureOwnedDocument(id, user);
    const targetVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId: id, version: versionNumber },
    });
    if (!targetVersion) throw new NotFoundException("Version not found");

    const newVersion = await this.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const created = await tx.documentVersion.create({
        data: {
          documentId: id,
          version: (lastVersion?.version ?? 0) + 1,
          objectKey: targetVersion.objectKey,
          sizeBytes: targetVersion.sizeBytes,
          checksum: targetVersion.checksum,
          note: `Restored from version ${targetVersion.version}`,
          authorId: user.id,
        },
      });
      await tx.document.update({
        where: { id },
        data: { currentVersionId: created.id },
      });
      return created;
    });

    return {
      version: newVersion.version,
      status: "restored",
    };
  }

  async createVersionDownloadUrl(
    id: string,
    versionNumber: number,
    user: AuthenticatedUser,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, ...this.accessWhere(user) },
      select: { id: true, name: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    const version = await this.prisma.documentVersion.findFirst({
      where: { documentId: id, version: versionNumber },
      select: { objectKey: true },
    });
    if (!version) throw new NotFoundException("Version not found");
    return {
      documentId: id,
      name: document.name,
      version: versionNumber,
      ...(await this.storage.createDownloadUrl(version.objectKey)),
    };
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...this.ownerWhere(user) },
      select: { id: true, ownerId: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }

  private publicInclude(user: AuthenticatedUser) {
    return {
      owner: { select: { name: true } },
      folder: { select: { id: true } },
      versions: {
        orderBy: { version: "desc" as const },
        take: 1,
        select: { sizeBytes: true, objectKey: true },
      },
      permissions: {
        where: this.permissionWhere(user),
        take: 1,
        select: { role: true },
      },
      _count: { select: { permissions: true } },
    } satisfies Prisma.DocumentInclude;
  }

  private toPublicItem(
    document: Prisma.DocumentGetPayload<{
      include: ReturnType<DocumentsService["publicInclude"]>;
    }>,
    userId: string,
  ): DocumentItem {
    const permission =
      document.ownerId === userId
        ? PermissionRole.OWNER
        : document.permissions[0]?.role;
    return {
      id: document.id,
      name: document.name,
      type: publicType(document.type),
      owner: document.owner.name,
      modifiedAt: document.updatedAt.toISOString(),
      size: formatBytes(document.versions[0]?.sizeBytes),
      status: publicStatus(document.status),
      folderId: document.folder?.id ?? "all",
      shared: document._count.permissions > 0,
      ...(document.starred ? { starred: true } : {}),
      ...(document.deletedAt
        ? { deletedAt: document.deletedAt.toISOString() }
        : {}),
      ...(permission
        ? { permission: this.toPublicPermission(permission) }
        : {}),
    };
  }

  private permissionWhere(user: AuthenticatedUser) {
    return {
      OR: [{ userId: user.id }, { email: user.email }],
    } satisfies Prisma.DocumentPermissionWhereInput;
  }

  private accessWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    if (user.role === "ADMINISTRATOR") return {};
    return {
      OR: [
        { ownerId: user.id },
        { permissions: { some: this.permissionWhere(user) } },
      ],
    };
  }

  private ownerWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    return user.role === "ADMINISTRATOR" ? {} : { ownerId: user.id };
  }

  private toPublicPermission(role: PermissionRole) {
    return role.charAt(0) + role.slice(1).toLowerCase() as
      | "Viewer"
      | "Commenter"
      | "Editor"
      | "Owner";
  }

  private toPermissionEntry(permission: {
    id: string;
    email: string | null;
    role: PermissionRole;
    user: { name: string } | null;
  }) {
    const email = permission.email ?? "";
    const name = permission.user?.name ?? email.split("@")[0] ?? email;
    return {
      id: permission.id,
      name,
      email,
      role: this.toPublicPermission(permission.role),
      initials: name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
  }

  private readPositiveNumber(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
