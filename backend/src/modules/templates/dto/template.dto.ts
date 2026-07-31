import { DocumentType } from "@prisma/client";
import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class CreateTemplateDto {
  @IsString()
  @Length(1, 160)
  name!: string;

  @IsIn([
    DocumentType.DOCX,
    DocumentType.XLSX,
    DocumentType.PPTX,
    DocumentType.PDF,
  ])
  type!: DocumentType;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsString()
  objectKey?: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @Length(1, 160)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
