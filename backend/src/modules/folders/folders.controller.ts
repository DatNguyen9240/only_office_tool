import {
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
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { CurrentUser } from "../../core/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { UpdateFolderDto } from "./dto/update-folder.dto";
import {
  CreateFolderPermissionDto,
  UpdateFolderPermissionDto,
} from "./dto/folder-permission.dto";
import { FoldersService } from "./folders.service";

@UseGuards(JwtAuthGuard)
@Controller("folders")
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("parentId") parentId?: string,
  ) {
    return this.folders.list(user, parentId);
  }

  @Post()
  create(
    @Body() input: CreateFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.create(input, user.id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() input: UpdateFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.update(id, input, user.id);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.folders.remove(id, user.id);
  }

  @Get(":id/permissions")
  permissions(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.listPermissions(id, user);
  }

  @Post(":id/permissions")
  addPermission(
    @Param("id") id: string,
    @Body() input: CreateFolderPermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.addPermission(id, input, user);
  }

  @Patch(":id/permissions/:permissionId")
  updatePermission(
    @Param("id") id: string,
    @Param("permissionId") permissionId: string,
    @Body() input: UpdateFolderPermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.updatePermission(id, permissionId, input, user);
  }

  @Delete(":id/permissions/:permissionId")
  removePermission(
    @Param("id") id: string,
    @Param("permissionId") permissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.removePermission(id, permissionId, user);
  }
}
