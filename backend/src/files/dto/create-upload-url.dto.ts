import { Type } from "class-transformer";
import {
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

export class CreateUploadUrlDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsString()
  @IsIn([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/pdf",
  ])
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(524288000)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  folderId?: string;
}
