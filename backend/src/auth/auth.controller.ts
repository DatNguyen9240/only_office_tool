import {
  Body,
  Controller,
  Get,
  Post,
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
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  refresh(@CurrentUser() principal: RefreshPrincipal) {
    return this.auth.refresh(principal);
  }

  @UseGuards(JwtRefreshGuard)
  @Post("logout")
  logout(@CurrentUser() principal: RefreshPrincipal) {
    return this.auth.logout(principal);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user);
  }
}
