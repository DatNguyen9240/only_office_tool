import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { ParsePositiveIntPipe } from "../../common/pipes/parse-positive-int.pipe";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { CurrentUser } from "../../core/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { DocumentsService } from "./documents.service";
import { DocumentPermissionsService } from "./document-permissions.service";
import { DocumentVersionsService } from "./document-versions.service";
import { OnlyOfficeService } from "./onlyoffice.service";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from "./dto/permission.dto";
import { ListDocumentsQueryDto } from "./dto/list-documents.dto";
import { EmptyTrashQueryDto } from "./dto/empty-trash-query.dto";

@UseGuards(JwtAuthGuard)
@Controller("documents")
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly permissionsService: DocumentPermissionsService,
    private readonly versionsService: DocumentVersionsService,
    private readonly onlyOfficeService: OnlyOfficeService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: ListDocumentsQueryDto,
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
  get(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.getById(id, user);
  }

  @Get(":id/editor-config")
  getEditorConfig(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.onlyOfficeService.getEditorConfig(id, user);
  }

  @Get(":id/permissions")
  listPermissions(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.listPermissions(id, user);
  }

  @Post(":id/permissions")
  addPermission(
    @Param("id") id: string,
    @Body() input: CreatePermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.addPermission(id, input, user);
  }

  @Patch(":id/permissions/:permissionId")
  updatePermission(
    @Param("id") id: string,
    @Param("permissionId") permissionId: string,
    @Body() input: UpdatePermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.updatePermission(id, permissionId, input, user);
  }

  @Delete(":id/permissions/:permissionId")
  removePermission(
    @Param("id") id: string,
    @Param("permissionId") permissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.removePermission(id, permissionId, user);
  }

  @Get(":id/versions")
  getVersions(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.versionsService.getVersions(id, user);
  }

  @Get(":id/versions/compare")
  compareVersions(
    @Param("id") id: string,
    @Query("from", ParsePositiveIntPipe) from: number,
    @Query("to", ParsePositiveIntPipe) to: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.versionsService.compareVersions(id, from, to, user);
  }

  @Get(":id/versions/:versionNumber/download-url")
  downloadVersion(
    @Param("id") id: string,
    @Param("versionNumber", ParsePositiveIntPipe) versionNumber: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.versionsService.createVersionDownloadUrl(id, versionNumber, user);
  }

  @Post(":id/versions/:versionNumber/restore")
  restoreVersion(
    @Param("id") id: string,
    @Param("versionNumber", ParsePositiveIntPipe) versionNumber: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.versionsService.restoreVersion(id, versionNumber, user);
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
  remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
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
    @Query() _query: EmptyTrashQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.emptyTrash(user);
  }

  @Post(":id/restore")
  restore(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.restore(id, user);
  }

  @Post(":id/star")
  star(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.toggleStar(id, user);
  }
}
