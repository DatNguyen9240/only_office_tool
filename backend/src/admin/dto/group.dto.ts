import { IsEmail, IsOptional, IsString, Length } from "class-validator";

export class CreateGroupDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class AddGroupMemberDto {
  @IsEmail()
  email!: string;
}
