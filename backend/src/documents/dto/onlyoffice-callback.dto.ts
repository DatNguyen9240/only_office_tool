import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
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

  @IsOptional()
  @IsString()
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
}
