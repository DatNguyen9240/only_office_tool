import {
  CheckCircleOutlined,
  CloudServerOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { Alert, Space, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import type { DocumentItem } from "@/types";

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (elementId: string, config: Record<string, unknown>) => {
        destroyEditor?: () => void;
      };
    };
  }
}

interface OnlyOfficeEditorProps {
  document: DocumentItem;
}

export function OnlyOfficeEditor({ document }: OnlyOfficeEditorProps) {
  const editorRef = useRef<{ destroyEditor?: () => void } | undefined>(undefined);
  const [error, setError] = useState<string>();
  const serverUrl = import.meta.env.VITE_ONLYOFFICE_SERVER_URL as string | undefined;
  const documentUrl = import.meta.env.VITE_SAMPLE_DOCUMENT_URL as string | undefined;

  useEffect(() => {
    if (!serverUrl || !documentUrl) return;
    const scriptId = "onlyoffice-api-script";
    let script = window.document.getElementById(scriptId) as HTMLScriptElement | null;

    const initialize = () => {
      if (!window.DocsAPI) {
        setError("The ONLYOFFICE API did not load.");
        return;
      }
      editorRef.current = new window.DocsAPI.DocEditor("onlyoffice-editor", {
        documentType: "word",
        width: "100%",
        height: "100%",
        document: {
          fileType: document.type,
          key: document.id,
          title: document.name,
          url: documentUrl,
          permissions: { edit: true, download: true, comment: true },
        },
        editorConfig: {
          mode: "edit",
          lang: "en",
          user: { id: "usr-1", name: "Anika Verma" },
          customization: {
            compactHeader: true,
            forcesave: true,
          },
        },
      });
    };

    if (!script) {
      script = window.document.createElement("script");
      script.id = scriptId;
      script.src = `${serverUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
      script.async = true;
      script.addEventListener("load", initialize);
      script.addEventListener("error", () => setError("Unable to connect to the ONLYOFFICE server."));
      window.document.body.appendChild(script);
    } else if (window.DocsAPI) {
      initialize();
    } else {
      script.addEventListener("load", initialize);
    }

    return () => {
      script?.removeEventListener("load", initialize);
      editorRef.current?.destroyEditor?.();
    };
  }, [document.id, document.name, document.type, documentUrl, serverUrl]);

  if (serverUrl && documentUrl) {
    return error ? (
      <Alert type="error" showIcon message="Editor unavailable" description={error} />
    ) : (
      <div id="onlyoffice-editor" className="onlyoffice-editor-host" />
    );
  }

  return (
    <div className="editor-fallback">
      <Alert
        showIcon
        type="info"
        message="Preview mode"
        description="Connect an ONLYOFFICE Document Server to enable collaborative editing."
      />
      <div className="document-paper">
        <div className="document-paper-heading">
          <FileTextOutlined />
          <span>OPERATING PLAN</span>
        </div>
        <Typography.Title>Q3 operating plan</Typography.Title>
        <Typography.Paragraph type="secondary">
          Prepared for the monthly operating review
        </Typography.Paragraph>
        <Typography.Title level={3}>Management summary</Typography.Title>
        <Typography.Paragraph>
          The third-quarter plan aligns operational capacity with the approved
          delivery schedule. Department owners should confirm milestones and
          dependencies before the review meeting.
        </Typography.Paragraph>
        <div className="document-callout">
          <CheckCircleOutlined />
          <div>
            <strong>Review focus</strong>
            <span>Confirm ownership, budget assumptions, and delivery dates.</span>
          </div>
        </div>
        <Typography.Title level={3}>Priority actions</Typography.Title>
        <ol>
          <li>Complete the finance and procurement dependency review.</li>
          <li>Confirm team capacity for the Harbor expansion workstream.</li>
          <li>Publish the approved plan to department managers.</li>
        </ol>
        <Space className="onlyoffice-setup-note">
          <CloudServerOutlined />
          <Typography.Text type="secondary">
            Set `VITE_ONLYOFFICE_SERVER_URL` and `VITE_SAMPLE_DOCUMENT_URL` to load the live editor.
          </Typography.Text>
        </Space>
      </div>
    </div>
  );
}
