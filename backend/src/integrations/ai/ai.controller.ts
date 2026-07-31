import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { CurrentUser } from "../../core/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { AiService } from "./ai.service";
import { AskAiDto } from "./dto/ai.dto";

@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("documents/:id/summarize")
  summarize(
    @Param("id") documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ai.summarize(documentId, user);
  }

  @Post("ask")
  ask(@Body() input: AskAiDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ai.ask(input, user);
  }
}
