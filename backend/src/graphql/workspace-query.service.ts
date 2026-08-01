import { Injectable, NotFoundException } from "@nestjs/common";
import type { DocumentItem } from "@share";
import type { AuthenticatedUser } from "../core/auth/auth.types";
import { DashboardService } from "../modules/dashboard/dashboard.service";
import { DocumentCapabilitiesService } from "../modules/documents/document-capabilities.service";
import { DocumentsService } from "../modules/documents/documents.service";
import { FoldersService } from "../modules/folders/folders.service";
import { SearchService } from "../modules/search/search.service";
import type { GraphqlDocumentScope } from "./graphql.types";

@Injectable()
export class WorkspaceQueryService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly documentsService: DocumentsService,
    private readonly foldersService: FoldersService,
    private readonly searchService: SearchService,
    private readonly capabilitiesService: DocumentCapabilitiesService,
  ) {}

  async workspace(user: AuthenticatedUser) {
    const [dashboard, folders, recent] = await Promise.all([
      this.dashboardService.get(user),
      this.foldersService.list(user),
      this.documentsService.listConnection("recent", user, { first: 5 }),
    ]);
    return {
      dashboard,
      folders,
      recentDocuments: {
        ...recent,
        nodes: await this.withCapabilities(recent.nodes, user),
      },
    };
  }

  async documents(
    scope: GraphqlDocumentScope,
    user: AuthenticatedUser,
    options: { folderId?: string; search?: string; first?: number; after?: string },
  ) {
    const connection = await this.documentsService.listConnection(
      scope,
      user,
      options,
    );
    return {
      ...connection,
      nodes: await this.withCapabilities(connection.nodes, user, {
        includeDeleted: scope === "trash",
      }),
    };
  }

  async document(id: string, user: AuthenticatedUser) {
    const [document, capabilities] = await Promise.all([
      this.documentsService.getById(id, user),
      this.capabilitiesService.forDocument(id, user),
    ]);
    return this.toGraphqlDocument(document, capabilities);
  }

  async enrichDocument(
    document: DocumentItem,
    user: AuthenticatedUser,
    options: { includeDeleted?: boolean } = {},
  ) {
    const capabilities = await this.capabilitiesService.forDocument(
      document.id,
      user,
      options,
    );
    return this.toGraphqlDocument(document, capabilities);
  }

  folders(user: AuthenticatedUser) {
    return this.foldersService.list(user);
  }

  async search(
    query: string,
    user: AuthenticatedUser,
    first: number,
    after?: string,
  ) {
    const result = await this.searchService.search(
      query,
      user,
      Math.min(Math.max(first, 1), 50),
      after,
    );
    return {
      ...result,
      documents: await this.withCapabilities(result.documents, user),
    };
  }

  private async withCapabilities(
    documents: DocumentItem[],
    user: AuthenticatedUser,
    options: { includeDeleted?: boolean } = {},
  ) {
    const capabilities = await this.capabilitiesService.forDocuments(
      documents.map((document) => document.id),
      user,
      options,
    );
    return documents.map((document) => {
      const value = capabilities.get(document.id);
      if (!value) throw new NotFoundException("Document not found");
      return this.toGraphqlDocument(document, value);
    });
  }

  private toGraphqlDocument(
    document: DocumentItem,
    viewerCapabilities: {
      canView: boolean;
      canComment: boolean;
      canEdit: boolean;
      canShare: boolean;
      canDelete: boolean;
    },
  ) {
    return {
      ...document,
      tags: document.tags ?? [],
      viewerCapabilities,
    };
  }
}
