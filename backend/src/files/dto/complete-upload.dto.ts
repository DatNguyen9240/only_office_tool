import { Type } from "class-transformer";
import { IsInt, IsString, Max, Min } from "class-validator";

export class CompleteUploadDto {
  @IsString()
  objectKey!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(524288000)
  expectedSizeBytes!: number;
}
