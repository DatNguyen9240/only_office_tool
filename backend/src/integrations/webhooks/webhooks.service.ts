import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHmac, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { PrismaService } from "../../database/prisma/prisma.service";
import { CreateWebhookDto } from "./dto/webhook.dto";

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthenticatedUser) {
    return this.prisma.webhookSubscription.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  create(input: CreateWebhookDto, user: AuthenticatedUser) {
    return this.prisma.webhookSubscription.create({
      data: {
        ownerId: user.id,
        url: input.url,
        secret: input.secret || randomBytes(24).toString("hex"),
        events: [...new Set(input.events)],
      },
      select: { id: true, url: true, events: true, active: true, createdAt: true },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const result = await this.prisma.webhookSubscription.deleteMany({
      where: { id, ownerId: user.id },
    });
    if (result.count !== 1) throw new NotFoundException("Webhook not found");
    return { id, status: "deleted" as const };
  }

  async emit(event: string, payload: Record<string, unknown>) {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { active: true, events: { has: event } },
      select: { id: true, url: true, secret: true },
    });
    for (const subscription of subscriptions) {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          subscriptionId: subscription.id,
          event,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      void this.deliver(delivery.id);
    }
  }

  async retry(id: string, user: AuthenticatedUser) {
    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: { id, subscription: { ownerId: user.id } },
      select: { id: true },
    });
    if (!delivery) throw new NotFoundException("Webhook delivery not found");
    await this.deliver(id);
    return { id, status: "queued" as const };
  }

  private async deliver(id: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id },
      include: {
        subscription: { select: { url: true, secret: true, active: true } },
      },
    });
    if (!delivery || !delivery.subscription.active || delivery.deliveredAt) return;
    const body = JSON.stringify({
      id: delivery.id,
      event: delivery.event,
      payload: delivery.payload,
      createdAt: delivery.createdAt.toISOString(),
    });
    const signature = createHmac("sha256", delivery.subscription.secret)
      .update(body)
      .digest("hex");
    try {
      const response = await fetch(delivery.subscription.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Meridian-Event": delivery.event,
          "X-Meridian-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
      await this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          statusCode: response.status,
          attempts: { increment: 1 },
          deliveredAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      const attempts = delivery.attempts + 1;
      await this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          attempts,
          lastError: (error instanceof Error ? error.message : String(error)).slice(
            0,
            500,
          ),
          nextAttemptAt: new Date(
            Date.now() + Math.min(60 * 60 * 1000, 2 ** attempts * 1000),
          ),
        },
      });
    }
  }
}
