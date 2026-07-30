import {
  CheckCircleOutlined,
  FileProtectOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  Space,
  Typography,
} from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import loginArchive from "@/assets/login-archive.jpg";
import { PreferenceControls } from "@/components/common/PreferenceControls";
import { translateApiError, useI18n } from "@/i18n";
import { isApiConfigured } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, t } = useI18n();
  const { message } = App.useApp();
  const login = useAuthStore((state) => state.login);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const signIn = async (values: {
    email: string;
    password: string;
    remember?: boolean;
  }) => {
    setSubmitting(true);
    setError(undefined);
    try {
      if (!isApiConfigured) {
        throw new Error("Set VITE_API_URL to connect to the Meridian API.");
      }
      await login(values.email, values.password, values.remember !== false);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from;
      navigate(from?.pathname || "/documents", { replace: true });
    } catch (cause) {
      const rawError = cause instanceof Error ? cause.message : "Sign in failed";
      const nextError = translateApiError(rawError, locale);
      setError(nextError);
      message.error(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label={t("login.productInfo")}>
        <img
          className="login-brand-visual"
          src={loginArchive}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
        <div className="login-brand-scrim" aria-hidden="true" />
        <div className="login-brand">
          <span className="brand-mark large">M</span>
          <span>Meridian DMS</span>
        </div>
        <div className="login-brand-copy">
          <Typography.Text className="login-brand-kicker">
            {t("login.kicker")}
          </Typography.Text>
          <Typography.Title>{t("login.headline")}</Typography.Title>
          <Typography.Paragraph>{t("login.description")}</Typography.Paragraph>
          <Space className="login-trust-list" direction="vertical" size={14}>
            <span className="trust-item">
              <CheckCircleOutlined />
              {t("login.trustAccess")}
            </span>
            <span className="trust-item">
              <SafetyCertificateOutlined />
              {t("login.trustVersions")}
            </span>
            <span className="trust-item">
              <FileProtectOutlined />
              {t("login.trustEditing")}
            </span>
          </Space>
        </div>
        <Typography.Text className="login-security-note">
          <LockOutlined /> {t("login.protected")}
        </Typography.Text>
      </section>

      <section className="login-form-panel">
        <div className="login-form-topbar">
          <PreferenceControls />
        </div>
        <div className="login-form-shell">
          <div className="mobile-login-brand">
            <span className="brand-mark">M</span>
            <strong>Meridian DMS</strong>
          </div>
          <div className="login-form-intro">
            <Typography.Text className="login-form-kicker">
              <LockOutlined /> {t("login.secureAccess")}
            </Typography.Text>
            <Typography.Title level={2}>{t("login.welcome")}</Typography.Title>
            <Typography.Paragraph type="secondary">
              {t("login.subtitle")}
            </Typography.Paragraph>
          </div>
          <Form
            className="login-form"
            layout="vertical"
            requiredMark={false}
            initialValues={{ remember: true, email: "anika.verma@meridian.example" }}
            onFinish={signIn}
          >
            {error && (
              <Alert
                type="error"
                showIcon
                closable
                message={error}
                onClose={() => setError(undefined)}
                style={{ marginBottom: 16 }}
              />
            )}
            <Form.Item
              label={t("login.email")}
              name="email"
              rules={[
                { required: true, message: t("login.emailRequired") },
                { type: "email", message: t("login.emailInvalid") },
              ]}
            >
              <Input
                autoComplete="email"
                prefix={<MailOutlined />}
                placeholder={t("login.emailPlaceholder")}
              />
            </Form.Item>
            <Form.Item
              label={t("login.password")}
              name="password"
              rules={[{ required: true, message: t("login.passwordRequired") }]}
            >
              <Input.Password
                autoComplete="current-password"
                prefix={<LockOutlined />}
                placeholder={t("login.passwordPlaceholder")}
              />
            </Form.Item>
            <div className="login-form-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>{t("login.remember")}</Checkbox>
              </Form.Item>
              <Button type="link">{t("login.forgot")}</Button>
            </div>
            <Button
              className="login-submit"
              type="primary"
              htmlType="submit"
              loading={submitting}
              block
            >
              {t("login.signIn")}
            </Button>
          </Form>
          <Divider plain>{t("login.or")}</Divider>
          <Button
            className="login-sso-button"
            icon={<SafetyCertificateOutlined />}
            block
          >
            {t("login.sso")}
          </Button>
          <div className="login-assurance">
            <SafetyCertificateOutlined />
            <Typography.Text type="secondary">{t("login.assurance")}</Typography.Text>
          </div>
        </div>
        <Typography.Paragraph type="secondary" className="login-help">
          {t("login.needAccess")}{" "}
          <Button type="link">{t("login.contactAdmin")}</Button>
        </Typography.Paragraph>
      </section>
    </main>
  );
}
