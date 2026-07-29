import {
  ArrowLeftOutlined,
  CheckOutlined,
  CommentOutlined,
  HistoryOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Space, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { OnlyOfficeEditor } from "@/components/editor/OnlyOfficeEditor";
import { SharePermissionModal } from "@/components/documents/SharePermissionModal";
import { VersionHistoryDrawer } from "@/components/documents/VersionHistoryDrawer";
import { documents } from "@/data/sampleData";

export function EditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [shareOpen, setShareOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const document = useMemo(
    () => documents.find((item) => item.id === id) ?? documents[0],
    [id],
  );

  return (
    <main className="editor-page">
      <header className="editor-header">
        <Space size={12}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            aria-label="Back to workspace"
            onClick={() => navigate("/workspace")}
          />
          <span className="brand-mark compact">M</span>
          <div className="editor-file-title">
            <Typography.Text strong>{document.name}</Typography.Text>
            <Space size={6}>
              <CheckOutlined className="saved-icon" />
              <Typography.Text type="secondary">Saved</Typography.Text>
              <Tag bordered={false}>Version 4</Tag>
            </Space>
          </div>
        </Space>
        <Space>
          <Avatar.Group size="small" max={{ count: 3 }}>
            <Avatar>AV</Avatar>
            <Avatar>MN</Avatar>
            <Avatar>PS</Avatar>
          </Avatar.Group>
          <Button icon={<CommentOutlined />}>Comments</Button>
          <Button icon={<HistoryOutlined />} onClick={() => setVersionsOpen(true)}>
            History
          </Button>
          <Button type="primary" icon={<ShareAltOutlined />} onClick={() => setShareOpen(true)}>
            Share
          </Button>
        </Space>
      </header>
      <section className="editor-stage" aria-label="Document editor">
        <OnlyOfficeEditor />
      </section>
      <SharePermissionModal open={shareOpen} document={document} onClose={() => setShareOpen(false)} />
      <VersionHistoryDrawer open={versionsOpen} document={document} onClose={() => setVersionsOpen(false)} />
    </main>
  );
}
