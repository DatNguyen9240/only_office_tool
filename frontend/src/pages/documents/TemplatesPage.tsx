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

interface TemplateItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  updatedAt: string;
}

export function TemplatesPage() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { data: templates = [], refetch } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiRequest<TemplateItem[]>("/templates"),
  });

  const create = async () => {
    const values = await form.validateFields();
    await apiRequest("/templates", {
      method: "POST",
      body: JSON.stringify(values),
    });
    await refetch();
    form.resetFields();
    setOpen(false);
    message.success("Template created");
  };

  return (
    <PageContainer
      ghost
      title="Templates"
      subTitle="Keep reusable document starting points for your team."
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
        >
          New template
        </Button>,
      ]}
    >
      <ProCard>
        <List
          grid={{ gutter: 16, column: 3 }}
          dataSource={templates}
          locale={{ emptyText: "No templates yet" }}
          renderItem={(template) => (
            <List.Item>
              <Card
                title={template.name}
                extra={
                  <Popconfirm
                    title="Delete this template?"
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
                  <span>{template.description || "No description"}</span>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </ProCard>
      <Modal
        title="New template"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void create()}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item name="type" label="File type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "DOCX", label: "Word document" },
                { value: "XLSX", label: "Spreadsheet" },
                { value: "PPTX", label: "Presentation" },
                { value: "PDF", label: "PDF" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
