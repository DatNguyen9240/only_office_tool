import { IsOptional, IsString, Length } from "class-validator";

export class CreateFolderDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsString()
  ownerId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
