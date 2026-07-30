import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth.types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    if (!request.user || !request.user.id) {
      throw new UnauthorizedException(
        "User context is missing or invalid",
      );
    }
    return request.user;
  },
);
