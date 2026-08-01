import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  type CanActivate,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthGuard } from "@nestjs/passport";
import type { UserRole } from "@prisma/client";
import type { AuthenticatedUser } from "../core/auth/auth.types";
import { ROLES_KEY } from "../core/auth/decorators/roles.decorator";
import type { GraphqlContext } from "./graphql.context";

@Injectable()
export class GqlJwtAuthGuard extends AuthGuard("jwt") {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext<GraphqlContext>().req;
  }
}

@Injectable()
export class GqlRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const request = GqlExecutionContext.create(context)
      .getContext<GraphqlContext>().req;
    return Boolean(request.user && roles.includes(request.user.role));
  }
}

export const GqlCurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = GqlExecutionContext.create(context)
      .getContext<GraphqlContext>().req.user;
    if (!user?.id) throw new UnauthorizedException("User context is missing");
    return user;
  },
);
