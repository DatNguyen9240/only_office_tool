import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type { AuthenticatedUser } from "../src/core/auth/auth.types";
import type { PrismaService } from "../src/database/prisma/prisma.service";
import { DocumentAccessService } from "../src/modules/documents/document-access.service";
import { SearchService } from "../src/modules/search/search.service";
import type { ElasticsearchService } from "../src/integrations/indexing/elasticsearch.service";

const user: AuthenticatedUser = {
  id: "user-1",
  email: "user@example.com",
  name: "User",
  role: "EMPLOYEE",
};

test("search returns a cursor and applies it to the next page", async () => {
  const folderWheres: unknown[] = [];
  const personWheres: unknown[] = [];
  const prisma = {
    document: { findMany: async () => [] },
    folder: {
      findMany: async (args: { where: unknown }) => {
        folderWheres.push(args.where);
        return [
          { id: "folder-a", name: "Alpha", parentId: null },
          { id: "folder-b", name: "Beta", parentId: null },
        ];
      },
    },
    user: {
      findMany: async (args: { where: unknown }) => {
        personWheres.push(args.where);
        return [
          { id: "person-a", name: "Alice", email: "alice@example.com", department: null },
          { id: "person-b", name: "Bob", email: "bob@example.com", department: "Ops" },
        ];
      },
    },
  } as unknown as PrismaService;
  const service = new SearchService(
    prisma,
    new DocumentAccessService(),
    { searchIds: async () => [] } as unknown as ElasticsearchService,
  );

  const firstPage = await service.search("a", user, 1);
  assert.equal(firstPage.folders.length, 1);
  assert.equal(firstPage.people.length, 1);
  assert.equal(firstPage.pageInfo.hasNextPage, true);
  assert.equal(typeof firstPage.pageInfo.endCursor, "string");

  await service.search("a", user, 1, firstPage.pageInfo.endCursor ?? undefined);

  assert.match(JSON.stringify(folderWheres[1]), /Alpha/);
  assert.match(JSON.stringify(folderWheres[1]), /folder-a/);
  assert.match(JSON.stringify(personWheres[1]), /Alice/);
  assert.match(JSON.stringify(personWheres[1]), /person-a/);
});

test("search rejects malformed cursors", async () => {
  const service = new SearchService(
    {
      document: { findMany: async () => [] },
      folder: { findMany: async () => [] },
      user: { findMany: async () => [] },
    } as unknown as PrismaService,
    new DocumentAccessService(),
    { searchIds: async () => [] } as unknown as ElasticsearchService,
  );

  await assert.rejects(
    () => service.search("a", user, 20, "not-a-cursor"),
    BadRequestException,
  );
});