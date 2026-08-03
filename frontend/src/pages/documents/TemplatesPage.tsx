import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
} from "antd";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { translateApiError, useI18n } from "@/i18n";

interface TemplateItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  updatedAt: string;
}

export function TemplatesPage() {
  const { message } = App.useApp();
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { data: templates = [], refetch } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiRequest<TemplateItem[]>("/templates"),
  });

  const create = async () => {
    const values = await form.validateFields();
    try {
      await apiRequest("/templates", {
        method: "POST",
        body: JSON.stringify(values),
      });
      await refetch();
      form.resetFields();
      setOpen(false);
      message.success(locale === "vi" ? "Đã tạo mẫu thành công" : "Template created");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Could not create template";
      message.error(translateApiError(text, locale));
    }
  };

  return (
    <PageContainer
      ghost
      title={locale === "vi" ? "Mẫu tài liệu" : "Templates"}
      subTitle={locale === "vi" ? "Lưu trữ các mẫu tài liệu chuẩn cho toàn bộ nhóm." : "Keep reusable document starting points for your team."}
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
        >
          {locale === "vi" ? "Tạo mẫu mới" : "New template"}
        </Button>,
      ]}
    >
      <ProCard>
        <List
          grid={{ gutter: 16, column: 3 }}
          dataSource={templates}
          locale={{ emptyText: locale === "vi" ? "Chưa có mẫu nào" : "No templates yet" }}
          renderItem={(template) => (
            <List.Item>
              <Card
                title={template.name}
                extra={
                  <Popconfirm
                    title={locale === "vi" ? "Xóa mẫu này?" : "Delete this template?"}
                    onConfirm={async () => {
                      await apiRequest(`/templates/${template.id}`, {
                        method: "DELETE",
                      });
                      await refetch();
                    }}
                  >
                    <Button danger type="text" icon={<DeleteOutlined />} />
                  </Popconfirm>
                }
              >
                <Space direction="vertical">
                  <span>{template.type}</span>
                  <span>{template.description || (locale === "vi" ? "Chưa có mô tả" : "No description")}</span>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </ProCard>
      <Modal
        title={locale === "vi" ? "Tạo mẫu mới" : "New template"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void create()}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={locale === "vi" ? "Tên mẫu" : "Name"} rules={[{ required: true }]}>
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item name="type" label={locale === "vi" ? "Loại tài liệu" : "File type"} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "DOCX", label: locale === "vi" ? "Văn bản Word (.docx)" : "Word document" },
                { value: "XLSX", label: locale === "vi" ? "Bảng tính Excel (.xlsx)" : "Spreadsheet" },
                { value: "PPTX", label: locale === "vi" ? "Trình chiếu PowerPoint (.pptx)" : "Presentation" },
                { value: "PDF", label: "PDF" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label={locale === "vi" ? "Mô tả" : "Description"}>
            <Input.TextArea maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
