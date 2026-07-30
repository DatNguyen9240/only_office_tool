import { Injectable, ServiceUnavailableException } from "@nestjs/common";
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

@Injectable()
export class StorageService {
  private readonly internalClient: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;
  private readonly expiresIn: number;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>("S3_ENDPOINT");
    const region = this.config.get<string>("S3_REGION", "us-east-1");
    const accessKeyId = this.config.get<string>("S3_ACCESS_KEY");
    const secretAccessKey = this.config.get<string>("S3_SECRET_KEY");

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
    const url = await getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: this.expiresIn },
    );
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

  private ensureConfigured() {
    if (!this.configured()) {
      throw new ServiceUnavailableException("Object storage is not configured");
    }
  }
}
