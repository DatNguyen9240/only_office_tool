import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class TokenRequestDto {
  @IsString()
  @IsNotEmpty()
  participantName!: string;

  @IsString()
  @IsOptional()
  participantId?: string;
}
