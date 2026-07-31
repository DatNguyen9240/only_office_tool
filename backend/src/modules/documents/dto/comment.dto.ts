import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class CreateCommentDto {
  @IsString()
  @Length(1, 5000)
  content!: string;
}

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}
