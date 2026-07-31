import {
  BadRequestException,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus, type UserRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshPrincipal,
  RefreshTokenPayload,
} from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from "./dto/account.dto";
import { MailService } from "../../integrations/mail/mail.service";

interface TokenUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    config: ConfigService,
    @Optional() private readonly mail?: MailService,
  ) {
    this.accessSecret = config.getOrThrow<string>("JWT_ACCESS_SECRET");
    this.refreshSecret = config.getOrThrow<string>("JWT_REFRESH_SECRET");
    this.accessTtlSeconds = this.readTtl(
      config.get<string>("JWT_ACCESS_TTL_SECONDS"),
      900,
    );
    this.refreshTtlSeconds = this.readTtl(
      config.get<string>("JWT_REFRESH_TTL_SECONDS"),
      2_592_000,
    );
  }

  async login(input: LoginDto, context: RequestContext = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });

    const validPassword =
      user?.passwordHash && (await compare(input.password, user.passwordHash));
    if (!user || !validPassword || user.status !== UserStatus.ACTIVE) {
      await this.audit.record({
        actorId: user?.id,
        action: "LOGIN",
        resourceType: "AUTH_SESSION",
        outcome: "DENIED",
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { email: input.email.trim().toLowerCase() },
      });
      throw new UnauthorizedException("Email or password is incorrect");
    }

    const response = await this.createSession(user, context);
    await this.audit.record({
      actorId: user.id,
      action: "LOGIN",
      resourceType: "AUTH_SESSION",
      resourceId: user.id,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { name: user.name },
    });
    return response;
  }

  async refresh(principal: RefreshPrincipal) {
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: principal.sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });

    const currentTokenHash = this.hashToken(principal.token);
    if (
      !session ||
      session.userId !== principal.userId ||
      session.tokenHash !== currentTokenHash ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException("Refresh session is invalid");
    }

    const tokens = await this.signTokens(session.user, session.id);
    const updated = await this.prisma.refreshSession.updateMany({
      where: {
        id: session.id,
        userId: session.userId,
        tokenHash: currentTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        tokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: tokens.refreshExpiresAt,
        lastUsedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw new UnauthorizedException("Refresh token has already been used");
    }

    await this.prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveAt: new Date() },
    });
    return this.response(session.user, tokens);
  }

  async logout(principal: RefreshPrincipal, context: RequestContext = {}) {
    await this.prisma.refreshSession.updateMany({
      where: {
        id: principal.sessionId,
        userId: principal.userId,
        tokenHash: this.hashToken(principal.token),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      actorId: principal.userId,
      action: "LOGOUT",
      resourceType: "AUTH_SESSION",
      resourceId: principal.sessionId,
      ip: context.ip,
      userAgent: context.userAgent,
    });
    return { status: "logged_out" as const };
  }

  me(user: AuthenticatedUser) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
      },
    });
  }

  async updateProfile(user: AuthenticatedUser, input: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name.trim(),
        department:
          input.department === undefined
            ? undefined
            : input.department.trim() || null,
      },
      select: { id: true, email: true, name: true, role: true, department: true },
    });
  }

  async changePassword(user: AuthenticatedUser, input: ChangePasswordDto) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (
      !account?.passwordHash ||
      !(await compare(input.currentPassword, account.passwordHash))
    ) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hash(input.newPassword, 12) },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { status: "password_changed" as const };
  }

  async listSessions(user: AuthenticatedUser) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return sessions.map((session) => ({
      ...session,
      lastUsedAt: session.lastUsedAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    }));
  }

  async revokeSession(user: AuthenticatedUser, sessionId: string) {
    const result = await this.prisma.refreshSession.updateMany({
      where: { id: sessionId, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) throw new BadRequestException("Session not found");
    return { id: sessionId, status: "revoked" as const };
  }

  async forgotPassword(input: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      select: { id: true },
    });
    if (!user) return { status: "accepted" as const };
    const token = randomBytes(32).toString("base64url");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:5173";
    await this.mail?.sendPasswordReset(
      input.email.trim().toLowerCase(),
      `${webAppUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`,
    );
    return {
      status: "accepted" as const,
      ...(process.env.NODE_ENV === "production" ? {} : { token }),
    };
  }

  async resetPassword(input: ResetPasswordDto) {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(input.token) },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException("Password reset token is invalid or expired");
    }
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash: await hash(input.password, 12) },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { status: "password_reset" as const };
  }

  async setPassword(userId: string, password: string) {
    const passwordHash = await hash(password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  createPasskeySession(user: TokenUser, context: RequestContext = {}) {
    return this.createSession(user, context);
  }

  private async createSession(user: TokenUser, context: RequestContext = {}) {
    const sessionId = randomUUID();
    const tokens = await this.signTokens(user, sessionId);
    await this.prisma.$transaction([
      this.prisma.refreshSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          tokenHash: this.hashToken(tokens.refreshToken),
          expiresAt: tokens.refreshExpiresAt,
          ip: context.ip,
          userAgent: context.userAgent,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      }),
    ]);
    return this.response(user, tokens);
  }

  private async signTokens(user: TokenUser, sessionId: string) {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      jti: randomUUID(),
      type: "refresh",
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessTtlSeconds,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtlSeconds,
      }),
    ]);
    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
    };
  }

  private response(
    user: TokenUser,
    tokens: Awaited<ReturnType<AuthService["signTokens"]>>,
  ) {
    return {
      tokenType: "Bearer" as const,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.accessTtlSeconds,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private readTtl(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
