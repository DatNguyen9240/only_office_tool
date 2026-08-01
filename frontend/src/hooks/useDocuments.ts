import { useInfiniteQuery } from "@tanstack/react-query";
import type { DocumentItem } from "@share";
import { graphqlRequest } from "@/lib/graphql";
import documentsQuery from "@/graphql/documents.graphql?raw";

export type DocumentScope =
  | "all"
  | "shared"
  | "trash"
  | "recent"
  | "favorites";

export function toGraphqlDocumentScope(scope: DocumentScope) {
  return scope.toUpperCase();
}

interface DocumentsResponse {
  documents: {
    nodes: DocumentItem[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface DocumentsVariables {
  scope: string;
  first: number;
  after?: string | null;
}

export function useDocuments(scope: DocumentScope = "all") {
  return useInfiniteQuery<
    DocumentsResponse,
    Error,
    DocumentItem[],
    readonly ["documents", DocumentScope],
    string | null
  >({
    queryKey: ["documents", scope] as const,
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) =>
      graphqlRequest<DocumentsResponse, DocumentsVariables>(
        documentsQuery,
        {
          scope: toGraphqlDocumentScope(scope),
          first: 50,
          ...(pageParam ? { after: pageParam } : {}),
        },
        { operationName: "Documents", signal },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.documents.pageInfo.hasNextPage
        ? lastPage.documents.pageInfo.endCursor ?? undefined
        : undefined,
    select: (data) =>
      data.pages.flatMap((page) => page.documents.nodes),
  });
}
