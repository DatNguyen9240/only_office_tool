import { useQuery } from "@tanstack/react-query";
import { documents, trashDocuments } from "@/data/sampleData";
import type { DocumentItem } from "@share";
import { apiRequest, isApiConfigured } from "@/lib/api";

export function useDocuments(scope: "all" | "shared" | "trash" = "all") {
  return useQuery({
    queryKey: ["documents", scope],
    queryFn: async ({ signal }): Promise<DocumentItem[]> => {
      if (isApiConfigured) {
        return apiRequest<DocumentItem[]>(
          `/documents?scope=${encodeURIComponent(scope)}&limit=100`,
          { signal },
        );
      }

      if (scope === "trash") return trashDocuments;
      if (scope === "shared") return documents.filter((item) => item.shared);
      return documents;
    },
  });
}
