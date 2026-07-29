import { useQuery } from "@tanstack/react-query";
import { documents, trashDocuments } from "@/data/sampleData";

const delay = (duration = 280) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

export function useDocuments(scope: "all" | "shared" | "trash" = "all") {
  return useQuery({
    queryKey: ["documents", scope],
    queryFn: async () => {
      await delay();
      if (scope === "trash") return trashDocuments;
      if (scope === "shared") return documents.filter((item) => item.shared);
      return documents;
    },
  });
}
