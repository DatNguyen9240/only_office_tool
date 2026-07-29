import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsBoolean()
  starred?: boolean;
}
