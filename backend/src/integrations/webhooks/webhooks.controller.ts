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
import { CreateWebhookDto } from "./dto/webhook.dto";
import { WebhooksService } from "./webhooks.service";

@UseGuards(JwtAuthGuard)
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.webhooks.list(user);
  }

  @Post()
  create(
    @Body() input: CreateWebhookDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.webhooks.create(input, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.webhooks.remove(id, user);
  }

  @Post("deliveries/:id/retry")
  retry(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.webhooks.retry(id, user);
  }
}
