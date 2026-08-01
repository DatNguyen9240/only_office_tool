import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { PrismaService } from "../../database/prisma/prisma.service";
import { DocumentAccessService } from "./document-access.service";

@Injectable()
export class DocumentCapabilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
  ) {}

  async forDocument(
    id: string,
    user: AuthenticatedUser,
    options: { includeDeleted?: boolean } = {},
  ) {
    const capabilities = await this.forDocuments([id], user, options);
    const result = capabilities.get(id);
    if (!result) throw new NotFoundException("Document not found");
    return result;
  }

  async forDocuments(
    ids: readonly string[],
    user: AuthenticatedUser,
    options: { includeDeleted?: boolean } = {},
  ) {
    if (ids.length === 0) return new Map();
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: [...ids] },
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...this.access.accessWhere(user),
      },
      select: {
        id: true,
        ownerId: true,
        permissions: {
          where: this.access.permissionWhere(user),
          select: { role: true },
          take: 1,
        },
      },
    });
    return new Map(
      documents.map((document) => [
        document.id,
        this.access.capabilities(
          document.ownerId,
          user,
          document.permissions[0]?.role,
        ),
      ]),
    );
  }
}
