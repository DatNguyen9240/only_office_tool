import { useQuery } from "@tanstack/react-query";
import { documents, trashDocuments } from "@/data/sampleData";
import type { DocumentItem } from "@share";

const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function useDocuments(scope: "all" | "shared" | "trash" = "all") {
  return useQuery({
    queryKey: ["documents", scope],
    queryFn: async ({ signal }): Promise<DocumentItem[]> => {
      if (apiUrl) {
        const response = await fetch(
          `${apiUrl}/documents?scope=${encodeURIComponent(scope)}&limit=100`,
          { signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) {
          throw new Error(`Documents request failed (${response.status})`);
        }
        return (await response.json()) as DocumentItem[];
      }

      if (scope === "trash") return trashDocuments;
      if (scope === "shared") return documents.filter((item) => item.shared);
      return documents;
    },
  });
}
