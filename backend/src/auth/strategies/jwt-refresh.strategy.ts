import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import type {
  RefreshPrincipal,
  RefreshTokenPayload,
} from "../auth.types";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      passReqToCallback: true,
    });
  }

  validate(
    request: Request,
    payload: RefreshTokenPayload,
  ): RefreshPrincipal {
    if (payload.type !== "refresh" || !payload.sid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (!token) throw new UnauthorizedException("Refresh token is required");
    return { userId: payload.sub, sessionId: payload.sid, token };
  }
}
