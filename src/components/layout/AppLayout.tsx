import {
  AuditOutlined,
  DashboardOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ShareAltOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { ProLayout } from "@ant-design/pro-components";
import { useMemo, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

const route = {
  path: "/",
  children: [
    { path: "/dashboard", name: "Dashboard", icon: <DashboardOutlined /> },
    { path: "/documents", name: "Documents", icon: <FileTextOutlined /> },
    { path: "/shared", name: "Shared with me", icon: <ShareAltOutlined /> },
    { path: "/trash", name: "Trash", icon: <DeleteOutlined /> },
    {
      path: "/admin",
      name: "Administration",
      icon: <TeamOutlined />,
      children: [
        { path: "/admin/users", name: "Users", icon: <TeamOutlined /> },
        { path: "/admin/audit", name: "Audit logs", icon: <AuditOutlined /> },
      ],
    },
  ],
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useAppStore((state) => state.collapsed);
  const setCollapsed = useAppStore((state) => state.setCollapsed);

  const selectedKeys = useMemo(() => [location.pathname], [location.pathname]);

  return (
    <ProLayout
      title="Meridian DMS"
      logo={<span className="brand-mark">M</span>}
      route={route}
      location={{ pathname: location.pathname }}
      layout="side"
      fixedHeader
      fixSiderbar
      collapsed={collapsed}
      selectedKeys={selectedKeys}
      breakpoint="lg"
      siderWidth={248}
      headerHeight={64}
      headerRender={false}
      collapsedButtonRender={false}
      onCollapse={setCollapsed}
      onMenuHeaderClick={() => navigate("/dashboard")}
      menuItemRender={(item: { path?: string }, defaultDom: ReactNode) => (
        <button
          className="menu-link-button"
          onClick={() => item.path && navigate(item.path)}
        >
          {defaultDom}
        </button>
      )}
      menuFooterRender={() => <Sidebar collapsed={collapsed} />}
      token={{
        header: {
          colorBgHeader: "#ffffff",
          colorHeaderTitle: "#172033",
          heightLayoutHeader: 64,
        },
        sider: {
          colorMenuBackground: "#ffffff",
          colorTextMenu: "#465268",
          colorTextMenuSelected: "#275dad",
          colorBgMenuItemSelected: "#eaf1fb",
        },
        pageContainer: {
          paddingInlinePageContainerContent: 24,
          paddingBlockPageContainerContent: 24,
        },
      }}
    >
      <div className="app-content-shell">
        <div className="app-content-header">
          <Header />
        </div>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </ProLayout>
  );
}
