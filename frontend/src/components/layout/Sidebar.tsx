import { CloudServerOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Progress, Space, Tooltip, Typography } from "antd";
import { useDashboard } from "@/hooks/useDashboard";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { data } = useDashboard();
  const storage = data?.storage;
  const percent = storage?.percent ?? 0;
  const storageLabel = storage
    ? `${formatBytes(storage.usedBytes)} of ${formatBytes(storage.totalBytes)} used`
    : "Storage unavailable";
  const storageSource =
    storage?.source === "configured_quota"
      ? "Configured quota"
      : "Live MinIO capacity";

  if (collapsed) {
    return (
      <Tooltip
        title={`${storageSource}: ${storageLabel}`}
        placement="right"
      >
        <div className="sidebar-storage-collapsed" aria-label="Storage usage">
          <CloudServerOutlined />
          <Progress
            type="circle"
            percent={percent}
            size={30}
            showInfo={false}
            strokeWidth={8}
          />
          <span className="sidebar-storage-collapsed-label">
            {storage ? formatBytes(storage.usedBytes) : "—"}
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="sidebar-footer">
      <div className="sidebar-storage-heading">
        <Space size={8}>
          <CloudServerOutlined />
          <Typography.Text strong>Storage</Typography.Text>
        </Space>
        <Typography.Text type="secondary">{percent}%</Typography.Text>
      </div>
      <Progress percent={percent} showInfo={false} size="small" />
      <Typography.Text type="secondary">{storageLabel}</Typography.Text>
      <Typography.Text type="secondary">{storageSource}</Typography.Text>
      <div className="sidebar-compliance">
        <SafetyCertificateOutlined />
        <Typography.Text type="secondary">Enterprise protected</Typography.Text>
      </div>
    </div>
  );
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
