import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../../core/auth/auth.types";
import { CurrentUser } from "../../core/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { DocumentCommentsService } from "./document-comments.service";
import { CreateCommentDto, UpdateCommentDto } from "./dto/comment.dto";

@UseGuards(JwtAuthGuard)
@Controller("documents/:documentId/comments")
export class DocumentCommentsController {
  constructor(private readonly comments: DocumentCommentsService) {}

  @Get()
  list(
    @Param("documentId") documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comments.list(documentId, user);
  }

  @Post()
  create(
    @Param("documentId") documentId: string,
    @Body() input: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comments.create(documentId, input, user);
  }

  @Patch(":commentId")
  update(
    @Param("documentId") documentId: string,
    @Param("commentId") commentId: string,
    @Body() input: UpdateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comments.update(documentId, commentId, input, user);
  }

  @Delete(":commentId")
  remove(
    @Param("documentId") documentId: string,
    @Param("commentId") commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comments.remove(documentId, commentId, user);
  }
}
