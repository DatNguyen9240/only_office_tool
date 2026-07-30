import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export enum DocumentScope {
  ALL = "all",
  SHARED = "shared",
  TRASH = "trash",
}

export class ListDocumentsQueryDto {
  @IsOptional()
  @IsEnum(DocumentScope, {
    message: "scope must be all, shared, or trash",
  })
  scope?: DocumentScope = DocumentScope.ALL;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 100;
}
