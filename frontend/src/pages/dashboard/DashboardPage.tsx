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
import { useI18n } from "@/i18n";

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
  const { locale, t } = useI18n();
  const { data: workspace, isLoading: dashboardLoading } = useWorkspace();
  const documents = workspace?.recentDocuments.nodes ?? [];
  const dashboard = workspace?.dashboard;

  const actionLabelsVi: Record<string, string> = {
    DOCUMENT_CREATED: "đã tạo",
    DOCUMENT_UPDATED: "đã chỉnh sửa",
    DOCUMENT_DOWNLOADED: "đã tải xuống",
    DOCUMENT_DELETED: "đã chuyển vào thùng rác",
    DOCUMENT_RESTORED: "đã khôi phục",
    DOCUMENT_PERMANENTLY_DELETED: "đã xóa vĩnh viễn",
    VERSION_RESTORED: "đã khôi phục phiên bản của",
    PERMISSION_GRANTED: "đã chia sẻ",
    PERMISSION_UPDATED: "đã thay đổi quyền truy cập của",
    PERMISSION_REVOKED: "đã thu hồi quyền truy cập của",
    USER_CREATED: "đã tạo người dùng",
    USER_UPDATED: "đã cập nhật người dùng",
    SESSIONS_REVOKED: "đã thu hồi phiên đăng nhập của",
  };

  const getActionLabel = (action: string) => {
    if (locale === "vi") {
      return actionLabelsVi[action] ?? action.toLowerCase();
    }
    return actionLabels[action] ?? action.toLowerCase();
  };

  const metrics = [
    {
      title: t("filter.documents"),
      value: dashboard?.metrics.documents ?? 0,
      icon: <FileTextOutlined />,
      detail: locale === "vi" ? `${dashboard?.metrics.folders ?? 0} thư mục` : `${dashboard?.metrics.folders ?? 0} folders`,
    },
    {
      title: t("nav.shared"),
      value: dashboard?.metrics.sharedWithMe ?? 0,
      icon: <ShareAltOutlined />,
      detail: locale === "vi" ? "Tài liệu chia sẻ trực tiếp với bạn" : "Documents shared directly with you",
    },
    {
      title: locale === "vi" ? "Chờ xem xét" : "Waiting for review",
      value: dashboard?.metrics.inReview ?? 0,
      icon: <ClockCircleOutlined />,
      detail: locale === "vi" ? "Tài liệu đang trong quá trình xem xét" : "Accessible documents in review",
    },
    {
      title: t("details.versions"),
      value: dashboard?.metrics.versions ?? 0,
      icon: <FolderOutlined />,
      detail: locale === "vi" ? "Phiên bản đã lưu trong tài liệu" : "Stored versions in your documents",
    },
  ];

  const hour = new Date().getHours();
  const greeting = locale === "vi"
    ? (hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối")
    : (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

  return (
    <PageContainer
      ghost
      title={`${greeting}, ${user?.name ?? "User"}`}
      subTitle={locale === "vi" ? "Tổng quan hoạt động tài liệu gần đây trong không gian làm việc của bạn." : "Here is the current document activity across your workspace."}
      extra={[
        <Button
          key="folder"
          icon={<PlusOutlined />}
          onClick={() => navigate("/documents")}
        >
          {t("folders.new")}
        </Button>,
        <Button
          key="upload"
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => navigate("/documents")}
        >
          {t("upload.title")}
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
          title={t("page.recent.collection")}
          extra={
            <Button type="link" onClick={() => navigate("/documents")}>
              {t("shared.viewAll")}
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
          <ProCard title={t("activity.title")} bodyStyle={{ padding: "0 20px" }}>
            <List
              className="activity-list"
              loading={dashboardLoading}
              locale={{ emptyText: <Empty description={locale === "vi" ? "Chưa có hoạt động nào được ghi nhận" : "No activity recorded yet"} /> }}
              dataSource={dashboard?.activities ?? []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{initials(item.actor)}</Avatar>}
                    title={
                      <span>
                        <strong>{item.actor}</strong>{" "}
                        {getActionLabel(item.action)}
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
                ? (locale === "vi" ? "Định mức lưu trữ không gian" : "Workspace storage quota")
                : (locale === "vi" ? "Dung lượng lưu trữ MinIO" : "MinIO storage capacity")
            }
          >
            <div className="storage-summary">
              <Space align="center" size={12}>
                <span className="storage-icon">
                  <CloudServerOutlined />
                </span>
                <div>
                  <Typography.Text strong>
                    {formatBytes(dashboard?.storage.usedBytes ?? 0)} {locale === "vi" ? "đã dùng" : "used"}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {locale === "vi" ? "trên tổng số" : "of"} {formatBytes(dashboard?.storage.totalBytes ?? 0)}
                  </Typography.Text>
                </div>
              </Space>
              <Progress
                percent={dashboard?.storage.percent ?? 0}
                showInfo={false}
              />
              <div className="storage-legend">
                <span>
                  {locale === "vi" ? "Còn trống" : "Free"} {formatBytes(dashboard?.storage.freeBytes ?? 0)}
                </span>
                <span>
                  {locale === "vi" ? "Không gian này" : "This workspace"}{" "}
                  {formatBytes(dashboard?.storage.workspaceBytes ?? 0)}
                </span>
              </div>
              <Typography.Text type="secondary">
                {dashboard?.storage.source === "configured_quota"
                  ? (locale === "vi" ? "Chỉ số MinIO không khả dụng; hiển thị định mức được cấu hình." : "MinIO metrics unavailable; showing configured quota.")
                  : (locale === "vi" ? "Dung lượng do MinIO báo cáo." : "Capacity reported by MinIO metrics.")}
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
