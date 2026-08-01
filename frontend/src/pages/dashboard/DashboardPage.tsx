import {
  ClockCircleOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  FolderOutlined,
  PlusOutlined,
  ShareAltOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import {
  Avatar,
  Button,
  Empty,
  List,
  Progress,
  Space,
  Statistic,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";
import { FileTable } from "@/components/file/Explorer/FileTable";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuthStore } from "@/store/useAuthStore";

const actionLabels: Record<string, string> = {
  LOGIN: "signed in",
  LOGOUT: "signed out",
  DOCUMENT_CREATED: "uploaded",
  DOCUMENT_UPDATED: "updated",
  DOCUMENT_DOWNLOADED: "downloaded",
  DOCUMENT_DELETED: "moved to trash",
  DOCUMENT_RESTORED: "restored",
  DOCUMENT_PERMANENTLY_DELETED: "permanently deleted",
  VERSION_RESTORED: "restored a version of",
  PERMISSION_GRANTED: "shared",
  PERMISSION_UPDATED: "changed access to",
  PERMISSION_REVOKED: "revoked access to",
  USER_CREATED: "created user",
  USER_UPDATED: "updated user",
  SESSIONS_REVOKED: "revoked sessions for",
};

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: workspace, isLoading: dashboardLoading } = useWorkspace();
  const documents = workspace?.recentDocuments.nodes ?? [];
  const dashboard = workspace?.dashboard;
  const metrics = [
    {
      title: "Documents",
      value: dashboard?.metrics.documents ?? 0,
      icon: <FileTextOutlined />,
      detail: `${dashboard?.metrics.folders ?? 0} folders`,
    },
    {
      title: "Shared with me",
      value: dashboard?.metrics.sharedWithMe ?? 0,
      icon: <ShareAltOutlined />,
      detail: "Documents shared directly with you",
    },
    {
      title: "Waiting for review",
      value: dashboard?.metrics.inReview ?? 0,
      icon: <ClockCircleOutlined />,
      detail: "Accessible documents in review",
    },
    {
      title: "Versions",
      value: dashboard?.metrics.versions ?? 0,
      icon: <FolderOutlined />,
      detail: "Stored versions in your documents",
    },
  ];
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <PageContainer
      ghost
      title={`${greeting}, ${user?.name ?? "User"}`}
      subTitle="Here is the current document activity across your workspace."
      extra={[
        <Button
          key="folder"
          icon={<PlusOutlined />}
          onClick={() => navigate("/documents")}
        >
          New folder
        </Button>,
        <Button
          key="upload"
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => navigate("/documents")}
        >
          Upload files
        </Button>,
      ]}
    >
      <section className="metric-strip" aria-label="Document metrics">
        {metrics.map((metric) => (
          <div className="metric-item" key={metric.title}>
            <div className="metric-icon">{metric.icon}</div>
            <Statistic
              loading={dashboardLoading}
              title={metric.title}
              value={metric.value}
            />
            <Typography.Text type="secondary">
              {metric.detail}
            </Typography.Text>
          </div>
        ))}
      </section>

      <div className="dashboard-grid">
        <ProCard
          title="Recent documents"
          extra={
            <Button type="link" onClick={() => navigate("/documents")}>
              View all
            </Button>
          }
          className="dashboard-recent"
          bodyStyle={{ padding: 0 }}
        >
            <FileTable
              compact
              loading={dashboardLoading}
              documents={documents.slice(0, 5)}
              onOpen={(document) => navigate(`/editor/${document.id}`)}
            />
        </ProCard>

        <div className="dashboard-side">
          <ProCard title="Recent activity" bodyStyle={{ padding: "0 20px" }}>
            <List
              className="activity-list"
              loading={dashboardLoading}
              locale={{ emptyText: <Empty description="No activity recorded yet" /> }}
              dataSource={dashboard?.activities ?? []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{initials(item.actor)}</Avatar>}
                    title={
                      <span>
                        <strong>{item.actor}</strong>{" "}
                        {actionLabels[item.action] ?? item.action.toLowerCase()}
                      </span>
                    }
                    description={
                      <>
                        <Typography.Text ellipsis>
                          {item.resource}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {formatActivityTime(item.timestamp)}
                        </Typography.Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </ProCard>
          <ProCard
            title={
              dashboard?.storage.source === "configured_quota"
                ? "Workspace storage quota"
                : "MinIO storage capacity"
            }
          >
            <div className="storage-summary">
              <Space align="center" size={12}>
                <span className="storage-icon">
                  <CloudServerOutlined />
                </span>
                <div>
                  <Typography.Text strong>
                    {formatBytes(dashboard?.storage.usedBytes ?? 0)} used
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    of {formatBytes(dashboard?.storage.totalBytes ?? 0)} total
                  </Typography.Text>
                </div>
              </Space>
              <Progress
                percent={dashboard?.storage.percent ?? 0}
                showInfo={false}
              />
              <div className="storage-legend">
                <span>
                  Free {formatBytes(dashboard?.storage.freeBytes ?? 0)}
                </span>
                <span>
                  This workspace{" "}
                  {formatBytes(dashboard?.storage.workspaceBytes ?? 0)}
                </span>
              </div>
              <Typography.Text type="secondary">
                {dashboard?.storage.source === "configured_quota"
                  ? "MinIO metrics unavailable; showing configured quota."
                  : "Capacity reported by MinIO metrics."}
              </Typography.Text>
            </div>
          </ProCard>
        </div>
      </div>
    </PageContainer>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** unit).toFixed(unit > 2 ? 1 : 0)} ${units[unit]}`;
}
