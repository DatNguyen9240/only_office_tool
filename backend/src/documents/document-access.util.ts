import { Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AuditService } from "../audit/audit.service";

export class DocumentAccessUtil {
  static permissionWhere(user: AuthenticatedUser): Prisma.DocumentPermissionWhereInput {
    return {
      OR: [{ userId: user.id }, { email: user.email }],
    };
  }

  static accessWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    if (user.role === "ADMINISTRATOR") return {};
    return {
      OR: [
        { ownerId: user.id },
        { permissions: { some: this.permissionWhere(user) } },
      ],
    };
  }

  static ownerWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    return user.role === "ADMINISTRATOR" ? {} : { ownerId: user.id };
  }

  static recordAudit(
    auditService: AuditService | undefined,
    logger: Logger,
    actorId: string,
    action: string,
    resourceId: string,
    name: string,
  ): Promise<void> {
    if (!auditService) return Promise.resolve();
    return Promise.resolve(
      auditService.record({
        actorId,
        action,
        resourceType: "DOCUMENT",
        resourceId,
        metadata: { name },
      }),
    ).catch((err) => {
      logger.error(
        `[Audit Log Error] Action: ${action}, Resource: ${resourceId}`,
        err,
      );
    });
  }
}
