import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
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

  private validateUser(user: AuthenticatedUser): void {
    if (!user || !user.id) {
      throw new UnauthorizedException("User context is missing or invalid");
    }
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDocumentsQueryDto,
  ) {
    this.validateUser(user);
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
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.documents.getById(id, user);
  }

  @Get(":id/editor-config")
  getEditorConfig(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.onlyOfficeService.getEditorConfig(id, user);
  }

  @Get(":id/permissions")
  listPermissions(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.permissionsService.listPermissions(id, user);
  }

  @Post(":id/permissions")
  addPermission(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: CreatePermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.permissionsService.addPermission(id, input, user);
  }

  @Patch(":id/permissions/:permissionId")
  updatePermission(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("permissionId", new ParseUUIDPipe({ version: "4" })) permissionId: string,
    @Body() input: UpdatePermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.permissionsService.updatePermission(id, permissionId, input, user);
  }

  @Delete(":id/permissions/:permissionId")
  removePermission(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("permissionId", new ParseUUIDPipe({ version: "4" })) permissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.permissionsService.removePermission(id, permissionId, user);
  }

  @Get(":id/versions")
  getVersions(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.versionsService.getVersions(id, user);
  }

  @Get(":id/versions/:versionNumber/download-url")
  downloadVersion(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param(
      "versionNumber",
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () =>
          new BadRequestException("versionNumber must be a positive integer"),
      }),
    )
    versionNumber: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    if (versionNumber < 1) {
      throw new BadRequestException("versionNumber must be a positive integer");
    }
    return this.versionsService.createVersionDownloadUrl(id, versionNumber, user);
  }

  @Post(":id/versions/:versionNumber/restore")
  restoreVersion(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param(
      "versionNumber",
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () =>
          new BadRequestException("versionNumber must be a positive integer"),
      }),
    )
    versionNumber: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    if (versionNumber < 1) {
      throw new BadRequestException("versionNumber must be a positive integer");
    }
    return this.versionsService.restoreVersion(id, versionNumber, user);
  }

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.documents.update(id, input, user);
  }

  @Delete(":id")
  remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.documents.softDelete(id, user);
  }

  @Delete(":id/permanent")
  removePermanently(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.documents.permanentDelete(id, user);
  }

  @Delete()
  emptyTrash(
    @Query() _query: EmptyTrashQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.documents.emptyTrash(user);
  }

  @Post(":id/restore")
  restore(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.documents.restore(id, user);
  }

  @Post(":id/star")
  star(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.validateUser(user);
    return this.documents.toggleStar(id, user);
  }
}
