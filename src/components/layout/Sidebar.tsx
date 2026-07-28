import { CloudServerOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Progress, Space, Tooltip, Typography } from "antd";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  if (collapsed) {
    return (
      <Tooltip title="Storage: 68 GB of 100 GB used" placement="right">
        <div className="sidebar-storage-collapsed" aria-label="Storage usage">
          <CloudServerOutlined />
          <Progress
            type="circle"
            percent={68}
            size={30}
            showInfo={false}
            strokeWidth={8}
          />
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
        <Typography.Text type="secondary">68%</Typography.Text>
      </div>
      <Progress percent={68} showInfo={false} size="small" />
      <Typography.Text type="secondary">68 GB of 100 GB used</Typography.Text>
      <div className="sidebar-compliance">
        <SafetyCertificateOutlined />
        <Typography.Text type="secondary">Enterprise protected</Typography.Text>
      </div>
    </div>
  );
}
