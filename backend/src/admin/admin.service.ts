import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole, UserStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listUsers(limit: number) {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        status: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    return users.map((user) => this.publicUser(user));
  }

  async createUser(input: CreateUserDto, actor: AuthenticatedUser) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) throw new ConflictException("Email is already in use");

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        department: input.department?.trim() || null,
        role: input.role,
        status: UserStatus.ACTIVE,
        passwordHash: await hash(input.password, 12),
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        status: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "USER_CREATED",
      resourceType: "USER",
      resourceId: user.id,
      metadata: { name: user.name, email: user.email, role: user.role },
    });
    return this.publicUser(user);
  }

  async updateUser(
    id: string,
    input: UpdateUserDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, status: true },
    });
    if (!existing) throw new NotFoundException("User not found");

    const removesActiveAdministrator =
      existing.role === UserRole.ADMINISTRATOR &&
      existing.status === UserStatus.ACTIVE &&
      (input.role && input.role !== UserRole.ADMINISTRATOR ||
        input.status && input.status !== UserStatus.ACTIVE);
    if (removesActiveAdministrator) {
      const activeAdministrators = await this.prisma.user.count({
        where: {
          role: UserRole.ADMINISTRATOR,
          status: UserStatus.ACTIVE,
        },
      });
      if (activeAdministrators <= 1) {
        throw new BadRequestException(
          "The last active administrator cannot be demoted or suspended",
        );
      }
    }
    if (
      actor.id === id &&
      (input.role && input.role !== UserRole.ADMINISTRATOR ||
        input.status && input.status !== UserStatus.ACTIVE)
    ) {
      throw new BadRequestException(
        "You cannot demote or suspend your own account",
      );
    }

    const passwordHash = input.password
      ? await hash(input.password, 12)
      : undefined;
    const user = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id },
        data: {
          name: input.name?.trim(),
          department:
            input.department === undefined
              ? undefined
              : input.department.trim() || null,
          role: input.role,
          status: input.status,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
          status: true,
          lastActiveAt: true,
          createdAt: true,
        },
      });
      if (input.status === UserStatus.SUSPENDED || passwordHash) {
        await transaction.refreshSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return updated;
    });
    await this.audit.record({
      actorId: actor.id,
      action: "USER_UPDATED",
      resourceType: "USER",
      resourceId: id,
      metadata: { name: user.name, role: user.role, status: user.status },
    });
    return this.publicUser(user);
  }

  async resetSessions(id: string, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const result = await this.prisma.refreshSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      actorId: actor.id,
      action: "SESSIONS_REVOKED",
      resourceType: "USER",
      resourceId: id,
      metadata: { name: user.name, count: result.count },
    });
    return { revoked: result.count };
  }

  async listAudit(
    limit: number,
    action?: string,
    outcome?: string,
  ) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: action || undefined,
        outcome: outcome || undefined,
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      include: {
        actor: { select: { name: true, email: true } },
      },
    });
    return logs.map((log) => {
      const metadata =
        log.metadata &&
        typeof log.metadata === "object" &&
        !Array.isArray(log.metadata)
          ? log.metadata
          : {};
      const name =
        "name" in metadata && typeof metadata.name === "string"
          ? metadata.name
          : log.resourceId;
      return {
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        actor: log.actor?.name ?? "System",
        actorEmail: log.actor?.email ?? null,
        action: log.action,
        resource: name
          ? `${log.resourceType}: ${name}`
          : log.resourceType,
        outcome: log.outcome,
        ip: log.ip,
        device: log.userAgent,
      };
    });
  }

  private publicUser<T extends {
    id: string;
    name: string;
    email: string;
    department: string | null;
    role: UserRole;
    status: UserStatus;
    lastActiveAt: Date | null;
    createdAt: Date;
  }>(user: T) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      status: user.status,
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
