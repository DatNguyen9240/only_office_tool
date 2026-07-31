import { PermissionRole, Prisma } from "@prisma/client";
import type {
  DocumentItem,
  DocumentStatus as PublicDocumentStatus,
  DocumentType as PublicDocumentType,
} from "@share";
import { formatBytes } from "../document-versions.service";
import { DocumentAccessService } from "../document-access.service";
import type { AuthenticatedUser } from "../../auth/auth.types";

const publicType = (value: string): PublicDocumentType =>
  value.toLowerCase() as PublicDocumentType;

const publicStatus = (value: string): PublicDocumentStatus =>
  value.toLowerCase() as PublicDocumentStatus;

export class DocumentMapper {
  static formatPermissionRole(role: PermissionRole): "Viewer" | "Commenter" | "Editor" | "Owner" {
    return (role.charAt(0) + role.slice(1).toLowerCase()) as
      | "Viewer"
      | "Commenter"
      | "Editor"
      | "Owner";
  }

  static publicInclude(
    accessService: DocumentAccessService,
    user: AuthenticatedUser,
  ) {
    return {
      owner: { select: { name: true } },
      folder: { select: { id: true } },
      versions: {
        orderBy: { version: "desc" as const },
        take: 1,
        select: { sizeBytes: true, objectKey: true },
      },
      permissions: {
        where: accessService.permissionWhere(user),
        take: 1,
        select: { role: true },
      },
      favorites: {
        where: { userId: user.id },
        take: 1,
        select: { id: true },
      },
      _count: { select: { permissions: true } },
      tags: {
        include: { tag: true },
        orderBy: { createdAt: "asc" as const },
      },
    } satisfies Prisma.DocumentInclude;
  }

  static toPublicItem(
    document: Prisma.DocumentGetPayload<{
      include: ReturnType<typeof DocumentMapper.publicInclude>;
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
      shared: document._count.permissions > 0,
      ...(document.favorites.length > 0 ? { starred: true } : {}),
      ...(document.deletedAt
        ? { deletedAt: document.deletedAt.toISOString() }
        : {}),
      ...(permission
        ? { permission: DocumentMapper.formatPermissionRole(permission) }
        : {}),
      metadata: document.metadata as Record<string, unknown> | null,
      tags: document.tags.map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
        color: item.tag.color,
      })),
    };
  }
}

