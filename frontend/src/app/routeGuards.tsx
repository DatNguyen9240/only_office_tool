import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { RouteSkeleton } from "@/components/common/LoadingSkeletons";
import type { AuthRole } from "@share";
import { useAuthStore } from "@/store/useAuthStore";

export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);

  if (status === "loading") return <RouteSkeleton variant="content" />;
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export function PublicOnly({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  if (status === "loading") return <RouteSkeleton variant="login" />;
  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  return children;
}

export function RequireRole({
  roles,
  children,
}: PropsWithChildren<{ roles: AuthRole[] }>) {
  const user = useAuthStore((state) => state.user);
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
