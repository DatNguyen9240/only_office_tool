import DataLoader from "dataloader";
import type { PrismaService } from "../database/prisma/prisma.service";
import { formatBytes } from "../modules/documents/document-versions.service";

export function createGraphqlLoaders(prisma: PrismaService) {
  return {
    versionsByDocumentId: new DataLoader<string, Array<{
      id: string;
      version: number;
      versionLabel: string;
      modifiedAt: string;
      author: string;
      size: string;
    }>>(async (documentIds) => {
      const versions = await prisma.documentVersion.findMany({
        where: { documentId: { in: [...documentIds] } },
        include: { author: { select: { name: true } } },
        orderBy: [{ documentId: "asc" }, { version: "desc" }],
      });
      const grouped = new Map<string, typeof versions>();
      for (const version of versions) {
        const group = grouped.get(version.documentId) ?? [];
        group.push(version);
        grouped.set(version.documentId, group);
      }
      return documentIds.map((id) =>
        (grouped.get(id) ?? []).slice(0, 20).map((version) => ({
          id: version.id,
          version: version.version,
          versionLabel: `v${version.version}.0`,
          modifiedAt: version.createdAt.toISOString(),
          author: version.author.name,
          size: formatBytes(version.sizeBytes),
        })),
      );
    }),
  };
}

export type GraphqlLoaders = ReturnType<typeof createGraphqlLoaders>;
