import { DeleteOutlined, InfoCircleOutlined, UndoOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@ant-design/pro-components";
import { Alert, App, Button, Popconfirm, Space, Typography } from "antd";
import { useState } from "react";
import { FileTable } from "@/components/file/Explorer/FileTable";
import { useDocuments } from "@/hooks/useDocuments";
import { translateApiError, useI18n } from "@/i18n";
import { apiRequest } from "@/lib/api";
import type { DocumentItem } from "@share";

export function TrashPage() {
  const { message, modal } = App.useApp();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const {
    data = [],
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDocuments("trash");

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
      setSelectedIds((prev) => prev.filter((id) => id !== document.id));
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

  const batchRestore = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) =>
          apiRequest(`/documents/${id}/restore`, { method: "POST" }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      message.success(`${selectedIds.length} items restored`);
      setSelectedIds([]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Restore failed";
      message.error(translateApiError(text, locale));
    }
  };

  const batchPermanentDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) =>
          apiRequest(`/documents/${id}/permanent`, { method: "DELETE" }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      message.success(`${selectedIds.length} items permanently deleted`);
      setSelectedIds([]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Delete failed";
      message.error(translateApiError(text, locale));
    }
  };

  const emptyTrash = async () => {
    try {
      await apiRequest("/documents?scope=trash", { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedIds([]);
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
        {selectedIds.length > 0 && (
          <div className="document-selection-bar">
            <Typography.Text strong>{selectedIds.length} selected</Typography.Text>
            <Space wrap>
              <Button
                size="small"
                icon={<UndoOutlined />}
                onClick={() => void batchRestore()}
              >
                Restore
              </Button>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() =>
                  modal.confirm({
                    title: `Permanently delete ${selectedIds.length} documents?`,
                    content: "This action cannot be undone.",
                    onOk: batchPermanentDelete,
                  })
                }
              >
                Delete permanently
              </Button>
              <Button type="text" size="small" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </Space>
          </div>
        )}
        <FileTable
          documents={data}
          loading={isLoading}
          trash
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRestore={(document) => void run(document, "restore")}
          onDelete={(document) => void run(document, "delete")}
        />
        {hasNextPage && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <Button
              loading={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        )}
      </section>
    </PageContainer>
  );
}
