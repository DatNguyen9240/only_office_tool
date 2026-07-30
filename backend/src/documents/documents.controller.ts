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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
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

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    @Body("folderId") folderId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.uploadDocument(file, folderId, user);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.getById(id, user);
  }

  @Get(":id/editor-config")
  getEditorConfig(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.getEditorConfig(id, user);
  }

  @Get(":id/download")
  async download(@Param("id") id: string, @Res() res: Response) {
    const file = await this.documents.downloadFile(id);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.filename)}"`,
    );
    res.setHeader("Content-Type", "application/octet-stream");
    return res.send(file.buffer);
  }

  @Post(":id/callback")
  callback(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.documents.handleCallback(id, body);
  }

  @Post(":id/permissions")
  addPermission(
    @Param("id") id: string,
    @Body("email") email: string,
    @Body("role") role: "VIEWER" | "COMMENTER" | "EDITOR",
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.addPermission(id, email, role, user);
  }

  @Delete(":id/permissions/:permissionId")
  removePermission(
    @Param("id") id: string,
    @Param("permissionId") permissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.removePermission(id, permissionId, user);
  }

  @Get(":id/versions")
  getVersions(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.getVersions(id, user);
  }

  @Post(":id/versions/:versionNumber/restore")
  restoreVersion(
    @Param("id") id: string,
    @Param("versionNumber") versionNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.restoreVersion(id, Number(versionNumber), user);
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
