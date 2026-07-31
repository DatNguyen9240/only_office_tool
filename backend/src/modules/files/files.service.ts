import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { DocumentStatus, DocumentType, ScanStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { AuditService } from "../../core/audit/audit.service";
import { PrismaService } from "../../database/prisma/prisma.service";
import { StorageService } from "../../integrations/storage/storage.service";
import { CompleteUploadDto } from "./dto/complete-upload.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { validateFileMagicBytes } from "../../common/utils/file-signature.util";
import { OperationsService } from "../../integrations/operations/operations.service";

const documentTypes: Record<string, DocumentType> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    DocumentType.DOCX,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    DocumentType.XLSX,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    DocumentType.PPTX,
  "application/pdf": DocumentType.PDF,
};

const documentExtensions: Partial<Record<DocumentType, string>> = {
  [DocumentType.DOCX]: ".docx",
  [DocumentType.XLSX]: ".xlsx",
  [DocumentType.PPTX]: ".pptx",
  [DocumentType.PDF]: ".pdf",
};

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Optional() private readonly operations?: OperationsService,
    @Optional() private readonly audit?: AuditService,
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
    if (extension !== documentExtensions[type]) {
      throw new BadRequestException(
        "File extension does not match the declared content type",
      );
    }
    if (input.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: input.folderId, ownerId: user.id },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException("Folder not found");
    }

    const document = await this.prisma.document.create({
      data: {
        name: input.name,
        type,
        ownerId: user.id,
        folderId: input.folderId,
      },
      select: { id: true },
    });

    const objectKey = `documents/${user.id}/${document.id}/${randomUUID()}${extension}`;
    let upload: Awaited<ReturnType<StorageService["createUploadUrl"]>>;
    try {
      upload = await this.storage.createUploadUrl(
        objectKey,
        input.contentType,
      );
      await this.prisma.uploadIntent.create({
        data: {
          documentId: document.id,
          objectKey,
          expectedSizeBytes: BigInt(input.sizeBytes),
          contentType: input.contentType,
          expiresAt: new Date(Date.now() + upload.expiresIn * 1000),
        },
      });
    } catch (error) {
      await this.prisma.document.delete({ where: { id: document.id } });
      throw error;
    }

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
      select: { id: true, name: true, ownerId: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    if (
      !input.objectKey.startsWith(
        `documents/${document.ownerId}/${document.id}/`,
      )
    ) {
      throw new BadRequestException("Upload object does not belong to document");
    }
    const existingVersion = await this.prisma.documentVersion.findFirst({
      where: { objectKey: input.objectKey },
      select: { id: true },
    });
    if (existingVersion) {
      throw new ConflictException("Upload has already been completed");
    }
    const intent = await this.prisma.uploadIntent.findFirst({
      where: {
        documentId,
        objectKey: input.objectKey,
        completedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (
      !intent ||
      Number(intent.expectedSizeBytes) !== input.expectedSizeBytes
    ) {
      throw new BadRequestException("Upload intent is invalid or expired");
    }

    const head = await this.storage.headObject(input.objectKey);
    if (!head.ContentLength || head.ContentLength <= 0) {
      throw new BadRequestException("Uploaded object is empty");
    }
    if (head.ContentLength !== input.expectedSizeBytes) {
      throw new BadRequestException("Uploaded object size does not match metadata");
    }
    const prefix = await this.storage.getObjectBuffer(
      input.objectKey,
      "bytes=0-15",
    );
    const expectedType = documentTypes[intent.contentType];
    if (!expectedType || !validateFileMagicBytes(prefix, expectedType)) {
      await this.storage.deleteObjects([input.objectKey]);
      throw new BadRequestException("Uploaded file signature is invalid");
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
          scanStatus: ScanStatus.PENDING,
        },
        select: { id: true, version: true, sizeBytes: true, createdAt: true },
      });
      await tx.document.update({
        where: { id: documentId },
        data: {
          currentVersionId: created.id,
          status: DocumentStatus.REVIEW,
        },
      });
      await tx.uploadIntent.update({
        where: { id: intent.id },
        data: { completedAt: new Date() },
      });
      return created;
    });
    await this.operations?.enqueueMalwareScan(version.id);

    await this.audit?.record({
      actorId: user.id,
      action: "DOCUMENT_CREATED",
      resourceType: "DOCUMENT",
      resourceId: documentId,
      metadata: { name: document.name, version: version.version },
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
        deletedAt: null,
        ...(user.role === "ADMINISTRATOR"
          ? {}
          : {
              OR: [
                { ownerId: user.id },
                {
                  permissions: {
                    some: {
                      OR: [
                        { userId: user.id },
                        { email: user.email },
                        {
                          group: {
                            members: { some: { userId: user.id } },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  folder: {
                    permissions: {
                      some: {
                        OR: [
                          { userId: user.id },
                          { email: user.email },
                          {
                            group: {
                              members: { some: { userId: user.id } },
                            },
                          },
                        ],
                      },
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
      },
    });
    if (!document) throw new NotFoundException("Document not found");
    const version = await this.prisma.documentVersion.findFirst({
      where: {
        documentId,
        ...(document.currentVersionId
          ? { id: document.currentVersionId }
          : {}),
      },
      orderBy: { version: "desc" },
      select: { objectKey: true, scanStatus: true },
    });
    if (!version) throw new NotFoundException("Document has no uploaded version");
    if (version.scanStatus !== ScanStatus.CLEAN) {
      throw new ConflictException(
        version.scanStatus === ScanStatus.INFECTED
          ? "Document is quarantined"
          : "Document security scan is not complete",
      );
    }

    const download = {
      documentId: document.id,
      name: document.name,
      ...(await this.storage.createDownloadUrl(version.objectKey)),
    };
    await this.audit?.record({
      actorId: user.id,
      action: "DOCUMENT_DOWNLOADED",
      resourceType: "DOCUMENT",
      resourceId: document.id,
      metadata: { name: document.name },
    });
    return download;
  }
}
