import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  AuthenticatedUser,
  RefreshPrincipal,
} from "../auth.types";

type RequestPrincipal = AuthenticatedUser | RefreshPrincipal;

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestPrincipal => {
    const request = context.switchToHttp().getRequest<{
      user?: RequestPrincipal;
    }>();
    const principalId =
      request.user && "id" in request.user
        ? request.user.id
        : request.user?.userId;
    if (!request.user || !principalId) {
      throw new UnauthorizedException(
        "User context is missing or invalid",
      );
    }
    return request.user;
  },
);
