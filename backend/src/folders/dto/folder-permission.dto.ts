import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import { PermissionRole } from "@prisma/client";

const assignableRoles = [
  PermissionRole.VIEWER,
  PermissionRole.COMMENTER,
  PermissionRole.EDITOR,
] as const;

export class CreateFolderPermissionDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsIn(assignableRoles)
  role!: (typeof assignableRoles)[number];
}

export class UpdateFolderPermissionDto {
  @IsIn(assignableRoles)
  role!: (typeof assignableRoles)[number];
}
