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
import type { StorageService } from "../src/storage/storage.service";
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
