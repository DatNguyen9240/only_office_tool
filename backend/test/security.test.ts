import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import type { PrismaService } from "../src/prisma/prisma.service";
import { StorageService } from "../src/storage/storage.service";
import type { AuditService } from "../src/audit/audit.service";
import { AdminService } from "../src/admin/admin.service";
import { AuthService } from "../src/auth/auth.service";
import { DocumentsService } from "../src/documents/documents.service";
import { FilesService } from "../src/files/files.service";
import { FoldersService } from "../src/folders/folders.service";

const user = {
  id: "user-1",
  email: "owner@example.com",
  name: "Owner",
  role: "EMPLOYEE" as const,
};

test("permission removal cannot target another document", async () => {
  const prisma = {
    document: {
      findFirst: async () => ({ id: "document-1", ownerId: user.id }),
    },
    documentPermission: {
      deleteMany: async () => ({ count: 0 }),
    },
  } as unknown as PrismaService;
  const service = new DocumentsService(
    prisma,
    {} as JwtService,
    {} as ConfigService,
    {} as StorageService,
  );

  await assert.rejects(
    () => service.removePermission("document-1", "foreign-permission", user),
    NotFoundException,
  );
});

test("folder move rejects a parent cycle", async () => {
  let calls = 0;
  const prisma = {
    folder: {
      findFirst: async () => {
        calls += 1;
        return calls === 1 ? { id: "folder-1" } : { parentId: "folder-1" };
      },
      update: async () => {
        throw new Error("update must not be reached");
      },
    },
  } as unknown as PrismaService;
  const service = new FoldersService(prisma);

  await assert.rejects(
    () => service.update("folder-1", { parentId: "folder-2" }, user.id),
    ConflictException,
  );
});

test("upload completion is bound to its document object-key prefix", async () => {
  const prisma = {
    document: {
      findFirst: async () => ({ id: "document-1", ownerId: user.id }),
    },
  } as unknown as PrismaService;
  const service = new FilesService(prisma, {} as StorageService);

  await assert.rejects(
    () =>
      service.completeUpload(
        "document-1",
        {
          objectKey: `documents/${user.id}/another-document/file.docx`,
          expectedSizeBytes: 10,
        },
        user,
      ),
    BadRequestException,
  );
});

test("ONLYOFFICE callback rejects an invalid ticket before fetching", async () => {
  const jwt = {
    verifyAsync: async () => {
      throw new Error("invalid");
    },
  } as unknown as JwtService;
  const config = {
    get: (key: string) =>
      key === "ONLYOFFICE_JWT_SECRET" ? "dedicated-secret" : undefined,
  } as unknown as ConfigService;
  const service = new DocumentsService(
    {} as PrismaService,
    jwt,
    config,
    {} as StorageService,
  );

  await assert.rejects(
    () =>
      service.handleOnlyOfficeCallback("document-1", "invalid", {
        status: 2,
        url: "http://127.0.0.1/private",
      }),
    UnauthorizedException,
  );
});

test("a denied login is recorded in the audit log", async () => {
  const events: Array<{ action: string; outcome?: string }> = [];
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "user-1",
        email: "owner@example.com",
        name: "Owner",
        role: "EMPLOYEE",
        status: "ACTIVE",
        passwordHash: null,
      }),
    },
  } as unknown as PrismaService;
  const config = {
    getOrThrow: (key: string) => `${key}-with-at-least-32-characters`,
    get: () => undefined,
  } as unknown as ConfigService;
  const audit = {
    record: async (event: { action: string; outcome?: string }) => {
      events.push(event);
      return {};
    },
  } as unknown as AuditService;
  const service = new AuthService(
    prisma,
    {} as JwtService,
    audit,
    config,
  );

  await assert.rejects(
    () =>
      service.login({
        email: "owner@example.com",
        password: "incorrect-password",
      }),
    UnauthorizedException,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0]?.action, "LOGIN");
  assert.equal(events[0]?.outcome, "DENIED");
});

test("the last active administrator cannot be suspended", async () => {
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "admin-1",
        name: "Administrator",
        role: "ADMINISTRATOR",
        status: "ACTIVE",
      }),
      count: async () => 1,
    },
  } as unknown as PrismaService;
  const service = new AdminService(
    prisma,
    {} as AuditService,
  );

  await assert.rejects(
    () =>
      service.updateUser(
        "admin-1",
        { status: "SUSPENDED" },
        {
          id: "admin-1",
          email: "admin@example.com",
          name: "Administrator",
          role: "ADMINISTRATOR",
        },
      ),
    BadRequestException,
  );
});

test("MinIO v3 metrics report real usable storage capacity", async () => {
  const config = {
    get: (key: string, fallback?: unknown) => {
      const values: Record<string, string> = {
        S3_ENDPOINT: "http://minio.internal:9000",
        S3_REGION: "us-east-1",
      };
      return values[key] ?? fallback;
    },
  } as unknown as ConfigService;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      [
        "minio_cluster_health_capacity_usable_total_bytes 1000",
        "minio_cluster_health_capacity_usable_free_bytes 400",
      ].join("\n"),
      { status: 200 },
    )) as typeof fetch;

  try {
    const capacity = await new StorageService(config).capacity();
    assert.equal(capacity?.totalBytes, 1000);
    assert.equal(capacity?.freeBytes, 400);
    assert.equal(capacity?.source, "minio_metrics_v3");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
