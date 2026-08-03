import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import type { Response } from "express";
import { OnlyOfficeService } from "./onlyoffice.service";
import { OnlyOfficeCallbackDto } from "./dto/onlyoffice-callback.dto";
import { OnlyOfficeCallbackQueryDto } from "./dto/onlyoffice-callback-query.dto";

@Controller("documents")
export class OnlyOfficeController {
  constructor(private readonly onlyOfficeService: OnlyOfficeService) {}

  @Post(":id/onlyoffice-callback")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false }))
  callback(
    @Param("id") id: string,
    @Query() query: OnlyOfficeCallbackQueryDto,
    @Body() body: OnlyOfficeCallbackDto,
  ) {
    return this.onlyOfficeService.handleOnlyOfficeCallback(
      id,
      query.ticket,
      body,
    );
  }

  @Get(":id/onlyoffice-file")
  downloadFile(
    @Param("id") id: string,
    @Query("ticket") ticket: string,
    @Res() res: Response,
  ) {
    return this.onlyOfficeService.streamOnlyOfficeFile(id, ticket, res);
  }
}
