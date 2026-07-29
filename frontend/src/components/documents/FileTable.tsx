import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  HistoryOutlined,
  LockOutlined,
  ShareAltOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { MenuProps, TableProps } from "antd";
import type { Key } from "react";
import { FileTableSkeleton } from "@/components/common/LoadingSkeletons";
import type { DocumentItem } from "@share";
import { fileIcon, fileTypeLabels } from "@/components/documents/filePresentation";

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
}

const statusMap = {
  ready: { label: "Ready", color: "green" },
  review: { label: "In review", color: "gold" },
  locked: { label: "Locked", color: "default" },
  deleted: { label: "Deleted", color: "red" },
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
}: FileTableProps) {
  if (loading) {
    return <FileTableSkeleton narrow={narrow} />;
  }

  const getActions = (record: DocumentItem): MenuProps["items"] =>
    trash
      ? [
          {
            key: "restore",
            icon: <UndoOutlined />,
            label: "Restore",
            onClick: () => onRestore?.(record),
          },
          { type: "divider" },
          {
            key: "delete",
            danger: true,
            icon: <DeleteOutlined />,
            label: "Delete permanently",
            onClick: () => onDelete?.(record),
          },
        ]
      : [
          {
            key: "open",
            icon: <EditOutlined />,
            label: "Open",
            onClick: () => onOpen?.(record),
          },
          {
            key: "preview",
            icon: <EyeOutlined />,
            label: "Preview",
            onClick: () => onSelect?.(record),
          },
          {
            key: "share",
            icon: <ShareAltOutlined />,
            label: "Manage access",
            onClick: () => onShare?.(record),
          },
          {
            key: "versions",
            icon: <HistoryOutlined />,
            label: "Version history",
            onClick: () => onVersions?.(record),
          },
          { type: "divider" },
          { key: "download", icon: <DownloadOutlined />, label: "Download" },
          {
            key: "delete",
            danger: true,
            icon: <DeleteOutlined />,
            label: "Move to trash",
            onClick: () => onDelete?.(record),
          },
        ];

  const columns: TableProps<DocumentItem>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 250,
      sorter: (a: DocumentItem, b: DocumentItem) => a.name.localeCompare(b.name),
      render: (_: unknown, record: DocumentItem) => (
        <Space size={12}>
          {fileIcon(record.type)}
          <span className="file-name-cell">
            <Typography.Text strong ellipsis={{ tooltip: record.name }}>
              {record.name}
            </Typography.Text>
            {compact && (
              <Typography.Text type="secondary" className="mobile-file-meta">
                {fileTypeLabels[record.type]} · {record.modifiedAt}
              </Typography.Text>
            )}
          </span>
        </Space>
      ),
    },
    {
      title: "Owner",
      dataIndex: "owner",
      key: "owner",
      responsive: ["lg"],
      width: 160,
      ellipsis: true,
    },
    {
      title: trash ? "Deleted" : "Modified",
      dataIndex: trash ? "deletedAt" : "modifiedAt",
      key: "modifiedAt",
      width: 160,
      responsive: ["md"],
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 92,
      responsive: ["xl"],
      align: "right",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 112,
      responsive: ["lg"],
      render: (status: DocumentItem["status"]) => (
        <Tag color={statusMap[status].color} bordered={false}>
          {status === "locked" && <LockOutlined />} {statusMap[status].label}
        </Tag>
      ),
    },
    {
      title: <span className="sr-only">Actions</span>,
      key: "actions",
      width: 56,
      fixed: "right",
      align: "center",
      render: (_: unknown, record: DocumentItem) => (
        <Dropdown menu={{ items: getActions(record) }} trigger={["click"]}>
          <Tooltip title="More actions">
            <Button
              aria-label={`Actions for ${record.name}`}
              icon={<EllipsisOutlined />}
              type="text"
              onClick={(event) => event.stopPropagation()}
            />
          </Tooltip>
        </Dropdown>
      ),
    },
  ];

  const displayColumns = narrow
    ? columns.filter((column: { key?: Key }) =>
        ["name", "modifiedAt", "actions"].includes(String(column.key)),
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
        compact
          ? undefined
          : {
              columnWidth: 44,
            }
      }
      scroll={{ x: narrow ? 360 : 860 }}
      size="middle"
      onRow={(record: DocumentItem) => ({
        onClick: () => onSelect?.(record),
        onDoubleClick: () => !trash && onOpen?.(record),
      })}
    />
  );
}
