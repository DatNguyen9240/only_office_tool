import { BadRequestException, ParseIntPipe } from "@nestjs/common";

export const ParsePositiveIntPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new BadRequestException("versionNumber must be a positive integer"),
});
