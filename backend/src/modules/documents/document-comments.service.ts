import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PermissionRole, UserRole, UserStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { NotificationsService } from "../../core/notifications/notifications.service";
import { PrismaService } from "../../database/prisma/prisma.service";
import { DocumentAccessService } from "./document-access.service";
import { CreateCommentDto, UpdateCommentDto } from "./dto/comment.dto";

const commentRoles = [
  PermissionRole.COMMENTER,
  PermissionRole.EDITOR,
  PermissionRole.OWNER,
];

@Injectable()
export class DocumentCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(documentId: string, user: AuthenticatedUser) {
    await this.ensureAccessible(documentId, user);
    const comments = await this.prisma.comment.findMany({
      where: { documentId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        mentions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return comments.map((comment) => this.toPublic(comment));
  }

  async create(
    documentId: string,
    input: CreateCommentDto,
    user: AuthenticatedUser,
  ) {
    const document = await this.ensureCanComment(documentId, user);
    const mentionedUsers = await this.findMentionedUsers(input.content);
    const comment = await this.prisma.comment.create({
      data: {
        documentId,
        authorId: user.id,
        content: input.content.trim(),
        mentions: {
          create: mentionedUsers.map((mentioned) => ({
            userId: mentioned.id,
          })),
        },
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        mentions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    const recipients = new Map(
      mentionedUsers
        .filter((mentioned) => mentioned.id !== user.id)
        .map((mentioned) => [mentioned.id, "MENTION"]),
    );
    if (document.ownerId !== user.id && !recipients.has(document.ownerId)) {
      recipients.set(document.ownerId, "COMMENT");
    }
    await this.notifications.createMany(
      [...recipients].map(([userId, type]) => ({
        userId,
        type,
        title:
          type === "MENTION"
            ? `${user.name} mentioned you`
            : `${user.name} commented`,
        body: `${document.name}: ${input.content.trim().slice(0, 180)}`,
        resourceType: "DOCUMENT",
        resourceId: documentId,
      })),
    );
    return this.toPublic(comment);
  }

  async update(
    documentId: string,
    commentId: string,
    input: UpdateCommentDto,
    user: AuthenticatedUser,
  ) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, documentId },
      select: { id: true, authorId: true },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    const document = await this.ensureCanComment(documentId, user);
    const canModerate =
      user.role === UserRole.ADMINISTRATOR || document.ownerId === user.id;
    if (input.content !== undefined && comment.authorId !== user.id) {
      throw new ForbiddenException("Only the author can edit this comment");
    }
    if (
      input.resolved !== undefined &&
      comment.authorId !== user.id &&
      !canModerate
    ) {
      throw new ForbiddenException("You cannot resolve this comment");
    }

    const mentionedUsers =
      input.content === undefined
        ? undefined
        : await this.findMentionedUsers(input.content);
    if (mentionedUsers) {
      await this.prisma.commentMention.deleteMany({ where: { commentId } });
    }
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        ...(input.content === undefined
          ? {}
          : {
              content: input.content.trim(),
              editedAt: new Date(),
              mentions: {
                create: mentionedUsers?.map((mentioned) => ({
                  userId: mentioned.id,
                })),
              },
            }),
        ...(input.resolved === undefined
          ? {}
          : { resolvedAt: input.resolved ? new Date() : null }),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        mentions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    return this.toPublic(updated);
  }

  async remove(
    documentId: string,
    commentId: string,
    user: AuthenticatedUser,
  ) {
    const document = await this.ensureAccessible(documentId, user);
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, documentId },
      select: { authorId: true },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (
      comment.authorId !== user.id &&
      document.ownerId !== user.id &&
      user.role !== UserRole.ADMINISTRATOR
    ) {
      throw new ForbiddenException("You cannot delete this comment");
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { id: commentId, status: "deleted" as const };
  }

  private async ensureAccessible(documentId: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        ...this.access.accessWhere(user),
      },
      select: { id: true, name: true, ownerId: true },
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }

  private async ensureCanComment(documentId: string, user: AuthenticatedUser) {
    if (user.role === UserRole.ADMINISTRATOR) {
      return this.ensureAccessible(documentId, user);
    }
    const principal = this.access.permissionWhere(user);
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        OR: [
          { ownerId: user.id },
          {
            permissions: {
              some: { AND: [principal, { role: { in: commentRoles } }] },
            },
          },
          {
            folder: {
              permissions: {
                some: {
                  role: { in: commentRoles },
                  OR: [
                    { userId: user.id },
                    { email: user.email },
                    { group: { members: { some: { userId: user.id } } } },
                  ],
                },
              },
            },
          },
        ],
      },
      select: { id: true, name: true, ownerId: true },
    });
    if (!document) {
      throw new ForbiddenException("Commenter permission is required");
    }
    return document;
  }

  private async findMentionedUsers(content: string) {
    const emails = [
      ...new Set(
        [...content.matchAll(/@([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g)].map(
          (match) => match[1].toLowerCase(),
        ),
      ),
    ];
    if (emails.length === 0) return [];
    return this.prisma.user.findMany({
      where: { email: { in: emails }, status: UserStatus.ACTIVE },
      select: { id: true, email: true },
    });
  }

  private toPublic(comment: {
    id: string;
    content: string;
    resolvedAt: Date | null;
    editedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; name: string; email: string };
    mentions: Array<{
      user: { id: string; name: string; email: string };
    }>;
  }) {
    return {
      id: comment.id,
      content: comment.content,
      resolved: Boolean(comment.resolvedAt),
      editedAt: comment.editedAt?.toISOString() ?? null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: comment.author,
      mentions: comment.mentions.map((mention) => mention.user),
    };
  }
}
