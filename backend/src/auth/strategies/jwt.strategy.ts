import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserStatus } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  AccessTokenPayload,
  AuthenticatedUser,
} from "../auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid access token");
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, status: UserStatus.ACTIVE },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new UnauthorizedException("Account is not active");
    return user;
  }
}
