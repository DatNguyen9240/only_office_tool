import { IsEmail, IsObject, IsOptional, IsString, Length } from "class-validator";

export class PasskeyRegistrationOptionsDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;
}

export class PasskeyRegistrationVerifyDto {
  @IsString()
  challengeId!: string;

  @IsObject()
  response!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;
}

export class PasskeyAuthenticationOptionsDto {
  @IsEmail()
  email!: string;
}

export class PasskeyAuthenticationVerifyDto {
  @IsString()
  challengeId!: string;

  @IsObject()
  response!: Record<string, unknown>;
}
