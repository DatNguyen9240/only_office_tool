import { UseGuards } from "@nestjs/common";
import {
  Args,
  Context,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import type { AuthenticatedUser } from "../core/auth/auth.types";
import { DocumentsService } from "../modules/documents/documents.service";
import { FoldersService } from "../modules/folders/folders.service";
import type { GraphqlContext } from "./graphql.context";
import { GqlCurrentUser, GqlJwtAuthGuard } from "./graphql-auth";
import {
  CreateDocumentPermissionInput,
  DocumentConnectionType,
  DocumentType,
  DocumentVersionType,
  GraphqlDocumentScope,
  FolderType,
  CreateFolderInput,
  PermissionEntryType,
  MutationStatusType,
  TrashStatusType,
  UpdateDocumentInput,
  UpdateDocumentPermissionInput,
  UpdateFolderInput,
  SearchResultType,
  WorkspaceType,
} from "./graphql.types";
import { WorkspaceQueryService } from "./workspace-query.service";
import { DocumentPermissionsService } from "../modules/documents/document-permissions.service";

@UseGuards(GqlJwtAuthGuard)
@Resolver()
export class WorkspaceResolver {
  constructor(
    private readonly queries: WorkspaceQueryService,
    private readonly documentsService: DocumentsService,
    private readonly foldersService: FoldersService,
    private readonly permissions: DocumentPermissionsService,
  ) {}

  @Query(() => WorkspaceType)
  workspace(@GqlCurrentUser() user: AuthenticatedUser) {
    return this.queries.workspace(user);
  }

  @Query(() => DocumentConnectionType)
  documents(
    @GqlCurrentUser() user: AuthenticatedUser,
    @Args("scope", {
      type: () => GraphqlDocumentScope,
      defaultValue: GraphqlDocumentScope.ALL,
    })
    scope: GraphqlDocumentScope,
    @Args("folderId", { nullable: true }) folderId?: string,
    @Args("search", { nullable: true }) search?: string,
    @Args("first", { type: () => Int, defaultValue: 20 }) first = 20,
    @Args("after", { nullable: true }) after?: string,
  ) {
    return this.queries.documents(scope, user, {
      folderId,
      search,
      first,
      after,
    });
  }

  @Query(() => DocumentType)
  document(
    @Args("id", { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.queries.document(id, user);
  }

  @Query(() => [FolderType])
  folders(@GqlCurrentUser() user: AuthenticatedUser) {
    return this.queries.folders(user);
  }

  @Query(() => SearchResultType)
  search(
    @Args("query") query: string,
    @Args("first", { type: () => Int, defaultValue: 20 }) first: number,
    @Args("after", { type: () => String, nullable: true }) after: string | undefined,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.queries.search(query, user, first, after);
  }

  @Query(() => [PermissionEntryType])
  documentPermissions(
    @Args("id", { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissions.listPermissions(id, user);
  }

  @Mutation(() => DocumentType)
  async updateDocument(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateDocumentInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documentsService.update(id, input, user);
    return this.queries.enrichDocument(document, user);
  }

  @Mutation(() => DocumentType)
  async restoreDocument(
    @Args("id", { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documentsService.restore(id, user);
    return this.queries.enrichDocument(document, user);
  }

  @Mutation(() => DocumentType)
  async toggleDocumentStar(
    @Args("id", { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documentsService.toggleStar(id, user);
    return this.queries.enrichDocument(document, user);
  }

  @Mutation(() => MutationStatusType)
  deleteDocument(
    @Args("id", { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.softDelete(id, user);
  }

  @Mutation(() => MutationStatusType)
  permanentlyDeleteDocument(
    @Args("id", { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.permanentDelete(id, user);
  }

  @Mutation(() => TrashStatusType)
  emptyTrash(@GqlCurrentUser() user: AuthenticatedUser) {
    return this.documentsService.emptyTrash(user);
  }

  @Mutation(() => FolderType)
  createFolder(
    @Args("input") input: CreateFolderInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.foldersService.create(
      { ...input, parentId: input.parentId ?? undefined },
      user.id,
    );
  }

  @Mutation(() => FolderType)
  updateFolder(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateFolderInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.foldersService.update(
      id,
      { ...input, parentId: input.parentId ?? undefined },
      user.id,
    );
  }

  @Mutation(() => MutationStatusType)
  deleteFolder(
    @Args("id", { type: () => ID }) id: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.foldersService.remove(id, user.id);
  }

  @Mutation(() => PermissionEntryType)
  grantDocumentPermission(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: CreateDocumentPermissionInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissions.addPermission(
      id,
      {
        email: input.email,
        groupId: input.groupId,
        role: input.role as "VIEWER" | "COMMENTER" | "EDITOR",
      },
      user,
    );
  }

  @Mutation(() => PermissionEntryType)
  updateDocumentPermission(
    @Args("id", { type: () => ID }) id: string,
    @Args("permissionId", { type: () => ID }) permissionId: string,
    @Args("input") input: UpdateDocumentPermissionInput,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissions.updatePermission(
      id,
      permissionId,
      { role: input.role as "VIEWER" | "COMMENTER" | "EDITOR" },
      user,
    );
  }

  @Mutation(() => MutationStatusType)
  revokeDocumentPermission(
    @Args("id", { type: () => ID }) id: string,
    @Args("permissionId", { type: () => ID }) permissionId: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissions.removePermission(id, permissionId, user);
  }
}

@Resolver(() => DocumentType)
export class DocumentFieldsResolver {
  @ResolveField(() => [DocumentVersionType])
  versions(
    @Parent() document: DocumentType,
    @Context() context: GraphqlContext,
    @Args("first", { type: () => Int, defaultValue: 20 }) first: number,
  ) {
    return context.loaders.versionsByDocumentId.load(document.id).then((items) =>
      items.slice(0, first),
    );
  }
}
