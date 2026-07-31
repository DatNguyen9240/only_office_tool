import { IsNotEmpty, IsString } from "class-validator";

export class OnlyOfficeCallbackQueryDto {
  @IsString()
  @IsNotEmpty({ message: "ONLYOFFICE callback ticket is required" })
  ticket!: string;
}
