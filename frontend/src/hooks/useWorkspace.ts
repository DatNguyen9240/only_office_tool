import { useQuery } from "@tanstack/react-query";
import type { DashboardResponse, DocumentItem } from "@share";
import { graphqlRequest } from "@/lib/graphql";
import workspaceQuery from "@/graphql/workspace.graphql?raw";

interface WorkspaceResponse {
  workspace: {
    dashboard: DashboardResponse;
    recentDocuments: {
      nodes: DocumentItem[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
}

export function useWorkspace() {
  return useQuery({
    queryKey: ["workspace"],
    queryFn: ({ signal }) =>
      graphqlRequest<WorkspaceResponse>(workspaceQuery, undefined, {
        operationName: "Workspace",
        signal,
      }),
    select: (response) => response.workspace,
  });
}
