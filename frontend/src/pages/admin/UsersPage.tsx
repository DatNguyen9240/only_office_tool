import {
  EditOutlined,
  LockOutlined,
  MoreOutlined,
  PlusOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import {
  ModalForm,
  PageContainer,
  ProCard,
  ProFormSelect,
  ProFormText,
  ProTable,
  type ProColumns,
} from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Avatar,
  Button,
  Dropdown,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import type { UserRecord, UserRole, UserStatus } from "@share";
import { apiRequest } from "@/lib/api";

const roleLabels: Record<UserRole, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  ADMINISTRATOR: "Administrator",
};
const roleColors: Record<UserRole, string> = {
  EMPLOYEE: "default",
  MANAGER: "blue",
  ADMINISTRATOR: "purple",
};
const statusLabels: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  SUSPENDED: "Suspended",
};
const statusColors: Record<UserStatus, string> = {
  ACTIVE: "green",
  INVITED: "gold",
  SUSPENDED: "red",
};
const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({
  value,
  label,
}));
const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value,
  label,
}));

export function UsersPage() {
  const { message, modal } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord>();
  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: ({ signal }) =>
      apiRequest<UserRecord[]>("/admin/users?limit=500", { signal }),
  });

  const updateUser = async (
    user: UserRecord,
    changes: Record<string, unknown>,
  ) => {
    await apiRequest<UserRecord>(`/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
    await refetch();
  };

  const columns: ProColumns<UserRecord>[] = [
    {
      title: "User",
      dataIndex: "name",
      render: (_, record) => (
        <Space size={12}>
          <Avatar>{initials(record.name)}</Avatar>
          <span className="user-cell">
            <Typography.Text strong>{record.name}</Typography.Text>
            <Typography.Text type="secondary">
              {record.email}
            </Typography.Text>
          </span>
        </Space>
      ),
    },
    {
      title: "Department",
      dataIndex: "department",
      renderText: (value) => value || "—",
    },
    {
      title: "Role",
      dataIndex: "role",
      valueType: "select",
      fieldProps: { options: roleOptions },
      render: (_, record) => (
        <Tag color={roleColors[record.role]}>{roleLabels[record.role]}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      valueType: "select",
      fieldProps: { options: statusOptions },
      render: (_, record) => (
        <Tag color={statusColors[record.status]}>
          {statusLabels[record.status]}
        </Tag>
      ),
    },
    {
      title: "Last active",
      dataIndex: "lastActiveAt",
      search: false,
      renderText: (value) =>
        value ? new Date(value).toLocaleString() : "Never",
    },
    {
      title: "Actions",
      valueType: "option",
      width: 72,
      render: (_, record) => [
        <Dropdown
          key="actions"
          menu={{
            items: [
              {
                key: "edit",
                label: "Edit user",
                icon: <EditOutlined />,
                onClick: () => {
                  setEditingUser(record);
                  setModalOpen(true);
                },
              },
              {
                key: "reset",
                label: "Revoke all sessions",
                icon: <UserSwitchOutlined />,
                onClick: () =>
                  modal.confirm({
                    title: "Revoke all sessions?",
                    content: `${record.name} will need to sign in again on every device.`,
                    okText: "Revoke sessions",
                    onOk: async () => {
                      await apiRequest(
                        `/admin/users/${record.id}/reset-sessions`,
                        { method: "POST" },
                      );
                      message.success("All active sessions were revoked");
                    },
                  }),
              },
              { type: "divider" },
              {
                key: "suspend",
                label: "Suspend account",
                icon: <LockOutlined />,
                danger: true,
                disabled: record.status === "SUSPENDED",
                onClick: () =>
                  modal.confirm({
                    title: "Suspend this account?",
                    content: `${record.name} will lose access and all active sessions will be revoked.`,
                    okText: "Suspend",
                    okButtonProps: { danger: true },
                    onOk: async () => {
                      await updateUser(record, { status: "SUSPENDED" });
                      message.success("Account suspended");
                    },
                  }),
              },
            ],
          }}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            aria-label={`Actions for ${record.name}`}
          />
        </Dropdown>,
      ],
    },
  ];

  return (
    <PageContainer
      ghost
      title="User management"
      subTitle="Manage employee access, roles, and account status."
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUser(undefined);
            setModalOpen(true);
          }}
        >
          Create user
        </Button>,
      ]}
    >
      <ProCard split="vertical" className="admin-stat-strip">
        <ProCard>
          <Statistic
            loading={isLoading}
            title="Total users"
            value={users.length}
            prefix={<TeamOutlined />}
          />
        </ProCard>
        <ProCard>
          <Statistic
            loading={isLoading}
            title="Active"
            value={users.filter((user) => user.status === "ACTIVE").length}
          />
        </ProCard>
        <ProCard>
          <Statistic
            loading={isLoading}
            title="Suspended"
            value={users.filter((user) => user.status === "SUSPENDED").length}
          />
        </ProCard>
        <ProCard>
          <Statistic
            loading={isLoading}
            title="Administrators"
            value={
              users.filter((user) => user.role === "ADMINISTRATOR").length
            }
          />
        </ProCard>
      </ProCard>

      <ProTable<UserRecord>
        className="admin-table"
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={isLoading}
        options={{
          density: false,
          fullScreen: true,
          reload: () => void refetch(),
        }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        search={{ labelWidth: "auto", defaultCollapsed: false }}
        toolbar={{ title: "Directory" }}
      />

      <ModalForm
        open={modalOpen}
        title={editingUser ? "Edit user" : "Create user"}
        modalProps={{
          destroyOnHidden: true,
          onCancel: () => setModalOpen(false),
        }}
        initialValues={
          editingUser ?? {
            role: "EMPLOYEE",
            status: "ACTIVE",
          }
        }
        onFinish={async (values) => {
          try {
            if (editingUser) {
              const payload = {
                name: values.name,
                department: values.department,
                role: values.role,
                status: values.status,
                password: values.password || undefined,
              };
              await updateUser(editingUser, payload);
              message.success("User updated");
            } else {
              await apiRequest<UserRecord>("/admin/users", {
                method: "POST",
                body: JSON.stringify(values),
              });
              await refetch();
              message.success("User created and can sign in");
            }
            setModalOpen(false);
            return true;
          } catch (cause) {
            message.error(
              cause instanceof Error ? cause.message : "Could not save user",
            );
            return false;
          }
        }}
      >
        <ProFormText
          name="name"
          label="Full name"
          placeholder="Enter full name"
          rules={[{ required: true, message: "Enter the user's name" }]}
        />
        <ProFormText
          name="email"
          label="Work email"
          placeholder="name@company.com"
          disabled={Boolean(editingUser)}
          rules={[
            { required: true, message: "Enter a work email" },
            { type: "email", message: "Enter a valid email" },
          ]}
        />
        <ProFormText
          name="department"
          label="Department"
          placeholder="Enter department"
        />
        <ProFormSelect
          name="role"
          label="Role"
          options={roleOptions}
          rules={[{ required: true, message: "Choose a role" }]}
        />
        {editingUser && (
          <ProFormSelect
            name="status"
            label="Status"
            options={statusOptions}
            rules={[{ required: true, message: "Choose a status" }]}
          />
        )}
        <ProFormText.Password
          name="password"
          label={editingUser ? "New password" : "Temporary password"}
          placeholder={
            editingUser
              ? "Leave blank to keep the current password"
              : "At least 12 characters"
          }
          rules={
            editingUser
              ? [{ min: 12, message: "Password must be at least 12 characters" }]
              : [
                  { required: true, message: "Enter a temporary password" },
                  {
                    min: 12,
                    message: "Password must be at least 12 characters",
                  },
                ]
          }
        />
      </ModalForm>
    </PageContainer>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
