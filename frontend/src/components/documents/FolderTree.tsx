import { useMemo } from "react";
import { FolderOpenOutlined, FolderOutlined } from "@ant-design/icons";
import { Tree, Typography } from "antd";
import type { Key } from "react";
import type { DataNode } from "antd/es/tree";
import { useFolders, type FolderItem } from "@/hooks/useFolders";

interface FolderTreeProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function FolderTree({ selectedId, onSelect }: FolderTreeProps) {
  const { data: folders = [] } = useFolders();

  const treeData = useMemo<DataNode[]>(() => {
    const allItem: FolderItem = { id: "all", name: "Tất cả tệp", count: folders.reduce((sum, f) => sum + (f.count || 0), 0) };
    const list = [allItem, ...folders.filter((f) => f.id !== "all")];

    return list
      .filter((folder) => !folder.parentId)
      .map((folder) => ({
        key: folder.id,
        icon: folder.id === "all" ? <FolderOpenOutlined /> : <FolderOutlined />,
        title: (
          <span className="tree-label">
            <span>{folder.name}</span>
            <Typography.Text type="secondary">{folder.count}</Typography.Text>
          </span>
        ),
        children: list
          .filter((child) => child.parentId === folder.id)
          .map((child) => ({
            key: child.id,
            icon: <FolderOutlined />,
            title: (
              <span className="tree-label">
                <span>{child.name}</span>
                <Typography.Text type="secondary">{child.count}</Typography.Text>
              </span>
            ),
          })),
      }));
  }, [folders]);

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
