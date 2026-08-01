import { useRef, useState } from "react";
import { InboxOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Modal,
  Select,
  Typography,
  Upload,
  type UploadFile,
} from "antd";
import type { UploadChangeParam } from "antd/es/upload";
import { useFolders, type FolderItem } from "@/hooks/useFolders";
import { translateApiError, useI18n } from "@/i18n";
import { apiRequest } from "@/lib/api";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  directory?: boolean;
  folders?: FolderItem[];
}

interface UploadUrlResponse {
  documentId: string;
  objectKey: string;
  expectedSizeBytes: number;
  url: string;
  headers: Record<string, string>;
}

const supportedTypes: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};

function contentTypeFor(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return supportedTypes[extension];
}

export function UploadModal({
  open,
  onClose,
  directory = false,
  folders,
}: UploadModalProps) {
  const { message } = App.useApp();
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const { data: fetchedFolders = [] } = useFolders(!folders);
  const availableFolders = folders ?? fetchedFolders;
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const cancelled = useRef(false);
  const [form] = Form.useForm();

  const updateFile = (uid: string, update: Partial<UploadFile>) => {
    setFiles((current) =>
      current.map((file) => (file.uid === uid ? { ...file, ...update } : file)),
    );
  };

  const uploadToObjectStorage = (
    fileItem: UploadFile,
    file: File,
    upload: UploadUrlResponse,
  ) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      requests.current.set(fileItem.uid, xhr);
      xhr.open("PUT", upload.url);
      Object.entries(upload.headers).forEach(([name, value]) =>
        xhr.setRequestHeader(name, value),
      );
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        updateFile(fileItem.uid, {
          percent: Math.round((event.loaded / event.total) * 100),
          status: "uploading",
        });
      };
      xhr.onload = () => {
        requests.current.delete(fileItem.uid);
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Object storage upload failed (${xhr.status})`));
      };
      xhr.onerror = () => {
        requests.current.delete(fileItem.uid);
        reject(new Error("Object storage upload failed"));
      };
      xhr.onabort = () => {
        requests.current.delete(fileItem.uid);
        reject(new DOMException("Upload cancelled", "AbortError"));
      };
      xhr.send(file);
    });

  const uploadOne = async (fileItem: UploadFile, folderId?: string) => {
    const file = fileItem.originFileObj;
    if (!file) return;
    const contentType = contentTypeFor(file);
    if (!contentType) throw new Error(`Unsupported file type: ${file.name}`);

    const upload = await apiRequest<UploadUrlResponse>("/documents/upload-url", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        contentType,
        sizeBytes: file.size,
        ...(folderId && folderId !== "all" ? { folderId } : {}),
      }),
    });

    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (cancelled.current) throw new DOMException("Upload cancelled", "AbortError");
      try {
        await uploadToObjectStorage(fileItem, file, upload);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (attempt < 3) updateFile(fileItem.uid, { percent: 0, status: "uploading" });
      }
    }
    if (lastError) throw lastError;

    await apiRequest(`/documents/${upload.documentId}/upload-complete`, {
      method: "POST",
      body: JSON.stringify({
        objectKey: upload.objectKey,
        expectedSizeBytes: upload.expectedSizeBytes,
      }),
    });
    updateFile(fileItem.uid, { percent: 100, status: "done" });
  };

  const submit = async () => {
    await form.validateFields();
    if (!files.length) {
      message.warning(t("upload.selectOne"));
      return;
    }

    setSubmitting(true);
    cancelled.current = false;
    const folderId = form.getFieldValue("folderId") as string | undefined;
    const results = await Promise.allSettled(
      files.map((file) => uploadOne(file, folderId)),
    );
    const failed = results.filter((result) => result.status === "rejected");
    await queryClient.invalidateQueries({ queryKey: ["documents"] });

    if (!failed.length) {
      message.success(t("upload.success", { count: files.length }));
      setFiles([]);
      form.resetFields();
      onClose();
    } else if (!cancelled.current) {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const file = files[index];
          if (file) updateFile(file.uid, { status: "error" });
        }
      });
      const cause = failed[0].status === "rejected" ? failed[0].reason : undefined;
      const error = cause instanceof Error ? cause.message : "Upload failed";
      message.error(translateApiError(error, locale));
    }
    requests.current.clear();
    setSubmitting(false);
  };

  const cancel = () => {
    cancelled.current = true;
    requests.current.forEach((request) => request.abort());
    requests.current.clear();
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      destroyOnHidden
      open={open}
      title={directory ? "Upload folder" : t("upload.title")}
      width={600}
      onCancel={cancel}
      footer={[
        <Button key="cancel" onClick={cancel}>
          {t("common.cancel")}
        </Button>,
        <Button key="upload" type="primary" loading={submitting} onClick={submit}>
          {t("header.upload")}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" initialValues={{ folderId: "all" }}>
        <Form.Item
          label={t("upload.destination")}
          name="folderId"
          rules={[{ required: true, message: t("upload.chooseDestination") }]}
        >
          <Select
            options={[
              { label: t("filter.all"), value: "all" },
              ...availableFolders.map((folder) => ({
                label: folder.name,
                value: folder.id,
              })),
            ]}
          />
        </Form.Item>
        <Form.Item label={t("upload.files")} required>
          <Upload.Dragger
            accept=".docx,.xlsx,.pptx,.pdf"
            directory={directory}
            beforeUpload={() => false}
            fileList={files}
            multiple
            onChange={(info: UploadChangeParam<UploadFile>) => setFiles(info.fileList)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <Typography.Text>Drag files here or click to browse.</Typography.Text>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
