import {
  DeleteOutlined,
  ShareAltOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
} from "antd";
import { useEffect, useState } from "react";
import type { FolderItem } from "@/hooks/useFolders";
import { apiRequest } from "@/lib/api";
import { translateApiError, useI18n } from "@/i18n";

interface GroupOption {
  id: string;
  name: string;
  memberCount: number;
}

interface FolderPermission {
  id: string;
  role: "VIEWER" | "COMMENTER" | "EDITOR";
  email: string | null;
  user: { name: string; email: string } | null;
  group: { id: string; name: string } | null;
}

interface FolderPermissionModalProps {
  folder?: FolderItem;
  onClose: () => void;
}

export function FolderPermissionModal({
  folder,
  onClose,
}: FolderPermissionModalProps) {
  const { message } = App.useApp();
  const { locale, t } = useI18n();
  const [form] = Form.useForm();
  const recipientType = Form.useWatch("recipientType", form) ?? "user";
  const [permissions, setPermissions] = useState<FolderPermission[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!folder) return;
    setLoading(true);
    try {
      const [nextPermissions, nextGroups] = await Promise.all([
        apiRequest<FolderPermission[]>(`/folders/${folder.id}/permissions`),
        apiRequest<GroupOption[]>("/groups"),
      ]);
      setPermissions(nextPermissions);
      setGroups(nextGroups);
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Could not load access";
      message.error(translateApiError(text, locale));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (folder) void load();
  }, [folder?.id]);

  const grant = async () => {
    if (!folder) return;
    const values = await form.validateFields();
    try {
      await apiRequest(`/folders/${folder.id}/permissions`, {
        method: "POST",
        body: JSON.stringify(
          values.recipientType === "group"
            ? { groupId: values.groupId, role: values.role }
            : { email: values.email, role: values.role },
        ),
      });
      form.resetFields(["email", "groupId"]);
      await load();
      message.success(locale === "vi" ? "Đã cập nhật quyền truy cập thư mục" : "Folder access updated");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Could not grant access";
      message.error(translateApiError(text, locale));
    }
  };

  return (
    <Modal
      open={Boolean(folder)}
      title={locale === "vi" ? `Chia sẻ thư mục ${folder?.name ?? ""}` : `Share ${folder?.name ?? "folder"}`}
      onCancel={onClose}
      footer={[
        <Button key="done" type="primary" onClick={onClose}>
          {t("common.done")}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ recipientType: "user", role: "VIEWER" }}
      >
        <Form.Item name="recipientType" label={locale === "vi" ? "Loại đối tượng" : "Recipient type"}>
          <Select
            options={[
              { value: "user", label: locale === "vi" ? "Cá nhân" : "Person" },
              { value: "group", label: locale === "vi" ? "Nhóm" : "Group" },
            ]}
          />
        </Form.Item>
        {recipientType === "group" ? (
          <Form.Item name="groupId" label={locale === "vi" ? "Chọn nhóm" : "Group"} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={groups.map((group) => ({
                value: group.id,
                label: `${group.name} (${group.memberCount})`,
              }))}
            />
          </Form.Item>
        ) : (
          <Form.Item
            name="email"
            label={locale === "vi" ? "Email làm việc" : "Work email"}
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input prefix={<UserAddOutlined />} />
          </Form.Item>
        )}
        <Form.Item name="role" label={locale === "vi" ? "Quyền truy cập" : "Permission"}>
          <Select
            options={[
              { value: "VIEWER", label: locale === "vi" ? "Người xem" : "Viewer" },
              { value: "COMMENTER", label: locale === "vi" ? "Người bình luận" : "Commenter" },
              { value: "EDITOR", label: locale === "vi" ? "Người chỉnh sửa" : "Editor" },
            ]}
          />
        </Form.Item>
        <Button
          type="primary"
          icon={<ShareAltOutlined />}
          onClick={() => void grant()}
        >
          {locale === "vi" ? "Cấp quyền" : "Grant access"}
        </Button>
      </Form>
      <List
        loading={loading}
        style={{ marginTop: 20 }}
        dataSource={permissions}
        locale={{ emptyText: locale === "vi" ? "Chưa có quyền bổ sung nào" : "No additional access" }}
        renderItem={(permission) => (
          <List.Item
            actions={[
              <Select
                key="role"
                size="small"
                value={permission.role}
                style={{ width: 130 }}
                options={[
                  { value: "VIEWER", label: locale === "vi" ? "Người xem" : "Viewer" },
                  { value: "COMMENTER", label: locale === "vi" ? "Người bình luận" : "Commenter" },
                  { value: "EDITOR", label: locale === "vi" ? "Người chỉnh sửa" : "Editor" },
                ]}
                onChange={async (role) => {
                  if (!folder) return;
                  await apiRequest(
                    `/folders/${folder.id}/permissions/${permission.id}`,
                    { method: "PATCH", body: JSON.stringify({ role }) },
                  );
                  await load();
                }}
              />,
              <Popconfirm
                key="remove"
                title={locale === "vi" ? "Gỡ bỏ quyền này?" : "Remove this access?"}
                onConfirm={async () => {
                  if (!folder) return;
                  await apiRequest(
                    `/folders/${folder.id}/permissions/${permission.id}`,
                    { method: "DELETE" },
                  );
                  await load();
                }}
              >
                <Button danger type="text" icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={permission.group?.name || permission.user?.name || permission.email}
              description={permission.group ? (locale === "vi" ? "Nhóm" : "Group") : permission.email}
            />
          </List.Item>
        )}
      />
    </Modal>
  );
}
