import {
  Body,
  Controller,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class OnlyOfficeController {
  constructor(private readonly documents: DocumentsService) {}

  @Post(":id/onlyoffice-callback")
  callback(
    @Param("id") id: string,
    @Query("ticket") ticket: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.documents.handleOnlyOfficeCallback(id, ticket, body);
  }
}
