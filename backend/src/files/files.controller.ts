import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CompleteUploadDto } from "./dto/complete-upload.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { FilesService } from "./files.service";

@Controller("documents")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("upload-url")
  createUploadUrl(@Body() input: CreateUploadUrlDto) {
    return this.files.createUploadUrl(input);
  }

  @Post(":id/upload-complete")
  completeUpload(
    @Param("id") documentId: string,
    @Body() input: CompleteUploadDto,
  ) {
    return this.files.completeUpload(documentId, input);
  }

  @Get(":id/download-url")
  createDownloadUrl(@Param("id") documentId: string) {
    return this.files.createDownloadUrl(documentId);
  }
}
