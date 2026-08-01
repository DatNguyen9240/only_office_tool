/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type DocumentScope =
  | 'ALL'
  | 'FAVORITES'
  | 'RECENT'
  | 'SHARED'
  | 'TRASH';

export type DocumentBrowserQueryVariables = Exact<{
  scope: DocumentScope;
  first: number;
  after?: string | null | undefined;
  folderId?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type DocumentBrowserQuery = { documents: { nodes: Array<{ id: string, version: number, name: string, type: string, owner: string, modifiedAt: string, size: string, status: string, folderId: string, shared: boolean, starred: boolean | null, deletedAt: string | null, permission: string | null, tags: Array<{ id: string, name: string, color: string | null }>, viewerCapabilities: { canView: boolean, canComment: boolean, canEdit: boolean, canShare: boolean, canDelete: boolean } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }, folders: Array<{ id: string, name: string, parentId: string | null, count: number | null }> };

export type DocumentDetailQueryVariables = Exact<{
  id: string | number;
}>;


export type DocumentDetailQuery = { document: { id: string, version: number, name: string, type: string, owner: string, modifiedAt: string, size: string, status: string, folderId: string, shared: boolean, starred: boolean | null, permission: string | null, tags: Array<{ id: string, name: string, color: string | null }>, viewerCapabilities: { canView: boolean, canComment: boolean, canEdit: boolean, canShare: boolean, canDelete: boolean }, versions: Array<{ id: string, version: number, versionLabel: string, modifiedAt: string, author: string, size: string }> } };

export type DocumentsQueryVariables = Exact<{
  scope: DocumentScope;
  first: number;
  after?: string | null | undefined;
}>;


export type DocumentsQuery = { documents: { nodes: Array<{ id: string, version: number, name: string, type: string, owner: string, modifiedAt: string, size: string, status: string, folderId: string, shared: boolean, starred: boolean | null, deletedAt: string | null, permission: string | null, tags: Array<{ id: string, name: string, color: string | null }>, viewerCapabilities: { canView: boolean, canComment: boolean, canEdit: boolean, canShare: boolean, canDelete: boolean } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type FoldersQueryVariables = Exact<{ [key: string]: never; }>;


export type FoldersQuery = { folders: Array<{ id: string, name: string, parentId: string | null, count: number | null }> };

export type SearchQueryVariables = Exact<{
  query: string;
  first: number;
  after?: string | null | undefined;
}>;


export type SearchQuery = { search: { documents: Array<{ id: string, version: number, name: string, type: string, owner: string, modifiedAt: string, size: string, status: string, folderId: string, shared: boolean, starred: boolean | null, permission: string | null, tags: Array<{ id: string, name: string, color: string | null }>, viewerCapabilities: { canView: boolean, canComment: boolean, canEdit: boolean, canShare: boolean, canDelete: boolean } }>, folders: Array<{ id: string, name: string, parentId: string | null }>, people: Array<{ id: string, name: string, email: string, department: string | null }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type WorkspaceQueryVariables = Exact<{ [key: string]: never; }>;


export type WorkspaceQuery = { workspace: { dashboard: { metrics: { documents: number, folders: number, sharedWithMe: number, inReview: number, versions: number }, storage: { source: string, usedBytes: number, totalBytes: number, freeBytes: number, workspaceBytes: number, documentsBytes: number, versionsBytes: number, percent: number, measuredAt: string | null }, activities: Array<{ id: string, actor: string, action: string, resource: string, timestamp: string, outcome: string }> }, recentDocuments: { nodes: Array<{ id: string, version: number, name: string, type: string, owner: string, modifiedAt: string, size: string, status: string, folderId: string, shared: boolean, starred: boolean | null, permission: string | null, tags: Array<{ id: string, name: string, color: string | null }>, viewerCapabilities: { canView: boolean, canComment: boolean, canEdit: boolean, canShare: boolean, canDelete: boolean } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } } };
