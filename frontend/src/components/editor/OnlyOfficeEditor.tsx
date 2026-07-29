import {
  CheckCircleOutlined,
  CloudServerOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { Alert, Space, Typography } from "antd";

export function OnlyOfficeEditor() {
  return (
    <div className="editor-fallback">
      <Alert
        showIcon
        type="info"
        message="Preview mode"
        description="The backend editor configuration is not connected yet."
      />
      <div className="document-paper">
        <div className="document-paper-heading">
          <FileTextOutlined />
          <span>OPERATING PLAN</span>
        </div>
        <Typography.Title>Q3 operating plan</Typography.Title>
        <Typography.Paragraph type="secondary">
          Prepared for the monthly operating review
        </Typography.Paragraph>
        <Typography.Title level={3}>Management summary</Typography.Title>
        <Typography.Paragraph>
          The third-quarter plan aligns operational capacity with the approved
          delivery schedule. Department owners should confirm milestones and
          dependencies before the review meeting.
        </Typography.Paragraph>
        <div className="document-callout">
          <CheckCircleOutlined />
          <div>
            <strong>Review focus</strong>
            <span>Confirm ownership, budget assumptions, and delivery dates.</span>
          </div>
        </div>
        <Typography.Title level={3}>Priority actions</Typography.Title>
        <ol>
          <li>Complete the finance and procurement dependency review.</li>
          <li>Confirm team capacity for the Harbor expansion workstream.</li>
          <li>Publish the approved plan to department managers.</li>
        </ol>
        <Space className="onlyoffice-setup-note">
          <CloudServerOutlined />
          <Typography.Text type="secondary">
            Connect the backend-generated ONLYOFFICE configuration to enable live editing.
          </Typography.Text>
        </Space>
      </div>
    </div>
  );
}
