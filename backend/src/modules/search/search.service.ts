import { BadRequestException, Injectable } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { DocumentAccessService } from "../documents/document-access.service";
import { DocumentMapper } from "../documents/mappers/document.mapper";
import { PrismaService } from "../../database/prisma/prisma.service";
import { ElasticsearchService } from "../../integrations/indexing/elasticsearch.service";

interface SearchCursor {
  document?: { updatedAt: Date; id: string };
  folder?: { name: string; id: string };
  person?: { name: string; id: string };
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly elasticsearch: ElasticsearchService,
  ) {}

  async search(
    query: string,
    user: AuthenticatedUser,
    limit = 20,
    after?: string,
  ) {
    const q = query.trim();
    if (!q) {
      return {
        documents: [],
        folders: [],
        people: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      };
    }

    const first = Math.min(Math.max(limit, 1), 50);
    const cursor = this.decodeCursor(after);
    const indexedIds = await this.elasticsearch.searchIds(q, first * 2);
    const [documents, folders, people] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          AND: [
            { deletedAt: null },
            {
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
            },
            this.access.accessWhere(user),
            ...(cursor?.document
              ? [
                  {
                    OR: [
                      { updatedAt: { lt: cursor.document.updatedAt } },
                      {
                        updatedAt: cursor.document.updatedAt,
                        id: { lt: cursor.document.id },
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
        include: DocumentMapper.publicInclude(this.access, user),
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: first + 1,
      }),
      this.prisma.folder.findMany({
        where: {
          AND: [
            {
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
            },
            { name: { contains: q, mode: "insensitive" } },
            ...(cursor?.folder
              ? [
                  {
                    OR: [
                      { name: { gt: cursor.folder.name } },
                      { name: cursor.folder.name, id: { gt: cursor.folder.id } },
                    ],
                  },
                ]
              : []),
          ],
        },
        select: { id: true, name: true, parentId: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: first + 1,
      }),
      this.prisma.user.findMany({
        where: {
          AND: [
            { status: UserStatus.ACTIVE },
            {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { department: { contains: q, mode: "insensitive" } },
              ],
            },
            ...(cursor?.person
              ? [
                  {
                    OR: [
                      { name: { gt: cursor.person.name } },
                      { name: cursor.person.name, id: { gt: cursor.person.id } },
                    ],
                  },
                ]
              : []),
          ],
        },
        select: { id: true, name: true, email: true, department: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: first + 1,
      }),
    ]);

    const documentPage = documents.slice(0, first);
    const folderPage = folders.slice(0, first);
    const peoplePage = people.slice(0, first);
    const hasNextPage =
      documents.length > first || folders.length > first || people.length > first;

    return {
      documents: documentPage.map((document) =>
        DocumentMapper.toPublicItem(document, user.id),
      ),
      folders: folderPage,
      people: peoplePage,
      pageInfo: {
        hasNextPage,
        endCursor: hasNextPage
          ? this.encodeCursor({
              document: this.documentCursor(documentPage.at(-1)),
              folder: this.nameCursor(folderPage.at(-1)),
              person: this.nameCursor(peoplePage.at(-1)),
            })
          : null,
      },
    };
  }

  private documentCursor(
    document?: { updatedAt: Date; id: string },
  ): SearchCursor["document"] {
    return document ? { updatedAt: document.updatedAt, id: document.id } : undefined;
  }

  private nameCursor(
    item?: { name: string; id: string },
  ): { name: string; id: string } | undefined {
    return item ? { name: item.name, id: item.id } : undefined;
  }

  private encodeCursor(cursor: SearchCursor): string {
    return Buffer.from(
      JSON.stringify({
        document: cursor.document
          ? {
              updatedAt: cursor.document.updatedAt.toISOString(),
              id: cursor.document.id,
            }
          : undefined,
        folder: cursor.folder,
        person: cursor.person,
      }),
    ).toString("base64url");
  }

  private decodeCursor(cursor?: string): SearchCursor | undefined {
    if (!cursor) return undefined;
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      ) as unknown;
      if (!parsed || typeof parsed !== "object") throw new Error("invalid");
      const value = parsed as {
        document?: { updatedAt?: unknown; id?: unknown };
        folder?: { name?: unknown; id?: unknown };
        person?: { name?: unknown; id?: unknown };
      };
      return {
        document: this.parseDateCursor(value.document),
        folder: this.parseNameCursor(value.folder),
        person: this.parseNameCursor(value.person),
      };
    } catch {
      throw new BadRequestException("Invalid search cursor");
    }
  }

  private parseDateCursor(value?: {
    updatedAt?: unknown;
    id?: unknown;
  }): SearchCursor["document"] {
    if (!value) return undefined;
    const updatedAt =
      typeof value.updatedAt === "string" ? new Date(value.updatedAt) : undefined;
    if (
      !updatedAt ||
      Number.isNaN(updatedAt.getTime()) ||
      typeof value.id !== "string" ||
      !value.id
    ) {
      throw new Error("invalid date cursor");
    }
    return { updatedAt, id: value.id };
  }

  private parseNameCursor(value?: {
    name?: unknown;
    id?: unknown;
  }): { name: string; id: string } | undefined {
    if (!value) return undefined;
    if (
      typeof value.name !== "string" ||
      !value.name ||
      typeof value.id !== "string" ||
      !value.id
    ) {
      throw new Error("invalid name cursor");
    }
    return { name: value.name, id: value.id };
  }
}