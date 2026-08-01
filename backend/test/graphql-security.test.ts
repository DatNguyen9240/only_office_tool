import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { AuthenticatedUser } from "../src/core/auth/auth.types";
import type { PrismaService } from "../src/database/prisma/prisma.service";
import { GqlJwtAuthGuard, GqlRolesGuard } from "../src/graphql/graphql-auth";
import {
  createGraphqlOperationAllowlistPlugin,
  isOfficialGraphqlOperation,
} from "../src/graphql/operation-allowlist";
import { WorkspaceResolver } from "../src/graphql/workspace.resolver";
import { DocumentAccessService } from "../src/modules/documents/document-access.service";
import { DocumentsService } from "../src/modules/documents/documents.service";

const employee: AuthenticatedUser = {
  id: "user-1",
  email: "employee@example.com",
  name: "Employee",
  role: "EMPLOYEE",
};

const admin: AuthenticatedUser = {
  ...employee,
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMINISTRATOR",
};

function graphqlExecutionContext(user?: AuthenticatedUser): ExecutionContext {
  const request = { user };
  const args = [undefined, {}, { req: request }, undefined];
  return {
    getArgs: () => args,
    getArgByIndex: (index: number) => args[index],
    getType: () => "graphql",
    getClass: () => WorkspaceResolver,
    getHandler: () => graphqlExecutionContext,
    switchToHttp: () => ({ getRequest: () => request }),
    switchToRpc: () => ({ getContext: () => undefined, getData: () => undefined }),
    switchToWs: () => ({ getClient: () => undefined, getData: () => undefined }),
  } as unknown as ExecutionContext;
}

test("GraphQL auth helpers read the HTTP request from GraphQL context", () => {
  const guard = new GqlJwtAuthGuard();
  const request = guard.getRequest(graphqlExecutionContext(employee));

  assert.equal(request.user, employee);
});

test("GraphQL role guard denies missing or mismatched user roles", () => {
  const reflector = {
    getAllAndOverride: () => ["ADMINISTRATOR"],
  } as unknown as Reflector;
  const guard = new GqlRolesGuard(reflector);

  assert.equal(guard.canActivate(graphqlExecutionContext()), false);
  assert.equal(guard.canActivate(graphqlExecutionContext(employee)), false);
  assert.equal(guard.canActivate(graphqlExecutionContext(admin)), true);
});

test("official GraphQL allowlist accepts only known operation hashes", async () => {
  const searchDocument = readFileSync(
    join(process.cwd(), "../frontend/src/graphql/search.graphql"),
    "utf8",
  );

  assert.equal(isOfficialGraphqlOperation("Search", searchDocument), true);
  assert.equal(
    isOfficialGraphqlOperation("Search", searchDocument.replace("pageInfo", "__typename")),
    false,
  );

  const plugin = createGraphqlOperationAllowlistPlugin(true);
  const listener = await plugin.requestDidStart?.({} as never);

  await assert.rejects(
    () =>
      listener?.didResolveSource?.({
        request: { operationName: "Search" },
        source: "query Search { __typename }",
      } as never),
    /not allowed/,
  );
});

test("GraphQL document mutations forward the authenticated user into permission checks", async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const documents = {
    softDelete: async (...args: unknown[]) => {
      calls.push({ method: "softDelete", args });
      return { id: "document-1", status: "deleted" };
    },
    permanentDelete: async (...args: unknown[]) => {
      calls.push({ method: "permanentDelete", args });
      return { id: "document-1", status: "deleted_permanently" };
    },
    emptyTrash: async (...args: unknown[]) => {
      calls.push({ method: "emptyTrash", args });
      return { status: "trash_emptied", count: 1 };
    },
  };
  const permissions = {
    addPermission: async (...args: unknown[]) => {
      calls.push({ method: "addPermission", args });
      return { id: "permission-1" };
    },
    updatePermission: async (...args: unknown[]) => {
      calls.push({ method: "updatePermission", args });
      return { id: "permission-1" };
    },
    removePermission: async (...args: unknown[]) => {
      calls.push({ method: "removePermission", args });
      return { id: "permission-1", status: "removed" };
    },
  };
  const resolver = new WorkspaceResolver(
    {} as never,
    documents as never,
    {} as never,
    permissions as never,
  );

  await resolver.deleteDocument("document-1", employee);
  await resolver.permanentlyDeleteDocument("document-1", employee);
  await resolver.emptyTrash(employee);
  await resolver.grantDocumentPermission(
    "document-1",
    { email: "target@example.com", role: "VIEWER" },
    employee,
  );
  await resolver.updateDocumentPermission(
    "document-1",
    "permission-1",
    { role: "EDITOR" },
    employee,
  );
  await resolver.revokeDocumentPermission("document-1", "permission-1", employee);

  assert.deepEqual(
    calls.map((call) => [call.method, call.args.at(-1)]),
    [
      ["softDelete", employee],
      ["permanentDelete", employee],
      ["emptyTrash", employee],
      ["addPermission", employee],
      ["updatePermission", employee],
      ["removePermission", employee],
    ],
  );
});

test("GraphQL trash mutations stay owner-scoped in the document service", async () => {
  let permanentDeleteWhere: unknown;
  let emptyTrashWhere: unknown;
  const prisma = {
    document: {
      findFirst: async (args: { where: unknown }) => {
        permanentDeleteWhere = args.where;
        return null;
      },
    },
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        document: {
          findMany: async (args: { where: unknown }) => {
            emptyTrashWhere = args.where;
            return [];
          },
        },
      }),
  } as unknown as PrismaService;
  const service = new DocumentsService(
    prisma,
    {} as never,
    new DocumentAccessService(),
    {} as never,
    {} as never,
    {} as never,
  );

  await assert.rejects(
    () => service.permanentDelete("document-1", employee),
    NotFoundException,
  );
  const result = await service.emptyTrash(employee);

  assert.deepEqual(permanentDeleteWhere, {
    id: "document-1",
    deletedAt: { not: null },
    ownerId: employee.id,
  });
  assert.deepEqual(emptyTrashWhere, {
    deletedAt: { not: null },
    ownerId: employee.id,
  });
  assert.deepEqual(result, { status: "trash_emptied", count: 0 });
});