import { IsOptional, IsString, Length } from "class-validator";

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
