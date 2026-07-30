import { useEffect, useState } from "react";
import { DownloadOutlined, HistoryOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Drawer, Popconfirm, Space, Tag, Timeline, Typography } from "antd";
import { versions as sampleVersions } from "@/data/sampleData";
import { useI18n } from "@/i18n";
import { apiRequest, isApiConfigured } from "@/lib/api";
import type { DocumentItem } from "@share";

interface VersionItem {
  id: string;
  version: number;
  versionLabel: string;
  modifiedAt: string;
  author: string;
  size: string;
}

interface VersionHistoryDrawerProps {
  open: boolean;
  document?: DocumentItem;
  onClose: () => void;
}

export function VersionHistoryDrawer({
  open,
  document,
  onClose,
}: VersionHistoryDrawerProps) {
  const { message } = App.useApp();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [versionList, setVersionList] = useState<VersionItem[]>([]);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open || !document?.id || !isApiConfigured) {
      return;
    }
    apiRequest<VersionItem[]>(`/documents/${document.id}/versions`)
      .then((data) => setVersionList(data))
      .catch((err) => console.warn("Failed to fetch versions:", err));
  }, [open, document?.id]);

  const handleRestore = async (versionNum: number) => {
    if (!document?.id) return;
    setRestoring(true);
    try {
      if (isApiConfigured) {
        await apiRequest(`/documents/${document.id}/versions/${versionNum}/restore`, {
          method: "POST",
        });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        const updated = await apiRequest<VersionItem[]>(`/documents/${document.id}/versions`);
        setVersionList(updated);
      }
      message.success(t("versions.restored", { version: `v${versionNum}.0` }));
    } catch (err) {
      console.warn("Restore version failed:", err);
    } finally {
      setRestoring(false);
    }
  };

  const displayList = isApiConfigured && versionList.length ? versionList : sampleVersions.map((v, idx) => ({
    id: v.id,
    version: sampleVersions.length - idx,
    versionLabel: v.version,
    modifiedAt: v.createdAt,
    author: v.author,
    size: v.size,
  }));

  return (
    <Drawer
      open={open}
      title={t("history.title")}
      width={420}
      onClose={onClose}
      extra={
        <Button size="small" icon={<DownloadOutlined />}>
          {t("history.downloadAll")}
        </Button>
      }
    >
      {document && (
        <div className="drawer-document-heading">
          <Typography.Text strong>{document.name}</Typography.Text>
          <Typography.Text type="secondary">{displayList.length} phiên bản đã lưu</Typography.Text>
        </div>
      )}
      <Timeline
        items={displayList.map((item, idx) => {
          const isCurrent = idx === 0;
          return {
            color: isCurrent ? "#275dad" : "gray",
            dot: isCurrent ? <HistoryOutlined /> : undefined,
            children: (
              <div className="version-entry">
                <Space>
                  <Typography.Text strong>{item.versionLabel}</Typography.Text>
                  {isCurrent && (
                    <Tag color="blue" bordered={false}>
                      {t("common.current")}
                    </Tag>
                  )}
                </Space>
                <Typography.Text type="secondary">
                  {item.author}, {item.modifiedAt}, {item.size}
                </Typography.Text>
                {!isCurrent && (
                  <Popconfirm
                    title={t("versions.restoreTitle")}
                    description={t("versions.restoreDescription")}
                    onConfirm={() => handleRestore(item.version)}
                  >
                    <Button size="small" loading={restoring}>{t("common.restore")}</Button>
                  </Popconfirm>
                )}
              </div>
            ),
          };
        })}
      />
    </Drawer>
  );
}
