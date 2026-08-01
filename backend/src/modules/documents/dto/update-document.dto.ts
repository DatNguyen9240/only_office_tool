import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}
