import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PermissionRole } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { OnlyOfficeCallbackDto } from "./dto/onlyoffice-callback.dto";
import { DOCUMENT_MIME_TYPES } from "../common/constants/mime-types.constant";
import { DocumentAccessUtil } from "./document-access.util";
import { validateFileMagicBytes } from "../common/utils/file-signature.util";
import { DocumentAuditListener } from "./listeners/document-audit.listener";
import { DocumentAuditEvent } from "./events/document-audit.event";
import { getDocumentType } from "./utils/document-type.util";

interface OnlyOfficeTicket {
  type: "onlyoffice-callback";
  documentId: string;
  userId: string;
}

@Injectable()
export class OnlyOfficeService implements OnModuleInit {
  private readonly logger = new Logger(OnlyOfficeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    @Optional() private readonly auditListener?: DocumentAuditListener,
  ) {}

  onModuleInit() {
    this.validateRequiredConfigs([
      "API_PUBLIC_URL",
      "ONLYOFFICE_SERVER_URL",
      "ONLYOFFICE_JWT_SECRET",
    ]);
  }

  private validateRequiredConfigs(keys: string[]): void {
    const missingKeys = keys.filter((key) => {
      const val = this.config.get<string>(key);
      return !val || val.trim() === "";
    });

    if (missingKeys.length > 0) {
      const msg = `[Fail-Fast Fatal Error] Missing required configuration keys: ${missingKeys.join(", ")}`;
      this.logger.error(msg);
      throw new Error(msg);
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value || value.trim() === "") {
      this.logger.error(`[Fail-Fast] Missing required config: ${key}`);
      throw new ServiceUnavailableException(
        `Server configuration error: ${key} is not configured`,
      );
    }
    return value;
  }

  async getEditorConfig(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null, ...DocumentAccessUtil.accessWhere(user) },
      include: {
        permissions: {
          where: DocumentAccessUtil.permissionWhere(user),
          take: 1,
          select: { role: true },
        },
      },
    });

    if (!document) throw new NotFoundException("Document not found");

    const permission =
      document.ownerId === user.id
        ? PermissionRole.OWNER
        : document.permissions[0]?.role;

    const canEdit =
      permission === PermissionRole.OWNER || permission === PermissionRole.EDITOR;
    const documentType = getDocumentType(document.name);
    const fileExt = document.name.split(".").pop()?.toLowerCase() || "docx";

    const apiPublicUrl = this.getRequiredConfig("API_PUBLIC_URL");
    const onlyofficeServerUrl = this.getRequiredConfig("ONLYOFFICE_SERVER_URL");
    const jwtSecret = this.getRequiredConfig("ONLYOFFICE_JWT_SECRET");

    const currentVersion = document.currentVersionId
      ? await this.prisma.documentVersion.findUnique({
          where: { id: document.currentVersionId },
          select: { objectKey: true },
        })
      : await this.prisma.documentVersion.findFirst({
          where: { documentId: document.id },
          orderBy: { version: "desc" },
          select: { objectKey: true },
        });

    if (!currentVersion) {
      throw new NotFoundException("Document has no uploaded version");
    }

    const documentUrl = (
      await this.storage.createDownloadUrl(currentVersion.objectKey)
    ).url;

    const callbackTicket = await this.jwt.signAsync<OnlyOfficeTicket>(
      {
        type: "onlyoffice-callback",
        documentId: document.id,
        userId: user.id,
      },
      { secret: jwtSecret, expiresIn: "24h" },
    );

    const callbackUrl = `${apiPublicUrl.replace(
      /\/$/,
      "",
    )}/documents/${document.id}/onlyoffice-callback?ticket=${encodeURIComponent(
      callbackTicket,
    )}`;

    const configPayload = {
      documentType,
      document: {
        fileType: fileExt,
        key: `${document.id}_${document.updatedAt.getTime()}`,
        title: document.name,
        url: documentUrl,
        permissions: {
          edit: canEdit,
          download: true,
          print: true,
          comment: canEdit,
        },
      },
      editorConfig: {
        mode: canEdit ? "edit" : "view",
        lang: "vi",
        callbackUrl,
        user: {
          id: user.id,
          name: user.name,
        },
        customization: {
          chat: false,
          comments: true,
          zoom: 100,
        },
      },
    };

    const token = this.jwt.sign(configPayload, { secret: jwtSecret });

    return {
      onlyofficeServerUrl,
      config: {
        ...configPayload,
        token,
      },
    };
  }

  async handleOnlyOfficeCallback(
    id: string,
    ticket: string,
    body: OnlyOfficeCallbackDto,
  ) {
    const jwtSecret = this.getRequiredConfig("ONLYOFFICE_JWT_SECRET");

    // 1. Verify Callback Ticket & Extract Principal
    const principal = await this.verifyCallbackTicket(ticket, id, jwtSecret);

    // Status 2: Ready for saving / Status 6: Force save
    if (body.status !== 2 && body.status !== 6) return { error: 0 };
    if (typeof body.url !== "string") {
      throw new BadRequestException("ONLYOFFICE callback URL is missing");
    }

    // 2. Query Document
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, ownerId: true, type: true, version: true },
    });
    if (!document) throw new NotFoundException("Document not found");

    // 3. Verify Trusted Origin
    const sourceUrl = this.validateAndParseUrl(body.url);
    this.verifyTrustedOrigin(sourceUrl);

    // 4. Download and validate buffer streaming
    const maxBytes = this.readPositiveNumber(
      this.config.get<string>("ONLYOFFICE_MAX_DOWNLOAD_BYTES"),
      104_857_600,
    );
    const buffer = await this.downloadAndValidateBuffer(sourceUrl, maxBytes);

    // 5. Magic Bytes Security Verification
    if (!validateFileMagicBytes(buffer, document.type)) {
      this.logger.warn(
        `[Security Alert] File Magic Bytes mismatch for document ${id} (declared type: ${document.type})`,
      );
      throw new BadRequestException(
        "Downloaded file signature does not match declared document format",
      );
    }

    // 6. Object Storage Key Generation & Upload
    const uniqueTag = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const objectKey = `documents/${document.ownerId}/${document.id}/onlyoffice-${uniqueTag}`;

    await this.storage.putObject(
      objectKey,
      buffer,
      DOCUMENT_MIME_TYPES[document.type] ?? "application/octet-stream",
    );

    // 7. Atomic DB Transaction - Increment version & refresh updatedAt to fix ONLYOFFICE Editor Cache Key Collision
    let createdVersion: { id: string; version: number };
    try {
      createdVersion = await this.prisma.$transaction(async (tx) => {
        const updatedDoc = await tx.document.update({
          where: { id },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
          select: { version: true },
        });

        const nextVersion = updatedDoc.version;

        const created = await tx.documentVersion.create({
          data: {
            documentId: id,
            version: nextVersion,
            objectKey,
            sizeBytes: BigInt(buffer.length),
            authorId: principal.userId,
          },
          select: { id: true, version: true },
        });

        await tx.document.update({
          where: { id },
          data: { currentVersionId: created.id },
        });

        return created;
      });
    } catch (dbError) {
      try {
        await this.storage.deleteObjects([objectKey]);
      } catch (storageErr) {
        this.logger.error(
          `[Compensation Rollback Error] Failed to delete orphan storage object ${objectKey}`,
          storageErr,
        );
      }
      throw dbError;
    }

    // 8. Non-blocking Async Audit Log Dispatch (Isolated try-catch to prevent corrupting successful DB transaction)
    if (this.auditListener) {
      try {
        this.auditListener.emit(
          new DocumentAuditEvent(
            principal.userId,
            "DOCUMENT_UPDATED",
            id,
            document.name,
          ),
        );
      } catch (auditErr) {
        this.logger.error(
          `[Audit Log Warning] Non-blocking audit log dispatch failed for document ${id}`,
          auditErr,
        );
      }
    }

    return { error: 0, version: createdVersion.version };
  }

  // --- Helper Methods for SRP & High Testability ---

  private async verifyCallbackTicket(
    ticket: string,
    documentId: string,
    jwtSecret: string,
  ): Promise<OnlyOfficeTicket> {
    if (!ticket) {
      throw new UnauthorizedException("ONLYOFFICE callback ticket is required");
    }

    let principal: OnlyOfficeTicket;
    try {
      principal = await this.jwt.verifyAsync<OnlyOfficeTicket>(ticket, {
        secret: jwtSecret,
      });
    } catch {
      throw new UnauthorizedException("ONLYOFFICE callback ticket is invalid");
    }

    if (
      principal.type !== "onlyoffice-callback" ||
      principal.documentId !== documentId
    ) {
      throw new UnauthorizedException("ONLYOFFICE callback ticket is invalid");
    }

    return principal;
  }

  private validateAndParseUrl(rawUrl: string): URL {
    try {
      return new URL(rawUrl);
    } catch {
      throw new BadRequestException("ONLYOFFICE callback URL is invalid");
    }
  }

  private verifyTrustedOrigin(sourceUrl: URL): void {
    const configuredOnlyOfficeUrl =
      this.config.get<string>("ONLYOFFICE_INTERNAL_URL") ??
      this.config.get<string>("ONLYOFFICE_SERVER_URL");

    if (!configuredOnlyOfficeUrl) {
      throw new ServiceUnavailableException(
        "ONLYOFFICE server is not configured",
      );
    }

    let trustedOrigin: string;
    try {
      trustedOrigin = new URL(configuredOnlyOfficeUrl).origin;
    } catch {
      this.logger.error(
        `[Configuration Error] Invalid ONLYOFFICE server URL: ${configuredOnlyOfficeUrl}`,
      );
      throw new ServiceUnavailableException(
        "ONLYOFFICE server configuration is invalid",
      );
    }

    if (sourceUrl.origin !== trustedOrigin) {
      throw new BadRequestException("ONLYOFFICE callback URL is not trusted");
    }
  }

  private async downloadAndValidateBuffer(
    sourceUrl: URL,
    maxBytes: number,
  ): Promise<Buffer> {
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `ONLYOFFICE returned HTTP ${response.status}`,
      );
    }

    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
      throw new BadRequestException("Edited document exceeds the size limit");
    }

    if (!response.body) {
      throw new BadRequestException("ONLYOFFICE response body is empty");
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new BadRequestException(
            "Edited document exceeds the allowed size limit",
          );
        }
        chunks.push(value);
      }
    }

    const buffer = Buffer.concat(chunks);
    if (!buffer.length) {
      throw new BadRequestException("Edited document has an invalid size");
    }

    return buffer;
  }

  private readPositiveNumber(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
