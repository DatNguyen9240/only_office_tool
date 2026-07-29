import { FolderOpenOutlined, FolderOutlined } from "@ant-design/icons";
import { Tree, Typography } from "antd";
import type { Key } from "react";
import type { DataNode } from "antd/es/tree";
import { folders } from "@/data/sampleData";

interface FolderTreeProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

const folderById = new Map(folders.map((folder) => [folder.id, folder]));

const treeData: DataNode[] = folders
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
    children: folders
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

export function FolderTree({ selectedId, onSelect }: FolderTreeProps) {
  return (
    <aside className="folder-tree-panel" aria-label="Folder navigation">
      <div className="panel-heading">
        <Typography.Text strong>Folders</Typography.Text>
      </div>
      <Tree
        blockNode
        defaultExpandAll
        showIcon
        selectedKeys={[selectedId]}
        treeData={treeData}
        onSelect={(keys: Key[]) => {
          const key = String(keys[0] ?? "all");
          if (folderById.has(key)) onSelect(key);
        }}
      />
    </aside>
  );
}
