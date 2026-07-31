import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../../database/prisma/prisma.service";

@UseGuards(JwtAuthGuard)
@Controller("groups")
export class GroupsDirectoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const groups = await this.prisma.group.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group._count.members,
    }));
  }
}
