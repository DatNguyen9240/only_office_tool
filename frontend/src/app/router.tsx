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
import { ShareLinkPage } from "@/pages/ShareLinkPage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { GroupsPage } from "@/pages/admin/GroupsPage";
import { AssistantPage } from "@/pages/AssistantPage";
import { TemplatesPage } from "@/pages/TemplatesPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  { path: "/share/:token", element: <ShareLinkPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ForgotPasswordPage /> },
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
      { path: "search", element: <SearchPage /> },
      { path: "assistant", element: <AssistantPage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "shared", element: <DocumentsPage scope="shared" /> },
      { path: "recent", element: <DocumentsPage scope="recent" /> },
      { path: "favorites", element: <DocumentsPage scope="favorites" /> },
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
        path: "admin/groups",
        element: (
          <RequireRole roles={["ADMINISTRATOR"]}>
            <GroupsPage />
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
