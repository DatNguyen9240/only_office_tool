import {
  AppstoreOutlined,
  BarsOutlined,
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
  Card,
  Dropdown,
  Empty,
  Input,
  Pagination,
  Segmented,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import type { UserRecord, UserRole, UserStatus } from "@share";
import { useI18n } from "@/i18n";
import { apiRequest } from "@/lib/api";

const roleColors: Record<UserRole, string> = {
  EMPLOYEE: "default",
  MANAGER: "blue",
  ADMINISTRATOR: "purple",
};
const statusColors: Record<UserStatus, string> = {
  ACTIVE: "green",
  INVITED: "gold",
  SUSPENDED: "red",
};

interface UserFilters {
  query: string;
  department?: string;
  role?: UserRole;
  status?: UserStatus;
}

export function UsersPage() {
  const { message, modal } = App.useApp();
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord>();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<UserFilters>({ query: "" });
  const roleLabels: Record<UserRole, string> = {
    EMPLOYEE: t("admin.employee"),
    MANAGER: t("admin.manager"),
    ADMINISTRATOR: t("admin.administrator"),
  };
  const statusLabels: Record<UserStatus, string> = {
    ACTIVE: t("status.active"),
    INVITED: t("status.invited"),
    SUSPENDED: t("status.suspended"),
  };
  const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({
    value,
    label,
  }));
  const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
    value,
    label,
  }));
  const departmentOptions = [
    { value: "Sales", label: t("department.sales") },
    { value: "Human Resources", label: t("department.humanResources") },
    { value: "Finance", label: t("department.finance") },
    { value: "Engineering", label: t("department.engineering") },
    { value: "Operations", label: t("department.operations") },
    { value: "Marketing", label: t("department.marketing") },
    { value: "Legal", label: t("department.legal") },
  ];
  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: ({ signal }) =>
      apiRequest<UserRecord[]>("/admin/users?limit=500", { signal }),
  });
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const query = filters.query.trim().toLowerCase();
        const department = (filters.department ?? "").trim().toLowerCase();
        return (
          (!query ||
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)) &&
          (!department ||
            (user.department ?? "").toLowerCase().includes(department)) &&
          (!filters.role || user.role === filters.role) &&
          (!filters.status || user.status === filters.status)
        );
      }),
    [filters, users],
  );
  const visibleUsers = filteredUsers.slice((page - 1) * 10, page * 10);

  const renderActions = (record: UserRecord) => (
    <Dropdown
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
                  await apiRequest(`/admin/users/${record.id}/reset-sessions`, {
                    method: "POST",
                  });
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
        size="small"
        icon={<MoreOutlined />}
        aria-label={`Actions for ${record.name}`}
      />
    </Dropdown>
  );

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
      ellipsis: true,
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
      width: 150,
      renderText: (value) => value || "Not set",
    },
    {
      title: "Role",
      dataIndex: "role",
      width: 110,
      valueType: "select",
      fieldProps: { options: roleOptions },
      render: (_, record) => (
        <Tag color={roleColors[record.role]}>{roleLabels[record.role]}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
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
      width: 170,
      search: false,
      renderText: (value) =>
        value ? new Date(value).toLocaleString() : "Never",
    },
    {
      title: "Actions",
      valueType: "option",
      width: 72,
      render: (_, record) => [
        <span key="actions">{renderActions(record)}</span>,
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

      <div className="admin-record-surface">
        <div className="admin-record-toolbar">
          <Typography.Text strong>Directory</Typography.Text>
          <Segmented
            size="small"
            aria-label="User view"
            value={viewMode}
            options={[
              { value: "table", icon: <BarsOutlined />, label: "Table" },
              { value: "card", icon: <AppstoreOutlined />, label: "Cards" },
            ]}
            onChange={(value) => {
              setViewMode(value as "table" | "card");
              setPage(1);
            }}
          />
        </div>
        <div className="admin-filter-bar" role="search" aria-label="Filter users">
          <Input
            allowClear
            value={filters.query}
            placeholder="Search name or email"
            onChange={(event) => {
              setFilters((current) => ({ ...current, query: event.target.value }));
              setPage(1);
            }}
          />
          <Select
            allowClear
            value={filters.department}
            placeholder="Department"
            options={departmentOptions}
            onChange={(value) => {
              setFilters((current) => ({ ...current, department: value }));
              setPage(1);
            }}
          />
          <Select
            allowClear
            value={filters.role}
            placeholder="Role"
            options={roleOptions}
            onChange={(value) => {
              setFilters((current) => ({ ...current, role: value }));
              setPage(1);
            }}
          />
          <Select
            allowClear
            value={filters.status}
            placeholder="Status"
            options={statusOptions}
            onChange={(value) => {
              setFilters((current) => ({ ...current, status: value }));
              setPage(1);
            }}
          />
          <Button
            type="text"
            disabled={
              !filters.query &&
              !filters.department &&
              !filters.role &&
              !filters.status
            }
            onClick={() => {
              setFilters({ query: "" });
              setPage(1);
            }}
          >
            Clear
          </Button>
        </div>
        {viewMode === "table" ? (
          <ProTable<UserRecord>
            className="admin-table"
            rowKey="id"
            columns={columns}
            dataSource={filteredUsers}
            loading={isLoading}
            size="small"
            scroll={{ x: "max-content" }}
            options={{
              density: false,
              fullScreen: true,
              reload: () => void refetch(),
            }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            search={false}
            toolbar={{ title: undefined }}
          />
        ) : (
          <>
            {isLoading ? (
              <div className="admin-card-loading">Loading users…</div>
            ) : visibleUsers.length ? (
              <div className="admin-card-grid">
                {visibleUsers.map((record) => (
                  <Card key={record.id} size="small" className="admin-record-card">
                    <div className="admin-card-heading">
                      <Space size={10} align="start">
                        <Avatar size={34}>{initials(record.name)}</Avatar>
                        <span className="user-cell">
                          <Typography.Text strong ellipsis>
                            {record.name}
                          </Typography.Text>
                          <Typography.Text type="secondary" ellipsis>
                            {record.email}
                          </Typography.Text>
                        </span>
                      </Space>
                      {renderActions(record)}
                    </div>
                    <div className="admin-card-fields">
                      <span>
                        <Typography.Text type="secondary">Department</Typography.Text>
                        <Typography.Text>{record.department || "Not set"}</Typography.Text>
                      </span>
                      <span>
                        <Typography.Text type="secondary">Role</Typography.Text>
                        <Tag color={roleColors[record.role]}>{roleLabels[record.role]}</Tag>
                      </span>
                      <span>
                        <Typography.Text type="secondary">Status</Typography.Text>
                        <Tag color={statusColors[record.status]}>{statusLabels[record.status]}</Tag>
                      </span>
                      <span>
                        <Typography.Text type="secondary">Last active</Typography.Text>
                        <Typography.Text>
                          {record.lastActiveAt
                            ? new Date(record.lastActiveAt).toLocaleString()
                            : "Never"}
                        </Typography.Text>
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No users found" />
            )}
            <Pagination
              className="admin-card-pagination"
              current={page}
              pageSize={10}
              total={filteredUsers.length}
              showSizeChanger={false}
              hideOnSinglePage
              onChange={setPage}
            />
          </>
        )}
      </div>

      <ModalForm
        open={modalOpen}
        title={editingUser ? t("admin.editUser") : t("admin.createUser")}
        submitter={{
          searchConfig: {
            resetText: t("common.cancel"),
            submitText: editingUser ? t("common.save") : t("common.create"),
          },
        }}
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
              message.success(t("admin.userUpdated"));
            } else {
              await apiRequest<UserRecord>("/admin/users", {
                method: "POST",
                body: JSON.stringify(values),
              });
              await refetch();
              message.success(t("admin.userCreated"));
            }
            setModalOpen(false);
            return true;
          } catch (cause) {
            message.error(
              cause instanceof Error ? cause.message : t("admin.saveFailed"),
            );
            return false;
          }
        }}
      >
        <ProFormText
          name="name"
          label={t("admin.fullName")}
          placeholder={t("admin.fullNamePlaceholder")}
          rules={[{ required: true, message: t("admin.fullNameRequired") }]}
        />
        <ProFormText
          name="email"
          label={t("admin.workEmail")}
          placeholder="name@company.com"
          disabled={Boolean(editingUser)}
          rules={[
            { required: true, message: t("admin.workEmailRequired") },
            { type: "email", message: t("admin.emailInvalid") },
          ]}
        />
        <ProFormSelect
          name="department"
          label={t("admin.department")}
          placeholder={t("admin.departmentPlaceholder")}
          options={departmentOptions}
          fieldProps={{
            showSearch: true,
            allowClear: true,
          }}
        />
        <ProFormSelect
          name="role"
          label={t("admin.role")}
          options={roleOptions}
          rules={[{ required: true, message: t("admin.roleRequired") }]}
        />
        {editingUser && (
          <ProFormSelect
            name="status"
            label={t("admin.status")}
            options={statusOptions}
            rules={[{ required: true, message: t("admin.statusRequired") }]}
          />
        )}
        <ProFormText.Password
          name="password"
          label={
            editingUser
              ? t("admin.newPassword")
              : t("admin.temporaryPassword")
          }
          placeholder={
            editingUser
              ? t("admin.keepPassword")
              : t("admin.passwordPlaceholder")
          }
          rules={
            editingUser
              ? [{ min: 12, message: t("admin.passwordMin") }]
              : [
                  { required: true, message: t("admin.passwordRequired") },
                  {
                    min: 12,
                    message: t("admin.passwordMin"),
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
