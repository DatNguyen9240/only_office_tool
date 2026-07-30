import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  private readonly quotaBytes: number;

  constructor(
    private readonly prisma: PrismaService,
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
    ] = await Promise.all([
      this.prisma.document.count({ where: ownedWhere }),
      this.prisma.folder.count({ where: { ownerId: user.id } }),
      this.prisma.document.count({
        where: {
          ownerId: { not: user.id },
          deletedAt: null,
          permissions: { some: { userId: user.id } },
        },
      }),
      this.prisma.document.count({
        where: {
          deletedAt: null,
          status: DocumentStatus.REVIEW,
          OR: [
            { ownerId: user.id },
            { permissions: { some: { userId: user.id } } },
          ],
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

    const usedBytes = this.safeNumber(versionStorage._sum.sizeBytes);
    const documentsBytes = this.safeNumber(currentStorage._sum.sizeBytes);

    return {
      metrics: {
        documents: documentCount,
        folders: folderCount,
        sharedWithMe: sharedWithMeCount,
        inReview: reviewCount,
        versions: versionCount,
      },
      storage: {
        usedBytes,
        quotaBytes: this.quotaBytes,
        documentsBytes,
        versionsBytes: Math.max(usedBytes - documentsBytes, 0),
        percent:
          this.quotaBytes > 0
            ? Math.min(Math.round((usedBytes / this.quotaBytes) * 100), 100)
            : 0,
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
