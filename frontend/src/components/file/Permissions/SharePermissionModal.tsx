import {
  DeleteOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  App,
  AutoComplete,
  Avatar,
  Button,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { translateApiError, useI18n } from "@/i18n";
import { apiRequest } from "@/lib/api";
import type { DocumentItem, PermissionEntry, PermissionRole } from "@share";

interface SharePermissionModalProps {
  open: boolean;
  document?: DocumentItem;
  onClose: () => void;
}

interface GroupOption {
  id: string;
  name: string;
  memberCount: number;
}

export function SharePermissionModal({
  open,
  document,
  onClose,
}: SharePermissionModalProps) {
  const { message } = App.useApp();
  const { locale, t } = useI18n();
  const [form] = Form.useForm();
  const [entries, setEntries] = useState<PermissionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [systemUsers, setSystemUsers] = useState<Array<{ id: string; name?: string; email: string }>>([]);
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string }>>([]);
  const recipientType = Form.useWatch("recipientType", form) ?? "user";
  const permissionOptions = ["Viewer", "Commenter", "Editor", "Owner"].map((role) => {
    const keys = {
      Viewer: "role.viewer",
      Commenter: "role.commenter",
      Editor: "role.editor",
      Owner: "role.owner",
    } as const;
    return {
      label: t(keys[role as keyof typeof keys]),
      value: role,
    };
  });

  useEffect(() => {
    if (!open || !document?.id) return;
    setLoading(true);
    apiRequest<PermissionEntry[]>(`/documents/${document.id}/permissions`)
      .then(setEntries)
      .catch((error) => {
        const text = error instanceof Error ? error.message : "Failed to load permissions";
        message.error(translateApiError(text, locale));
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [document?.id, locale, message, open]);

  useEffect(() => {
    if (!open) return;
    apiRequest<GroupOption[]>("/groups")
      .then(setGroups)
      .catch(() => setGroups([]));

    apiRequest<Array<{ id: string; name?: string; email: string }>>("/admin/users")
      .then(setSystemUsers)
      .catch(() => setSystemUsers([]));
  }, [open]);

  const handleUserSearch = (text: string) => {
    if (!text || text.trim() === "") {
      setUserOptions([]);
      return;
    }
    const query = text.toLowerCase();
    const matches = systemUsers
      .filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          (u.name && u.name.toLowerCase().includes(query)),
      )
      .map((u) => ({
        value: u.email,
        label: u.name ? `${u.name} <${u.email}>` : u.email,
      }));

    if (matches.length > 0) {
      setUserOptions(matches);
    } else if (!text.includes("@")) {
      setUserOptions([
        { value: `${text}@gmail.com`, label: `${text}@gmail.com` },
        { value: `${text}@company.com`, label: `${text}@company.com` },
      ]);
    } else {
      setUserOptions([{ value: text, label: text }]);
    }
  };

  const invite = async () => {
    const values = await form.validateFields();
    if (!document?.id) return;
    setSaving(true);
    try {
      const role = String(values.role).toUpperCase();
      const created = await apiRequest<PermissionEntry>(
        `/documents/${document.id}/permissions`,
        {
          method: "POST",
          body: JSON.stringify(
            values.recipientType === "group"
              ? { groupId: values.groupId, role }
              : { email: values.email, role },
          ),
        },
      );
      setEntries((current) => [
        ...current.filter((entry) => entry.id !== created.id),
        created,
      ]);
      form.resetFields(["email", "groupId"]);
      message.success(t("share.sent"));
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to grant access";
      message.error(translateApiError(text, locale));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (entry: PermissionEntry, role: PermissionRole) => {
    if (!document?.id) return;
    try {
      const updated = await apiRequest<PermissionEntry>(
        `/documents/${document.id}/permissions/${entry.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ role: role.toUpperCase() }),
        },
      );
      setEntries((current) =>
        current.map((item) => (item.id === entry.id ? updated : item)),
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to update access";
      message.error(translateApiError(text, locale));
    }
  };

  const remove = async (entry: PermissionEntry) => {
    if (!document?.id) return;
    try {
      await apiRequest(`/documents/${document.id}/permissions/${entry.id}`, {
        method: "DELETE",
      });
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to remove access";
      message.error(translateApiError(text, locale));
    }
  };

  const createShareLink = async () => {
    if (!document?.id) return;
    setLinkLoading(true);
    try {
      const link = await apiRequest<{ url: string }>(
        `/documents/${document.id}/share-links`,
        {
          method: "POST",
          body: JSON.stringify({ permission: "VIEWER" }),
        },
      );
      await navigator.clipboard.writeText(link.url);
      message.success("View-only link copied");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create share link";
      message.error(translateApiError(text, locale));
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      rootClassName="share-permission-modal"
      zIndex={1200}
      title={
        <div className="share-modal-title">
          <span className="share-modal-title-icon">
            <SafetyCertificateOutlined />
          </span>
          <span className="share-modal-title-copy">
            <Typography.Text strong>{t("share.title")}</Typography.Text>
            {document && (
              <Typography.Text type="secondary" ellipsis>
                {document.name}
              </Typography.Text>
            )}
          </span>
        </div>
      }
      width={720}
      onCancel={onClose}
      footer={[
        <Button
          key="copy"
          icon={<LinkOutlined />}
          loading={linkLoading}
          onClick={() => void createShareLink()}
        >
          {t("share.copy")}
        </Button>,
        <Button key="done" type="primary" onClick={onClose}>
          {t("common.done")}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ role: "Viewer", recipientType: "user" }}
        className="share-form"
      >
        <Form.Item label="Recipient type" name="recipientType">
          <Select
            options={[
              { value: "user", label: "Person" },
              { value: "group", label: "Group" },
            ]}
          />
        </Form.Item>
        {recipientType === "group" ? (
          <Form.Item
            label="Group"
            name="groupId"
            rules={[{ required: true, message: "Choose a group" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Choose a group"
              options={groups.map((group) => ({
                value: group.id,
                label: `${group.name} (${group.memberCount})`,
              }))}
            />
          </Form.Item>
        ) : (
          <Form.Item
            label={t("share.invite")}
            name="email"
            rules={[
              { required: true, message: t("share.emailRequired") },
              { type: "email", message: t("share.emailInvalid") },
            ]}
          >
            <AutoComplete
              options={userOptions}
              onSearch={handleUserSearch}
            >
              <Input
                prefix={<UserAddOutlined />}
                placeholder={t("share.emailPlaceholder")}
              />
            </AutoComplete>
          </Form.Item>
        )}
        <Form.Item label={t("share.permission")} name="role">
          <Select
            options={permissionOptions.filter((option) => option.value !== "Owner")}
          />
        </Form.Item>
        <Button
          className="share-invite-button"
          type="primary"
          icon={<SendOutlined />}
          loading={saving}
          onClick={invite}
        >
          {t("share.send")}
        </Button>
      </Form>

      <div className="permission-list-heading">
        <Typography.Text strong>{t("share.people")}</Typography.Text>
        <Typography.Text type="secondary">
          {t("share.entries", { count: entries.length })}
        </Typography.Text>
      </div>
      <List
        className="permission-list"
        loading={loading}
        dataSource={entries}
        renderItem={(entry) => (
          <List.Item
            actions={[
              <Select
                key="role"
                aria-label={`Permission for ${entry.name}`}
                disabled={entry.role === "Owner"}
                size="small"
                value={entry.role}
                style={{ width: 165 }}
                options={permissionOptions}
                onChange={(role) => void changeRole(entry, role)}
              />,
              ...(entry.role !== "Owner"
                ? [
                    <Popconfirm
                      key="remove"
                      title={t("share.removeTitle")}
                      onConfirm={() => remove(entry)}
                    >
                      <Button
                        aria-label={t("share.remove", { name: entry.name })}
                        danger
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>,
                  ]
                : []),
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar className="permission-avatar">{entry.initials}</Avatar>}
              title={entry.name}
              description={entry.kind === "group" ? "Group" : entry.email}
            />
          </List.Item>
        )}
      />
      <div className="access-note">
        <span className="access-note-icon">
          <LinkOutlined />
        </span>
        <Typography.Text type="secondary">{t("share.restricted")}</Typography.Text>
      </div>
    </Modal>
  );
}
