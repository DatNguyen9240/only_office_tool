import type { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  type: "refresh";
}

export interface RefreshPrincipal {
  userId: string;
  sessionId: string;
  token: string;
}
