import {
  EllipsisOutlined,
  HistoryOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  ShareAltOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Space, Typography } from "antd";
import type { DocumentItem } from "@share";
import { fileIcon, getFileTypeLabel } from "@/components/file/Explorer/filePresentation";
import { useI18n } from "@/i18n";

interface FileCardProps {
  document: DocumentItem;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  onShare?: () => void;
  onVersions?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onStar?: () => void;
}

export function FileCard({
  document,
  selected,
  onSelect,
  onOpen,
  onShare,
  onVersions,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onStar,
}: FileCardProps) {
  const { locale, t } = useI18n();

  return (
    <article
      className={`file-card${selected ? " selected" : ""}`}
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen?.();
      }}
    >
      <div className="file-card-topline">
        {fileIcon(document.type, 22)}
        <Dropdown
          menu={{
            items: [
              { key: "open", label: t("common.open") || "Mở", onClick: onOpen },
              {
                key: "rename",
                icon: <EditOutlined />,
                label: t("common.rename"),
                onClick: onRename,
              },
              {
                key: "move",
                icon: <FolderOpenOutlined />,
                label: t("common.move"),
                onClick: onMove,
              },
              {
                key: "star",
                icon: <StarOutlined />,
                label: document.starred
                  ? t("files.removeFavorite")
                  : t("files.addFavorite"),
                onClick: onStar,
              },
              {
                key: "share",
                icon: <ShareAltOutlined />,
                label: t("share.title"),
                onClick: onShare,
              },
              {
                key: "versions",
                icon: <HistoryOutlined />,
                label: t("context.versions"),
                onClick: onVersions,
              },
              {
                key: "download",
                icon: <DownloadOutlined />,
                label: t("common.download"),
                onClick: onDownload,
              },
              {
                key: "delete",
                danger: true,
                icon: <DeleteOutlined />,
                label: t("context.moveTrash"),
                onClick: onDelete,
              },
            ],
          }}
          trigger={["click"]}
        >
          <Button
            type="text"
            icon={<EllipsisOutlined />}
            aria-label={`Actions for ${document.name}`}
            onClick={(event) => event.stopPropagation()}
          />
        </Dropdown>
      </div>
      <Typography.Text strong ellipsis={{ tooltip: document.name }}>
        {document.name}
      </Typography.Text>
      <Space direction="vertical" size={2}>
        <Typography.Text type="secondary">
          {getFileTypeLabel(document.type, locale)}
        </Typography.Text>
        <Typography.Text type="secondary">{document.modifiedAt}</Typography.Text>
      </Space>
    </article>
  );
}
