import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PermissionRole } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentAccessService, AuditAction } from "./document-access.service";
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
  ) {}

  async listPermissions(id: string, user: AuthenticatedUser) {
    const document = await this.ensureOwnedDocument(id, user);
    const permissions = await this.prisma.documentPermission.findMany({
      where: { documentId: id },
      include: { user: { select: { name: true } } },
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

    const targetUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    const permission = await this.prisma.documentPermission.upsert({
      where: {
        documentId_email: {
          documentId: id,
          email: input.email,
        },
      },
      create: {
        documentId: id,
        email: input.email,
        userId: targetUser?.id ?? null,
        role: input.role,
        grantedById: user.id,
      },
      update: {
        ...(targetUser?.id ? { userId: targetUser.id } : {}),
        role: input.role,
        grantedById: user.id,
      },
      include: { user: { select: { name: true } } },
    });

    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.PERMISSION_GRANTED,
      id,
      document.name,
    );
    return this.toPermissionEntry(permission);
  }

  async updatePermission(
    id: string,
    permissionId: string,
    input: UpdatePermissionDto,
    user: AuthenticatedUser,
  ) {
    const document = await this.ensureOwnedDocument(id, user);
    const updated = await this.prisma.documentPermission.updateMany({
      where: { id: permissionId, documentId: id },
      data: { role: input.role, grantedById: user.id },
    });
    if (updated.count !== 1) throw new NotFoundException("Permission not found");
    const permission = await this.prisma.documentPermission.findUniqueOrThrow({
      where: { id: permissionId },
      include: { user: { select: { name: true } } },
    });
    this.accessService.recordAuditAsync(
      user.id,
      AuditAction.PERMISSION_UPDATED,
      id,
      document.name,
    );
    return this.toPermissionEntry(permission);
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
  }) {
    const email = permission.email ?? "";
    const name = permission.user?.name ?? email.split("@")[0] ?? email;
    return {
      id: permission.id,
      name,
      email,
      role: this.toPublicPermission(permission.role),
      initials: name
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "US",
    };
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
