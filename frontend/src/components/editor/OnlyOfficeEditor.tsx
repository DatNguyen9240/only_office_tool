import { LoadingOutlined } from "@ant-design/icons";
import { Alert, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
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
  const editorInstanceRef = useRef<{ destroy?: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!documentId || !isApiConfigured) {
      setError(
        !documentId
          ? "Document ID is missing"
          : "VITE_API_URL is not configured",
      );
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(undefined);

    const initialize = async () => {
      try {
        const response = await apiRequest<EditorConfigResponse>(
          `/documents/${documentId}/editor-config`,
        );
        if (!active) return;

        const serverUrl = response.onlyofficeServerUrl.replace(/\/$/, "");
        if (!window.DocsAPI) {
          await loadScript(
            `${serverUrl}/web-apps/apps/api/documents/api.js`,
          );
        }
        if (!active) return;
        if (!window.DocsAPI || !containerRef.current) {
          throw new Error("ONLYOFFICE SDK did not initialize");
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
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load the ONLYOFFICE editor",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialize();
    return () => {
      active = false;
      editorInstanceRef.current?.destroy?.();
      editorInstanceRef.current = null;
    };
  }, [documentId]);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 650 }}>
      {error ? (
        <Alert
          showIcon
          type="error"
          message="ONLYOFFICE editor is unavailable"
          description={error}
          style={{ margin: 24 }}
        />
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
            tip="Loading ONLYOFFICE editor..."
          />
        </div>
      ) : null}
      <div
        ref={containerRef}
        hidden={loading || Boolean(error)}
        style={{ width: "100%", height: "100%", minHeight: 650 }}
      />
    </div>
  );
}

function loadScript(source: string) {
  const existing = window.document.querySelector<HTMLScriptElement>(
    `script[src="${source}"]`,
  );
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      if (window.DocsAPI) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ONLYOFFICE SDK from ${source}`)),
        { once: true },
      );
    });
  }
  return new Promise<void>((resolve, reject) => {
    const script = window.document.createElement("script");
    script.src = source;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ONLYOFFICE SDK from ${source}`)),
      { once: true },
    );
    window.document.body.appendChild(script);
  });
}
