import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PermissionRole, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditAction, DocumentAccessService } from "./document-access.service";
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from "./dto/permission.dto";

@Injectable()
export class DocumentPermissionsService {
  private readonly logger = new Logger(DocumentPermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DocumentAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async listPermissions(id: string, user: AuthenticatedUser) {
    await this.ensureOwnedDocument(id, user);
    const permissions = await this.prisma.documentPermission.findMany({
      where: { documentId: id },
      include: {
        user: { select: { name: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return permissions.map((permission) => this.toPermissionEntry(permission));
  }

  async addPermission(
    id: string,
    input: CreatePermissionDto,
    user: AuthenticatedUser,
  ) {
    const document = await this.ensureOwnedDocument(id, user);
    if (Boolean(input.email) === Boolean(input.groupId)) {
      throw new BadRequestException("Provide either email or groupId");
    }

    if (input.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: input.groupId },
        include: { members: { select: { userId: true } } },
      });
      if (!group) throw new NotFoundException("Group not found");
      const permission = await this.prisma.documentPermission.upsert({
        where: {
          documentId_groupId: { documentId: id, groupId: group.id },
        },
        create: {
          documentId: id,
          groupId: group.id,
          role: input.role,
          grantedById: user.id,
        },
        update: { role: input.role, grantedById: user.id },
        include: {
          user: { select: { name: true } },
          group: { select: { id: true, name: true } },
        },
      });
      await this.notifications.createMany(
        group.members
          .filter((member) => member.userId !== user.id)
          .map((member) => ({
            userId: member.userId,
            type: "DOCUMENT_SHARED",
            title: `${document.name} was shared with ${group.name}`,
            resourceType: "DOCUMENT",
            resourceId: id,
          })),
      );
      this.recordGrant(user.id, id, document.name);
      return this.toPermissionEntry(permission);
    }

    const email = input.email!.trim().toLowerCase();
    const targetUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    const permission = await this.prisma.documentPermission.upsert({
      where: { documentId_email: { documentId: id, email } },
      create: {
        documentId: id,
        email,
        userId: targetUser?.id ?? null,
        role: input.role,
        grantedById: user.id,
      },
      update: {
        ...(targetUser?.id ? { userId: targetUser.id } : {}),
        role: input.role,
        grantedById: user.id,
      },
      include: {
        user: { select: { name: true } },
        group: { select: { id: true, name: true } },
      },
    });
    if (targetUser?.id && targetUser.id !== user.id) {
      await this.notifications.create({
        userId: targetUser.id,
        type: "DOCUMENT_SHARED",
        title: `${document.name} was shared with you`,
        resourceType: "DOCUMENT",
        resourceId: id,
      });
    }
    this.recordGrant(user.id, id, document.name);
    return this.toPermissionEntry(permission);
  }

  async updatePermission(
    id: string,
    permissionId: string,
    input: UpdatePermissionDto,
    user: AuthenticatedUser,
  ) {
    const document = await this.ensureOwnedDocument(id, user);
    try {
      const permission = await this.prisma.documentPermission.update({
        where: { id: permissionId, documentId: id },
        data: { role: input.role, grantedById: user.id },
        include: {
          user: { select: { name: true } },
          group: { select: { id: true, name: true } },
        },
      });
      this.accessService.recordAuditAsync(
        user.id,
        AuditAction.PERMISSION_UPDATED,
        id,
        document.name,
      );
      return this.toPermissionEntry(permission);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("Permission not found");
      }
      throw error;
    }
  }

  async removePermission(
    id: string,
    permissionId: string,
    user: AuthenticatedUser,
  ) {
    const document = await this.ensureOwnedDocument(id, user);
    const removed = await this.prisma.documentPermission.deleteMany({
      where: { id: permissionId, documentId: id },
    });
    if (removed.count !== 1) throw new NotFoundException("Permission not found");
    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.PERMISSION_REVOKED,
      id,
      document.name,
    );
    return { id: permissionId, status: "removed" as const };
  }

  public toPublicPermission(role: PermissionRole) {
    return (role.charAt(0) + role.slice(1).toLowerCase()) as
      | "Viewer"
      | "Commenter"
      | "Editor"
      | "Owner";
  }

  public toPermissionEntry(permission: {
    id: string;
    email: string | null;
    role: PermissionRole;
    user: { name: string } | null;
    group?: { id: string; name: string } | null;
  }) {
    if (permission.group) {
      return {
        id: permission.id,
        name: permission.group.name,
        email: "",
        groupId: permission.group.id,
        kind: "group" as const,
        role: this.toPublicPermission(permission.role),
        initials: this.initials(permission.group.name, "GR"),
      };
    }
    const email = permission.email?.trim() ?? "";
    const fallbackName = email.includes("@")
      ? email.split("@")[0]
      : email || "Unknown User";
    const displayName = permission.user?.name?.trim() || fallbackName;
    return {
      id: permission.id,
      name: displayName,
      email,
      kind: "user" as const,
      role: this.toPublicPermission(permission.role),
      initials: this.initials(displayName, "US"),
    };
  }

  private initials(name: string, fallback: string) {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || fallback
    );
  }

  private recordGrant(actorId: string, id: string, name: string) {
    this.accessService.recordAuditAsync(
      actorId,
      AuditAction.PERMISSION_GRANTED,
      id,
      name,
    );
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...this.accessService.ownerWhere(user) },
      select: { id: true, name: true, ownerId: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }
}
