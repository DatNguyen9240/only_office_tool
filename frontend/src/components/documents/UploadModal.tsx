import { InboxOutlined } from "@ant-design/icons";
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
import { useState } from "react";
import { folders } from "@/data/sampleData";
import { useI18n } from "@/i18n";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function UploadModal({ open, onClose }: UploadModalProps) {
  const { message } = App.useApp();
  const { t } = useI18n();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const submit = async () => {
    await form.validateFields();
    if (!files.length) {
      message.warning(t("upload.selectOne"));
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setFiles([]);
      form.resetFields();
      message.success(t("upload.success", { count: files.length }));
      onClose();
    }, 650);
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
