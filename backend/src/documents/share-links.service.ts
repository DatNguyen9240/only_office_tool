import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PermissionRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { DocumentAccessService } from "./document-access.service";
import {
  CreateShareLinkDto,
  ShareLinkAccessDto,
} from "./dto/share-link.dto";

@Injectable()
export class ShareLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly accessService: DocumentAccessService,
    private readonly config: ConfigService,
  ) {}

  async create(
    documentId: string,
    input: CreateShareLinkDto,
    user: AuthenticatedUser,
  ) {
    const document = await this.ensureOwned(documentId, user);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) {
      throw new ForbiddenException("Share link expiry must be in the future");
    }
    const link = await this.prisma.shareLink.create({
      data: {
        documentId,
        tokenHash: this.hashToken(token),
        passwordHash: input.password ? await hash(input.password, 12) : null,
        permission: (input.permission ?? "VIEWER") as PermissionRole,
        expiresAt,
        createdById: user.id,
      },
    });
    return this.publicLink(link, token, document.name);
  }

  async list(documentId: string, user: AuthenticatedUser) {
    await this.ensureOwned(documentId, user);
    const links = await this.prisma.shareLink.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
    });
    return links.map((link) => this.publicLink(link));
  }

  async revoke(documentId: string, linkId: string, user: AuthenticatedUser) {
    await this.ensureOwned(documentId, user);
    const result = await this.prisma.shareLink.updateMany({
      where: { id: linkId, documentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) throw new NotFoundException("Share link not found");
    return { id: linkId, status: "revoked" as const };
  }

  async resolve(token: string, input: ShareLinkAccessDto) {
    const link = await this.prisma.shareLink.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        document: {
          include: {
            owner: { select: { name: true } },
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              select: { objectKey: true, sizeBytes: true },
            },
          },
        },
      },
    });
    if (
      !link ||
      link.revokedAt ||
      (link.expiresAt && link.expiresAt <= new Date()) ||
      link.document.deletedAt
    ) {
      throw new NotFoundException("Share link is unavailable");
    }
    if (link.passwordHash) {
      if (!input.password || !(await compare(input.password, link.passwordHash))) {
        throw new UnauthorizedException("Share link password is incorrect");
      }
    }
    const version = link.document.versions[0];
    if (!version) throw new NotFoundException("Document has no uploaded version");
    return {
      document: {
        id: link.document.id,
        name: link.document.name,
        type: link.document.type.toLowerCase(),
        owner: link.document.owner.name,
        sizeBytes: Number(version.sizeBytes),
      },
      permission: link.permission,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      ...(await this.storage.createDownloadUrl(version.objectKey)),
    };
  }

  private async ensureOwned(documentId: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, ...this.accessService.ownerWhere(user) },
      select: { id: true, name: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }

  private publicLink(
    link: {
      id: string;
      documentId: string;
      permission: PermissionRole;
      expiresAt: Date | null;
      revokedAt: Date | null;
    },
    token?: string,
    documentName?: string,
  ) {
    const baseUrl = this.config.get<string>("WEB_APP_URL", "");
    return {
      id: link.id,
      documentId: link.documentId,
      documentName,
      permission: link.permission,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      revokedAt: link.revokedAt?.toISOString() ?? null,
      ...(token
        ? {
            token,
            url: `${baseUrl.replace(/\/$/, "")}/share/${token}`,
          }
        : {}),
    };
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
