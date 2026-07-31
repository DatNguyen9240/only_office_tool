import {
  Body,
  Controller,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { OnlyOfficeService } from "./onlyoffice.service";
import { OnlyOfficeCallbackDto } from "./dto/onlyoffice-callback.dto";
import { OnlyOfficeCallbackQueryDto } from "./dto/onlyoffice-callback-query.dto";

@Controller("documents")
export class OnlyOfficeController {
  constructor(private readonly onlyOfficeService: OnlyOfficeService) {}

  @Post(":id/onlyoffice-callback")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
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
}
