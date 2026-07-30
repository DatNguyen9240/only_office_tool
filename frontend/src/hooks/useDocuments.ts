import { useQuery } from "@tanstack/react-query";
import type { DocumentItem } from "@share";
import { apiRequest } from "@/lib/api";

export function useDocuments(scope: "all" | "shared" | "trash" = "all") {
  return useQuery({
    queryKey: ["documents", scope],
    queryFn: ({ signal }): Promise<DocumentItem[]> =>
      apiRequest<DocumentItem[]>(
        `/documents?scope=${encodeURIComponent(scope)}&limit=100`,
        { signal },
      ),
  });
}
