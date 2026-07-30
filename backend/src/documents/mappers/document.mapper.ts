import { PermissionRole, Prisma } from "@prisma/client";
import type {
  DocumentItem,
  DocumentStatus as PublicDocumentStatus,
  DocumentType as PublicDocumentType,
} from "@share";
import { formatBytes } from "../document-versions.service";
import { DocumentAccessService } from "../document-access.service";
import { DocumentPermissionsService } from "../document-permissions.service";
import type { AuthenticatedUser } from "../../auth/auth.types";

const publicType = (value: string): PublicDocumentType =>
  value.toLowerCase() as PublicDocumentType;

const publicStatus = (value: string): PublicDocumentStatus =>
  value.toLowerCase() as PublicDocumentStatus;

export class DocumentMapper {
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
      _count: { select: { permissions: true } },
    } satisfies Prisma.DocumentInclude;
  }

  static toPublicItem(
    document: Prisma.DocumentGetPayload<{
      include: ReturnType<typeof DocumentMapper.publicInclude>;
    }>,
    userId: string,
    permissionsService: DocumentPermissionsService,
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
      ...(document.starred ? { starred: true } : {}),
      ...(document.deletedAt
        ? { deletedAt: document.deletedAt.toISOString() }
        : {}),
      ...(permission
        ? { permission: permissionsService.toPublicPermission(permission) }
        : {}),
    };
  }
}
