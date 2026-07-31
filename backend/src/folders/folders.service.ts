import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { UpdateFolderDto } from "./dto/update-folder.dto";
import {
  CreateFolderPermissionDto,
  UpdateFolderPermissionDto,
} from "./dto/folder-permission.dto";

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  async list(user: AuthenticatedUser, parentId?: string) {
    const folders = await this.prisma.folder.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { permissions: { some: { userId: user.id } } },
          { permissions: { some: { email: user.email } } },
          {
            permissions: {
              some: {
                group: { members: { some: { userId: user.id } } },
              },
            },
          },
        ],
        ...(parentId === undefined ? {} : { parentId: parentId || null }),
      },
      include: { _count: { select: { documents: true, children: true } } },
      orderBy: { name: "asc" },
    });

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      ...(folder.parentId ? { parentId: folder.parentId } : {}),
      count: folder._count.documents + folder._count.children,
    }));
  }

  async listPermissions(id: string, user: AuthenticatedUser) {
    await this.ensureOwnedFolder(id, user);
    const permissions = await this.prisma.folderPermission.findMany({
      where: { folderId: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return permissions.map((permission) => ({
      id: permission.id,
      role: permission.role,
      email: permission.email,
      user: permission.user,
      group: permission.group,
    }));
  }

  async addPermission(
    id: string,
    input: CreateFolderPermissionDto,
    user: AuthenticatedUser,
  ) {
    const folder = await this.ensureOwnedFolder(id, user);
    if (Boolean(input.email) === Boolean(input.groupId)) {
      throw new BadRequestException("Provide either email or groupId");
    }
    if (input.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: input.groupId },
        select: { id: true },
      });
      if (!group) throw new NotFoundException("Group not found");
      const permission = await this.prisma.folderPermission.upsert({
        where: { folderId_groupId: { folderId: id, groupId: group.id } },
        create: {
          folderId: id,
          groupId: group.id,
          role: input.role,
          grantedById: user.id,
        },
        update: { role: input.role, grantedById: user.id },
      });
      await this.record(user.id, "FOLDER_PERMISSION_GRANTED", id, folder.name);
      return permission;
    }
    const email = input.email!.trim().toLowerCase();
    const target = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    const permission = await this.prisma.folderPermission.upsert({
      where: { folderId_email: { folderId: id, email } },
      create: {
        folderId: id,
        email,
        userId: target?.id,
        role: input.role,
        grantedById: user.id,
      },
      update: {
        userId: target?.id,
        role: input.role,
        grantedById: user.id,
      },
    });
    await this.record(user.id, "FOLDER_PERMISSION_GRANTED", id, folder.name);
    return permission;
  }

  async updatePermission(
    id: string,
    permissionId: string,
    input: UpdateFolderPermissionDto,
    user: AuthenticatedUser,
  ) {
    const folder = await this.ensureOwnedFolder(id, user);
    const result = await this.prisma.folderPermission.updateMany({
      where: { id: permissionId, folderId: id },
      data: { role: input.role, grantedById: user.id },
    });
    if (result.count !== 1) throw new NotFoundException("Permission not found");
    await this.record(user.id, "FOLDER_PERMISSION_UPDATED", id, folder.name);
    return this.prisma.folderPermission.findUniqueOrThrow({
      where: { id: permissionId },
    });
  }

  async removePermission(
    id: string,
    permissionId: string,
    user: AuthenticatedUser,
  ) {
    const folder = await this.ensureOwnedFolder(id, user);
    const result = await this.prisma.folderPermission.deleteMany({
      where: { id: permissionId, folderId: id },
    });
    if (result.count !== 1) throw new NotFoundException("Permission not found");
    await this.record(user.id, "FOLDER_PERMISSION_REVOKED", id, folder.name);
    return { id: permissionId, status: "removed" as const };
  }

  async create(input: CreateFolderDto, ownerId: string) {
    if (input.parentId) await this.ensureFolder(input.parentId, ownerId);
    const folder = await this.prisma.folder.create({
      data: {
        name: input.name,
        ownerId,
        ...(input.parentId ? { parentId: input.parentId } : {}),
      },
    });
    await this.record(ownerId, "FOLDER_CREATED", folder.id, folder.name);
    return { id: folder.id, name: folder.name, parentId: folder.parentId ?? undefined, count: 0 };
  }

  async update(id: string, input: UpdateFolderDto, ownerId: string) {
    await this.ensureFolder(id, ownerId);
    if (input.parentId !== undefined) {
      await this.ensureValidParent(id, input.parentId, ownerId);
    }
    const folder = await this.prisma.folder.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
      },
      include: { _count: { select: { documents: true, children: true } } },
    });
    await this.record(ownerId, "FOLDER_UPDATED", folder.id, folder.name);
    return {
      id: folder.id,
      name: folder.name,
      ...(folder.parentId ? { parentId: folder.parentId } : {}),
      count: folder._count.documents + folder._count.children,
    };
  }

  async remove(id: string, ownerId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, ownerId },
      include: { _count: { select: { documents: true, children: true } } },
    });
    if (!folder) throw new NotFoundException("Folder not found");
    if (folder._count.documents > 0 || folder._count.children > 0) {
      throw new ConflictException("Folder must be empty before deletion");
    }
    await this.prisma.folder.delete({ where: { id } });
    await this.record(ownerId, "FOLDER_DELETED", id, folder.name);
    return { id, status: "deleted" as const };
  }

  private async ensureFolder(id: string, ownerId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, ownerId },
      select: { id: true },
    });
    if (!folder) throw new NotFoundException("Folder not found");
  }

  private async ensureOwnedFolder(id: string, user: AuthenticatedUser) {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id,
        ...(user.role === "ADMINISTRATOR" ? {} : { ownerId: user.id }),
      },
      select: { id: true, name: true },
    });
    if (!folder) throw new NotFoundException("Folder not found");
    return folder;
  }

  private async ensureValidParent(
    folderId: string,
    parentId: string | null,
    ownerId: string,
  ) {
    if (!parentId) return;
    if (parentId === folderId) {
      throw new ConflictException("A folder cannot be its own parent");
    }

    let currentId: string | null = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === folderId || visited.has(currentId)) {
        throw new ConflictException("Folder move would create a cycle");
      }
      visited.add(currentId);
      const current: { parentId: string | null } | null =
        await this.prisma.folder.findFirst({
          where: { id: currentId, ownerId },
          select: { parentId: true },
        });
      if (!current) throw new NotFoundException("Parent folder not found");
      currentId = current.parentId;
    }
  }

  private async record(
    actorId: string,
    action: string,
    resourceId: string,
    name: string,
  ) {
    await this.audit?.record({
      actorId,
      action,
      resourceType: "FOLDER",
      resourceId,
      metadata: { name },
    });
  }
}
