import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DocumentsService } from "./documents.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";

@UseGuards(JwtAuthGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("scope") scope = "all",
    @Query("folderId") folderId?: string,
    @Query("q") search?: string,
    @Query("limit") limitParam?: string,
  ) {
    if (!["all", "shared", "trash"].includes(scope)) {
      throw new BadRequestException("scope must be all, shared, or trash");
    }
    const parsedLimit = Number(limitParam);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 100)
      : 100;
    return this.documents.list(
      scope as "all" | "shared" | "trash",
      user,
      folderId,
      search,
      limit,
    );
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.getById(id, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() input: UpdateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.update(id, input, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.softDelete(id, user);
  }

  @Post(":id/restore")
  restore(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.restore(id, user);
  }

  @Post(":id/star")
  star(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.toggleStar(id, user);
  }
}
