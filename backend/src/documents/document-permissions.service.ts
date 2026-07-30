import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { PermissionRole } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentAccessUtil } from "./document-access.util";
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from "./dto/permission.dto";

@Injectable()
export class DocumentPermissionsService {
  private readonly logger = new Logger(DocumentPermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly audit?: AuditService,
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
        userId: targetUser?.id,
        role: input.role,
        grantedById: user.id,
      },
      update: {
        userId: targetUser?.id,
        role: input.role,
        grantedById: user.id,
      },
      include: { user: { select: { name: true } } },
    });

    DocumentAccessUtil.recordAudit(
      this.audit,
      this.logger,
      user.id,
      "PERMISSION_GRANTED",
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
    DocumentAccessUtil.recordAudit(
      this.audit,
      this.logger,
      user.id,
      "PERMISSION_UPDATED",
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
    DocumentAccessUtil.recordAudit(
      this.audit,
      this.logger,
      user.id,
      "PERMISSION_REVOKED",
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
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
  }

  private async ensureOwnedDocument(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, ...DocumentAccessUtil.ownerWhere(user) },
      select: { id: true, name: true, ownerId: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }
}
