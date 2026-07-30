import { useQuery } from "@tanstack/react-query";
import type { DashboardResponse } from "@share";
import { apiRequest } from "@/lib/api";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) =>
      apiRequest<DashboardResponse>("/dashboard", { signal }),
  });
}
