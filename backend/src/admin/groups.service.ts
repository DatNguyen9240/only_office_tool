import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AddGroupMemberDto,
  CreateGroupDto,
  UpdateGroupDto,
} from "./dto/group.dto";

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const groups = await this.prisma.group.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.members.length,
      members: group.members.map((member) => member.user),
      createdAt: group.createdAt.toISOString(),
    }));
  }

  async create(input: CreateGroupDto, actor: AuthenticatedUser) {
    try {
      const group = await this.prisma.group.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          createdById: actor.id,
        },
      });
      await this.record(actor.id, "GROUP_CREATED", group.id, group.name);
      return { ...group, memberCount: 0, members: [] };
    } catch {
      throw new ConflictException("A group with this name already exists");
    }
  }

  async update(
    id: string,
    input: UpdateGroupDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.group.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Group not found");
    try {
      const group = await this.prisma.group.update({
        where: { id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name.trim() }),
          ...(input.description === undefined
            ? {}
            : { description: input.description.trim() || null }),
        },
      });
      await this.record(actor.id, "GROUP_UPDATED", group.id, group.name);
      return group;
    } catch {
      throw new ConflictException("A group with this name already exists");
    }
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    await this.prisma.group.delete({ where: { id } });
    await this.record(actor.id, "GROUP_DELETED", id, group.name);
    return { id, status: "deleted" as const };
  }

  async addMember(
    groupId: string,
    input: AddGroupMemberDto,
    actor: AuthenticatedUser,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, status: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException("Active user not found");
    }
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId: user.id } },
      create: { groupId, userId: user.id },
      update: {},
    });
    await this.record(actor.id, "GROUP_MEMBER_ADDED", groupId, user.email);
    return user;
  }

  async removeMember(
    groupId: string,
    userId: string,
    actor: AuthenticatedUser,
  ) {
    const result = await this.prisma.groupMember.deleteMany({
      where: { groupId, userId },
    });
    if (result.count !== 1) throw new NotFoundException("Group member not found");
    await this.record(actor.id, "GROUP_MEMBER_REMOVED", groupId, userId);
    return { userId, status: "removed" as const };
  }

  private record(
    actorId: string,
    action: string,
    resourceId: string,
    name: string,
  ) {
    return this.audit.record({
      actorId,
      action,
      resourceType: "GROUP",
      resourceId,
      metadata: { name },
    });
  }
}
