import {
  EditOutlined,
  LockOutlined,
  MailOutlined,
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
import { App, Avatar, Button, Dropdown, Space, Statistic, Tag, Typography } from "antd";
import { useState } from "react";
import { users as sampleUsers } from "@/data/sampleData";
import type { UserRecord } from "@/types";

const roleColors = {
  Employee: "default",
  Manager: "blue",
  Administrator: "purple",
};

const statusColors = {
  Active: "green",
  Invited: "gold",
  Suspended: "red",
};

export function UsersPage() {
  const { message } = App.useApp();
  const [users, setUsers] = useState(sampleUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord>();

  const columns: ProColumns<UserRecord>[] = [
    {
      title: "User",
      dataIndex: "name",
      render: (_, record) => (
        <Space size={12}>
          <Avatar>{record.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Avatar>
          <span className="user-cell">
            <Typography.Text strong>{record.name}</Typography.Text>
            <Typography.Text type="secondary">{record.email}</Typography.Text>
          </span>
        </Space>
      ),
    },
    {
      title: "Department",
      dataIndex: "department",
      valueType: "select",
      fieldProps: {
        options: ["Operations", "Finance", "Executive office", "Information security", "Legal", "People operations"].map((value) => ({ label: value, value })),
      },
    },
    {
      title: "Role",
      dataIndex: "role",
      valueType: "select",
      fieldProps: {
        options: ["Employee", "Manager", "Administrator"].map((value) => ({ label: value, value })),
      },
      render: (_, record) => <Tag color={roleColors[record.role]}>{record.role}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      valueType: "select",
      fieldProps: {
        options: ["Active", "Invited", "Suspended"].map((value) => ({ label: value, value })),
      },
      render: (_, record) => <Tag color={statusColors[record.status]}>{record.status}</Tag>,
    },
    {
      title: "Last active",
      dataIndex: "lastActive",
      search: false,
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
              { key: "resend", label: "Resend invitation", icon: <MailOutlined />, disabled: record.status !== "Invited" },
              { key: "reset", label: "Reset sessions", icon: <UserSwitchOutlined /> },
              { type: "divider" },
              { key: "suspend", label: "Suspend account", icon: <LockOutlined />, danger: true, disabled: record.status === "Suspended" },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} aria-label={`Actions for ${record.name}`} />
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
        <Button key="invite" type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditingUser(undefined);
          setModalOpen(true);
        }}>
          Invite user
        </Button>,
      ]}
    >
      <ProCard split="vertical" className="admin-stat-strip">
        <ProCard><Statistic title="Total users" value={users.length} prefix={<TeamOutlined />} /></ProCard>
        <ProCard><Statistic title="Active" value={users.filter((user) => user.status === "Active").length} /></ProCard>
        <ProCard><Statistic title="Pending invitations" value={users.filter((user) => user.status === "Invited").length} /></ProCard>
        <ProCard><Statistic title="Administrators" value={users.filter((user) => user.role === "Administrator").length} /></ProCard>
      </ProCard>

      <ProTable<UserRecord>
        className="admin-table"
        rowKey="id"
        columns={columns}
        dataSource={users}
        options={{ density: false, fullScreen: true, reload: false }}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        search={{ labelWidth: "auto", defaultCollapsed: false }}
        toolbar={{ title: "Directory" }}
      />

      <ModalForm
        open={modalOpen}
        title={editingUser ? "Edit user" : "Invite user"}
        modalProps={{
          destroyOnHidden: true,
          onCancel: () => setModalOpen(false),
        }}
        initialValues={editingUser}
        onFinish={async (values) => {
          if (editingUser) {
            setUsers((current) =>
              current.map((user) =>
                user.id === editingUser.id ? { ...user, ...values } : user,
              ),
            );
            message.success("User updated");
          } else {
            setUsers((current) => [
              ...current,
              {
                id: `usr-${Date.now()}`,
                name: values.name,
                email: values.email,
                department: values.department,
                role: values.role,
                status: "Invited",
                lastActive: "Not signed in",
              },
            ]);
            message.success("Invitation sent");
          }
          setModalOpen(false);
          return true;
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
          rules={[
            { required: true, message: "Enter a work email" },
            { type: "email", message: "Enter a valid email" },
          ]}
        />
        <ProFormSelect
          name="department"
          label="Department"
          options={["Operations", "Finance", "Executive office", "Information security", "Legal", "People operations"].map((value) => ({ label: value, value }))}
          rules={[{ required: true, message: "Choose a department" }]}
        />
        <ProFormSelect
          name="role"
          label="Role"
          initialValue="Employee"
          options={["Employee", "Manager", "Administrator"].map((value) => ({ label: value, value }))}
          rules={[{ required: true, message: "Choose a role" }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
