import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  HistoryOutlined,
  LockOutlined,
  FolderOpenOutlined,
  StarOutlined,
  ShareAltOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { MenuProps, TableProps } from "antd";
import { useState } from "react";
import type { Key } from "react";
import { FileTableSkeleton } from "@/components/common/LoadingSkeletons";
import type { DocumentItem } from "@share";
import { getFileTypeLabel, fileIcon } from "@/components/file/Explorer/filePresentation";
import { formatDate, formatRelativeDate } from "@/lib/date";
import { useI18n } from "@/i18n";

interface FileTableProps {
  documents: DocumentItem[];
  loading?: boolean;
  selectedId?: string;
  trash?: boolean;
  compact?: boolean;
  narrow?: boolean;
  onSelect?: (document: DocumentItem) => void;
  onOpen?: (document: DocumentItem) => void;
  onShare?: (document: DocumentItem) => void;
  onVersions?: (document: DocumentItem) => void;
  onDelete?: (document: DocumentItem) => void;
  onRestore?: (document: DocumentItem) => void;
  onDownload?: (document: DocumentItem) => void;
  onRename?: (document: DocumentItem) => void;
  onMove?: (document: DocumentItem) => void;
  onStar?: (document: DocumentItem) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

const statusMap = {
  ready: { labelEn: "Ready", labelVi: "Sẵn sàng", color: "green" },
  review: { labelEn: "In review", labelVi: "Đang xem xét", color: "gold" },
  locked: { labelEn: "Locked", labelVi: "Đã khóa", color: "default" },
  deleted: { labelEn: "Deleted", labelVi: "Đã xóa", color: "red" },
} as const;

export function FileTable({
  documents,
  loading,
  selectedId,
  trash = false,
  compact = false,
  narrow = false,
  onSelect,
  onOpen,
  onShare,
  onVersions,
  onDelete,
  onRestore,
  onDownload,
  onRename,
  onMove,
  onStar,
  selectedIds = [],
  onSelectionChange,
}: FileTableProps) {
  const { locale, t } = useI18n();
  const [internalSelectedIds, setInternalSelectedIds] = useState<Key[]>([]);

  if (loading) {
    return <FileTableSkeleton narrow={narrow} />;
  }

  const activeSelectedKeys = onSelectionChange
    ? selectedIds
    : internalSelectedIds.map(String);

  const handleSelectionChange = (keys: Key[]) => {
    const stringKeys = keys.map((key) => String(key));
    if (onSelectionChange) {
      onSelectionChange(stringKeys);
    } else {
      setInternalSelectedIds(keys);
    }
  };

  const getActions = (record: DocumentItem): MenuProps["items"] =>
    trash
      ? [
          {
            key: "restore",
            icon: <UndoOutlined />,
            label: t("common.restore"),
            onClick: () => onRestore?.(record),
          },
          { type: "divider" },
          {
            key: "delete",
            danger: true,
            icon: <DeleteOutlined />,
            label: t("context.deleteForever"),
            onClick: () => onDelete?.(record),
          },
        ]
      : [
          {
            key: "open",
            icon: <EditOutlined />,
            label: t("common.open"),
            onClick: () => onOpen?.(record),
          },
          {
            key: "preview",
            icon: <EyeOutlined />,
            label: t("preview.title"),
            onClick: () => onSelect?.(record),
          },
          {
            key: "rename",
            icon: <EditOutlined />,
            label: t("common.rename"),
            onClick: () => onRename?.(record),
          },
          {
            key: "move",
            icon: <FolderOpenOutlined />,
            label: t("common.move"),
            onClick: () => onMove?.(record),
          },
          {
            key: "star",
            icon: <StarOutlined />,
            label: record.starred ? t("files.removeFavorite") : t("files.addFavorite"),
            onClick: () => onStar?.(record),
          },
          {
            key: "share",
            icon: <ShareAltOutlined />,
            label: t("share.title"),
            onClick: () => onShare?.(record),
          },
          {
            key: "versions",
            icon: <HistoryOutlined />,
            label: t("context.versions"),
            onClick: () => onVersions?.(record),
          },
          { type: "divider" },
          {
            key: "download",
            icon: <DownloadOutlined />,
            label: t("common.download"),
            onClick: () => onDownload?.(record),
          },
          {
            key: "delete",
            danger: true,
            icon: <DeleteOutlined />,
            label: t("context.moveTrash"),
            onClick: () => onDelete?.(record),
          },
        ];

  const columns: TableProps<DocumentItem>["columns"] = [
    {
      title: t("files.name"),
      dataIndex: "name",
      key: "name",
      sorter: (a: DocumentItem, b: DocumentItem) => a.name.localeCompare(b.name),
      ellipsis: true,
      render: (_: unknown, record: DocumentItem) => (
        <Space size={10} style={{ width: "100%", overflow: "hidden" }}>
          {fileIcon(record.type, 16)}
          <span className="file-name-cell">
            <Typography.Text strong ellipsis={{ tooltip: record.name }} style={{ fontSize: 13, color: "inherit" }}>
              {record.name}
            </Typography.Text>
            {(compact || narrow) && (
              <Typography.Text
                type="secondary"
                className="mobile-file-meta"
              >
                {getFileTypeLabel(record.type, locale)} · {formatRelativeDate(record.modifiedAt)}
              </Typography.Text>
            )}
          </span>
        </Space>
      ),
    },
    {
      title: t("common.owner"),
      dataIndex: "owner",
      key: "owner",
      responsive: ["lg"],
      width: 140,
      ellipsis: true,
    },
    {
      title: trash ? t("files.deleted") : t("common.modified"),
      dataIndex: trash ? "deletedAt" : "modifiedAt",
      key: "modifiedAt",
      width: 140,
      responsive: ["md"],
      render: (val: string) => (
        <span
          style={{
            whiteSpace: "nowrap",
            fontSize: 12,
            color: "#64748b",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "inline-block",
            maxWidth: "100%",
          }}
        >
          {formatDate(val)}
        </span>
      ),
    },
    {
      title: t("common.size"),
      dataIndex: "size",
      key: "size",
      width: 88,
      responsive: ["xl"],
      align: "right",
    },
    {
      title: t("admin.status"),
      dataIndex: "status",
      key: "status",
      width: 108,
      responsive: ["lg"],
      render: (status: DocumentItem["status"]) => {
        const item = statusMap[status];
        const label = locale === "vi" ? item.labelVi : item.labelEn;
        return (
          <Tag color={item.color} bordered={false} style={{ margin: 0 }}>
            {status === "locked" && <LockOutlined />} {label}
          </Tag>
        );
      },
    },
    {
      title: <span className="sr-only">Actions</span>,
      key: "actions",
      width: 44,
      align: "center",
      render: (_: unknown, record: DocumentItem) => (
        <Dropdown menu={{ items: getActions(record) }} trigger={["click"]}>
          <Tooltip title="More actions">
            <Button
              aria-label={`Actions for ${record.name}`}
              icon={<EllipsisOutlined />}
              type="text"
              size="small"
              className="action-btn-compact"
              onClick={(event) => event.stopPropagation()}
            />
          </Tooltip>
        </Dropdown>
      ),
    },
  ];

  const displayColumns = (narrow || compact)
    ? columns.filter((column: { key?: Key }) =>
        ["name", "actions"].includes(String(column.key)),
      )
    : columns;

  return (
    <Table<DocumentItem>
      className="file-table"
      columns={displayColumns}
      dataSource={documents}
      locale={{
        emptyText: trash
          ? "Trash is empty"
          : "No documents match the current folder and filters",
      }}
      pagination={documents.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
      rowClassName={(record: DocumentItem) => (record.id === selectedId ? "selected-row" : "")}
      rowKey="id"
      rowSelection={
        (compact || narrow)
          ? undefined
          : {
              columnWidth: 40,
              selectedRowKeys: activeSelectedKeys,
              onChange: handleSelectionChange,
            }
      }
      scroll={narrow || compact ? undefined : { x: "max-content" }}
      size="small"
      onRow={(record: DocumentItem) => ({
        onClick: () => onSelect?.(record),
        onDoubleClick: () => !trash && onOpen?.(record),
      })}
    />
  );
}
