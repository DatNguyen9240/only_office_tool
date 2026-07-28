import { DownloadOutlined, HistoryOutlined } from "@ant-design/icons";
import { App, Button, Drawer, Popconfirm, Space, Tag, Timeline, Typography } from "antd";
import { versions } from "@/data/sampleData";
import { useI18n } from "@/i18n";
import type { DocumentItem } from "@/types";

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
          <Typography.Text type="secondary">{t("history.saved")}</Typography.Text>
        </div>
      )}
      <Timeline
        items={versions.map((version) => ({
          color: version.current ? "#275dad" : "gray",
          dot: version.current ? <HistoryOutlined /> : undefined,
          children: (
            <div className="version-entry">
              <Space>
                <Typography.Text strong>{version.version}</Typography.Text>
                {version.current && (
                  <Tag color="blue" bordered={false}>
                    {t("common.current")}
                  </Tag>
                )}
              </Space>
              <Typography.Text type="secondary">{version.note}</Typography.Text>
              <Typography.Text type="secondary">
                {version.author}, {version.createdAt}, {version.size}
              </Typography.Text>
              {!version.current && (
                <Popconfirm
                  title={t("versions.restoreTitle")}
                  description={t("versions.restoreDescription")}
                  onConfirm={() =>
                    message.success(
                      t("versions.restored", { version: version.version }),
                    )
                  }
                >
                  <Button size="small">{t("common.restore")}</Button>
                </Popconfirm>
              )}
            </div>
          ),
        }))}
      />
    </Drawer>
  );
}
