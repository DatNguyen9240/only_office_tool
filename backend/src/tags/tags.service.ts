import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentAccessService } from "../documents/document-access.service";
import { CreateTagDto, UpdateDocumentMetadataDto, UpdateDocumentTagsDto } from "./dto/tag.dto";

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
  ) {}

  async list() {
    const tags = await this.prisma.tag.findMany({
      include: { _count: { select: { documents: true } } },
      orderBy: { name: "asc" },
    });
    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      documentCount: tag._count.documents,
    }));
  }

  create(input: CreateTagDto) {
    return this.prisma.tag.upsert({
      where: { name: input.name.trim() },
      create: { name: input.name.trim(), color: input.color?.trim() || null },
      update: { color: input.color?.trim() || undefined },
    });
  }

  async remove(id: string) {
    const result = await this.prisma.tag.deleteMany({ where: { id } });
    if (result.count !== 1) throw new NotFoundException("Tag not found");
    return { id, status: "deleted" as const };
  }

  async setDocumentTags(
    documentId: string,
    input: UpdateDocumentTagsDto,
    user: AuthenticatedUser,
  ) {
    await this.ensureOwnedDocument(documentId, user);
    const ids = [...new Set(input.tagIds)];
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (tags.length !== ids.length) throw new NotFoundException("Tag not found");
    await this.prisma.$transaction(async (tx) => {
      await tx.documentTag.deleteMany({ where: { documentId } });
      if (ids.length > 0) {
        await tx.documentTag.createMany({
          data: ids.map((tagId) => ({ documentId, tagId })),
        });
      }
    });
    return this.prisma.documentTag.findMany({
      where: { documentId },
      include: { tag: true },
    });
  }

  async setMetadata(
    documentId: string,
    input: UpdateDocumentMetadataDto,
    user: AuthenticatedUser,
  ) {
    await this.ensureOwnedDocument(documentId, user);
    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        metadata:
          input.metadata === undefined
            ? Prisma.DbNull
            : (input.metadata as Prisma.InputJsonValue),
      },
      select: { id: true, metadata: true },
    });
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...this.access.ownerWhere(user) },
      select: { id: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }
}
