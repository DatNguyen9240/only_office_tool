import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { CurrentUser } from "../../core/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CompleteUploadDto } from "./dto/complete-upload.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { FilesService } from "./files.service";

@UseGuards(JwtAuthGuard)
@Controller("documents")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("upload-url")
  createUploadUrl(
    @Body() input: CreateUploadUrlDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.files.createUploadUrl(input, user);
  }

  @Post(":id/upload-complete")
  completeUpload(
    @Param("id") documentId: string,
    @Body() input: CompleteUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.files.completeUpload(documentId, input, user);
  }

  @Get(":id/download-url")
  createDownloadUrl(
    @Param("id") documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.files.createDownloadUrl(documentId, user);
  }
}
