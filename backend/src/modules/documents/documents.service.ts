import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  DocumentStatus,
  DocumentType,
  ScanStatus,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import type { DocumentItem } from "@share";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { PrismaService } from "../../database/prisma/prisma.service";
import { StorageService } from "../../integrations/storage/storage.service";
import { ProcessorService } from "../../integrations/processor/processor.service";
import { OperationsService } from "../../integrations/operations/operations.service";
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

export interface DocumentConnection {
  nodes: DocumentItem[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly accessService: DocumentAccessService,
    private readonly permissionsService: DocumentPermissionsService,
    private readonly versionsService: DocumentVersionsService,
    private readonly processor: ProcessorService,
    @Optional() private readonly operations?: OperationsService,
  ) {}

  async list(
    scope: DocumentScope,
    user: AuthenticatedUser,
    folderId?: string,
    search?: string,
    limit = 100,
  ): Promise<DocumentItem[]> {
    const where = this.buildListWhere(scope, user, { folderId, search });

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

  /** Bounded, cursor-based document listing for read clients. */
  async listConnection(
    scope: DocumentScope,
    user: AuthenticatedUser,
    options: {
      folderId?: string;
      search?: string;
      first?: number;
      after?: string;
    } = {},
  ): Promise<DocumentConnection> {
    const first = Math.min(Math.max(options.first ?? 20, 1), 50);
    const cursor = this.decodeCursor(options.after);
    const where = this.buildListWhere(scope, user, {
      folderId: options.folderId,
      search: options.search,
      cursor,
    });
    const records = await this.prisma.document.findMany({
      where,
      include: DocumentMapper.publicInclude(this.accessService, user),
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: first + 1,
    });
    const hasNextPage = records.length > first;
    const page = hasNextPage ? records.slice(0, first) : records;
    const last = page.at(-1);
    return {
      nodes: page.map((document) =>
        DocumentMapper.toPublicItem(document, user.id),
      ),
      pageInfo: {
        hasNextPage,
        endCursor: last ? this.encodeCursor(last.updatedAt, last.id) : null,
      },
    };
  }

  private encodeCursor(updatedAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({ updatedAt: updatedAt.toISOString(), id }),
    ).toString("base64url");
  }

  private decodeCursor(
    cursor?: string,
  ): { updatedAt: Date; id: string } | undefined {
    if (!cursor) return undefined;
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      ) as { updatedAt?: unknown; id?: unknown };
      const updatedAt =
        typeof parsed.updatedAt === "string"
          ? new Date(parsed.updatedAt)
          : undefined;
      if (
        !updatedAt ||
        Number.isNaN(updatedAt.getTime()) ||
        typeof parsed.id !== "string" ||
        !parsed.id
      ) {
        throw new Error("invalid cursor");
      }
      return { updatedAt, id: parsed.id };
    } catch {
      throw new BadRequestException("Invalid document cursor");
    }
  }

  private buildListWhere(
    scope: DocumentScope,
    user: AuthenticatedUser,
    options: {
      folderId?: string;
      search?: string;
      cursor?: { updatedAt: Date; id: string };
    } = {},
  ): Prisma.DocumentWhereInput {
    const filters: Prisma.DocumentWhereInput[] = [
      scope === "trash"
        ? { deletedAt: { not: null } }
        : { deletedAt: null },
    ];

    if (options.folderId) filters.push({ folderId: options.folderId });
    if (options.search) {
      filters.push({
        name: { contains: options.search, mode: "insensitive" },
      });
    }

    if (scope === "trash") {
      filters.push(this.accessService.ownerWhere(user));
    } else if (scope === "shared") {
      filters.push({ ownerId: { not: user.id } });
      filters.push(this.accessService.accessWhere(user));
    } else {
      filters.push(this.accessService.accessWhere(user));
    }

    if (scope === "favorites") {
      filters.push({ favorites: { some: { userId: user.id } } });
    }

    if (options.cursor) {
      filters.push({
        OR: [
          { updatedAt: { lt: options.cursor.updatedAt } },
          {
            updatedAt: options.cursor.updatedAt,
            id: { lt: options.cursor.id },
          },
        ],
      });
    }

    return { AND: filters };
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
      select: { id: true, name: true, ownerId: true, version: true, folderId: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }

  async mergeWord(
    id: string,
    placeholders: Record<string, string>,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const ownedDocument = await this.ensureOwnedDocument(id, user);
    
    const latestVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
    });
    if (!latestVersion) {
      throw new BadRequestException("Document has no uploaded version to merge");
    }

    const nextVersionNum = ownedDocument.version + 1;
    const outputKey = `documents/${user.id}/${id}/version-${nextVersionNum}.docx`;

    await this.processor.mergeWord(
      latestVersion.objectKey,
      outputKey,
      placeholders
    );

    const head = await this.storage.headObject(outputKey);
    const sizeBytes = BigInt(head.ContentLength ?? 0);

    const updatedDoc = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id },
        data: {
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      const createdVersion = await tx.documentVersion.create({
        data: {
          documentId: id,
          version: nextVersionNum,
          objectKey: outputKey,
          sizeBytes,
          checksum: head.ETag?.replaceAll('"', "") ?? null,
          authorId: user.id,
          scanStatus: ScanStatus.PENDING,
        },
      });

      return tx.document.update({
        where: { id },
        data: {
          currentVersionId: createdVersion.id,
          status: DocumentStatus.READY,
        },
        include: DocumentMapper.publicInclude(this.accessService, user),
      });
    });

    if (this.operations && updatedDoc.currentVersionId) {
      await this.operations.enqueueMalwareScan(updatedDoc.currentVersionId);
    }

    return DocumentMapper.toPublicItem(updatedDoc, user.id);
  }

  async convertPdf(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const ownedDocument = await this.ensureOwnedDocument(id, user);
    
    const latestVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
    });
    if (!latestVersion) {
      throw new BadRequestException("Document has no uploaded version to convert");
    }

    const newDocId = randomUUID();
    const outputKey = `documents/${user.id}/${newDocId}/version-1.pdf`;

    await this.processor.convertPdf(latestVersion.objectKey, outputKey);

    const head = await this.storage.headObject(outputKey);
    const sizeBytes = BigInt(head.ContentLength ?? 0);

    const pdfName = ownedDocument.name.includes(".")
      ? `${ownedDocument.name.slice(0, ownedDocument.name.lastIndexOf("."))}.pdf`
      : `${ownedDocument.name}.pdf`;

    const pdfDoc = await this.prisma.$transaction(async (tx) => {
      await tx.document.create({
        data: {
          id: newDocId,
          name: pdfName,
          type: DocumentType.PDF,
          ownerId: user.id,
          folderId: ownedDocument.folderId,
          status: DocumentStatus.READY,
        },
      });

      const version = await tx.documentVersion.create({
        data: {
          documentId: newDocId,
          version: 1,
          objectKey: outputKey,
          sizeBytes,
          checksum: head.ETag?.replaceAll('"', "") ?? null,
          authorId: user.id,
          scanStatus: ScanStatus.PENDING,
        },
      });

      return tx.document.update({
        where: { id: newDocId },
        data: {
          currentVersionId: version.id,
        },
        include: DocumentMapper.publicInclude(this.accessService, user),
      });
    });

    if (this.operations && pdfDoc.currentVersionId) {
      await this.operations.enqueueMalwareScan(pdfDoc.currentVersionId);
    }

    return DocumentMapper.toPublicItem(pdfDoc, user.id);
  }
}
