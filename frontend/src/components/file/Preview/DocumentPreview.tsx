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
import { getFileTypeLabel, fileIcon } from "@/components/file/Explorer/filePresentation";
import { CommentsPanel } from "@/components/file/Comments/CommentsPanel";
import { formatDate } from "@/lib/date";
import { useI18n } from "@/i18n";

interface DocumentPreviewProps {
  document?: DocumentItem;
  onOpen?: () => void;
  onShare?: () => void;
  onVersions?: () => void;
  onDownload?: () => void;
  onClose?: () => void;
  onMetadata?: () => void;
}

export function DocumentPreview({
  document,
  onOpen,
  onShare,
  onVersions,
  onDownload,
  onClose,
  onMetadata,
}: DocumentPreviewProps) {
  const { locale, t } = useI18n();

  if (!document) {
    return (
      <aside className="document-preview empty-preview" aria-label="Document preview">
        <Empty
          image={<FileSearchOutlined className="empty-preview-icon" />}
          description={locale === "vi" ? "Chọn một tài liệu để xem chi tiết" : "Select a document to preview its details"}
        />
      </aside>
    );
  }

  return (
    <aside className="document-preview" aria-label={`Preview of ${document.name}`}>
      <div className="preview-header">
        <Typography.Text strong>{t("preview.title")}</Typography.Text>
        {onClose && (
          <Button type="text" size="small" onClick={onClose}>
            {locale === "vi" ? "Đóng" : "Close"}
          </Button>
        )}
      </div>
      <div className="preview-canvas">
        <div className="preview-file-mark">{fileIcon(document.type, 32)}</div>
        <Typography.Title level={5}>{document.name}</Typography.Title>
        <Typography.Text type="secondary">
          {getFileTypeLabel(document.type, locale)} · {document.size}
        </Typography.Text>
        <Button
          icon={<ExpandOutlined />}
          className="preview-expand"
          onClick={onOpen}
        >
          {locale === "vi" ? "Xem toàn màn hình" : "Full preview"}
        </Button>
      </div>
      <div className="preview-actions">
        <Button type="primary" icon={<EditOutlined />} onClick={onOpen}>
          {t("common.open")}
        </Button>
        <Button icon={<ShareAltOutlined />} onClick={onShare}>
          {t("common.share")}
        </Button>
        <Button
          icon={<DownloadOutlined />}
          aria-label="Download document"
          onClick={onDownload}
        />
      </div>
      <Descriptions column={1} size="small" className="preview-details">
        <Descriptions.Item label={t("common.owner")}>{document.owner}</Descriptions.Item>
        <Descriptions.Item label={t("common.modified")}>
          {formatDate(document.modifiedAt)}
        </Descriptions.Item>
        <Descriptions.Item label={t("files.access")}>
          <Tag bordered={false}>{document.permission ?? t("files.private")}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("admin.status")}>
          {document.status === "review" ? t("status.review") : t("status.ready")}
        </Descriptions.Item>
      </Descriptions>
      <Button block icon={<HistoryOutlined />} onClick={onVersions}>
        {t("context.versions")}
      </Button>
      <Button
        block
        icon={<FileSearchOutlined />}
        onClick={onMetadata}
        style={{ marginTop: 8 }}
      >
        {locale === "vi" ? "Thẻ và thông tin bổ sung" : "Metadata and tags"}
      </Button>
      <CommentsPanel
        documentId={document.id}
        canComment={document.permission !== "Viewer"}
      />
    </aside>
  );
}
