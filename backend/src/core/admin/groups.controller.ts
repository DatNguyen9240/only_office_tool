import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  AddGroupMemberDto,
  CreateGroupDto,
  UpdateGroupDto,
} from "./dto/group.dto";
import { GroupsService } from "./groups.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
@Controller("admin/groups")
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list() {
    return this.groups.list();
  }

  @Post()
  create(
    @Body() input: CreateGroupDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.groups.create(input, actor);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() input: UpdateGroupDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.groups.update(id, input, actor);
  }

  @Delete(":id")
  remove(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.groups.remove(id, actor);
  }

  @Post(":id/members")
  addMember(
    @Param("id") id: string,
    @Body() input: AddGroupMemberDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.groups.addMember(id, input, actor);
  }

  @Delete(":id/members/:userId")
  removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.groups.removeMember(id, userId, actor);
  }
}
