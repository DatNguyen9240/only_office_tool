import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  resourceType?: string;
  resourceId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, unreadOnly = false, limit = 50) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
    });
    const unreadCount = await this.prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });
    return {
      items: notifications.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        readAt: item.readAt?.toISOString() ?? null,
      })),
      unreadCount,
    };
  }

  create(input: CreateNotificationInput) {
    return this.prisma.notification.create({ data: input });
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return;
    await this.prisma.notification.createMany({
      data: inputs,
    });
  }

  async markRead(user: AuthenticatedUser, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    if (result.count !== 1) throw new NotFoundException("Notification not found");
    return { id, status: "read" as const };
  }

  async markAllRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { status: "read" as const, count: result.count };
  }
}
