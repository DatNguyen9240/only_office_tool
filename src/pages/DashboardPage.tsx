import {
  ClockCircleOutlined,
  CloudServerOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  PlusOutlined,
  ShareAltOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import {
  Avatar,
  Button,
  List,
  Progress,
  Space,
  Statistic,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";
import { activities } from "@/data/sampleData";
import { useDocuments } from "@/hooks/useDocuments";
import { FileTable } from "@/components/documents/FileTable";

const metrics = [
  { title: "Documents", value: 1842, icon: <FileTextOutlined />, detail: "Across 46 folders" },
  { title: "Shared with me", value: 28, icon: <ShareAltOutlined />, detail: "6 updated this week" },
  { title: "Waiting for review", value: 7, icon: <ClockCircleOutlined />, detail: "2 due today" },
  { title: "Approved this month", value: 34, icon: <FileDoneOutlined />, detail: "Across 5 teams" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useDocuments();

  return (
    <PageContainer
      ghost
      title="Good morning, Anika"
      subTitle="Here is the current document activity across your workspace."
      extra={[
        <Button key="folder" icon={<PlusOutlined />}>
          New folder
        </Button>,
        <Button key="upload" type="primary" icon={<UploadOutlined />} onClick={() => navigate("/documents")}>
          Upload files
        </Button>,
      ]}
    >
      <section className="metric-strip" aria-label="Document metrics">
        {metrics.map((metric) => (
          <div className="metric-item" key={metric.title}>
            <div className="metric-icon">{metric.icon}</div>
            <Statistic title={metric.title} value={metric.value} />
            <Typography.Text type="secondary">{metric.detail}</Typography.Text>
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
            loading={isLoading}
            documents={data.slice(0, 5)}
            onOpen={(document) => navigate(`/editor/${document.id}`)}
          />
        </ProCard>

        <div className="dashboard-side">
          <ProCard title="Recent activity" bodyStyle={{ padding: "0 20px" }}>
            <List
              className="activity-list"
              dataSource={activities}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{item.actor.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Avatar>}
                    title={
                      <span>
                        <strong>{item.actor}</strong> {item.action}
                      </span>
                    }
                    description={
                      <>
                        <Typography.Text ellipsis>{item.resource}</Typography.Text>
                        <Typography.Text type="secondary">{item.at}</Typography.Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </ProCard>
          <ProCard title="Workspace storage">
            <div className="storage-summary">
              <Space align="center" size={12}>
                <span className="storage-icon"><CloudServerOutlined /></span>
                <div>
                  <Typography.Text strong>68 GB used</Typography.Text>
                  <Typography.Text type="secondary">of 100 GB available</Typography.Text>
                </div>
              </Space>
              <Progress percent={68} showInfo={false} />
              <div className="storage-legend">
                <span>Documents 52 GB</span>
                <span>Versions 16 GB</span>
              </div>
            </div>
          </ProCard>
        </div>
      </div>
    </PageContainer>
  );
}
