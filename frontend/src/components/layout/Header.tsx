import {
  BellOutlined,
  MenuOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Empty,
  Input,
  List,
  Popover,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { apiRequest } from "@/lib/api";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationResponse {
  items: NotificationItem[];
  unreadCount: number;
}

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/documents": "Documents",
  "/shared": "Shared with me",
  "/recent": "Recent",
  "/favorites": "Favorites",
  "/trash": "Trash",
  "/admin/users": "User management",
  "/admin/groups": "Group management",
  "/admin/audit": "Audit logs",
  "/search": "Search",
  "/assistant": "AI assistant",
  "/templates": "Templates",
  "/settings": "Profile and security",
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const collapsed = useAppStore((state) => state.collapsed);
  const setCollapsed = useAppStore((state) => state.setCollapsed);
  const selectDocument = useAppStore((state) => state.selectDocument);
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<NotificationResponse>("/notifications?limit=20"),
    refetchInterval: 30_000,
  });
  const routeLabel = routeLabels[location.pathname] ?? "Meridian DMS";

  return (
    <div className="global-header">
      <Button
        className="mobile-menu-trigger"
        type="text"
        icon={<MenuOutlined />}
        aria-label="Open navigation"
        onClick={() => setCollapsed(!collapsed)}
      />
      <div className="header-route-label">{routeLabel}</div>
      <Input
        allowClear
        className="global-search"
        prefix={<SearchOutlined />}
        aria-label="Search all documents"
        placeholder="Search documents, folders, and people"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onPressEnter={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
      />
      <Space size={4}>
        <Tooltip title="Help center is not available yet">
          <Button
            className="header-secondary-action"
            disabled
            type="text"
            icon={<QuestionCircleOutlined />}
            aria-label="Help center"
          />
        </Tooltip>
        <Popover
          trigger="click"
          placement="bottomRight"
          title={
            <div className="notification-heading">
              <Typography.Text strong>Notifications</Typography.Text>
              <Button
                size="small"
                type="link"
                disabled={!notifications?.unreadCount}
                onClick={async () => {
                  await apiRequest("/notifications/read-all", {
                    method: "PATCH",
                  });
                  await refetchNotifications();
                }}
              >
                Mark all read
              </Button>
            </div>
          }
          content={
            <List
              className="notification-list"
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="You're all caught up"
                  />
                ),
              }}
              dataSource={notifications?.items ?? []}
              renderItem={(notification) => (
                <List.Item
                  className={notification.readAt ? "" : "is-unread"}
                  onClick={async () => {
                    if (!notification.readAt) {
                      await apiRequest(`/notifications/${notification.id}/read`, {
                        method: "PATCH",
                      });
                      await refetchNotifications();
                    }
                    if (
                      notification.resourceType === "DOCUMENT" &&
                      notification.resourceId
                    ) {
                      selectDocument(notification.resourceId);
                      navigate(
                        `/documents?documentId=${encodeURIComponent(notification.resourceId)}`,
                      );
                    }
                  }}
                >
                  <List.Item.Meta
                    title={notification.title}
                    description={
                      <>
                        {notification.body && (
                          <Typography.Paragraph ellipsis={{ rows: 2 }}>
                            {notification.body}
                          </Typography.Paragraph>
                        )}
                        <Typography.Text type="secondary">
                          {new Date(notification.createdAt).toLocaleString()}
                        </Typography.Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          }
        >
          <Badge
            count={notifications?.unreadCount ?? 0}
            size="small"
            overflowCount={99}
          >
            <Button
              className="header-secondary-action"
              type="text"
              icon={<BellOutlined />}
              aria-label="Notifications"
            />
          </Badge>
        </Popover>
        <Dropdown
          menu={{
            items: [
              {
                key: "profile",
                label: "Profile and settings",
                onClick: () => navigate("/settings?tab=profile"),
              },
              {
                key: "security",
                label: "Security",
                onClick: () => navigate("/settings?tab=security"),
              },
              { type: "divider" },
              {
                key: "signout",
                label: "Sign out",
                onClick: () => {
                  void logout().then(() => navigate("/login", { replace: true }));
                },
              },
            ],
          }}
          trigger={["click"]}
        >
          <button className="account-trigger" aria-label="Open account menu">
            <Avatar size={32}>
              {user?.name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "U"}
            </Avatar>
            <span className="account-copy">
              <strong>{user?.name || "User"}</strong>
              <small>{user?.role || "Employee"}</small>
            </span>
          </button>
        </Dropdown>
      </Space>
    </div>
  );
}
