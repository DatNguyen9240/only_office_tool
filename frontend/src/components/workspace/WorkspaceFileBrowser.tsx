import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  ExportOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  ShareAltOutlined,
  StarFilled,
  StarOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  Button,
  Checkbox,
  Dropdown,
  Empty,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import type { Key, MouseEvent } from "react";
import { useI18n, type Translate } from "@/i18n";
import type { DocumentItem } from "@share";
import { fileIcon } from "@/components/documents/filePresentation";

export interface WorkspaceFileActions {
  open: (document: DocumentItem) => void;
  details: (document: DocumentItem) => void;
  rename: (document: DocumentItem) => void;
  move: (document: DocumentItem) => void;
  share: (document: DocumentItem) => void;
  download: (document: DocumentItem) => void;
  versions: (document: DocumentItem) => void;
  remove: (document: DocumentItem) => void;
  restore: (document: DocumentItem) => void;
  favorite: (document: DocumentItem) => void;
}

function actionItems(
  document: DocumentItem,
  actions: WorkspaceFileActions,
  trash: boolean,
  t: Translate,
) {
  if (trash) {
    return [
      {
        key: "restore",
        icon: <UndoOutlined />,
        label: t("common.restore"),
        onClick: () => actions.restore(document),
      },
      { type: "divider" as const },
      {
        key: "remove",
        icon: <DeleteOutlined />,
        danger: true,
        label: t("context.deleteForever"),
        onClick: () => actions.remove(document),
      },
    ];
  }

  return [
    {
      key: "open",
      icon: <ExportOutlined />,
      label: t("context.open"),
      onClick: () => actions.open(document),
    },
    {
      key: "rename",
      icon: <EditOutlined />,
      label: t("context.rename"),
      onClick: () => actions.rename(document),
    },
    {
      key: "move",
      icon: <FolderOpenOutlined />,
      label: t("context.move"),
      onClick: () => actions.move(document),
    },
    {
      key: "share",
      icon: <ShareAltOutlined />,
      label: t("context.share"),
      onClick: () => actions.share(document),
    },
    {
      key: "download",
      icon: <DownloadOutlined />,
      label: t("context.download"),
      onClick: () => actions.download(document),
    },
    {
      key: "versions",
      icon: <HistoryOutlined />,
      label: t("context.versions"),
      onClick: () => actions.versions(document),
    },
    { type: "divider" as const },
    {
      key: "remove",
      icon: <DeleteOutlined />,
      danger: true,
      label: t("context.moveTrash"),
      onClick: () => actions.remove(document),
    },
  ];
}

interface WorkspaceFileBrowserProps {
  documents: DocumentItem[];
  mode: "list" | "grid";
  selectedKeys: Key[];
  trash?: boolean;
  actions: WorkspaceFileActions;
  onSelectionChange: (keys: Key[]) => void;
}

export function WorkspaceFileBrowser({
  documents,
  mode,
  selectedKeys,
  trash = false,
  actions,
  onSelectionChange,
}: WorkspaceFileBrowserProps) {
  const { t } = useI18n();
  const permissionLabel = (permission: NonNullable<DocumentItem["permission"]>) => {
    const keys = {
      Viewer: "role.viewer",
      Commenter: "role.commenter",
      Editor: "role.editor",
      Owner: "role.owner",
    } as const;
    return t(keys[permission]);
  };
  if (!documents.length) {
    return (
      <div className="workspace-browser-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={trash ? t("files.trashEmpty") : t("files.noMatch")}
        />
      </div>
    );
  }

  if (mode === "grid") {
    return (
      <div className="workspace-file-grid">
        {documents.map((document) => {
          const selected = selectedKeys.includes(document.id);
          return (
            <Dropdown
              key={document.id}
              trigger={["contextMenu"]}
              menu={{ items: actionItems(document, actions, trash, t) }}
            >
              <article
                className={`workspace-file-card${selected ? " selected" : ""}`}
                tabIndex={0}
                aria-label={document.name}
                onClick={() => actions.details(document)}
                onDoubleClick={() => actions.open(document)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") actions.open(document);
                }}
              >
                <div className="workspace-file-card-top">
                  <Checkbox
                    checked={selected}
                    aria-label={t("files.select", { name: document.name })}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      onSelectionChange(
                        event.target.checked
                          ? [...selectedKeys, document.id]
                          : selectedKeys.filter((key) => key !== document.id),
                      )
                    }
                  />
                  {!trash && (
                    <Button
                      type="text"
                      aria-label={
                        document.starred
                          ? t("files.removeFavorite")
                          : t("files.addFavorite")
                      }
                      icon={document.starred ? <StarFilled /> : <StarOutlined />}
                      className={document.starred ? "favorite-active" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        actions.favorite(document);
                      }}
                    />
                  )}
                  <Dropdown menu={{ items: actionItems(document, actions, trash, t) }}>
                    <Button
                      type="text"
                      aria-label={t("files.actionsFor", { name: document.name })}
                      icon={<EllipsisOutlined />}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </Dropdown>
                </div>
                <div className="workspace-file-card-preview">
                  {fileIcon(document.type, 28)}
                </div>
                <Tooltip title={document.name}>
                  <Typography.Text strong ellipsis>
                    {document.name}
                  </Typography.Text>
                </Tooltip>
                <Typography.Text type="secondary">
                  {document.modifiedAt} · {document.size}
                </Typography.Text>
              </article>
            </Dropdown>
          );
        })}
      </div>
    );
  }

  const columns: TableColumnsType<DocumentItem> = [
    {
      title: t("files.name"),
      dataIndex: "name",
      key: "name",
      render: (_, document) => (
        <Space size={12} className="workspace-file-name">
          {fileIcon(document.type)}
          <span>
            <Tooltip title={document.name}>
              <Typography.Text strong ellipsis>
                {document.name}
              </Typography.Text>
            </Tooltip>
            <Typography.Text type="secondary" className="workspace-mobile-file-meta">
              {document.owner} · {document.modifiedAt}
            </Typography.Text>
          </span>
        </Space>
      ),
    },
    {
      title: t("common.owner"),
      dataIndex: "owner",
      key: "owner",
      responsive: ["md"],
      width: 160,
    },
    {
      title: t("files.access"),
      dataIndex: "permission",
      key: "permission",
      responsive: ["lg"],
      width: 112,
      render: (value: DocumentItem["permission"]) =>
        value ? (
          <Tag bordered={false}>{permissionLabel(value)}</Tag>
        ) : (
          <Typography.Text type="secondary">{t("files.private")}</Typography.Text>
        ),
    },
    {
      title: trash ? t("files.deleted") : t("common.modified"),
      dataIndex: trash ? "deletedAt" : "modifiedAt",
      key: "modified",
      responsive: ["sm"],
      width: 152,
    },
    {
      title: t("common.size"),
      dataIndex: "size",
      key: "size",
      responsive: ["xl"],
      width: 90,
    },
    {
      key: "favorite",
      width: 48,
      align: "center",
      render: (_, document) =>
        !trash && (
          <Tooltip
            title={
              document.starred ? t("files.removeFavorite") : t("files.addFavorite")
            }
          >
            <Button
              type="text"
              aria-label={
                document.starred ? t("files.removeFavorite") : t("files.addFavorite")
              }
              icon={document.starred ? <StarFilled /> : <StarOutlined />}
              className={document.starred ? "favorite-active" : ""}
              onClick={(event) => {
                event.stopPropagation();
                actions.favorite(document);
              }}
            />
          </Tooltip>
        ),
    },
    {
      key: "actions",
      width: 52,
      render: (_, document) => (
        <Dropdown
          trigger={["click"]}
          menu={{ items: actionItems(document, actions, trash, t) }}
        >
          <Button
            type="text"
            aria-label={t("files.actionsFor", { name: document.name })}
            icon={<EllipsisOutlined />}
            onClick={(event) => event.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  const openContextMenu = (document: DocumentItem, event: MouseEvent) => {
    event.preventDefault();
    const trigger = event.currentTarget.querySelector<HTMLButtonElement>(
      'button[aria-label^="Actions for"]',
    );
    trigger?.click();
  };

  return (
    <Table
      className="workspace-file-table"
      rowKey="id"
      columns={columns}
      dataSource={documents}
      pagination={false}
      tableLayout="fixed"
      rowSelection={{
        selectedRowKeys: selectedKeys,
        onChange: onSelectionChange,
        columnWidth: 44,
      }}
      onRow={(document: DocumentItem) => ({
        onClick: (event: MouseEvent<HTMLElement>) => {
          if ((event.target as HTMLElement).closest("button, .ant-checkbox-wrapper")) return;
          actions.details(document);
        },
        onDoubleClick: () => actions.open(document),
        onContextMenu: (event: MouseEvent<HTMLElement>) =>
          openContextMenu(document, event),
      })}
    />
  );
}
