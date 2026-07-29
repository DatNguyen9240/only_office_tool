import {
  BellOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SearchOutlined,
  StarOutlined,
  TeamOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Input,
  Layout,
  Menu,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { useI18n } from "@/i18n";
import { PreferenceControls } from "@/components/common/PreferenceControls";

export type WorkspaceSection = "drive" | "shared" | "recent" | "favorites" | "trash";

const workspaceNavDescriptors = [
  { key: "drive", labelKey: "nav.drive", icon: <FolderOpenOutlined /> },
  { key: "shared", labelKey: "nav.shared", icon: <TeamOutlined /> },
  { key: "recent", labelKey: "nav.recent", icon: <ClockCircleOutlined /> },
  { key: "favorites", labelKey: "nav.favorites", icon: <StarOutlined /> },
  { key: "trash", labelKey: "nav.trash", icon: <DeleteOutlined /> },
] as const;

interface WorkspaceSidebarProps {
  active: WorkspaceSection;
  collapsed: boolean;
  expandedOnTablet: boolean;
  onSelect: (section: WorkspaceSection) => void;
}

export function WorkspaceSidebar({
  active,
  collapsed,
  expandedOnTablet,
  onSelect,
}: WorkspaceSidebarProps) {
  const { t } = useI18n();
  const workspaceNavItems = workspaceNavDescriptors.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: t(item.labelKey),
  }));

  return (
    <Layout.Sider
      className={`workspace-sidebar${expandedOnTablet ? " tablet-expanded" : ""}`}
      theme="light"
      width={232}
      collapsedWidth={72}
      collapsed={collapsed && !expandedOnTablet}
      trigger={null}
    >
      <div className="workspace-brand">
        <span className="brand-mark">M</span>
        <span className="workspace-brand-copy">
          <strong>Meridian</strong>
          <small>{t("brand.workspace")}</small>
        </span>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[active]}
        items={workspaceNavItems}
        onClick={({ key }: { key: string }) => onSelect(key as WorkspaceSection)}
      />
      <div className="workspace-sidebar-help">
        <Typography.Text type="secondary">{t("nav.help")}</Typography.Text>
        <Button type="link" size="small">
          {t("nav.guide")}
        </Button>
      </div>
    </Layout.Sider>
  );
}

interface WorkspaceHeaderProps {
  searchValue: string;
  sidebarOpen: boolean;
  onSearch: (value: string) => void;
  onToggleSidebar: () => void;
  onCreateFolder: () => void;
  onUpload: () => void;
}

export function WorkspaceHeader({
  searchValue,
  sidebarOpen,
  onSearch,
  onToggleSidebar,
  onCreateFolder,
  onUpload,
}: WorkspaceHeaderProps) {
  const { t } = useI18n();

  return (
    <Layout.Header className="workspace-header">
      <Tooltip title={sidebarOpen ? t("header.collapseNav") : t("header.expandNav")}>
        <Button
          className="workspace-sidebar-toggle"
          type="text"
          aria-label={sidebarOpen ? t("header.collapseNav") : t("header.expandNav")}
          icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          onClick={onToggleSidebar}
        />
      </Tooltip>
      <Input
        className="workspace-search"
        aria-label="Search documents"
        allowClear
        prefix={<SearchOutlined />}
        placeholder={t("header.search")}
        value={searchValue}
        onChange={(event) => onSearch(event.target.value)}
      />
      <Space className="workspace-create-actions" size={8}>
        <Button icon={<PlusOutlined />} onClick={onCreateFolder}>
          <span className="workspace-action-label">{t("header.newFolder")}</span>
        </Button>
        <Button type="primary" icon={<UploadOutlined />} onClick={onUpload}>
          <span className="workspace-action-label">{t("header.upload")}</span>
        </Button>
      </Space>
      <PreferenceControls />
      <Tooltip title={t("header.notifications")}>
        <Badge dot offset={[-5, 5]}>
          <Button
            className="workspace-notification"
            type="text"
            aria-label={t("header.notifications")}
            icon={<BellOutlined />}
          />
        </Badge>
      </Tooltip>
      <Dropdown
        menu={{
          items: [
            { key: "profile", label: t("header.profile") },
            { key: "settings", label: t("header.settings") },
            { type: "divider" },
            { key: "logout", label: t("header.signOut") },
          ],
        }}
      >
        <button className="workspace-account" type="button" aria-label={t("header.userMenu")}>
          <Avatar size={32}>AV</Avatar>
          <span>
            <strong>Anika Verma</strong>
            <small>Operations</small>
          </span>
        </button>
      </Dropdown>
    </Layout.Header>
  );
}

interface WorkspaceBottomNavProps {
  active: WorkspaceSection;
  onSelect: (section: WorkspaceSection) => void;
}

export function WorkspaceBottomNav({ active, onSelect }: WorkspaceBottomNavProps) {
  const { t } = useI18n();
  return (
    <nav className="workspace-bottom-nav" aria-label={t("nav.destinations")}>
      {workspaceNavDescriptors.map((item) => (
        <button
          key={item.key}
          type="button"
          className={active === item.key ? "active" : ""}
          aria-current={active === item.key ? "page" : undefined}
          onClick={() => onSelect(item.key as WorkspaceSection)}
        >
          {item.icon}
          <span>{item.key === "shared" ? t("nav.sharedShort") : t(item.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
