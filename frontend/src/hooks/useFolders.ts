import { useQuery } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/graphql";
import foldersQuery from "@/graphql/folders.graphql?raw";

export interface FolderItem {
  id: string;
  name: string;
  count: number;
  parentId?: string;
}

export function useFolders(enabled = true) {
  return useQuery({
    queryKey: ["folders"],
    enabled,
    queryFn: ({ signal }): Promise<FolderItem[]> =>
      graphqlRequest<{ folders: Array<FolderItem & { parentId: string | null; count: number | null }> }>(
        foldersQuery,
        undefined,
        { operationName: "Folders", signal },
      ).then((response) =>
        response.folders.map((folder) => ({
          ...folder,
          parentId: folder.parentId ?? undefined,
          count: folder.count ?? 0,
        })),
      ),
  });
}
