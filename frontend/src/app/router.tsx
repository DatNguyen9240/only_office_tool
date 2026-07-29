import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import {
  RouteSkeleton,
  type RouteSkeletonVariant,
} from "@/components/common/LoadingSkeletons";
import { AppLayout } from "@/components/layout/AppLayout";

const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const DocumentsPage = lazy(() =>
  import("@/pages/DocumentsPage").then((module) => ({ default: module.DocumentsPage })),
);
const TrashPage = lazy(() =>
  import("@/pages/TrashPage").then((module) => ({ default: module.TrashPage })),
);
const EditorPage = lazy(() =>
  import("@/pages/EditorPage").then((module) => ({ default: module.EditorPage })),
);
const WorkspacePage = lazy(() =>
  import("@/pages/WorkspacePage").then((module) => ({ default: module.WorkspacePage })),
);
const UsersPage = lazy(() =>
  import("@/pages/admin/UsersPage").then((module) => ({ default: module.UsersPage })),
);
const AuditPage = lazy(() =>
  import("@/pages/admin/AuditPage").then((module) => ({ default: module.AuditPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);

const load = (element: ReactNode, variant: RouteSkeletonVariant = "content") => (
  <Suspense fallback={<RouteSkeleton variant={variant} />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: load(<LoginPage />, "login"),
  },
  {
    path: "/editor/:id",
    element: load(<EditorPage />, "editor"),
  },
  {
    path: "/workspace",
    element: load(<WorkspacePage />, "workspace"),
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: load(<DashboardPage />) },
      { path: "documents", element: load(<DocumentsPage />) },
      { path: "shared", element: load(<DocumentsPage scope="shared" />) },
      { path: "trash", element: load(<TrashPage />) },
      { path: "admin/users", element: load(<UsersPage />) },
      { path: "admin/audit", element: load(<AuditPage />) },
      { path: "*", element: load(<NotFoundPage />) },
    ],
  },
]);
