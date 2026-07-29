import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { UpdateFolderDto } from "./dto/update-folder.dto";

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(parentId?: string) {
    const folders = await this.prisma.folder.findMany({
      where: parentId === undefined ? {} : { parentId: parentId || null },
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

  async create(input: CreateFolderDto) {
    const folder = await this.prisma.folder.create({
      data: {
        name: input.name,
        ownerId: input.ownerId,
        ...(input.parentId ? { parentId: input.parentId } : {}),
      },
    });
    return { id: folder.id, name: folder.name, parentId: folder.parentId ?? undefined, count: 0 };
  }

  async update(id: string, input: UpdateFolderDto) {
    await this.ensureFolder(id);
    const folder = await this.prisma.folder.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
      },
      include: { _count: { select: { documents: true, children: true } } },
    });
    return {
      id: folder.id,
      name: folder.name,
      ...(folder.parentId ? { parentId: folder.parentId } : {}),
      count: folder._count.documents + folder._count.children,
    };
  }

  async remove(id: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: { _count: { select: { documents: true, children: true } } },
    });
    if (!folder) throw new NotFoundException("Folder not found");
    if (folder._count.documents > 0 || folder._count.children > 0) {
      throw new ConflictException("Folder must be empty before deletion");
    }
    await this.prisma.folder.delete({ where: { id } });
    return { id, status: "deleted" as const };
  }

  private async ensureFolder(id: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!folder) throw new NotFoundException("Folder not found");
  }
}
