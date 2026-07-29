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
import type { AuthenticatedUser } from "../auth/auth.types";
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
    user: AuthenticatedUser,
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
        ? {
            ownerId: { not: user.id },
            permissions: { some: this.permissionWhere(user) },
          }
        : { OR: this.accessWhere(user) }),
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
          where: this.permissionWhere(user),
          take: 1,
          select: { role: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return documents.map((document) => this.toPublicItem(document, user.id));
  }

  async getById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const document = await this.prisma.document.findFirst({
      where: { id, OR: this.accessWhere(user) },
      include: {
        owner: { select: { name: true } },
        folder: { select: { id: true } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { sizeBytes: true },
        },
        permissions: {
          where: this.permissionWhere(user),
          take: 1,
          select: { role: true },
        },
      },
    });

    if (!document) throw new NotFoundException("Document not found");
    return this.toPublicItem(document, user.id);
  }

  async update(
    id: string,
    input: UpdateDocumentDto,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    await this.ensureOwnedDocument(id, user);
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.folderId === undefined ? {} : { folderId: input.folderId }),
        ...(input.starred === undefined ? {} : { starred: input.starred }),
      },
      include: this.publicInclude(user),
    });

    return this.toPublicItem(document, user.id);
  }

  async softDelete(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ id: string; status: "deleted" }> {
    await this.ensureOwnedDocument(id, user);
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), status: DocumentStatus.DELETED },
    });
    return { id, status: "deleted" };
  }

  async restore(id: string, user: AuthenticatedUser): Promise<DocumentItem> {
    await this.ensureOwnedDocument(id, user);
    const document = await this.prisma.document.update({
      where: { id },
      data: { deletedAt: null, status: DocumentStatus.READY },
      include: this.publicInclude(user),
    });
    return this.toPublicItem(document, user.id);
  }

  async toggleStar(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentItem> {
    const current = await this.prisma.document.findFirst({
      where: { id, ...this.ownerWhere(user) },
      select: { starred: true },
    });
    if (!current) throw new NotFoundException("Document not found");

    const document = await this.prisma.document.update({
      where: { id },
      data: { starred: !current.starred },
      include: this.publicInclude(user),
    });
    return this.toPublicItem(document, user.id);
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...this.ownerWhere(user) },
      select: { id: true },
    });
    if (!document) throw new NotFoundException("Document not found");
  }

  private publicInclude(user: AuthenticatedUser) {
    return {
      owner: { select: { name: true } },
      folder: { select: { id: true } },
      versions: {
        orderBy: { version: "desc" as const },
        take: 1,
        select: { sizeBytes: true },
      },
      permissions: {
        where: this.permissionWhere(user),
        take: 1,
        select: { role: true },
      },
    } satisfies Prisma.DocumentInclude;
  }

  private toPublicItem(
    document: Prisma.DocumentGetPayload<{
      include: ReturnType<DocumentsService["publicInclude"]>;
    }>,
    userId: string,
  ): DocumentItem {
    const permission =
      document.ownerId === userId
        ? PermissionRole.OWNER
        : document.permissions[0]?.role;
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

  private permissionWhere(user: AuthenticatedUser) {
    return {
      OR: [{ userId: user.id }, { email: user.email }],
    } satisfies Prisma.DocumentPermissionWhereInput;
  }

  private accessWhere(user: AuthenticatedUser) {
    if (user.role === "ADMINISTRATOR") return [{}];
    return [
      { ownerId: user.id },
      { permissions: { some: this.permissionWhere(user) } },
    ] satisfies Prisma.DocumentWhereInput[];
  }

  private ownerWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    return user.role === "ADMINISTRATOR" ? {} : { ownerId: user.id };
  }

  private toPublicPermission(role: PermissionRole) {
    return role.charAt(0) + role.slice(1).toLowerCase() as
      | "Viewer"
      | "Commenter"
      | "Editor"
      | "Owner";
  }
}
