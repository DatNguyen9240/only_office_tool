import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

const shareableRoles = ["VIEWER", "COMMENTER", "EDITOR"] as const;

export class CreateShareLinkDto {
  @IsOptional()
  @IsIn(shareableRoles)
  permission?: (typeof shareableRoles)[number] = "VIEWER";

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @Length(8, 128)
  password?: string;
}

export class ShareLinkAccessDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  password?: string;
}
