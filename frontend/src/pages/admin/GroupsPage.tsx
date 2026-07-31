import {
  DeleteOutlined,
  PlusOutlined,
  TeamOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Space,
  Typography,
} from "antd";
import { useState } from "react";
import { apiRequest } from "@/lib/api";

interface GroupMember {
  id: string;
  name: string;
  email: string;
  department: string | null;
  status: string;
}

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: GroupMember[];
}

export function GroupsPage() {
  const { message } = App.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [memberGroup, setMemberGroup] = useState<GroupItem>();
  const [memberEmail, setMemberEmail] = useState("");
  const [form] = Form.useForm();
  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "groups"],
    queryFn: () => apiRequest<GroupItem[]>("/admin/groups"),
  });

  const createGroup = async () => {
    const values = await form.validateFields();
    await apiRequest("/admin/groups", {
      method: "POST",
      body: JSON.stringify(values),
    });
    await refetch();
    form.resetFields();
    setCreateOpen(false);
    message.success("Group created");
  };

  return (
    <PageContainer
      ghost
      title="Groups"
      subTitle="Manage reusable teams for document and folder access."
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          Create group
        </Button>,
      ]}
    >
      <ProCard loading={isLoading}>
        <Row gutter={[16, 16]}>
          {groups.map((group) => (
            <Col key={group.id} xs={24} md={12} xl={8}>
              <Card
                title={
                  <Space>
                    <Avatar icon={<TeamOutlined />} />
                    <span>{group.name}</span>
                  </Space>
                }
                extra={
                  <Popconfirm
                    title="Delete this group?"
                    description="Existing group permissions will also be removed."
                    onConfirm={async () => {
                      await apiRequest(`/admin/groups/${group.id}`, {
                        method: "DELETE",
                      });
                      await refetch();
                    }}
                  >
                    <Button
                      danger
                      type="text"
                      aria-label={`Delete ${group.name}`}
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                }
                actions={[
                  <Button
                    key="members"
                    type="link"
                    icon={<UserAddOutlined />}
                    onClick={() => setMemberGroup(group)}
                  >
                    Manage members
                  </Button>,
                ]}
              >
                <Typography.Paragraph type="secondary">
                  {group.description || "No description"}
                </Typography.Paragraph>
                <Typography.Text>{group.memberCount} members</Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      </ProCard>
      <Modal
        title="Create group"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void createGroup()}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={memberGroup ? `${memberGroup.name} members` : "Members"}
        open={Boolean(memberGroup)}
        onCancel={() => {
          setMemberGroup(undefined);
          setMemberEmail("");
        }}
        footer={null}
      >
        <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
          <Input
            value={memberEmail}
            onChange={(event) => setMemberEmail(event.target.value)}
            placeholder="user@company.com"
          />
          <Button
            type="primary"
            disabled={!memberEmail.trim()}
            onClick={async () => {
              if (!memberGroup) return;
              await apiRequest(`/admin/groups/${memberGroup.id}/members`, {
                method: "POST",
                body: JSON.stringify({ email: memberEmail }),
              });
              const result = await refetch();
              setMemberGroup(
                result.data?.find((group) => group.id === memberGroup.id),
              );
              setMemberEmail("");
            }}
          >
            Add
          </Button>
        </Space.Compact>
        <List
          dataSource={memberGroup?.members ?? []}
          locale={{ emptyText: "No members" }}
          renderItem={(member) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="remove"
                  title="Remove this member?"
                  onConfirm={async () => {
                    if (!memberGroup) return;
                    await apiRequest(
                      `/admin/groups/${memberGroup.id}/members/${member.id}`,
                      { method: "DELETE" },
                    );
                    const result = await refetch();
                    setMemberGroup(
                      result.data?.find((group) => group.id === memberGroup.id),
                    );
                  }}
                >
                  <Button danger type="text">Remove</Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar>{member.name.slice(0, 2).toUpperCase()}</Avatar>}
                title={member.name}
                description={member.email}
              />
            </List.Item>
          )}
        />
      </Modal>
    </PageContainer>
  );
}
