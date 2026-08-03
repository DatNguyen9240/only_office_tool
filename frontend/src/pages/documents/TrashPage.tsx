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
  const { locale, t } = useI18n();
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
          ? t("trash.restored")
          : t("trash.deleted"),
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
      message.success(t("trash.batchRestored", { count: selectedIds.length }));
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
      message.success(t("trash.batchDeleted", { count: selectedIds.length }));
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
      message.success(t("trash.refreshed"));
    } catch (error) {
      const text = error instanceof Error ? error.message : "Empty trash failed";
      message.error(translateApiError(text, locale));
    }
  };

  return (
    <PageContainer
      ghost
      title={t("page.trash.title")}
      subTitle={t("page.trash.description")}
      extra={[
        <Popconfirm
          key="empty"
          title={t("trash.emptyConfirm")}
          description={t("trash.emptyDescription")}
          onConfirm={emptyTrash}
        >
          <Button danger icon={<DeleteOutlined />}>{t("trash.emptyButton")}</Button>
        </Popconfirm>,
      ]}
    >
      <Alert
        className="trash-alert"
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message={t("trash.retentionAlert")}
      />
      <section className="trash-table-surface">
        {selectedIds.length > 0 && (
          <div className="document-selection-bar">
            <Typography.Text strong>{t("selection.count", { count: selectedIds.length })}</Typography.Text>
            <Space wrap>
              <Button
                size="small"
                icon={<UndoOutlined />}
                onClick={() => void batchRestore()}
              >
                {t("common.restore")}
              </Button>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() =>
                  modal.confirm({
                    title: t("trash.batchDeleteTitle", { count: selectedIds.length }),
                    content: t("trash.batchDeleteDescription"),
                    onOk: batchPermanentDelete,
                  })
                }
              >
                {t("context.deleteForever")}
              </Button>
              <Button type="text" size="small" onClick={() => setSelectedIds([])}>
                {t("selection.clear")}
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
              {locale === "vi" ? "Tải thêm" : "Load more"}
            </Button>
          </div>
        )}
      </section>
    </PageContainer>
  );
}
