import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DocumentStatus,
  Prisma,
} from "@prisma/client";
import type { DocumentItem } from "@share";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { PrismaService } from "../../database/prisma/prisma.service";
import { StorageService } from "../../integrations/storage/storage.service";
import { DocumentAccessService, AuditAction } from "./document-access.service";
import { DocumentPermissionsService } from "./document-permissions.service";
import { DocumentVersionsService } from "./document-versions.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { DocumentMapper } from "./mappers/document.mapper";

type DocumentScope =
  | "all"
  | "shared"
  | "trash"
  | "recent"
  | "favorites";

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
      ...(scope === "favorites"
        ? { favorites: { some: { userId: user.id } } }
        : {}),
    };

    const documents = await this.prisma.document.findMany({
      where,
      include: DocumentMapper.publicInclude(this.accessService, user),
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return documents.map((document) =>
      DocumentMapper.toPublicItem(document, user.id),
    );
  }

  async getById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, ...this.accessService.accessWhere(user) },
      include: DocumentMapper.publicInclude(this.accessService, user),
    });

    if (!document) throw new NotFoundException("Document not found");

    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.DOCUMENT_VIEWED,
      id,
      document.name,
    );

    return DocumentMapper.toPublicItem(document, user.id);
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
        include: DocumentMapper.publicInclude(this.accessService, user),
      });

      return DocumentMapper.toPublicItem(document, user.id);
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
        include: DocumentMapper.publicInclude(this.accessService, user),
      });

      this.accessService.recordAuditAsync(
        user.id,
        AuditAction.DOCUMENT_RESTORED,
        id,
        ownedDocument.name,
      );
      return DocumentMapper.toPublicItem(document, user.id);
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

    if (keysToDelete.length > 0) {
      try {
        await this.storage.deleteObjects(keysToDelete);
      } catch (err) {
        this.logger.error(
          `[STORAGE_CLEANUP_ERROR] Failed to delete storage objects for permanently deleted document ${id}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
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
    return this.prisma.$transaction(async (tx) => {
      const documents = await tx.document.findMany({
        where: {
          deletedAt: { not: null },
          ...this.accessService.ownerWhere(user),
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

      const docIds = documents.map((doc) => doc.id);
      const keysToDelete = documents.flatMap((document) =>
        document.versions.map((version) => version.objectKey),
      );

      const deleted = await tx.document.deleteMany({
        where: {
          id: { in: docIds },
          deletedAt: { not: null },
          ...this.accessService.ownerWhere(user),
        },
      });

      if (keysToDelete.length > 0) {
        try {
          await this.storage.deleteObjects(keysToDelete);
        } catch (err) {
          this.logger.error(
            `[STORAGE_CLEANUP_ERROR] Failed to delete storage objects during emptyTrash for user ${user.id}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
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
    });
  }

  async toggleStar(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const current = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.accessService.accessWhere(user),
      },
      select: { id: true, name: true },
    });
    if (!current) throw new NotFoundException("Document not found");

    const existing = await this.prisma.documentFavorite.findUnique({
      where: { documentId_userId: { documentId: id, userId: user.id } },
      select: { id: true },
    });
    const starred = !existing;
    if (existing) {
      await this.prisma.documentFavorite.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.documentFavorite.create({
        data: { documentId: id, userId: user.id },
      });
    }

    const document = await this.prisma.document.findFirstOrThrow({
      where: { id },
      include: DocumentMapper.publicInclude(this.accessService, user),
    });
    this.accessService.recordAuditAsync(
      user.id,
      starred ? AuditAction.DOCUMENT_STARRED : AuditAction.DOCUMENT_UNSTARRED,
      id,
      current.name,
    );
    return DocumentMapper.toPublicItem(document, user.id);
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...this.accessService.ownerWhere(user) },
      select: { id: true, name: true, ownerId: true, version: true, starred: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }
}
