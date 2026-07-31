import { DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@ant-design/pro-components";
import { Alert, App, Button, Popconfirm } from "antd";
import { FileTable } from "@/components/file/Explorer/FileTable";
import { useDocuments } from "@/hooks/useDocuments";
import { translateApiError, useI18n } from "@/i18n";
import { apiRequest } from "@/lib/api";
import type { DocumentItem } from "@share";

export function TrashPage() {
  const { message } = App.useApp();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useDocuments("trash");

  const run = async (
    document: DocumentItem,
    action: "restore" | "delete",
  ) => {
    try {
      await apiRequest(
        action === "restore"
          ? `/documents/${document.id}/restore`
          : `/documents/${document.id}/permanent`,
        { method: action === "restore" ? "POST" : "DELETE" },
      );
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      message.success(
        action === "restore"
          ? `${document.name} restored`
          : `${document.name} permanently deleted`,
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : "Operation failed";
      message.error(translateApiError(text, locale));
    }
  };

  const emptyTrash = async () => {
    try {
      await apiRequest("/documents?scope=trash", { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      message.success("Trash emptied");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Empty trash failed";
      message.error(translateApiError(text, locale));
    }
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
          onConfirm={emptyTrash}
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
          documents={data}
          loading={isLoading}
          trash
          onRestore={(document) => void run(document, "restore")}
          onDelete={(document) => void run(document, "delete")}
        />
      </section>
    </PageContainer>
  );
}
