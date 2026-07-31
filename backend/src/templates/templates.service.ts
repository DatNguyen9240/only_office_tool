import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTemplateDto, UpdateTemplateDto } from "./dto/template.dto";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const templates = await this.prisma.documentTemplate.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return templates.map((template) => ({
      ...template,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }));
  }

  create(input: CreateTemplateDto, user: AuthenticatedUser) {
    return this.prisma.documentTemplate.create({
      data: {
        name: input.name.trim(),
        type: input.type,
        description: input.description?.trim() || null,
        objectKey: input.objectKey?.trim() || null,
        ownerId: user.id,
      },
    });
  }

  async update(id: string, input: UpdateTemplateDto, user: AuthenticatedUser) {
    await this.ensureOwner(id, user);
    return this.prisma.documentTemplate.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined
          ? {}
          : { description: input.description.trim() || null }),
      },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.ensureOwner(id, user);
    await this.prisma.documentTemplate.delete({ where: { id } });
    return { id, status: "deleted" as const };
  }

  private async ensureOwner(id: string, user: AuthenticatedUser) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: { id, ownerId: user.id },
      select: { id: true },
    });
    if (!template) throw new NotFoundException("Template not found");
  }
}
