import { useQuery } from "@tanstack/react-query";
import { folders as sampleFolders } from "@/data/sampleData";
import { apiRequest, isApiConfigured } from "@/lib/api";

export interface FolderItem {
  id: string;
  name: string;
  count: number;
  parentId?: string;
}

export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: async ({ signal }): Promise<FolderItem[]> => {
      if (isApiConfigured) {
        return apiRequest<FolderItem[]>("/folders", { signal });
      }
      return sampleFolders;
    },
  });
}
