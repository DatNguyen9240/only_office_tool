import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageCapacity {
  totalBytes: number;
  freeBytes: number;
  source: "minio_metrics_v3" | "minio_metrics_v2";
  measuredAt: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly internalClient: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;
  private readonly expiresIn: number;
  private capacityCache?: {
    expiresAt: number;
    value: StorageCapacity | null;
  };

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>("S3_ENDPOINT");
    const region = this.config.get<string>("S3_REGION", "us-east-1");
    const accessKeyId = this.config.get<string>("S3_ACCESS_KEY");
    const secretAccessKey = this.config.get<string>("S3_SECRET_KEY");

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        "S3_ACCESS_KEY or S3_SECRET_KEY is missing in environment. Storage operations may fail.",
      );
    }

    this.bucket = this.config.get<string>(
      "S3_BUCKET",
      "meridian-documents",
    );
    this.expiresIn = Math.min(
      Math.max(
        this.config.get<number>("S3_URL_TTL_SECONDS", 900),
        60,
      ),
      3600,
    );
    const forcePathStyle =
      this.config.get<string>("S3_FORCE_PATH_STYLE", "true") === "true";
    const credentials =
      accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {};
    const createClient = (clientEndpoint?: string) =>
      new S3Client({
        region,
        endpoint: clientEndpoint,
        forcePathStyle,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        ...credentials,
      });

    this.internalClient = createClient(endpoint);
    this.publicClient = createClient(
      this.config.get<string>("S3_PUBLIC_ENDPOINT") || endpoint,
    );
  }

  async createUploadUrl(
    objectKey: string,
    contentType: string,
  ): Promise<{ url: string; expiresIn: number; headers: Record<string, string> }> {
    this.ensureConfigured();
    const url = await getSignedUrl(
      this.publicClient,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: contentType,
      }),
      { expiresIn: this.expiresIn },
    );
    return {
      url,
      expiresIn: this.expiresIn,
      headers: { "Content-Type": contentType },
    };
  }

  async createDownloadUrl(objectKey: string) {
    this.ensureConfigured();
    const rawUrl = await getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: this.expiresIn },
    );
    const url = rawUrl.replace(/&x-amz-checksum-mode=[^&]*/, "");
    return { url, expiresIn: this.expiresIn };
  }

  async headObject(objectKey: string) {
    this.ensureConfigured();
    return this.internalClient.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  async health(): Promise<"up" | "down" | "not_configured"> {
    if (!this.configured()) return "not_configured";
    try {
      await this.internalClient.send(
        new HeadBucketCommand({ Bucket: this.bucket }),
      );
      return "up";
    } catch {
      return "down";
    }
  }

  async capacity(): Promise<StorageCapacity | null> {
    const now = Date.now();
    if (this.capacityCache && this.capacityCache.expiresAt > now) {
      return this.capacityCache.value;
    }

    const baseUrl =
      this.config.get<string>("MINIO_METRICS_URL") ||
      this.config.get<string>("S3_ENDPOINT");
    if (!baseUrl) return null;

    const token = this.config.get<string>("MINIO_METRICS_TOKEN");
    const headers = new Headers({ Accept: "text/plain" });
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const endpoints = [
      {
        path: "/minio/metrics/v3/cluster/health",
        source: "minio_metrics_v3" as const,
        totalMetric:
          "minio_cluster_health_capacity_usable_total_bytes",
        freeMetric:
          "minio_cluster_health_capacity_usable_free_bytes",
      },
      {
        path: "/minio/v2/metrics/cluster",
        source: "minio_metrics_v2" as const,
        totalMetric: "minio_cluster_capacity_usable_total_bytes",
        freeMetric: "minio_cluster_capacity_usable_free_bytes",
      },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(
          `${baseUrl.replace(/\/$/, "")}${endpoint.path}`,
          {
            headers,
            signal: AbortSignal.timeout(3_000),
          },
        );
        if (!response.ok) continue;
        const body = await response.text();
        const totalBytes = this.metricValue(body, endpoint.totalMetric);
        const freeBytes = this.metricValue(body, endpoint.freeMetric);
        if (
          totalBytes !== null &&
          freeBytes !== null &&
          totalBytes > 0 &&
          freeBytes >= 0
        ) {
          const value: StorageCapacity = {
            totalBytes,
            freeBytes: Math.min(freeBytes, totalBytes),
            source: endpoint.source,
            measuredAt: new Date().toISOString(),
          };
          this.capacityCache = {
            expiresAt: now + 30_000,
            value,
          };
          return value;
        }
      } catch {
        // Try the legacy metrics endpoint, then fall back to configured quota.
      }
    }

    this.capacityCache = {
      expiresAt: now + 10_000,
      value: null,
    };
    return null;
  }

  private configured() {
    return Boolean(
      this.config.get<string>("S3_ENDPOINT") &&
        this.config.get<string>("S3_ACCESS_KEY") &&
        this.config.get<string>("S3_SECRET_KEY"),
    );
  }

  async putObject(objectKey: string, buffer: Buffer, contentType: string) {
    this.ensureConfigured();
    await this.internalClient.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async deleteObjects(objectKeys: string[]) {
    const uniqueKeys = [...new Set(objectKeys)].filter(Boolean);
    if (!uniqueKeys.length) return;
    this.ensureConfigured();
    await this.internalClient.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: uniqueKeys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }

  async getObjectStream(objectKey: string) {
    this.ensureConfigured();
    const response = await this.internalClient.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    return response.Body;
  }

  async getObjectBuffer(objectKey: string, range?: string) {
    this.ensureConfigured();
    const response = await this.internalClient.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ...(range ? { Range: range } : {}),
      }),
    );
    if (!response.Body) {
      throw new ServiceUnavailableException("Object body is unavailable");
    }
    return Buffer.from(await response.Body.transformToByteArray());
  }

  private ensureConfigured() {
    if (!this.configured()) {
      throw new ServiceUnavailableException("Object storage is not configured");
    }
  }

  private metricValue(body: string, metric: string): number | null {
    for (const line of body.split(/\r?\n/)) {
      if (
        !line.startsWith(`${metric} `) &&
        !line.startsWith(`${metric}{`)
      ) {
        continue;
      }
      const value = Number(line.trim().split(/\s+/).at(-1));
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return null;
  }
}
