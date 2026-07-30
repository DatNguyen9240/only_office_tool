import { useEffect, useRef, useState } from "react";
import {
  CheckCircleOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { Alert, Spin, Space, Typography } from "antd";
import { apiRequest, isApiConfigured } from "@/lib/api";

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        elementId: string,
        config: Record<string, unknown>,
      ) => { destroy?: () => void };
    };
  }
}

interface OnlyOfficeEditorProps {
  documentId?: string;
}

interface EditorConfigResponse {
  onlyofficeServerUrl: string;
  config: Record<string, unknown>;
}

export function OnlyOfficeEditor({ documentId }: OnlyOfficeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const editorInstanceRef = useRef<{ destroy?: () => void } | null>(null);

  useEffect(() => {
    if (!documentId || !isApiConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(undefined);

    async function initEditor() {
      try {
        const res = await apiRequest<EditorConfigResponse>(
          `/documents/${documentId}/editor-config`,
        );

        if (!isMounted) return;

        const serverUrl = res.onlyofficeServerUrl.replace(/\/$/, "");
        const scriptUrl = `${serverUrl}/web-apps/apps/api/documents/api.js`;

        // Check if script already loaded or load it dynamically
        if (!window.DocsAPI) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = scriptUrl;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error(`Failed to load ONLYOFFICE SDK from ${scriptUrl}`));
            document.body.appendChild(script);
          });
        }

        if (!isMounted) return;

        if (window.DocsAPI && containerRef.current) {
          // Clear any previous editor container
          containerRef.current.innerHTML = "";
          const editorDiv = document.createElement("div");
          editorDiv.id = `onlyoffice-editor-${documentId}`;
          editorDiv.style.width = "100%";
          editorDiv.style.height = "100%";
          containerRef.current.appendChild(editorDiv);

          editorInstanceRef.current = new window.DocsAPI.DocEditor(
            editorDiv.id,
            res.config,
          );
        }
      } catch (err) {
        if (isMounted) {
          console.warn("[ONLYOFFICE] Failed to init editor:", err);
          setError(
            err instanceof Error ? err.message : "Failed to load ONLYOFFICE editor",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initEditor();

    return () => {
      isMounted = false;
      if (editorInstanceRef.current?.destroy) {
        editorInstanceRef.current.destroy();
      }
    };
  }, [documentId]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} tip="Đang tải trình soạn thảo ONLYOFFICE..." />
      </div>
    );
  }

  if (error || !isApiConfigured || !documentId) {
    return (
      <div className="editor-fallback">
        <Alert
          showIcon
          type={error ? "warning" : "info"}
          message={error ? "Không thể kết nối ONLYOFFICE Server" : "Chế độ xem thử (Preview Mode)"}
          description={
            error
              ? `${error}. Đang hiển thị bản xem trước mẫu.`
              : "Trình soạn thảo sẽ được kích hoạt khi mở từ hệ thống."
          }
        />
        <div className="document-paper">
          <div className="document-paper-heading">
            <FileTextOutlined />
            <span>KẾ HOẠCH HOẠT ĐỘNG</span>
          </div>
          <Typography.Title>Kế hoạch hoạt động Q3</Typography.Title>
          <Typography.Paragraph type="secondary">
            Tài liệu chuẩn bị cho buổi đánh giá hoạt động hàng tháng
          </Typography.Paragraph>
          <Typography.Title level={3}>Tóm tắt điều hành</Typography.Title>
          <Typography.Paragraph>
            Kế hoạch quý 3 điều chỉnh năng lực vận hành phù hợp với tiến độ giao hàng đã phê duyệt. Các chủ sở hữu bộ phận cần xác nhận các mốc quan trọng và sự phụ thuộc trước họp đánh giá.
          </Typography.Paragraph>
          <div className="document-callout">
            <CheckCircleOutlined />
            <div>
              <strong>Trọng tâm đánh giá</strong>
              <span>Xác nhận quyền sở hữu, giả định ngân sách và ngày hoàn thành.</span>
            </div>
          </div>
          <Space className="onlyoffice-setup-note">
            <CloudServerOutlined />
            <Typography.Text type="secondary">
              Mở file qua tài khoản công ty để kích hoạt chỉnh sửa trực tiếp với ONLYOFFICE.
            </Typography.Text>
          </Space>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "650px" }}
    />
  );
}
