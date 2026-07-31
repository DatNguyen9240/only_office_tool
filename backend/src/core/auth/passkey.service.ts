import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserStatus } from "@prisma/client";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../database/prisma/prisma.service";
import type { AuthenticatedUser } from "./auth.types";
import { AuthService } from "./auth.service";
import type {
  PasskeyAuthenticationOptionsDto,
  PasskeyAuthenticationVerifyDto,
  PasskeyRegistrationOptionsDto,
  PasskeyRegistrationVerifyDto,
} from "./dto/passkey.dto";

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class PasskeyService {
  private readonly origin: string;
  private readonly rpId: string;
  private readonly rpName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.origin = config
      .get<string>("WEBAUTHN_ORIGIN", config.get<string>("WEB_APP_URL", "http://localhost:5173"))
      .replace(/\/$/, "");
    this.rpId =
      config.get<string>("WEBAUTHN_RP_ID") ?? new URL(this.origin).hostname;
    this.rpName = config.get<string>("WEBAUTHN_RP_NAME", "Meridian DMS");
  }

  async registrationOptions(
    principal: AuthenticatedUser,
    input: PasskeyRegistrationOptionsDto,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: principal.id },
      select: {
        id: true,
        email: true,
        name: true,
        passkeys: { select: { id: true, transports: true } },
      },
    });
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: "none",
      excludeCredentials: user.passkeys.map((passkey) => ({
        id: passkey.id,
        transports: passkey.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
    });
    const challenge = await this.createChallenge(
      user.id,
      "registration",
      options.challenge,
    );
    return {
      challengeId: challenge.id,
      options,
      suggestedName: input.name?.trim() || undefined,
    };
  }

  async verifyRegistration(
    principal: AuthenticatedUser,
    input: PasskeyRegistrationVerifyDto,
    context: RequestContext = {},
  ) {
    const challenge = await this.prisma.webAuthnChallenge.findFirst({
      where: {
        id: input.challengeId,
        userId: principal.id,
        type: "registration",
        expiresAt: { gt: new Date() },
      },
    });
    if (!challenge) {
      throw new BadRequestException("Passkey challenge is invalid or expired");
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: input.response as unknown as RegistrationResponseJSON,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        requireUserVerification: true,
      });
    } catch {
      throw new BadRequestException("Passkey registration could not be verified");
    }
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException("Passkey registration could not be verified");
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;
    await this.prisma.$transaction([
      this.prisma.passkeyCredential.create({
        data: {
          id: credential.id,
          userId: principal.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: credential.transports ?? [],
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          name: input.name?.trim() || null,
        },
      }),
      this.prisma.webAuthnChallenge.delete({ where: { id: challenge.id } }),
    ]);
    await this.audit.record({
      actorId: principal.id,
      action: "PASSKEY_REGISTER",
      resourceType: "AUTH_CREDENTIAL",
      resourceId: credential.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });
    return { id: credential.id, status: "registered" as const };
  }

  async authenticationOptions(input: PasskeyAuthenticationOptionsDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      select: {
        id: true,
        status: true,
        passkeys: { select: { id: true, transports: true } },
      },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      user.passkeys.length === 0
    ) {
      throw new UnauthorizedException("No passkey is available for this account");
    }
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials: user.passkeys.map((passkey) => ({
        id: passkey.id,
        transports: passkey.transports as AuthenticatorTransportFuture[],
      })),
      userVerification: "required",
    });
    const challenge = await this.createChallenge(
      user.id,
      "authentication",
      options.challenge,
    );
    return { challengeId: challenge.id, options };
  }

  async verifyAuthentication(
    input: PasskeyAuthenticationVerifyDto,
    context: RequestContext = {},
  ) {
    const challenge = await this.prisma.webAuthnChallenge.findFirst({
      where: {
        id: input.challengeId,
        type: "authentication",
        expiresAt: { gt: new Date() },
        userId: { not: null },
      },
    });
    const credentialId =
      typeof input.response.id === "string" ? input.response.id : undefined;
    if (!challenge?.userId || !credentialId) {
      throw new UnauthorizedException("Passkey challenge is invalid or expired");
    }
    const passkey = await this.prisma.passkeyCredential.findFirst({
      where: { id: credentialId, userId: challenge.userId },
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
    if (!passkey || passkey.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Passkey is not recognized");
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: input.response as unknown as AuthenticationResponseJSON,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        credential: {
          id: passkey.id,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: Number(passkey.counter),
          transports:
            passkey.transports as AuthenticatorTransportFuture[],
        },
        requireUserVerification: true,
      });
    } catch {
      throw new UnauthorizedException("Passkey verification failed");
    }
    if (!verification.verified) {
      throw new UnauthorizedException("Passkey verification failed");
    }

    await this.prisma.$transaction([
      this.prisma.passkeyCredential.update({
        where: { id: passkey.id },
        data: {
          counter: BigInt(verification.authenticationInfo.newCounter),
          lastUsedAt: new Date(),
        },
      }),
      this.prisma.webAuthnChallenge.delete({ where: { id: challenge.id } }),
    ]);
    const response = await this.auth.createPasskeySession(passkey.user, context);
    await this.audit.record({
      actorId: passkey.user.id,
      action: "PASSKEY_LOGIN",
      resourceType: "AUTH_SESSION",
      resourceId: passkey.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });
    return response;
  }

  async list(principal: AuthenticatedUser) {
    const passkeys = await this.prisma.passkeyCredential.findMany({
      where: { userId: principal.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    return passkeys.map((passkey) => ({
      ...passkey,
      createdAt: passkey.createdAt.toISOString(),
      lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
    }));
  }

  async remove(principal: AuthenticatedUser, credentialId: string) {
    const result = await this.prisma.passkeyCredential.deleteMany({
      where: { id: credentialId, userId: principal.id },
    });
    if (result.count !== 1) throw new BadRequestException("Passkey not found");
    await this.audit.record({
      actorId: principal.id,
      action: "PASSKEY_DELETE",
      resourceType: "AUTH_CREDENTIAL",
      resourceId: credentialId,
    });
    return { id: credentialId, status: "deleted" as const };
  }

  private async createChallenge(
    userId: string,
    type: "registration" | "authentication",
    challenge: string,
  ) {
    await this.prisma.webAuthnChallenge.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: new Date() } },
          { userId, type },
        ],
      },
    });
    return this.prisma.webAuthnChallenge.create({
      data: {
        userId,
        type,
        challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
  }
}
