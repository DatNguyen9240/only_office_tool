import { LoadingOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Spin, Space } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, isApiConfigured } from "@/lib/api";
import { useI18n } from "@/i18n";

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
  showWatermark?: boolean;
}

interface EditorConfigResponse {
  onlyofficeServerUrl: string;
  config: Record<string, unknown>;
  watermarkText?: string;
}

export function OnlyOfficeEditor({
  documentId,
  showWatermark = true,
}: OnlyOfficeEditorProps) {
  const { locale, t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<{ destroy?: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [watermarkText, setWatermarkText] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  const initEditor = useCallback(async () => {
    if (!documentId || !isApiConfigured) {
      setError(
        !documentId
          ? (locale === "vi" ? "Thiếu mã tài liệu" : "Document ID is missing")
          : (locale === "vi" ? "Chưa cấu hình VITE_API_URL" : "VITE_API_URL is not configured"),
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const response = await apiRequest<EditorConfigResponse>(
        `/documents/${documentId}/editor-config`,
      );
      setWatermarkText(response.watermarkText);

      const serverUrl = response.onlyofficeServerUrl.replace(/\/$/, "");
      if (!window.DocsAPI) {
        await loadScript(
          `${serverUrl}/web-apps/apps/api/documents/api.js`,
          locale,
        );
      }
      if (!window.DocsAPI || !containerRef.current) {
        throw new Error(
          locale === "vi"
            ? "Thư viện SDK ONLYOFFICE không thể khởi tạo"
            : "ONLYOFFICE SDK did not initialize",
        );
      }

      containerRef.current.innerHTML = "";
      const editorElement = window.document.createElement("div");
      editorElement.id = `onlyoffice-editor-${documentId}`;
      editorElement.style.width = "100%";
      editorElement.style.height = "100%";
      containerRef.current.appendChild(editorElement);
      editorInstanceRef.current = new window.DocsAPI.DocEditor(
        editorElement.id,
        response.config,
      );
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [documentId, locale]);

  useEffect(() => {
    let cleanupFunc: (() => void) | undefined;
    void initEditor().then(() => {
      cleanupFunc = () => {
        editorInstanceRef.current?.destroy?.();
        editorInstanceRef.current = null;
      };
    });

    return () => {
      cleanupFunc?.();
      editorInstanceRef.current?.destroy?.();
      editorInstanceRef.current = null;
    };
  }, [initEditor, reloadKey]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {error ? (
        <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
          <Alert
            showIcon
            type="error"
            message={locale === "vi" ? "Trình chỉnh sửa ONLYOFFICE không khả dụng" : "ONLYOFFICE editor is unavailable"}
            description={
              <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
                <div>{error}</div>
                {error.includes("api.js") && (
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                    {locale === "vi" ? (
                      <>
                        📌 <strong>Nguyên nhân:</strong> Biến môi trường <code>ONLYOFFICE_SERVER_URL</code> trên Backend đang trỏ tới cổng 5001 (là dịch vụ <code>document-processor</code>) hoặc máy chủ ONLYOFFICE DocumentServer chưa sẵn sàng tại địa chỉ này.<br />
                        🛠️ <strong>Cách khắc phục:</strong> Kiểm tra lại biến <code>ONLYOFFICE_SERVER_URL</code> trong tệp <code>backend/.env</code> (ví dụ: <code>ONLYOFFICE_SERVER_URL=http://103.190.38.46:8080</code> hoặc <code>http://localhost:8080</code>) rồi khởi động lại backend.
                      </>
                    ) : (
                      <>
                        📌 <strong>Reason:</strong> The <code>ONLYOFFICE_SERVER_URL</code> environment variable on the Backend points to port 5001 (which is the <code>document-processor</code> service) or ONLYOFFICE DocumentServer is unreachable.<br />
                        🛠️ <strong>Fix:</strong> Verify <code>ONLYOFFICE_SERVER_URL</code> in <code>backend/.env</code> (e.g. <code>ONLYOFFICE_SERVER_URL=http://103.190.38.46:8080</code> or <code>http://localhost:8080</code>) and restart backend.
                      </>
                    )}
                  </div>
                )}
                <Button
                  size="small"
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() => setReloadKey((k) => k + 1)}
                  style={{ marginTop: 8 }}
                >
                  {locale === "vi" ? "Thử lại" : "Retry"}
                </Button>
              </Space>
            }
          />
        </div>
      ) : null}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />}
            tip={locale === "vi" ? "Đang tải trình chỉnh sửa ONLYOFFICE..." : "Loading ONLYOFFICE editor..."}
          />
        </div>
      ) : null}
      <div
        ref={containerRef}
        hidden={loading || Boolean(error)}
        style={{ width: "100%", height: "100%" }}
      />
      {showWatermark && !loading && !error && watermarkText && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 9999,
            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="200">
                <text x="50%" y="50%" fill="black" font-size="13" font-family="sans-serif" font-weight="bold" opacity="${
                  watermarkText.includes("CONFIDENTIAL") ? 0.14 : 0.05
                }" transform="rotate(-30 175 100)" text-anchor="middle">
                  ${watermarkText}
                </text>
              </svg>`,
            )}")`,
            backgroundRepeat: "repeat",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function loadScript(source: string, locale?: string) {
  if (window.DocsAPI) {
    return Promise.resolve();
  }

  const errorMsg =
    locale === "vi"
      ? `Không thể tải SDK ONLYOFFICE từ địa chỉ: ${source}`
      : `Failed to load ONLYOFFICE SDK from ${source}`;

  const existingScripts = window.document.querySelectorAll<HTMLScriptElement>(
    'script[src*="web-apps/apps/api/documents/api.js"]',
  );
  existingScripts.forEach((script) => script.remove());

  return new Promise<void>((resolve, reject) => {
    const script = window.document.createElement("script");
    script.src = source;
    script.async = true;
    script.onload = () => {
      if (window.DocsAPI) {
        resolve();
      } else {
        script.remove();
        reject(new Error(errorMsg));
      }
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(errorMsg));
    };
    window.document.body.appendChild(script);
  });
}
