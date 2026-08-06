import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  scheduledAt?: string;
}
