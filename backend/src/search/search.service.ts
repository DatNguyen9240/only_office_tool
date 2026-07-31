import { Injectable } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { DocumentAccessService } from "../documents/document-access.service";
import { DocumentMapper } from "../documents/mappers/document.mapper";
import { PrismaService } from "../prisma/prisma.service";
import { ElasticsearchService } from "../indexing/elasticsearch.service";

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly elasticsearch: ElasticsearchService,
  ) {}

  async search(query: string, user: AuthenticatedUser, limit = 20) {
    const q = query.trim();
    if (!q) return { documents: [], folders: [], people: [] };
    const indexedIds = await this.elasticsearch.searchIds(q, limit * 2);
    const [documents, folders, people] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          OR: [
            ...(indexedIds.length > 0 ? [{ id: { in: indexedIds } }] : []),
            { name: { contains: q, mode: "insensitive" } },
            {
              versions: {
                some: { textContent: { contains: q, mode: "insensitive" } },
              },
            },
            {
              tags: {
                some: { tag: { name: { contains: q, mode: "insensitive" } } },
              },
            },
          ],
          ...this.access.accessWhere(user),
        },
        include: DocumentMapper.publicInclude(this.access, user),
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      this.prisma.folder.findMany({
        where: {
          OR: [
            { ownerId: user.id },
            { permissions: { some: { userId: user.id } } },
            { permissions: { some: { email: user.email } } },
            {
              permissions: {
                some: { group: { members: { some: { userId: user.id } } } },
              },
            },
          ],
          name: { contains: q, mode: "insensitive" },
        },
        select: { id: true, name: true, parentId: true },
        orderBy: { name: "asc" },
        take: limit,
      }),
      this.prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, department: true },
        orderBy: { name: "asc" },
        take: limit,
      }),
    ]);
    return {
      documents: documents.map((document) =>
        DocumentMapper.toPublicItem(document, user.id),
      ),
      folders,
      people,
    };
  }
}
