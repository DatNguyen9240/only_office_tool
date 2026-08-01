import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentStatus, ScanStatus } from "@prisma/client";
import { Queue, Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { PrismaService } from "../../database/prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { MalwareScannerService } from "./malware-scanner.service";
import { ContentExtractionService } from "../indexing/content-extraction.service";
import { ElasticsearchService } from "../indexing/elasticsearch.service";
import { DOCUMENT_MIME_TYPES } from "../../common/constants/mime-types.constant";
import { WebhooksService } from "../webhooks/webhooks.service";
import { MailService } from "../mail/mail.service";

type OperationJob =
  | { type: "malware-scan"; versionId: string }
  | { type: "cleanup" }
  | { type: "webhook-deliver"; deliveryId: string }
  | { type: "email-send"; to: string; subject: string; text: string; html: string };

@Injectable()
export class OperationsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(OperationsService.name);
  private queue?: Queue<OperationJob>;
  private worker?: Worker<OperationJob>;
  private redis?: Redis;
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(MalwareScannerService) private readonly scanner: MalwareScannerService,
    @Inject(ContentExtractionService)
    private readonly extraction: ContentExtractionService,
    @Inject(ElasticsearchService)
    private readonly elasticsearch: ElasticsearchService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(forwardRef(() => WebhooksService))
    private readonly webhooks: WebhooksService,
    @Inject(forwardRef(() => MailService))
    private readonly mail: MailService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>("REDIS_URL");
    if (redisUrl && process.env.NODE_ENV !== "test") {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
      this.queue = new Queue<OperationJob>("meridian-operations", {
        connection: this.redis,
      });
      this.worker = new Worker<OperationJob>(
        "meridian-operations",
        (job: Job<OperationJob>) => this.process(job),
        { connection: this.redis.duplicate(), concurrency: 2 },
      );
      this.worker.on("failed", (job: Job<OperationJob> | undefined, error: Error) => {
        this.logger.error(`Job ${job?.id ?? "unknown"} failed`, error.stack);
      });
    } else {
      this.logger.warn("REDIS_URL is not configured; jobs run in-process");
    }
    this.timer = setInterval(() => void this.enqueueCleanup(), 60 * 60 * 1000);
    this.timer.unref();
  }

  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
    await this.redis?.quit();
  }

  async enqueueMalwareScan(versionId: string) {
    const payload: OperationJob = { type: "malware-scan", versionId };
    if (this.queue) {
      await this.queue.add("malware-scan", payload, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      });
      return;
    }
    setImmediate(() => void this.processPayload(payload));
  }

  async enqueueCleanup() {
    const payload: OperationJob = { type: "cleanup" };
    if (this.queue) {
      await this.queue.add("cleanup", payload, {
        jobId: `cleanup-${new Date().toISOString().slice(0, 13)}`,
        removeOnComplete: 48,
        removeOnFail: 48,
      });
      return;
    }
    await this.processPayload(payload);
  }

  async enqueueWebhookDeliver(deliveryId: string) {
    const payload: OperationJob = { type: "webhook-deliver", deliveryId };
    if (this.queue) {
      await this.queue.add("webhook-deliver", payload, {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      });
      return;
    }
    setImmediate(() => void this.processPayload(payload));
  }

  async enqueueEmailSend(to: string, subject: string, text: string, html: string) {
    const payload: OperationJob = { type: "email-send", to, subject, text, html };
    if (this.queue) {
      await this.queue.add("email-send", payload, {
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      });
      return;
    }
    setImmediate(() => void this.processPayload(payload));
  }

  async cleanupNow() {
    const [trash, uploads, security] = await Promise.all([
      this.cleanupTrash(),
      this.cleanupUploads(),
      this.cleanupSecurityRecords(),
    ]);
    return { trash, uploads, security };
  }

  private process(job: Job<OperationJob>) {
    return this.processPayload(job.data);
  }

  private async processPayload(job: OperationJob) {
    switch (job.type) {
      case "malware-scan":
        return this.scanVersion(job.versionId);
      case "cleanup":
        return this.cleanupNow();
      case "webhook-deliver":
        return this.webhooks.deliverDirectly(job.deliveryId);
      case "email-send":
        return this.mail.sendMailDirect(job.to, job.subject, job.text, job.html);
      default:
        throw new Error("Unknown job type");
    }
  }

  private async scanVersion(versionId: string) {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        documentId: true,
        objectKey: true,
        document: { select: { type: true, name: true } },
      },
    });
    if (!version) return;
    try {
      const buffer = await this.storage.getObjectBuffer(version.objectKey);
      const result = await this.scanner.scan(buffer);
      const scanStatus = ScanStatus[result.status];
      await this.prisma.$transaction([
        this.prisma.documentVersion.update({
          where: { id: version.id },
          data: {
            scanStatus,
            scanMessage: result.message.slice(0, 1000),
            scannedAt: new Date(),
          },
        }),
        this.prisma.document.update({
          where: { id: version.documentId },
          data: {
            status:
              result.status === "CLEAN"
                ? DocumentStatus.READY
                : result.status === "INFECTED"
                  ? DocumentStatus.LOCKED
                  : DocumentStatus.REVIEW,
          },
        }),
      ]);
      if (result.status === "CLEAN") {
        const contentType =
          DOCUMENT_MIME_TYPES[version.document.type] ??
          "application/octet-stream";
        const extracted = await this.extraction.extract(buffer, contentType);
        await this.prisma.documentVersion.update({
          where: { id: version.id },
          data: {
            textContent:
              extracted || `${version.document.name}\n${version.document.type}`,
          },
        });
        await this.elasticsearch.indexDocument(version.documentId);
      }
    } catch (error) {
      await this.prisma.documentVersion.update({
        where: { id: version.id },
        data: {
          scanStatus: ScanStatus.FAILED,
          scanMessage: (error instanceof Error ? error.message : String(error)).slice(
            0,
            1000,
          ),
          scannedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async cleanupTrash() {
    const cutoff = new Date(
      Date.now() -
        this.config.get<number>("TRASH_RETENTION_DAYS", 30) *
          24 *
          60 *
          60 *
          1000,
    );
    const documents = await this.prisma.document.findMany({
      where: { deletedAt: { lte: cutoff } },
      select: {
        id: true,
        versions: { select: { objectKey: true } },
      },
      take: 250,
    });
    let count = 0;
    for (const document of documents) {
      await this.storage.deleteObjects(
        document.versions.map((version) => version.objectKey),
      );
      await this.prisma.document.delete({ where: { id: document.id } });
      count += 1;
    }
    return { count };
  }

  private async cleanupUploads() {
    const intents = await this.prisma.uploadIntent.findMany({
      where: { completedAt: null, expiresAt: { lte: new Date() } },
      select: { id: true, documentId: true, objectKey: true },
      take: 250,
    });
    let count = 0;
    for (const intent of intents) {
      try {
        await this.storage.deleteObjects([intent.objectKey]);
      } catch {
        // The client may never have uploaded the object.
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.uploadIntent.delete({ where: { id: intent.id } });
        const versions = await tx.documentVersion.count({
          where: { documentId: intent.documentId },
        });
        if (versions === 0) {
          await tx.document.deleteMany({ where: { id: intent.documentId } });
        }
      });
      count += 1;
    }
    return { count };
  }

  private async cleanupSecurityRecords() {
    const now = new Date();
    const [challenges, resetTokens, sessions] = await this.prisma.$transaction([
      this.prisma.webAuthnChallenge.deleteMany({
        where: { expiresAt: { lte: now } },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: now } },
            { usedAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
      this.prisma.refreshSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: now } },
            {
              revokedAt: {
                lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      }),
    ]);
    return {
      challenges: challenges.count,
      resetTokens: resetTokens.count,
      sessions: sessions.count,
    };
  }
}
