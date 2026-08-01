import {
  ArrowLeftOutlined,
  HistoryOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DocumentItem } from "@share";
import { SharePermissionModal } from "@/components/file/Permissions/SharePermissionModal";
import { VersionHistoryDrawer } from "@/components/file/Details/VersionHistoryDrawer";
import { OnlyOfficeEditor } from "@/components/file/OnlyOffice/OnlyOfficeEditor";
import { graphqlRequest } from "@/lib/graphql";
import documentDetailQuery from "@/graphql/document-detail.graphql?raw";

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
  const [shareOpen, setShareOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
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
        <Space>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setVersionsOpen(true)}
          >
            History
          </Button>
          <Button
            type="primary"
            icon={<ShareAltOutlined />}
            onClick={() => setShareOpen(true)}
          >
            Share
          </Button>
        </Space>
      </header>
      <section className="editor-stage" aria-label="Document editor">
        <OnlyOfficeEditor documentId={id} />
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
