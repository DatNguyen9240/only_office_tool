import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
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
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { DocumentAccessUtil } from "./document-access.util";
import { DocumentPermissionsService } from "./document-permissions.service";
import {
  DocumentVersionsService,
  formatBytes,
} from "./document-versions.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { CreatePermissionDto, UpdatePermissionDto } from "./dto/permission.dto";
import { OnlyOfficeCallbackDto } from "./dto/onlyoffice-callback.dto";
import { OnlyOfficeService } from "./onlyoffice.service";

type DocumentScope = "all" | "shared" | "trash";

const publicType = (value: string): PublicDocumentType =>
  value.toLowerCase() as PublicDocumentType;

const publicStatus = (value: string): PublicDocumentStatus =>
  value.toLowerCase() as PublicDocumentStatus;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  private readonly permissionsService: DocumentPermissionsService;
  private readonly versionsService: DocumentVersionsService;
  private readonly onlyOfficeService: OnlyOfficeService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    @Optional() permissionsService?: DocumentPermissionsService,
    @Optional() versionsService?: DocumentVersionsService,
    @Optional() onlyOfficeService?: OnlyOfficeService,
    @Optional() private readonly audit?: AuditService,
  ) {
    this.permissionsService =
      permissionsService ??
      new DocumentPermissionsService(this.prisma, this.audit);
    this.versionsService =
      versionsService ??
      new DocumentVersionsService(this.prisma, this.storage, this.audit);
    this.onlyOfficeService =
      onlyOfficeService ??
      new OnlyOfficeService(this.prisma, this.jwt, this.config, this.storage);
  }

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
            permissions: { some: DocumentAccessUtil.permissionWhere(user) },
          }
        : DocumentAccessUtil.accessWhere(user)),
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
      where: { id, deletedAt: null, ...DocumentAccessUtil.accessWhere(user) },
      include: this.publicInclude(user),
    });

    if (!document) throw new NotFoundException("Document not found");
    DocumentAccessUtil.recordAudit(
      this.audit,
      this.logger,
      user.id,
      "DOCUMENT_VIEWED",
      id,
      document.name,
    );
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

    if (
      input.expectedVersion !== undefined &&
      ownedDocument.version !== input.expectedVersion
    ) {
      throw new ConflictException(
        `Document version mismatch. Current: ${ownedDocument.version}, Expected: ${input.expectedVersion}`,
      );
    }

    try {
      const document = await this.prisma.document.update({
        where: {
          id,
          ...(input.expectedVersion !== undefined
            ? { version: input.expectedVersion }
            : {}),
        },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.folderId === undefined ? {} : { folderId: input.folderId }),
          ...(input.starred === undefined ? {} : { starred: input.starred }),
          version: { increment: 1 },
        },
        include: this.publicInclude(user),
      });

      return this.toPublicItem(document, user.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ConflictException(
          "Document update conflict detected. The document was modified by another request.",
        );
      }
      throw error;
    }
  }

  async softDelete(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ id: string; status: "deleted" }> {
    const document = await this.ensureOwnedDocument(id, user);
    await this.prisma.document.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: DocumentStatus.DELETED,
        version: { increment: 1 },
      },
    });
    DocumentAccessUtil.recordAudit(
      this.audit,
      this.logger,
      user.id,
      "DOCUMENT_DELETED",
      id,
      document.name,
    );
    return { id, status: "deleted" };
  }

  async restore(id: string, user: AuthenticatedUser): Promise<DocumentItem> {
    const ownedDocument = await this.ensureOwnedDocument(id, user);
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        deletedAt: null,
        status: DocumentStatus.READY,
        version: { increment: 1 },
      },
      include: this.publicInclude(user),
    });
    DocumentAccessUtil.recordAudit(
      this.audit,
      this.logger,
      user.id,
      "DOCUMENT_RESTORED",
      id,
      ownedDocument.name,
    );
    return this.toPublicItem(document, user.id);
  }

  async permanentDelete(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: { not: null },
        ...DocumentAccessUtil.ownerWhere(user),
      },
      select: {
        id: true,
        name: true,
        versions: { select: { objectKey: true } },
      },
    });
    if (!document) throw new NotFoundException("Trashed document not found");
    const keysToDelete = document.versions.map((version) => version.objectKey);
    await this.prisma.document.delete({ where: { id } });
    if (keysToDelete.length > 0) {
      this.storage.deleteObjects(keysToDelete).catch((err) => {
        this.logger.warn(
          `Failed to delete storage objects for document ${id}`,
          err,
        );
      });
    }
    DocumentAccessUtil.recordAudit(
      this.audit,
      this.logger,
      user.id,
      "DOCUMENT_PERMANENTLY_DELETED",
      id,
      document.name,
    );
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
        name: true,
        versions: { select: { objectKey: true } },
      },
    });

    const keysToDelete = documents.flatMap((document) =>
      document.versions.map((version) => version.objectKey),
    );

    const deleted = await this.prisma.document.deleteMany({
      where: {
        id: { in: documents.map((document) => document.id) },
        ownerId: user.id,
        deletedAt: { not: null },
      },
    });

    if (keysToDelete.length > 0) {
      this.storage.deleteObjects(keysToDelete).catch((err) => {
        this.logger.warn("Failed to delete storage objects during emptyTrash", err);
      });
    }

    if (documents.length > 0) {
      Promise.allSettled(
        documents.map((doc) =>
          DocumentAccessUtil.recordAudit(
            this.audit,
            this.logger,
            user.id,
            "DOCUMENT_PERMANENTLY_DELETED",
            doc.id,
            doc.name,
          ),
        ),
      ).catch((err) => {
        this.logger.warn(`Failed to process audit logs for emptyTrash`, err);
      });
    }

    return { status: "trash_emptied" as const, count: deleted.count };
  }

  async toggleStar(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const current = await this.prisma.document.findFirst({
      where: { id, ...DocumentAccessUtil.ownerWhere(user) },
      select: { starred: true, name: true },
    });
    if (!current) throw new NotFoundException("Document not found");

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        starred: !current.starred,
        version: { increment: 1 },
      },
      include: this.publicInclude(user),
    });

    DocumentAccessUtil.recordAudit(
      this.audit,
      this.logger,
      user.id,
      document.starred ? "DOCUMENT_STARRED" : "DOCUMENT_UNSTARRED",
      id,
      current.name,
    );
    return this.toPublicItem(document, user.id);
  }

  // Delegated OnlyOffice Methods
  getEditorConfig(id: string, user: AuthenticatedUser) {
    return this.onlyOfficeService.getEditorConfig(id, user);
  }

  handleOnlyOfficeCallback(
    id: string,
    ticket: string,
    body: OnlyOfficeCallbackDto,
  ) {
    return this.onlyOfficeService.handleOnlyOfficeCallback(id, ticket, body);
  }

  // Delegated permissions methods
  addPermission(id: string, input: CreatePermissionDto, user: AuthenticatedUser) {
    return this.permissionsService.addPermission(id, input, user);
  }

  listPermissions(id: string, user: AuthenticatedUser) {
    return this.permissionsService.listPermissions(id, user);
  }

  updatePermission(
    id: string,
    permissionId: string,
    input: UpdatePermissionDto,
    user: AuthenticatedUser,
  ) {
    return this.permissionsService.updatePermission(id, permissionId, input, user);
  }

  removePermission(id: string, permissionId: string, user: AuthenticatedUser) {
    return this.permissionsService.removePermission(id, permissionId, user);
  }

  // Delegated versions methods
  getVersions(id: string, user: AuthenticatedUser) {
    return this.versionsService.getVersions(id, user);
  }

  restoreVersion(id: string, versionNumber: number, user: AuthenticatedUser) {
    return this.versionsService.restoreVersion(id, versionNumber, user);
  }

  createVersionDownloadUrl(
    id: string,
    versionNumber: number,
    user: AuthenticatedUser,
  ) {
    return this.versionsService.createVersionDownloadUrl(id, versionNumber, user);
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...DocumentAccessUtil.ownerWhere(user) },
      select: { id: true, name: true, ownerId: true, version: true },
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
        where: DocumentAccessUtil.permissionWhere(user),
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
        ? { permission: this.permissionsService.toPublicPermission(permission) }
        : {}),
    };
  }
}
