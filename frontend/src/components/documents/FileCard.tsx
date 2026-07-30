import {
  EllipsisOutlined,
  HistoryOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Space, Typography } from "antd";
import type { DocumentItem } from "@share";
import { fileIcon, fileTypeLabels } from "@/components/documents/filePresentation";

interface FileCardProps {
  document: DocumentItem;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  onShare?: () => void;
  onVersions?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
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
}: FileCardProps) {
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
              { key: "open", label: "Open", onClick: onOpen },
              {
                key: "share",
                icon: <ShareAltOutlined />,
                label: "Manage access",
                onClick: onShare,
              },
              {
                key: "versions",
                icon: <HistoryOutlined />,
                label: "Version history",
                onClick: onVersions,
              },
              {
                key: "download",
                icon: <DownloadOutlined />,
                label: "Download",
                onClick: onDownload,
              },
              {
                key: "delete",
                danger: true,
                icon: <DeleteOutlined />,
                label: "Move to trash",
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
          {fileTypeLabels[document.type]}
        </Typography.Text>
        <Typography.Text type="secondary">{document.modifiedAt}</Typography.Text>
      </Space>
    </article>
  );
}
