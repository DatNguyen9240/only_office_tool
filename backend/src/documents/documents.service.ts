import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DocumentStatus,
  PermissionRole,
  Prisma,
} from "@prisma/client";
import type {
  DocumentItem,
  DocumentStatus as PublicDocumentStatus,
  DocumentType as PublicDocumentType,
} from "@share";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";

type DocumentScope = "all" | "shared" | "trash";

const publicType = (value: string): PublicDocumentType =>
  value.toLowerCase() as PublicDocumentType;

const publicStatus = (value: string): PublicDocumentStatus =>
  value.toLowerCase() as PublicDocumentStatus;

function formatBytes(value: bigint | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 102.4) / 10} KB`;
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 104857.6) / 10} MB`;
  return `${Math.round(bytes / 107374182.4) / 10} GB`;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    scope: DocumentScope,
    folderId?: string,
    search?: string,
    limit = 100,
  ): Promise<DocumentItem[]> {
    const where: Prisma.DocumentWhereInput = {
      ...(scope === "trash"
        ? { deletedAt: { not: null } }
        : { deletedAt: null }),
      ...(folderId ? { folderId } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
      ...(scope === "shared"
        ? { permissions: { some: {} } }
        : {}),
    };

    const documents = await this.prisma.document.findMany({
      where,
      include: {
        owner: { select: { name: true } },
        folder: { select: { id: true } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { sizeBytes: true },
        },
        permissions: {
          take: 1,
          select: { role: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return documents.map((document) => this.toPublicItem(document));
  }

  async getById(id: string): Promise<DocumentItem> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true } },
        folder: { select: { id: true } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { sizeBytes: true },
        },
        permissions: {
          take: 1,
          select: { role: true },
        },
      },
    });

    if (!document) throw new NotFoundException("Document not found");
    return this.toPublicItem(document);
  }

  async update(id: string, input: UpdateDocumentDto): Promise<DocumentItem> {
    await this.ensureDocument(id);
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.folderId === undefined ? {} : { folderId: input.folderId }),
        ...(input.starred === undefined ? {} : { starred: input.starred }),
      },
      include: this.publicInclude(),
    });

    return this.toPublicItem(document);
  }

  async softDelete(id: string): Promise<{ id: string; status: "deleted" }> {
    await this.ensureDocument(id);
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), status: DocumentStatus.DELETED },
    });
    return { id, status: "deleted" };
  }

  async restore(id: string): Promise<DocumentItem> {
    await this.ensureDocument(id);
    const document = await this.prisma.document.update({
      where: { id },
      data: { deletedAt: null, status: DocumentStatus.READY },
      include: this.publicInclude(),
    });
    return this.toPublicItem(document);
  }

  async toggleStar(id: string): Promise<DocumentItem> {
    const current = await this.prisma.document.findUnique({
      where: { id },
      select: { starred: true },
    });
    if (!current) throw new NotFoundException("Document not found");

    const document = await this.prisma.document.update({
      where: { id },
      data: { starred: !current.starred },
      include: this.publicInclude(),
    });
    return this.toPublicItem(document);
  }

  private async ensureDocument(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!document) throw new NotFoundException("Document not found");
  }

  private publicInclude() {
    return {
      owner: { select: { name: true } },
      folder: { select: { id: true } },
      versions: {
        orderBy: { version: "desc" as const },
        take: 1,
        select: { sizeBytes: true },
      },
      permissions: {
        take: 1,
        select: { role: true },
      },
    } satisfies Prisma.DocumentInclude;
  }

  private toPublicItem(
    document: Prisma.DocumentGetPayload<{
      include: ReturnType<DocumentsService["publicInclude"]>;
    }>,
  ): DocumentItem {
    const permission = document.permissions[0]?.role;
    return {
      id: document.id,
      name: document.name,
      type: publicType(document.type),
      owner: document.owner.name,
      modifiedAt: document.updatedAt.toISOString(),
      size: formatBytes(document.versions[0]?.sizeBytes),
      status: publicStatus(document.status),
      folderId: document.folder?.id ?? "all",
      shared: document.permissions.length > 0,
      ...(document.starred ? { starred: true } : {}),
      ...(document.deletedAt
        ? { deletedAt: document.deletedAt.toISOString() }
        : {}),
      ...(permission
        ? { permission: this.toPublicPermission(permission) }
        : {}),
    };
  }

  private toPublicPermission(role: PermissionRole) {
    return role.charAt(0) + role.slice(1).toLowerCase() as
      | "Viewer"
      | "Commenter"
      | "Editor"
      | "Owner";
  }
}
