import { useEffect, type PropsWithChildren } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthBootstrap({ children }: PropsWithChildren) {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const markUnauthenticated = useAuthStore((state) => state.markUnauthenticated);

  useEffect(() => {
    void bootstrap();
    const onExpired = () => markUnauthenticated();
    window.addEventListener("meridian-auth-expired", onExpired);
    return () => window.removeEventListener("meridian-auth-expired", onExpired);
  }, [bootstrap, markUnauthenticated]);

  return children;
}
