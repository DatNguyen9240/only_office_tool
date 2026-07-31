import { useMemo } from "react";
import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  FolderOpenOutlined as FolderMoveOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Tree, Typography } from "antd";
import type { Key } from "react";
import type { DataNode } from "antd/es/tree";
import { useFolders, type FolderItem } from "@/hooks/useFolders";

interface FolderTreeProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onRename?: (folder: FolderItem) => void;
  onMove?: (folder: FolderItem) => void;
  onDelete?: (folder: FolderItem) => void;
  onShare?: (folder: FolderItem) => void;
}

export function FolderTree({
  selectedId,
  onSelect,
  onRename,
  onMove,
  onDelete,
  onShare,
}: FolderTreeProps) {
  const { data: folders = [] } = useFolders();

  const treeData = useMemo<DataNode[]>(() => {
    const allItem: FolderItem = { id: "all", name: "Tất cả tệp", count: folders.reduce((sum, f) => sum + (f.count || 0), 0) };
    const list = [allItem, ...folders.filter((f) => f.id !== "all")];

    const buildNode = (folder: FolderItem): DataNode => {
      const children = list
        .filter((child) => child.parentId === folder.id)
        .map(buildNode);
      const actions =
        folder.id === "all"
          ? null
          : (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    {
                      key: "share",
                      icon: <ShareAltOutlined />,
                      label: "Share",
                      onClick: () => onShare?.(folder),
                    },
                    {
                      key: "rename",
                      icon: <EditOutlined />,
                      label: "Rename",
                      onClick: () => onRename?.(folder),
                    },
                    {
                      key: "move",
                      icon: <FolderMoveOutlined />,
                      label: "Move",
                      onClick: () => onMove?.(folder),
                    },
                    { type: "divider" },
                    {
                      key: "delete",
                      danger: true,
                      icon: <DeleteOutlined />,
                      label: "Delete",
                      onClick: () => onDelete?.(folder),
                    },
                  ],
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<EllipsisOutlined />}
                  aria-label={`Actions for ${folder.name}`}
                  onClick={(event) => event.stopPropagation()}
                />
              </Dropdown>
            );
      return {
        key: folder.id,
        icon: folder.id === "all" ? <FolderOpenOutlined /> : <FolderOutlined />,
        title: (
          <span className="tree-label">
            <span>{folder.name}</span>
            <Typography.Text type="secondary">{folder.count}</Typography.Text>
            {actions}
          </span>
        ),
        children: children.length ? children : undefined,
      };
    };
    return list.filter((folder) => !folder.parentId).map(buildNode);
  }, [folders, onDelete, onMove, onRename, onShare]);

  return (
    <aside className="folder-tree-panel" aria-label="Folder navigation">
      <div className="panel-heading">
        <Typography.Text strong>Thư mục</Typography.Text>
      </div>
      <Tree
        blockNode
        defaultExpandAll
        showIcon
        selectedKeys={[selectedId]}
        treeData={treeData}
        onSelect={(keys: Key[]) => {
          const key = String(keys[0] ?? "all");
          onSelect(key);
        }}
      />
    </aside>
  );
}
