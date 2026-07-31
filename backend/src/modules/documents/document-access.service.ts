import { Injectable, Logger, Optional } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { DocumentAuditListener } from "./listeners/document-audit.listener";
import { DocumentAuditEvent } from "./events/document-audit.event";

export enum AuditAction {
  DOCUMENT_VIEWED = "DOCUMENT_VIEWED",
  DOCUMENT_STARRED = "DOCUMENT_STARRED",
  DOCUMENT_UNSTARRED = "DOCUMENT_UNSTARRED",
  DOCUMENT_DELETED = "DOCUMENT_DELETED",
  DOCUMENT_RESTORED = "DOCUMENT_RESTORED",
  DOCUMENT_PERMANENTLY_DELETED = "DOCUMENT_PERMANENTLY_DELETED",
  PERMISSION_GRANTED = "PERMISSION_GRANTED",
  PERMISSION_UPDATED = "PERMISSION_UPDATED",
  PERMISSION_REVOKED = "PERMISSION_REVOKED",
  VERSION_RESTORED = "VERSION_RESTORED",
  VERSION_DOWNLOADED = "VERSION_DOWNLOADED",
}

@Injectable()
export class DocumentAccessService {
  private readonly logger = new Logger(DocumentAccessService.name);

  constructor(
    @Optional() private readonly auditListener?: DocumentAuditListener,
  ) {}

  permissionWhere(user: AuthenticatedUser): Prisma.DocumentPermissionWhereInput {
    return {
      OR: [
        { userId: user.id },
        { email: user.email },
        { group: { members: { some: { userId: user.id } } } },
      ],
    };
  }

  accessWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    if (user?.role === "ADMINISTRATOR") return {};
    return {
      OR: [
        { ownerId: user.id },
        { permissions: { some: this.permissionWhere(user) } },
        {
          folder: {
            permissions: {
              some: {
                OR: [
                  { userId: user.id },
                  { email: user.email },
                  { group: { members: { some: { userId: user.id } } } },
                ],
              },
            },
          },
        },
      ],
    };
  }

  ownerWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    return user?.role === "ADMINISTRATOR" ? {} : { ownerId: user.id };
  }

  recordAuditAsync(
    actorId: string,
    action: AuditAction | string,
    resourceId: string,
    name: string,
  ): void {
    if (!this.auditListener) return;
    try {
      this.auditListener.emit(
        new DocumentAuditEvent(actorId, action, resourceId, name),
      );
    } catch (err) {
      this.logger.error(
        `[Non-blocking Audit Event Failed] Action: ${action}, Resource: ${resourceId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
