import { useState } from "react";
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
import { folders } from "@/data/sampleData";
import { translateApiError, useI18n } from "@/i18n";
import { apiRequest, isApiConfigured } from "@/lib/api";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function UploadModal({ open, onClose }: UploadModalProps) {
  const { message } = App.useApp();
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const submit = async () => {
    await form.validateFields();
    if (!files.length) {
      message.warning(t("upload.selectOne"));
      return;
    }

    const folderId = form.getFieldValue("folderId");
    setSubmitting(true);

    try {
      if (isApiConfigured) {
        for (const fileItem of files) {
          const originFile = fileItem.originFileObj;
          if (!originFile) continue;

          const formData = new FormData();
          formData.append("file", originFile);
          if (folderId && folderId !== "all") {
            formData.append("folderId", folderId);
          }

          // Use fetch directly for FormData to avoid default JSON content-type header
          const stored = localStorage.getItem("meridian-auth");
          const token = stored ? JSON.parse(stored).state?.accessToken : "";
          const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

          const res = await fetch(`${apiBase}/documents/upload`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Upload failed (${res.status})`);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      }

      message.success(t("upload.success", { count: files.length }));
      setFiles([]);
      form.resetFields();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      message.error(translateApiError(msg, locale));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      destroyOnHidden
      open={open}
      title={t("upload.title")}
      width={600}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t("common.cancel")}
        </Button>,
        <Button key="upload" type="primary" loading={submitting} onClick={submit}>
          {t("header.upload")}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" initialValues={{ folderId: "company" }}>
        <Form.Item
          label={t("upload.destination")}
          name="folderId"
          rules={[{ required: true, message: t("upload.chooseDestination") }]}
        >
          <Select
            options={folders
              .filter((folder) => folder.id !== "all")
              .map((folder) => ({ label: folder.name, value: folder.id }))}
          />
        </Form.Item>
        <Form.Item label={t("upload.files")} required>
          <Upload.Dragger
            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"
            beforeUpload={() => false}
            fileList={files}
            multiple
            onChange={({ fileList }: UploadChangeParam<UploadFile>) => setFiles(fileList)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <Typography.Text strong>{t("upload.drop")}</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ margin: "6px 0 0" }}>
              {t("upload.supported")}
            </Typography.Paragraph>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
