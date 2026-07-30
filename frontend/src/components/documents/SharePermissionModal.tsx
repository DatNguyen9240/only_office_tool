import {
  DeleteOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  App,
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
import { useState } from "react";
import { permissions as initialPermissions } from "@/data/sampleData";
import { useI18n } from "@/i18n";
import { apiRequest, isApiConfigured } from "@/lib/api";
import type { DocumentItem, PermissionEntry, PermissionRole } from "@share";

interface SharePermissionModalProps {
  open: boolean;
  document?: DocumentItem;
  onClose: () => void;
}

export function SharePermissionModal({
  open,
  document,
  onClose,
}: SharePermissionModalProps) {
  const { message } = App.useApp();
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [entries, setEntries] = useState<PermissionEntry[]>(initialPermissions);
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

  const invite = async () => {
    const values = await form.validateFields();
    const email = String(values.email);

    if (isApiConfigured && document?.id) {
      try {
        const role = String(values.role).toUpperCase();
        await apiRequest(`/documents/${document.id}/permissions`, {
          method: "POST",
          body: JSON.stringify({ email, role }),
        });
      } catch (err) {
        console.warn("Share API failed:", err);
      }
    }

    setEntries((current) => [
      ...current,
      {
        id: `perm-${Date.now()}`,
        name: email.split("@")[0],
        email,
        role: values.role as PermissionRole,
        initials: email.slice(0, 2).toUpperCase(),
      },
    ]);
    form.resetFields(["email"]);
    message.success(t("share.sent"));
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
      width={640}
      onCancel={onClose}
      footer={[
        <Button
          key="copy"
          icon={<LinkOutlined />}
          onClick={() => message.success(t("share.copied"))}
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
        initialValues={{ role: "Viewer" }}
        className="share-form"
      >
        <Form.Item
          label={t("share.invite")}
          name="email"
          rules={[
            { required: true, message: t("share.emailRequired") },
            { type: "email", message: t("share.emailInvalid") },
          ]}
        >
          <Input placeholder={t("share.emailPlaceholder")} prefix={<UserAddOutlined />} />
        </Form.Item>
        <Form.Item label={t("share.permission")} name="role">
          <Select
            options={permissionOptions.filter((option) => option.value !== "Owner")}
          />
        </Form.Item>
        <Button
          className="share-invite-button"
          type="primary"
          icon={<SendOutlined />}
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
                style={{ width: 136 }}
                options={permissionOptions}
                onChange={(role) =>
                  setEntries((current) =>
                    current.map((item) =>
                      item.id === entry.id ? { ...item, role } : item,
                    ),
                  )
                }
              />,
              ...(entry.role !== "Owner"
                ? [
                    <Popconfirm
                      key="remove"
                      title={t("share.removeTitle")}
                      onConfirm={() =>
                        setEntries((current) =>
                          current.filter((item) => item.id !== entry.id),
                        )
                      }
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
              description={entry.email}
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
