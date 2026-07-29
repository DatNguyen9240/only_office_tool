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
} from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
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
      folderId,
      search,
      limit,
    );
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.documents.getById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() input: UpdateDocumentDto) {
    return this.documents.update(id, input);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documents.softDelete(id);
  }

  @Post(":id/restore")
  restore(@Param("id") id: string) {
    return this.documents.restore(id);
  }

  @Post(":id/star")
  star(@Param("id") id: string) {
    return this.documents.toggleStar(id);
  }
}
