import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus, type UserRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshPrincipal,
  RefreshTokenPayload,
} from "./auth.types";
import { LoginDto } from "./dto/login.dto";

interface TokenUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
    config: ConfigService,
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

  async login(input: LoginDto) {
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
      throw new UnauthorizedException("Email or password is incorrect");
    }

    return this.createSession(user);
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

  async logout(principal: RefreshPrincipal) {
    await this.prisma.refreshSession.updateMany({
      where: {
        id: principal.sessionId,
        userId: principal.userId,
        tokenHash: this.hashToken(principal.token),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return { status: "logged_out" as const };
  }

  me(user: AuthenticatedUser) {
    return user;
  }

  async setPassword(userId: string, password: string) {
    const passwordHash = await hash(password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  private async createSession(user: TokenUser) {
    const sessionId = randomUUID();
    const tokens = await this.signTokens(user, sessionId);
    await this.prisma.$transaction([
      this.prisma.refreshSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          tokenHash: this.hashToken(tokens.refreshToken),
          expiresAt: tokens.refreshExpiresAt,
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
