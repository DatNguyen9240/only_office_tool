import { IsArray, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateTagDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class UpdateDocumentTagsDto {
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];
}

export class UpdateDocumentMetadataDto {
  @IsOptional()
  metadata?: Record<string, unknown>;
}
