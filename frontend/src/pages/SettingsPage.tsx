import {
  DeleteOutlined,
  LaptopOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { startRegistration } from "@simplewebauthn/browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tabs,
  Typography,
} from "antd";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { AuthUser } from "@share";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface SessionItem {
  id: string;
  ip: string | null;
  userAgent: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

interface PasskeyItem {
  id: string;
  name: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export function SettingsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const [passkeyModalOpen, setPasskeyModalOpen] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: () => apiRequest<AuthUser>("/auth/me"),
  });
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => apiRequest<SessionItem[]>("/auth/sessions"),
  });
  const { data: passkeys = [], refetch: refetchPasskeys } = useQuery({
    queryKey: ["auth", "passkeys"],
    queryFn: () => apiRequest<PasskeyItem[]>("/auth/passkeys"),
  });

  const registerPasskey = async () => {
    setPasskeySubmitting(true);
    try {
      const ceremony = await apiRequest<{
        challengeId: string;
        options: Parameters<typeof startRegistration>[0]["optionsJSON"];
      }>("/auth/passkeys/register/options", {
        method: "POST",
        body: JSON.stringify({ name: passkeyName || undefined }),
      });
      const credential = await startRegistration({
        optionsJSON: ceremony.options,
      });
      await apiRequest("/auth/passkeys/register/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeId: ceremony.challengeId,
          response: credential,
          name: passkeyName || undefined,
        }),
      });
      await refetchPasskeys();
      setPasskeyModalOpen(false);
      setPasskeyName("");
      message.success("Passkey added");
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : "Could not add passkey");
    } finally {
      setPasskeySubmitting(false);
    }
  };

  return (
    <PageContainer
      ghost
      title="Profile and security"
      subTitle="Manage your account details, password, passkeys, and signed-in devices."
    >
      <ProCard>
        <Tabs
          activeKey={params.get("tab") ?? "profile"}
          onChange={(tab) => setParams({ tab })}
          items={[
            {
              key: "profile",
              label: "Profile",
              icon: <UserOutlined />,
              children: profile && (
                <Form
                  layout="vertical"
                  initialValues={profile}
                  onFinish={async (values) => {
                    await apiRequest("/auth/profile", {
                      method: "PATCH",
                      body: JSON.stringify(values),
                    });
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] }),
                      bootstrap(),
                    ]);
                    message.success("Profile updated");
                  }}
                >
                  <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Email">
                    <Input value={profile.email} disabled />
                  </Form.Item>
                  <Form.Item name="department" label="Department">
                    <Input />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">Save profile</Button>
                </Form>
              ),
            },
            {
              key: "security",
              label: "Security",
              icon: <LockOutlined />,
              children: (
                <>
                  <Typography.Title level={5}>Change password</Typography.Title>
                  <Form
                    layout="vertical"
                    onFinish={async (values) => {
                      await apiRequest("/auth/change-password", {
                        method: "POST",
                        body: JSON.stringify(values),
                      });
                      message.success("Password changed. Sign in again on your devices.");
                    }}
                  >
                    <Form.Item name="currentPassword" label="Current password" rules={[{ required: true }]}>
                      <Input.Password autoComplete="current-password" />
                    </Form.Item>
                    <Form.Item
                      name="newPassword"
                      label="New password"
                      rules={[{ required: true }, { min: 12 }]}
                    >
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                  <Button type="primary" htmlType="submit">Change password</Button>
                  </Form>
                  <Divider />
                  <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                    <div>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        Passkeys
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        Sign in with your device lock, fingerprint, or security key.
                      </Typography.Text>
                    </div>
                    <Button
                      icon={<SafetyCertificateOutlined />}
                      onClick={() => setPasskeyModalOpen(true)}
                    >
                      Add passkey
                    </Button>
                  </Space>
                  <List
                    style={{ marginTop: 12 }}
                    locale={{ emptyText: "No passkeys registered" }}
                    dataSource={passkeys}
                    renderItem={(passkey) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="delete"
                            title="Delete this passkey?"
                            onConfirm={async () => {
                              await apiRequest(`/auth/passkeys/${encodeURIComponent(passkey.id)}`, {
                                method: "DELETE",
                              });
                              await refetchPasskeys();
                            }}
                          >
                            <Button danger type="text" icon={<DeleteOutlined />}>
                              Delete
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<SafetyCertificateOutlined />}
                          title={passkey.name || "Passkey"}
                          description={`${passkey.backedUp ? "Synced" : "Device-bound"} · Added ${new Date(passkey.createdAt).toLocaleDateString()}${passkey.lastUsedAt ? ` · Last used ${new Date(passkey.lastUsedAt).toLocaleString()}` : ""}`}
                        />
                      </List.Item>
                    )}
                  />
                  <Typography.Title level={5} style={{ marginTop: 32 }}>
                    Signed-in devices
                  </Typography.Title>
                  <List
                    dataSource={sessions}
                    renderItem={(session) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="revoke"
                            title="Revoke this session?"
                            onConfirm={async () => {
                              await apiRequest(`/auth/sessions/${session.id}`, {
                                method: "DELETE",
                              });
                              await refetchSessions();
                            }}
                          >
                            <Button danger type="text" icon={<DeleteOutlined />}>
                              Revoke
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<LaptopOutlined />}
                          title={session.userAgent || "Unknown device"}
                          description={`${session.ip || "Unknown IP"} · Last used ${new Date(session.lastUsedAt).toLocaleString()}`}
                        />
                      </List.Item>
                    )}
                  />
                </>
              ),
            },
          ]}
        />
      </ProCard>
      <Modal
        title="Add a passkey"
        open={passkeyModalOpen}
        onCancel={() => setPasskeyModalOpen(false)}
        onOk={registerPasskey}
        okText="Continue"
        confirmLoading={passkeySubmitting}
      >
        <Typography.Paragraph type="secondary">
          Give this passkey a recognizable name. Your browser will then ask you
          to confirm with this device.
        </Typography.Paragraph>
        <Input
          autoFocus
          maxLength={80}
          value={passkeyName}
          onChange={(event) => setPasskeyName(event.target.value)}
          placeholder="e.g. Work laptop"
        />
      </Modal>
    </PageContainer>
  );
}
