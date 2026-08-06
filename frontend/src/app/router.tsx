import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicOnly, RequireAuth, RequireRole } from "@/app/routeGuards";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { DocumentsPage } from "@/pages/documents/DocumentsPage";
import { TrashPage } from "@/pages/documents/TrashPage";
import { EditorPage } from "@/pages/documents/EditorPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { AuditPage } from "@/pages/admin/AuditPage";
import { NotFoundPage } from "@/pages/errors/NotFoundPage";
import { ShareLinkPage } from "@/pages/documents/ShareLinkPage";
import { SearchPage } from "@/pages/documents/SearchPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { GroupsPage } from "@/pages/admin/GroupsPage";
import { AssistantPage } from "@/pages/assistant/AssistantPage";
import { TemplatesPage } from "@/pages/documents/TemplatesPage";
import { MeetingRoomPage } from "@/pages/meetings/MeetingRoomPage";
import { MeetingPlaybackPage } from "@/pages/meetings/MeetingPlaybackPage";

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
    path: "/meetings/:meetingId",
    element: (
      <RequireAuth>
        <MeetingRoomPage />
      </RequireAuth>
    ),
  },
  {
    path: "/meetings/:meetingId/playback",
    element: (
      <RequireAuth>
        <MeetingPlaybackPage />
      </RequireAuth>
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
