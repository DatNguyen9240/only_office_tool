import { useQuery } from "@tanstack/react-query";
import type { DocumentItem } from "@share";
import { apiRequest } from "@/lib/api";

export type DocumentScope =
  | "all"
  | "shared"
  | "trash"
  | "recent"
  | "favorites";

export function useDocuments(scope: DocumentScope = "all") {
  return useQuery({
    queryKey: ["documents", scope],
    queryFn: ({ signal }): Promise<DocumentItem[]> =>
      apiRequest<DocumentItem[]>(
        `/documents?scope=${encodeURIComponent(scope)}&limit=100`,
        { signal },
      ),
  });
}
