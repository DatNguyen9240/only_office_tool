import {
  BellOutlined,
  MenuOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Input, Space, Tooltip } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/documents": "Documents",
  "/shared": "Shared with me",
  "/trash": "Trash",
  "/admin/users": "User management",
  "/admin/audit": "Audit logs",
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const collapsed = useAppStore((state) => state.collapsed);
  const setCollapsed = useAppStore((state) => state.setCollapsed);
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
        onPressEnter={() => navigate(`/documents?q=${encodeURIComponent(query)}`)}
      />
      <Space size={4}>
        <Tooltip title="Help center is not available yet">
          <Button
            disabled
            type="text"
            icon={<QuestionCircleOutlined />}
            aria-label="Help center"
          />
        </Tooltip>
        <Tooltip title="Notifications are not available yet">
          <Button
            disabled
            type="text"
            icon={<BellOutlined />}
            aria-label="Notifications"
          />
        </Tooltip>
        <Dropdown
          menu={{
            items: [
              {
                key: "profile",
                label: "Profile and settings",
                disabled: true,
              },
              { key: "security", label: "Security", disabled: true },
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
