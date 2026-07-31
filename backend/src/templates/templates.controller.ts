import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateTemplateDto, UpdateTemplateDto } from "./dto/template.dto";
import { TemplatesService } from "./templates.service";

@UseGuards(JwtAuthGuard)
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.templates.list(user);
  }

  @Post()
  create(
    @Body() input: CreateTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.templates.create(input, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() input: UpdateTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.templates.update(id, input, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.remove(id, user);
  }
}
