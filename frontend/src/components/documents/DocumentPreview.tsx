import {
  DownloadOutlined,
  EditOutlined,
  ExpandOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Button, Descriptions, Empty, Tag, Typography } from "antd";
import type { DocumentItem } from "@share";
import { fileIcon, fileTypeLabels } from "@/components/documents/filePresentation";

interface DocumentPreviewProps {
  document?: DocumentItem;
  onOpen?: () => void;
  onShare?: () => void;
  onVersions?: () => void;
  onClose?: () => void;
}

export function DocumentPreview({
  document,
  onOpen,
  onShare,
  onVersions,
  onClose,
}: DocumentPreviewProps) {
  if (!document) {
    return (
      <aside className="document-preview empty-preview" aria-label="Document preview">
        <Empty
          image={<FileSearchOutlined className="empty-preview-icon" />}
          description="Select a document to preview its details"
        />
      </aside>
    );
  }

  return (
    <aside className="document-preview" aria-label={`Preview of ${document.name}`}>
      <div className="preview-header">
        <Typography.Text strong>Preview</Typography.Text>
        {onClose && (
          <Button type="text" size="small" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
      <div className="preview-canvas">
        <div className="preview-file-mark">{fileIcon(document.type, 32)}</div>
        <Typography.Title level={5}>{document.name}</Typography.Title>
        <Typography.Text type="secondary">
          {fileTypeLabels[document.type]} · {document.size}
        </Typography.Text>
        <Button icon={<ExpandOutlined />} className="preview-expand">
          Full preview
        </Button>
      </div>
      <div className="preview-actions">
        <Button type="primary" icon={<EditOutlined />} onClick={onOpen}>
          Open
        </Button>
        <Button icon={<ShareAltOutlined />} onClick={onShare}>
          Share
        </Button>
        <Button icon={<DownloadOutlined />} aria-label="Download document" />
      </div>
      <Descriptions column={1} size="small" className="preview-details">
        <Descriptions.Item label="Owner">{document.owner}</Descriptions.Item>
        <Descriptions.Item label="Modified">{document.modifiedAt}</Descriptions.Item>
        <Descriptions.Item label="Access">
          <Tag bordered={false}>{document.permission ?? "Private"}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          {document.status === "review" ? "In review" : "Ready"}
        </Descriptions.Item>
      </Descriptions>
      <Button block icon={<HistoryOutlined />} onClick={onVersions}>
        View version history
      </Button>
    </aside>
  );
}
