import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from "class-validator";

export class OnlyOfficeUserDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class OnlyOfficeCallbackDto {
  @Type(() => Number)
  @IsInt()
  status!: number;

  @ValidateIf((o: OnlyOfficeCallbackDto) => o.status === 2 || o.status === 6)
  @IsString()
  @IsUrl({ require_tld: false }, { message: "ONLYOFFICE callback URL must be a valid URL" })
  url?: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsArray()
  users?: string[];

  @IsOptional()
  @IsArray()
  actions?: unknown[];

  @IsOptional()
  @IsString()
  changesurl?: string;

  @IsOptional()
  @IsString()
  history?: unknown;

  @IsOptional()
  @IsString()
  token?: string;
}
