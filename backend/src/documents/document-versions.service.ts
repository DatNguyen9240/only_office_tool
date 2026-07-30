import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { DocumentAccessService, AuditAction } from "./document-access.service";

export function formatBytes(value: bigint | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 102.4) / 10} KB`;
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 104857.6) / 10} MB`;
  return `${Math.round(bytes / 107374182.4) / 10} GB`;
}

@Injectable()
export class DocumentVersionsService {
  private readonly logger = new Logger(DocumentVersionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly accessService: DocumentAccessService,
  ) {}

  async getVersions(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, ...this.accessService.accessWhere(user) },
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
    const document = await this.ensureOwnedDocument(id, user);
    const targetVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId: id, version: versionNumber },
    });
    if (!targetVersion) throw new NotFoundException("Version not found");

    const newVersion = await this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.documentVersion.aggregate({
        where: { documentId: id },
        _max: { version: true },
      });
      const nextVersion = (aggregate._max.version ?? 0) + 1;

      const created = await tx.documentVersion.create({
        data: {
          documentId: id,
          version: nextVersion,
          objectKey: targetVersion.objectKey,
          sizeBytes: targetVersion.sizeBytes,
          checksum: targetVersion.checksum,
          note: `Restored from version ${targetVersion.version}`,
          authorId: user.id,
        },
      });
      await tx.document.update({
        where: { id },
        data: {
          currentVersionId: created.id,
          version: { increment: 1 },
        },
      });
      return created;
    });

    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.VERSION_RESTORED,
      id,
      document.name,
    );
    return {
      version: newVersion.version,
      status: "restored" as const,
    };
  }

  async createVersionDownloadUrl(
    id: string,
    versionNumber: number,
    user: AuthenticatedUser,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, ...this.accessService.accessWhere(user) },
      select: { id: true, name: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    const version = await this.prisma.documentVersion.findFirst({
      where: { documentId: id, version: versionNumber },
      select: { objectKey: true },
    });
    if (!version) throw new NotFoundException("Version not found");
    const download = {
      documentId: id,
      name: document.name,
      version: versionNumber,
      ...(await this.storage.createDownloadUrl(version.objectKey)),
    };
    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.VERSION_DOWNLOADED,
      id,
      document.name,
    );
    return download;
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...this.accessService.ownerWhere(user) },
      select: { id: true, name: true, ownerId: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }
}
