import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DocumentType, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { CompleteUploadDto } from "./dto/complete-upload.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";

const documentTypes: Record<string, DocumentType> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    DocumentType.DOCX,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    DocumentType.XLSX,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    DocumentType.PPTX,
  "application/pdf": DocumentType.PDF,
};

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createUploadUrl(
    input: CreateUploadUrlDto,
    user: AuthenticatedUser,
  ) {
    const type = documentTypes[input.contentType];
    if (!type) throw new BadRequestException("Unsupported content type");

    const extension = input.name.includes(".")
      ? input.name.slice(input.name.lastIndexOf(".")).toLowerCase()
      : "";
    if (input.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: input.folderId, ownerId: user.id },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException("Folder not found");
    }

    const objectKey = `documents/${user.id}/${randomUUID()}${extension}`;
    const document = await this.prisma.document.create({
      data: {
        name: input.name,
        type,
        ownerId: user.id,
        folderId: input.folderId,
      },
      select: { id: true },
    });

    const upload = await this.storage.createUploadUrl(
      objectKey,
      input.contentType,
    );
    await this.prisma.document.update({
      where: { id: document.id },
      data: { currentVersionId: null },
    });

    return {
      documentId: document.id,
      objectKey,
      expectedSizeBytes: input.sizeBytes,
      ...upload,
    };
  }

  async completeUpload(
    documentId: string,
    input: CompleteUploadDto,
    user: AuthenticatedUser,
  ) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        ...(user.role === "ADMINISTRATOR" ? {} : { ownerId: user.id }),
      },
      select: { id: true, ownerId: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    if (!input.objectKey.startsWith(`documents/${document.ownerId}/`)) {
      throw new BadRequestException("Upload object does not belong to document");
    }

    const head = await this.storage.headObject(input.objectKey);
    if (!head.ContentLength || head.ContentLength <= 0) {
      throw new BadRequestException("Uploaded object is empty");
    }
    if (head.ContentLength !== input.expectedSizeBytes) {
      throw new BadRequestException("Uploaded object size does not match metadata");
    }

    const version = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.documentVersion.findFirst({
        where: { documentId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (latest?.version ?? 0) + 1;
      const created = await tx.documentVersion.create({
        data: {
          documentId,
          version: nextVersion,
          objectKey: input.objectKey,
          sizeBytes: BigInt(head.ContentLength ?? 0),
          checksum: head.ETag?.replaceAll('"', "") ?? null,
          authorId: user.id,
        },
        select: { id: true, version: true, sizeBytes: true, createdAt: true },
      });
      await tx.document.update({
        where: { id: documentId },
        data: { currentVersionId: created.id },
      });
      return created;
    });

    return {
      documentId,
      version: version.version,
      sizeBytes: Number(version.sizeBytes),
      createdAt: version.createdAt.toISOString(),
    };
  }

  async createDownloadUrl(
    documentId: string,
    user: AuthenticatedUser,
  ) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        ...(user.role === "ADMINISTRATOR"
          ? {}
          : {
              OR: [
                { ownerId: user.id },
                {
                  permissions: {
                    some: {
                      OR: [{ userId: user.id }, { email: user.email }],
                    },
                  },
                },
              ],
            }),
      },
      select: {
        id: true,
        name: true,
        currentVersionId: true,
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { objectKey: true },
        },
      },
    });
    if (!document) throw new NotFoundException("Document not found");
    const objectKey = document.versions[0]?.objectKey;
    if (!objectKey) throw new NotFoundException("Document has no uploaded version");

    return {
      documentId: document.id,
      name: document.name,
      ...(await this.storage.createDownloadUrl(objectKey)),
    };
  }
}
