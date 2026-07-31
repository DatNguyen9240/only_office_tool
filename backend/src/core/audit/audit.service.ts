import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";

export interface AuditEvent {
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome?: "SUCCESS" | "DENIED" | "FAILED";
  ip?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: event.actorId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          outcome: event.outcome ?? "SUCCESS",
          ip: event.ip,
          userAgent: event.userAgent,
          metadata: event.metadata,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit log for action [${event.action}]:`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
