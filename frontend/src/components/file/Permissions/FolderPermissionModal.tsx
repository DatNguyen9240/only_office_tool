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
      message.error(cause instanceof Error ? cause.message : "Could not load access");
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
    message.success("Folder access updated");
  };

  return (
    <Modal
      open={Boolean(folder)}
      title={`Share ${folder?.name ?? "folder"}`}
      onCancel={onClose}
      footer={[
        <Button key="done" type="primary" onClick={onClose}>
          Done
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ recipientType: "user", role: "VIEWER" }}
      >
        <Form.Item name="recipientType" label="Recipient type">
          <Select
            options={[
              { value: "user", label: "Person" },
              { value: "group", label: "Group" },
            ]}
          />
        </Form.Item>
        {recipientType === "group" ? (
          <Form.Item name="groupId" label="Group" rules={[{ required: true }]}>
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
            label="Work email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input prefix={<UserAddOutlined />} />
          </Form.Item>
        )}
        <Form.Item name="role" label="Permission">
          <Select
            options={[
              { value: "VIEWER", label: "Viewer" },
              { value: "COMMENTER", label: "Commenter" },
              { value: "EDITOR", label: "Editor" },
            ]}
          />
        </Form.Item>
        <Button
          type="primary"
          icon={<ShareAltOutlined />}
          onClick={() => void grant()}
        >
          Grant access
        </Button>
      </Form>
      <List
        loading={loading}
        style={{ marginTop: 20 }}
        dataSource={permissions}
        locale={{ emptyText: "No additional access" }}
        renderItem={(permission) => (
          <List.Item
            actions={[
              <Select
                key="role"
                size="small"
                value={permission.role}
                style={{ width: 120 }}
                options={[
                  { value: "VIEWER", label: "Viewer" },
                  { value: "COMMENTER", label: "Commenter" },
                  { value: "EDITOR", label: "Editor" },
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
                title="Remove this access?"
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
              description={permission.group ? "Group" : permission.email}
            />
          </List.Item>
        )}
      />
    </Modal>
  );
}
