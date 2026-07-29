import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { UpdateFolderDto } from "./dto/update-folder.dto";
import { FoldersService } from "./folders.service";

@Controller("folders")
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  list(@Query("parentId") parentId?: string) {
    return this.folders.list(parentId);
  }

  @Post()
  create(@Body() input: CreateFolderDto) {
    return this.folders.create(input);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() input: UpdateFolderDto) {
    return this.folders.update(id, input);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.folders.remove(id);
  }
}
