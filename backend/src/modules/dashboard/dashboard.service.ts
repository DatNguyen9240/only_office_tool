import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { PrismaService } from "../../database/prisma/prisma.service";
import { StorageService } from "../../integrations/storage/storage.service";
import { DocumentAccessService } from "../documents/document-access.service";

@Injectable()
export class DashboardService {
  private readonly quotaBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: DocumentAccessService,
    config: ConfigService,
  ) {
    const configuredQuota = Number(config.get("STORAGE_QUOTA_BYTES"));
    this.quotaBytes =
      Number.isSafeInteger(configuredQuota) && configuredQuota > 0
        ? configuredQuota
        : 100 * 1024 * 1024 * 1024;
  }

  async get(user: AuthenticatedUser) {
    const ownedWhere = { ownerId: user.id, deletedAt: null };
    const [
      documentCount,
      folderCount,
      sharedWithMeCount,
      reviewCount,
      versionCount,
      versionStorage,
      ownedDocuments,
      auditLogs,
      storageCapacity,
    ] = await Promise.all([
      this.prisma.document.count({ where: ownedWhere }),
      this.prisma.folder.count({ where: { ownerId: user.id } }),
      this.prisma.document.count({
        where: {
          ownerId: { not: user.id },
          deletedAt: null,
          ...this.access.accessWhere(user),
        },
      }),
      this.prisma.document.count({
        where: {
          deletedAt: null,
          status: DocumentStatus.REVIEW,
          ...this.access.accessWhere(user),
        },
      }),
      this.prisma.documentVersion.count({
        where: { document: { ownerId: user.id } },
      }),
      this.prisma.documentVersion.aggregate({
        where: { document: { ownerId: user.id } },
        _sum: { sizeBytes: true },
      }),
      this.prisma.document.findMany({
        where: ownedWhere,
        select: { currentVersionId: true },
      }),
      this.prisma.auditLog.findMany({
        where: { actorId: user.id },
        orderBy: { timestamp: "desc" },
        take: 8,
        include: {
          actor: { select: { name: true } },
        },
      }),
      this.storage.capacity(),
    ]);

    const currentVersionIds = ownedDocuments
      .map((document) => document.currentVersionId)
      .filter((id): id is string => Boolean(id));
    const currentStorage = currentVersionIds.length
      ? await this.prisma.documentVersion.aggregate({
          where: { id: { in: currentVersionIds } },
          _sum: { sizeBytes: true },
        })
      : { _sum: { sizeBytes: null } };

    const workspaceBytes = this.safeNumber(versionStorage._sum.sizeBytes);
    const documentsBytes = this.safeNumber(currentStorage._sum.sizeBytes);
    const totalBytes = storageCapacity?.totalBytes ?? this.quotaBytes;
    const freeBytes =
      storageCapacity?.freeBytes ??
      Math.max(this.quotaBytes - workspaceBytes, 0);
    const usedBytes = storageCapacity
      ? Math.max(totalBytes - freeBytes, 0)
      : workspaceBytes;

    return {
      metrics: {
        documents: documentCount,
        folders: folderCount,
        sharedWithMe: sharedWithMeCount,
        inReview: reviewCount,
        versions: versionCount,
      },
      storage: {
        source: storageCapacity?.source ?? "configured_quota",
        usedBytes,
        totalBytes,
        freeBytes,
        workspaceBytes,
        documentsBytes,
        versionsBytes: Math.max(workspaceBytes - documentsBytes, 0),
        percent:
          totalBytes > 0
            ? Math.min(Math.round((usedBytes / totalBytes) * 100), 100)
            : 0,
        measuredAt: storageCapacity?.measuredAt ?? null,
      },
      activities: auditLogs.map((log) => {
        const metadata =
          log.metadata &&
          typeof log.metadata === "object" &&
          !Array.isArray(log.metadata)
            ? log.metadata
            : {};
        const resourceName =
          "name" in metadata && typeof metadata.name === "string"
            ? metadata.name
            : log.resourceId ?? log.resourceType;
        return {
          id: log.id,
          actor: log.actor?.name ?? "System",
          action: log.action,
          resource: resourceName,
          timestamp: log.timestamp.toISOString(),
          outcome: log.outcome,
        };
      }),
    };
  }

  private safeNumber(value: bigint | null | undefined) {
    if (!value) return 0;
    return Number(value > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : value);
  }
}
