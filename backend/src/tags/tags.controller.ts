import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateTagDto, UpdateDocumentMetadataDto, UpdateDocumentTagsDto } from "./dto/tag.dto";
import { TagsService } from "./tags.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get("tags")
  list() {
    return this.tags.list();
  }

  @Post("tags")
  create(@Body() input: CreateTagDto) {
    return this.tags.create(input);
  }

  @Delete("tags/:id")
  remove(@Param("id") id: string) {
    return this.tags.remove(id);
  }

  @Put("documents/:id/tags")
  setDocumentTags(
    @Param("id") documentId: string,
    @Body() input: UpdateDocumentTagsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tags.setDocumentTags(documentId, input, user);
  }

  @Patch("documents/:id/metadata")
  setMetadata(
    @Param("id") documentId: string,
    @Body() input: UpdateDocumentMetadataDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tags.setMetadata(documentId, input, user);
  }
}
