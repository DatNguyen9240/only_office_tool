import { useInfiniteQuery } from "@tanstack/react-query";
import type { DocumentItem } from "@share";
import { toGraphqlDocumentScope, type DocumentScope } from "@/hooks/useDocuments";
import { graphqlRequest } from "@/lib/graphql";
import browserQuery from "@/graphql/document-browser.graphql?raw";

interface DocumentBrowserOptions {
  folderId?: string;
  search?: string;
}

interface BrowserResponse {
  documents: {
    nodes: DocumentItem[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
  folders: Array<{ id: string; name: string; parentId: string | null; count: number | null }>;
}

interface BrowserVariables {
  scope: string;
  first: number;
  after?: string | null;
  folderId?: string;
  search?: string;
}

interface BrowserData {
  documents: DocumentItem[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  folders: Array<{ id: string; name: string; parentId?: string; count: number }>;
}

export function useDocumentBrowser(
  scope: DocumentScope = "all",
  options: DocumentBrowserOptions = {},
) {
  const folderId = options.folderId;
  const search = options.search?.trim() || undefined;

  return useInfiniteQuery<
    BrowserResponse,
    Error,
    BrowserData,
    readonly ["documents", "browser", DocumentScope, string | null, string],
    string | null
  >({
    queryKey: ["documents", "browser", scope, folderId ?? null, search ?? ""] as const,
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) =>
      graphqlRequest<BrowserResponse, BrowserVariables>(
        browserQuery,
        {
          scope: toGraphqlDocumentScope(scope),
          first: 50,
          ...(pageParam ? { after: pageParam } : {}),
          ...(folderId ? { folderId } : {}),
          ...(search ? { search } : {}),
        },
        { operationName: "DocumentBrowser", signal },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.documents.pageInfo.hasNextPage
        ? lastPage.documents.pageInfo.endCursor ?? undefined
        : undefined,
    select: (response) => ({
      documents: response.pages.flatMap((page) => page.documents.nodes),
      pageInfo: response.pages[response.pages.length - 1]?.documents.pageInfo ?? {
        hasNextPage: false,
        endCursor: null,
      },
      folders: (response.pages[0]?.folders ?? []).map((folder) => ({
        ...folder,
        parentId: folder.parentId ?? undefined,
        count: folder.count ?? 0,
      })),
    }),
  });
}
