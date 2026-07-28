import { DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import { Alert, App, Button, Popconfirm } from "antd";
import { useState } from "react";
import { FileTable } from "@/components/documents/FileTable";
import { useDocuments } from "@/hooks/useDocuments";
import type { DocumentItem } from "@/types";

export function TrashPage() {
  const { message } = App.useApp();
  const { data = [], isLoading } = useDocuments("trash");
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const visible = data.filter((item) => !hiddenIds.includes(item.id));

  const remove = (document: DocumentItem, action: "restored" | "deleted") => {
    setHiddenIds((ids) => [...ids, document.id]);
    message.success(`${document.name} ${action}`);
  };

  return (
    <PageContainer
      ghost
      title="Trash"
      subTitle="Restore documents or remove them permanently."
      extra={[
        <Popconfirm
          key="empty"
          title="Empty trash?"
          description="This permanently deletes every item in Trash."
          onConfirm={() => {
            setHiddenIds(data.map((item) => item.id));
            message.success("Trash emptied");
          }}
        >
          <Button danger icon={<DeleteOutlined />}>Empty trash</Button>
        </Popconfirm>,
      ]}
    >
      <Alert
        className="trash-alert"
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="Items in Trash are permanently deleted after 30 days."
      />
      <section className="trash-table-surface">
        <FileTable
          documents={visible}
          loading={isLoading}
          trash
          onRestore={(document) => remove(document, "restored")}
          onDelete={(document) => remove(document, "deleted")}
        />
      </section>
    </PageContainer>
  );
}
