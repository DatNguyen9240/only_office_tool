import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { CurrentUser } from "../../core/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import {
  CreateShareLinkDto,
  ShareLinkAccessDto,
} from "./dto/share-link.dto";
import { ShareLinksService } from "./share-links.service";
import { Throttle } from "@nestjs/throttler";

@Controller()
export class ShareLinksController {
  constructor(private readonly links: ShareLinksService) {}

  @UseGuards(JwtAuthGuard)
  @Get("documents/:id/share-links")
  list(
    @Param("id") documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.list(documentId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post("documents/:id/share-links")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(
    @Param("id") documentId: string,
    @Body() input: CreateShareLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.create(documentId, input, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("documents/:id/share-links/:linkId")
  revoke(
    @Param("id") documentId: string,
    @Param("linkId") linkId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.revoke(documentId, linkId, user);
  }

  @Post("share/:token/access")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  access(
    @Param("token") token: string,
    @Body() input: ShareLinkAccessDto,
  ) {
    return this.links.resolve(token, input);
  }
}
