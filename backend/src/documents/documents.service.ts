import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  DocumentStatus,
  DocumentType,
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

import { StorageService } from "../storage/storage.service";

type DocumentScope = "all" | "shared" | "trash";

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
        : { OR: this.accessWhere(user) }),
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
      where: { id, OR: this.accessWhere(user) },
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
    await this.ensureOwnedDocument(id, user);
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
      where: { id, OR: this.accessWhere(user) },
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

    const apiPublicUrl = this.config.get<string>("API_PUBLIC_URL", "http://103.190.38.46:5000/api");
    const onlyofficeServerUrl = this.config.get<string>("ONLYOFFICE_SERVER_URL", "http://103.190.38.46:8080");
    const jwtSecret = this.config.get<string>("ONLYOFFICE_JWT_SECRET") || this.config.get<string>("JWT_ACCESS_SECRET", "secret");

    const documentUrl = `${apiPublicUrl}/documents/${document.id}/download`;
    const callbackUrl = `${apiPublicUrl}/documents/${document.id}/callback`;

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

  async uploadDocument(
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    folderId: string | undefined,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "docx";
    let docType: DocumentType = DocumentType.DOCX;
    if (["xlsx", "xls", "csv"].includes(ext)) docType = DocumentType.XLSX;
    else if (["pptx", "ppt"].includes(ext)) docType = DocumentType.PPTX;
    else if (ext === "pdf") docType = DocumentType.PDF;

    const document = await this.prisma.document.create({
      data: {
        name: file.originalname,
        type: docType,
        status: DocumentStatus.READY,
        ownerId: user.id,
        folderId: folderId && folderId !== "all" ? folderId : null,
        versions: {
          create: {
            version: 1,
            objectKey: `documents/${user.id}/${Date.now()}_${file.originalname}`,
            sizeBytes: BigInt(file.size),
            authorId: user.id,
          },
        },
      },
      include: this.publicInclude(user),
    });

    const objectKey = document.versions[0]?.objectKey;
    if (objectKey) {
      try {
        await this.storage.putObject(objectKey, file.buffer, file.mimetype);
      } catch (err) {
        console.warn("[Storage] PutObject failed:", err);
      }
    }

    return this.toPublicItem(document, user.id);
  }

  async downloadFile(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!document) throw new NotFoundException("Document not found");

    const objectKey = document.versions[0]?.objectKey;
    if (objectKey) {
      try {
        const stream = await this.storage.getObjectStream(objectKey);
        if (stream) {
          const chunks: Uint8Array[] = [];
          for await (const chunk of stream as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          return {
            filename: document.name,
            buffer: Buffer.concat(chunks),
          };
        }
      } catch (err) {
        console.warn("[Storage] Download stream failed, using fallback:", err);
      }
    }

    return {
      filename: document.name,
      buffer: Buffer.from(`Sample content for document: ${document.name}`),
    };
  }

  async handleCallback(id: string, body: Record<string, unknown>) {
    console.log(`[ONLYOFFICE Callback] Document ${id}:`, body);
    if (body.status === 2 && typeof body.url === "string") {
      try {
        const response = await fetch(body.url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const lastVersion = await this.prisma.documentVersion.findFirst({
            where: { documentId: id },
            orderBy: { version: "desc" },
          });

          const nextVersionNumber = (lastVersion?.version ?? 0) + 1;
          const objectKey = `documents/${id}/v${nextVersionNumber}_${Date.now()}`;

          await this.storage.putObject(
            objectKey,
            buffer,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          );

          await this.prisma.documentVersion.create({
            data: {
              documentId: id,
              version: nextVersionNumber,
              objectKey,
              sizeBytes: BigInt(buffer.length),
              authorId: lastVersion?.authorId || id,
            },
          });

          await this.prisma.document.update({
            where: { id },
            data: { updatedAt: new Date() },
          });

          console.log(`[ONLYOFFICE Callback] Saved version ${nextVersionNumber} for document ${id}`);
        }
      } catch (err) {
        console.error(`[ONLYOFFICE Callback] Failed to save edited file:`, err);
      }
    }
    return { error: 0 };
  }

  async addPermission(
    id: string,
    email: string,
    role: "VIEWER" | "COMMENTER" | "EDITOR",
    user: AuthenticatedUser,
  ) {
    await this.ensureOwnedDocument(id, user);

    const targetUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const permission = await this.prisma.documentPermission.create({
      data: {
        documentId: id,
        email,
        userId: targetUser?.id,
        role: role as PermissionRole,
        grantedById: user.id,
      },
    });

    return permission;
  }

  async removePermission(
    id: string,
    permissionId: string,
    user: AuthenticatedUser,
  ) {
    await this.ensureOwnedDocument(id, user);
    await this.prisma.documentPermission.delete({
      where: { id: permissionId },
    });
    return { id: permissionId, status: "removed" };
  }

  async getVersions(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, OR: this.accessWhere(user) },
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

    const lastVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
    });

    const nextVersionNumber = (lastVersion?.version ?? 0) + 1;
    const newVersion = await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version: nextVersionNumber,
        objectKey: targetVersion.objectKey,
        sizeBytes: targetVersion.sizeBytes,
        authorId: user.id,
      },
    });

    await this.prisma.document.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return {
      version: newVersion.version,
      status: "restored",
    };
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...this.ownerWhere(user) },
      select: { id: true },
    });
    if (!document) throw new NotFoundException("Document not found");
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
      shared: document.permissions.length > 0,
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

  private accessWhere(user: AuthenticatedUser) {
    if (user.role === "ADMINISTRATOR") return [{}];
    return [
      { ownerId: user.id },
      { permissions: { some: this.permissionWhere(user) } },
    ] satisfies Prisma.DocumentWhereInput[];
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
}
