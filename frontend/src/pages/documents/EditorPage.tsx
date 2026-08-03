import {
  ArrowLeftOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Switch, Tag, Tooltip, Typography } from "antd";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DocumentItem } from "@share";
import { SharePermissionModal } from "@/components/file/Permissions/SharePermissionModal";
import { VersionHistoryDrawer } from "@/components/file/Details/VersionHistoryDrawer";
import { OnlyOfficeEditor } from "@/components/file/OnlyOffice/OnlyOfficeEditor";
import { graphqlRequest } from "@/lib/graphql";
import documentDetailQuery from "@/graphql/document-detail.graphql?raw";
import { useI18n } from "@/i18n";

interface DocumentDetailResponse {
  document: DocumentItem & {
    versions: Array<{
      id: string;
      version: number;
      versionLabel: string;
      modifiedAt: string;
      author: string;
      size: string;
    }>;
  };
}

export function EditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { locale, t } = useI18n();
  const [shareOpen, setShareOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const { data } = useQuery({
    queryKey: ["documents", "detail", id],
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      graphqlRequest<DocumentDetailResponse, { id: string }>(
        documentDetailQuery,
        { id: id! },
        { operationName: "DocumentDetail", signal },
      ),
  });
  const document = data?.document;
  const versions = document?.versions ?? [];

  return (
    <main className="editor-page">
      <header className="editor-header">
        <Space size={12}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            aria-label="Back to documents"
            onClick={() => navigate("/documents")}
          />
          <span className="brand-mark compact">M</span>
          <div className="editor-file-title">
            <Typography.Text strong>
              {document?.name ?? "Loading document..."}
            </Typography.Text>
            <Space size={6}>
              {document && (
                <Tag bordered={false}>{formatStatus(document.status)}</Tag>
              )}
              {versions[0] && (
                <Tag bordered={false}>Version {versions[0].version}</Tag>
              )}
            </Space>
          </div>
        </Space>
        <Space size={16}>
          <Tooltip title={locale === "vi" ? "Bật / Tắt chữ ký mờ bảo mật Watermark" : "Toggle Security Watermark Overlay"}>
            <Space size={6} style={{ cursor: "pointer" }}>
              <SafetyCertificateOutlined style={{ color: showWatermark ? "#1677ff" : "#8c8c8c" }} />
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {locale === "vi" ? "Watermark" : "Watermark"}
              </Typography.Text>
              <Switch
                size="small"
                checked={showWatermark}
                onChange={(checked) => setShowWatermark(checked)}
              />
            </Space>
          </Tooltip>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setVersionsOpen(true)}
          >
            {locale === "vi" ? "Lịch sử" : "History"}
          </Button>
          <Button
            type="primary"
            icon={<ShareAltOutlined />}
            onClick={() => setShareOpen(true)}
          >
            {locale === "vi" ? "Chia sẻ" : "Share"}
          </Button>
        </Space>
      </header>
      <section className="editor-stage" aria-label="Document editor">
        <OnlyOfficeEditor documentId={id} showWatermark={showWatermark} />
      </section>
      <SharePermissionModal
        open={shareOpen}
        document={document}
        onClose={() => setShareOpen(false)}
      />
      <VersionHistoryDrawer
        open={versionsOpen}
        document={document}
        onClose={() => setVersionsOpen(false)}
      />
    </main>
  );
}

function formatStatus(status: DocumentItem["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
