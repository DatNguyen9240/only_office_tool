import {
  BellOutlined,
  MenuOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Button, Dropdown, Input, Space, Tooltip } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";

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
        <Tooltip title="Help center">
          <Button type="text" icon={<QuestionCircleOutlined />} aria-label="Help center" />
        </Tooltip>
        <Tooltip title="Notifications">
          <Badge dot offset={[-7, 8]}>
            <Button type="text" icon={<BellOutlined />} aria-label="Notifications" />
          </Badge>
        </Tooltip>
        <Dropdown
          menu={{
            items: [
              { key: "profile", label: "Profile and settings" },
              { key: "security", label: "Security" },
              { type: "divider" },
              { key: "signout", label: "Sign out", onClick: () => navigate("/login") },
            ],
          }}
          trigger={["click"]}
        >
          <button className="account-trigger" aria-label="Open account menu">
            <Avatar size={32}>AV</Avatar>
            <span className="account-copy">
              <strong>Anika Verma</strong>
              <small>Operations manager</small>
            </span>
          </button>
        </Dropdown>
      </Space>
    </div>
  );
}
