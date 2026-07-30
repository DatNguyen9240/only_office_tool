import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import type {
  AuthenticatedUser,
  RefreshPrincipal,
} from "./auth.types";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(
    @Body() input: LoginDto,
    @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.auth.login(input, this.requestContext(request));
  }

  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  refresh(@CurrentUser() principal: RefreshPrincipal) {
    return this.auth.refresh(principal);
  }

  @UseGuards(JwtRefreshGuard)
  @Post("logout")
  logout(
    @CurrentUser() principal: RefreshPrincipal,
    @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.auth.logout(principal, this.requestContext(request));
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user);
  }

  private requestContext(request: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  }) {
    const userAgent = request.headers["user-agent"];
    return {
      ip: request.ip,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    };
  }
}
