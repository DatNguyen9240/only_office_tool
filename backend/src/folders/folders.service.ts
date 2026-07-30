import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { UpdateFolderDto } from "./dto/update-folder.dto";

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  async list(ownerId: string, parentId?: string) {
    const folders = await this.prisma.folder.findMany({
      where: {
        ownerId,
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
