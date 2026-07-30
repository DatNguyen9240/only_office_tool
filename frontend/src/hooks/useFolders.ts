import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface FolderItem {
  id: string;
  name: string;
  count: number;
  parentId?: string;
}

export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: ({ signal }): Promise<FolderItem[]> =>
      apiRequest<FolderItem[]>("/folders", { signal }),
  });
}
