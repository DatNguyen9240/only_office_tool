import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminService } from "./admin.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ListAuditQueryDto, ListUsersQueryDto } from "./dto/list-users.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("users")
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query.limit ?? 100);
  }

  @Post("users")
  createUser(
    @Body() input: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.admin.createUser(input, actor);
  }

  @Patch("users/:id")
  updateUser(
    @Param("id") id: string,
    @Body() input: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.admin.updateUser(id, input, actor);
  }

  @Post("users/:id/reset-sessions")
  resetSessions(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.admin.resetSessions(id, actor);
  }

  @Get("audit")
  listAudit(@Query() query: ListAuditQueryDto) {
    return this.admin.listAudit(
      query.limit ?? 100,
      query.action,
      query.outcome,
    );
  }
}
