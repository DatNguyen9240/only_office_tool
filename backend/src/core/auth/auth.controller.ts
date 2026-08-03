import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from "./dto/account.dto";
import {
  PasskeyAuthenticationOptionsDto,
  PasskeyAuthenticationVerifyDto,
  PasskeyRegistrationOptionsDto,
  PasskeyRegistrationVerifyDto,
} from "./dto/passkey.dto";
import { PasskeyService } from "./passkey.service";
import { Throttle } from "@nestjs/throttler";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passkeys: PasskeyService,
  ) {}

  @Post("login")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
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

  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(user, input);
  }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user, input);
  }

  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.listSessions(user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:id")
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") sessionId: string,
  ) {
    return this.auth.revokeSession(user, sessionId);
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.auth.forgotPassword(input);
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.auth.resetPassword(input);
  }

  @UseGuards(JwtAuthGuard)
  @Post("passkeys/register/options")
  passkeyRegistrationOptions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: PasskeyRegistrationOptionsDto,
    @Req() request: { headers: Record<string, string | string[] | undefined> },
  ) {
    const origin = this.extractOrigin(request);
    return this.passkeys.registrationOptions(user, input, origin);
  }

  @UseGuards(JwtAuthGuard)
  @Post("passkeys/register/verify")
  passkeyRegistrationVerify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: PasskeyRegistrationVerifyDto,
    @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    const origin = this.extractOrigin(request);
    return this.passkeys.verifyRegistration(
      user,
      input,
      this.requestContext(request),
      origin,
    );
  }

  @Post("passkeys/login/options")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  passkeyAuthenticationOptions(
    @Body() input: PasskeyAuthenticationOptionsDto,
    @Req() request: { headers: Record<string, string | string[] | undefined> },
  ) {
    const origin = this.extractOrigin(request);
    return this.passkeys.authenticationOptions(input, origin);
  }

  @Post("passkeys/login/verify")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  passkeyAuthenticationVerify(
    @Body() input: PasskeyAuthenticationVerifyDto,
    @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    const origin = this.extractOrigin(request);
    return this.passkeys.verifyAuthentication(
      input,
      this.requestContext(request),
      origin,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("passkeys")
  passkeyList(@CurrentUser() user: AuthenticatedUser) {
    return this.passkeys.list(user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("passkeys/:id")
  passkeyDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") credentialId: string,
  ) {
    return this.passkeys.remove(user, credentialId);
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

  private extractOrigin(request: {
    headers: Record<string, string | string[] | undefined>;
  }): string | undefined {
    const raw = request.headers.origin || request.headers.referer;
    return Array.isArray(raw) ? raw[0] : raw;
  }
}
