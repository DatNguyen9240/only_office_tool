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
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { UpdateFolderDto } from "./dto/update-folder.dto";
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
    return this.folders.list(user.id, parentId);
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
}
