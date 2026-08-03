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
import { translateApiError, useI18n } from "@/i18n";

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
  const { locale, t } = useI18n();
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
      message.success(locale === "vi" ? "Đã thêm Passkey thành công" : "Passkey added");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Could not add passkey";
      message.error(translateApiError(text, locale));
    } finally {
      setPasskeySubmitting(false);
    }
  };

  return (
    <PageContainer
      ghost
      title={locale === "vi" ? "Hồ sơ & Bảo mật" : "Profile and security"}
      subTitle={locale === "vi" ? "Quản lý thông tin tài khoản, mật khẩu, Passkey và các thiết bị đang đăng nhập." : "Manage your account details, password, passkeys, and signed-in devices."}
    >
      <ProCard>
        <Tabs
          activeKey={params.get("tab") ?? "profile"}
          onChange={(tab) => setParams({ tab })}
          items={[
            {
              key: "profile",
              label: locale === "vi" ? "Hồ sơ" : "Profile",
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
                    message.success(locale === "vi" ? "Đã cập nhật hồ sơ" : "Profile updated");
                  }}
                >
                  <Form.Item name="name" label={locale === "vi" ? "Họ và tên" : "Name"} rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Email">
                    <Input value={profile.email} disabled />
                  </Form.Item>
                  <Form.Item name="department" label={locale === "vi" ? "Phòng ban" : "Department"}>
                    <Input />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    {locale === "vi" ? "Lưu hồ sơ" : "Save profile"}
                  </Button>
                </Form>
              ),
            },
            {
              key: "security",
              label: locale === "vi" ? "Bảo mật" : "Security",
              icon: <LockOutlined />,
              children: (
                <>
                  <Typography.Title level={5}>
                    {locale === "vi" ? "Đổi mật khẩu" : "Change password"}
                  </Typography.Title>
                  <Form
                    layout="vertical"
                    onFinish={async (values) => {
                      await apiRequest("/auth/change-password", {
                        method: "POST",
                        body: JSON.stringify(values),
                      });
                      message.success(locale === "vi" ? "Đã đổi mật khẩu. Vui lòng đăng nhập lại." : "Password changed. Sign in again on your devices.");
                    }}
                  >
                    <Form.Item name="currentPassword" label={locale === "vi" ? "Mật khẩu hiện tại" : "Current password"} rules={[{ required: true }]}>
                      <Input.Password autoComplete="current-password" />
                    </Form.Item>
                    <Form.Item
                      name="newPassword"
                      label={locale === "vi" ? "Mật khẩu mới" : "New password"}
                      rules={[{ required: true }, { min: 12 }]}
                    >
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      {locale === "vi" ? "Đổi mật khẩu" : "Change password"}
                    </Button>
                  </Form>
                  <Divider />
                  <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                    <div>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        Passkeys
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        {locale === "vi" ? "Đăng nhập bằng vân tay, khuôn mặt (FaceID) hoặc khóa bảo mật thiết bị." : "Sign in with your device lock, fingerprint, or security key."}
                      </Typography.Text>
                    </div>
                    <Button
                      icon={<SafetyCertificateOutlined />}
                      onClick={() => setPasskeyModalOpen(true)}
                    >
                      {locale === "vi" ? "Thêm Passkey" : "Add passkey"}
                    </Button>
                  </Space>
                  <List
                    style={{ marginTop: 12 }}
                    locale={{ emptyText: locale === "vi" ? "Chưa đăng ký Passkey nào" : "No passkeys registered" }}
                    dataSource={passkeys}
                    renderItem={(passkey) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="delete"
                            title={locale === "vi" ? "Xóa Passkey này?" : "Delete this passkey?"}
                            onConfirm={async () => {
                              await apiRequest(`/auth/passkeys/${encodeURIComponent(passkey.id)}`, {
                                method: "DELETE",
                              });
                              await refetchPasskeys();
                            }}
                          >
                            <Button danger type="text" icon={<DeleteOutlined />}>
                              {locale === "vi" ? "Xóa" : "Delete"}
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<SafetyCertificateOutlined />}
                          title={passkey.name || "Passkey"}
                          description={`${passkey.backedUp ? (locale === "vi" ? "Đồng bộ" : "Synced") : (locale === "vi" ? "Gắn với thiết bị" : "Device-bound")} · ${locale === "vi" ? "Đã thêm" : "Added"} ${new Date(passkey.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}${passkey.lastUsedAt ? ` · ${locale === "vi" ? "Dùng lần cuối" : "Last used"} ${new Date(passkey.lastUsedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}` : ""}`}
                        />
                      </List.Item>
                    )}
                  />
                  <Typography.Title level={5} style={{ marginTop: 32 }}>
                    {locale === "vi" ? "Thiết bị đang đăng nhập" : "Signed-in devices"}
                  </Typography.Title>
                  <List
                    dataSource={sessions}
                    renderItem={(session) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="revoke"
                            title={locale === "vi" ? "Thu hồi phiên đăng nhập này?" : "Revoke this session?"}
                            onConfirm={async () => {
                              await apiRequest(`/auth/sessions/${session.id}`, {
                                method: "DELETE",
                              });
                              await refetchSessions();
                            }}
                          >
                            <Button danger type="text" icon={<DeleteOutlined />}>
                              {locale === "vi" ? "Thu hồi" : "Revoke"}
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<LaptopOutlined />}
                          title={session.userAgent || (locale === "vi" ? "Thiết bị không xác định" : "Unknown device")}
                          description={`${session.ip || "Unknown IP"} · ${locale === "vi" ? "Dùng lần cuối" : "Last used"} ${new Date(session.lastUsedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}`}
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
        title={locale === "vi" ? "Thêm Passkey mới" : "Add a passkey"}
        open={passkeyModalOpen}
        onCancel={() => setPasskeyModalOpen(false)}
        onOk={registerPasskey}
        okText={locale === "vi" ? "Tiếp tục" : "Continue"}
        confirmLoading={passkeySubmitting}
      >
        <Typography.Paragraph type="secondary">
          {locale === "vi" ? "Đặt tên gợi nhớ cho Passkey này (ví dụ: Laptop làm việc). Trình duyệt sẽ yêu cầu bạn xác nhận bằng vân tay hoặc mã PIN trên thiết bị này." : "Give this passkey a recognizable name. Your browser will then ask you to confirm with this device."}
        </Typography.Paragraph>
        <Input
          autoFocus
          maxLength={80}
          value={passkeyName}
          onChange={(event) => setPasskeyName(event.target.value)}
          placeholder={locale === "vi" ? "Ví dụ: Laptop làm việc" : "e.g. Work laptop"}
        />
      </Modal>
    </PageContainer>
  );
}
