import { useEffect, useState } from "react";
import { DownloadOutlined, HistoryOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Drawer,
  Popconfirm,
  Space,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { translateApiError, useI18n } from "@/i18n";
import { apiRequest } from "@/lib/api";
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
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [versionList, setVersionList] = useState<VersionItem[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !document?.id) {
      setVersionList([]);
      return;
    }
    setVersionList([]);
    setLoading(true);
    apiRequest<VersionItem[]>(`/documents/${document.id}/versions`)
      .then(setVersionList)
      .catch((error) => {
        const text =
          error instanceof Error ? error.message : "Failed to fetch versions";
        message.error(translateApiError(text, locale));
      })
      .finally(() => setLoading(false));
  }, [document?.id, locale, message, open]);

  const handleRestore = async (version: number) => {
    if (!document?.id) return;
    setRestoring(true);
    try {
      await apiRequest(`/documents/${document.id}/versions/${version}/restore`, {
        method: "POST",
      });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      const updated = await apiRequest<VersionItem[]>(
        `/documents/${document.id}/versions`,
      );
      setVersionList(updated);
      message.success(t("versions.restored", { version: `v${version}.0` }));
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Restore version failed";
      message.error(translateApiError(text, locale));
    } finally {
      setRestoring(false);
    }
  };

  const downloadVersion = async (version: number) => {
    if (!document?.id) return;
    try {
      const response = await apiRequest<{ url: string }>(
        `/documents/${document.id}/versions/${version}/download-url`,
      );
      window.location.assign(response.url);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Download failed";
      message.error(translateApiError(text, locale));
    }
  };

  return (
    <Drawer
      open={open}
      title={t("history.title")}
      width={420}
      onClose={onClose}
    >
      {document && (
        <div className="drawer-document-heading">
          <Typography.Text strong>{document.name}</Typography.Text>
          <Typography.Text type="secondary">
            {versionList.length} phiên bản đã lưu
          </Typography.Text>
        </div>
      )}
      <Timeline
        pending={loading}
        items={versionList.map((item, index) => {
          const isCurrent = index === 0;
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
                <Space>
                  {!isCurrent && (
                    <Popconfirm
                      title={t("versions.restoreTitle")}
                      description={t("versions.restoreDescription")}
                      onConfirm={() => handleRestore(item.version)}
                    >
                      <Button size="small" loading={restoring}>
                        {t("common.restore")}
                      </Button>
                    </Popconfirm>
                  )}
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => void downloadVersion(item.version)}
                  >
                    Download
                  </Button>
                </Space>
              </div>
            ),
          };
        })}
      />
    </Drawer>
  );
}
