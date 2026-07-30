import { Transform } from "class-transformer";
import { IsEmail, IsIn } from "class-validator";
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
  @IsEmail()
  email!: string;

  @IsIn(assignableRoles)
  role!: (typeof assignableRoles)[number];
}

export class UpdatePermissionDto {
  @IsIn(assignableRoles)
  role!: (typeof assignableRoles)[number];
}
