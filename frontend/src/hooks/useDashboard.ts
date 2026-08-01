import { useWorkspace } from "@/hooks/useWorkspace";

export function useDashboard() {
  const workspace = useWorkspace();
  return { ...workspace, data: workspace.data?.dashboard };
}
