import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicOnly, RequireAuth, RequireRole } from "@/app/routeGuards";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { TrashPage } from "@/pages/TrashPage";
import { EditorPage } from "@/pages/EditorPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { AuditPage } from "@/pages/admin/AuditPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: "/editor/:id",
    element: (
      <RequireAuth>
        <EditorPage />
      </RequireAuth>
    ),
  },
  {
    path: "/workspace",
    element: (
      <RequireAuth>
        <Navigate to="/documents" replace />
      </RequireAuth>
    ),
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "shared", element: <DocumentsPage scope="shared" /> },
      { path: "trash", element: <TrashPage /> },
      {
        path: "admin/users",
        element: (
          <RequireRole roles={["ADMINISTRATOR"]}>
            <UsersPage />
          </RequireRole>
        ),
      },
      {
        path: "admin/audit",
        element: (
          <RequireRole roles={["ADMINISTRATOR"]}>
            <AuditPage />
          </RequireRole>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
