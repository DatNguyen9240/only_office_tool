import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import { PermissionRole } from "@prisma/client";

const assignableRoles = [
  PermissionRole.VIEWER,
  PermissionRole.COMMENTER,
  PermissionRole.EDITOR,
] as const;

export class CreatePermissionDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsIn(assignableRoles)
  role!: (typeof assignableRoles)[number];
}

export class UpdatePermissionDto {
  @IsIn(assignableRoles)
  role!: (typeof assignableRoles)[number];
}
