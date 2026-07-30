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
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from "./dto/permission.dto";
import { ListDocumentsQueryDto } from "./dto/list-documents.dto";

@UseGuards(JwtAuthGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDocumentsQueryDto,
  ) {
    return this.documents.list(
      query.scope ?? "all",
      user,
      query.folderId,
      query.q,
      query.limit,
    );
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

  @Get(":id/permissions")
  listPermissions(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.listPermissions(id, user);
  }

  @Post(":id/permissions")
  addPermission(
    @Param("id") id: string,
    @Body() input: CreatePermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.addPermission(id, input, user);
  }

  @Patch(":id/permissions/:permissionId")
  updatePermission(
    @Param("id") id: string,
    @Param("permissionId") permissionId: string,
    @Body() input: UpdatePermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.updatePermission(id, permissionId, input, user);
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

  @Get(":id/versions/:versionNumber/download-url")
  downloadVersion(
    @Param("id") id: string,
    @Param("versionNumber") versionNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = Number(versionNumber);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException("versionNumber must be a positive integer");
    }
    return this.documents.createVersionDownloadUrl(id, parsed, user);
  }

  @Post(":id/versions/:versionNumber/restore")
  restoreVersion(
    @Param("id") id: string,
    @Param("versionNumber") versionNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = Number(versionNumber);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException("versionNumber must be a positive integer");
    }
    return this.documents.restoreVersion(id, parsed, user);
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

  @Delete(":id/permanent")
  removePermanently(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.permanentDelete(id, user);
  }

  @Delete()
  emptyTrash(
    @Query("scope") scope: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (scope !== "trash") {
      throw new BadRequestException("DELETE /documents requires scope=trash");
    }
    return this.documents.emptyTrash(user);
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
