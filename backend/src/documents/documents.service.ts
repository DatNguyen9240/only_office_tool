import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
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
import { StorageService } from "../storage/storage.service";
import { DocumentAccessService, AuditAction } from "./document-access.service";
import { DocumentPermissionsService } from "./document-permissions.service";
import {
  DocumentVersionsService,
  formatBytes,
} from "./document-versions.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";

type DocumentScope = "all" | "shared" | "trash";

const publicType = (value: string): PublicDocumentType =>
  value.toLowerCase() as PublicDocumentType;

const publicStatus = (value: string): PublicDocumentStatus =>
  value.toLowerCase() as PublicDocumentStatus;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly accessService: DocumentAccessService,
    private readonly permissionsService: DocumentPermissionsService,
    private readonly versionsService: DocumentVersionsService,
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
            permissions: { some: this.accessService.permissionWhere(user) },
          }
        : this.accessService.accessWhere(user)),
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
      where: { id, deletedAt: null, ...this.accessService.accessWhere(user) },
      include: this.publicInclude(user),
    });

    if (!document) throw new NotFoundException("Document not found");

    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.DOCUMENT_VIEWED,
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

    const targetVersion =
      input.expectedVersion !== undefined
        ? input.expectedVersion
        : ownedDocument.version;

    try {
      const document = await this.prisma.document.update({
        where: {
          id,
          version: targetVersion,
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
    try {
      await this.prisma.document.update({
        where: { id, version: document.version },
        data: {
          deletedAt: new Date(),
          status: DocumentStatus.DELETED,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ConflictException(
          "Document delete conflict detected. The document was modified by another request.",
        );
      }
      throw error;
    }

    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.DOCUMENT_DELETED,
      id,
      document.name,
    );
    return { id, status: "deleted" };
  }

  async restore(id: string, user: AuthenticatedUser): Promise<DocumentItem> {
    const ownedDocument = await this.ensureOwnedDocument(id, user);
    try {
      const document = await this.prisma.document.update({
        where: { id, version: ownedDocument.version },
        data: {
          deletedAt: null,
          status: DocumentStatus.READY,
          version: { increment: 1 },
        },
        include: this.publicInclude(user),
      });

      this.accessService.recordAuditAsync(
        user.id,
        AuditAction.DOCUMENT_RESTORED,
        id,
        ownedDocument.name,
      );
      return this.toPublicItem(document, user.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ConflictException(
          "Document restore conflict detected. The document was modified by another request.",
        );
      }
      throw error;
    }
  }

  async permanentDelete(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: { not: null },
        ...this.accessService.ownerWhere(user),
      },
      select: {
        id: true,
        name: true,
        versions: { select: { objectKey: true } },
      },
    });
    if (!document) throw new NotFoundException("Trashed document not found");
    const keysToDelete = document.versions.map((version) => version.objectKey);

    if (keysToDelete.length > 0) {
      try {
        await this.storage.deleteObjects(keysToDelete);
      } catch (err) {
        this.logger.error(
          `Failed to delete storage objects for document ${id}, aborting DB deletion`,
          err,
        );
        throw new BadRequestException(
          "Failed to delete document storage files. Permanent deletion aborted.",
        );
      }
    }

    try {
      await this.prisma.document.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ConflictException(
          "Document permanent deletion conflict detected. The document was deleted or modified by another request.",
        );
      }
      throw error;
    }

    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.DOCUMENT_PERMANENTLY_DELETED,
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

    if (documents.length === 0) {
      return { status: "trash_emptied" as const, count: 0 };
    }

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

    for (const doc of documents) {
      this.accessService.recordAuditAsync(
        user.id,
        AuditAction.DOCUMENT_PERMANENTLY_DELETED,
        doc.id,
        doc.name,
      );
    }

    return { status: "trash_emptied" as const, count: deleted.count };
  }

  async toggleStar(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const current = await this.prisma.document.findFirst({
      where: { id, ...this.accessService.ownerWhere(user) },
      select: { starred: true, name: true, version: true },
    });
    if (!current) throw new NotFoundException("Document not found");

    try {
      const document = await this.prisma.document.update({
        where: {
          id,
          version: current.version,
        },
        data: {
          starred: !current.starred,
          version: { increment: 1 },
        },
        include: this.publicInclude(user),
      });

      this.accessService.recordAuditAsync(
        user.id,
        document.starred ? AuditAction.DOCUMENT_STARRED : AuditAction.DOCUMENT_UNSTARRED,
        id,
        current.name,
      );
      return this.toPublicItem(document, user.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new ConflictException(
          "Document star status update conflict. The document was modified by another request.",
        );
      }
      throw error;
    }
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...this.accessService.ownerWhere(user) },
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
        where: this.accessService.permissionWhere(user),
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
