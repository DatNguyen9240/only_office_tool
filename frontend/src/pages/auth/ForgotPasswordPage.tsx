import { LockOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";

export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const resetToken = params.get("token");
  const [done, setDone] = useState(false);

  return (
    <main className="share-link-page">
      <Card className="share-link-card">
        <Typography.Title level={3}>
          <LockOutlined /> {resetToken ? "Set a new password" : "Reset password"}
        </Typography.Title>
        {done ? (
          <Alert
            type="success"
            showIcon
            message={resetToken ? "Password updated" : "Check your email for reset instructions"}
            action={<Link to="/login">Back to sign in</Link>}
          />
        ) : (
          <Form
            layout="vertical"
            onFinish={async (values) => {
              await apiRequest(
                resetToken ? "/auth/reset-password" : "/auth/forgot-password",
                {
                  method: "POST",
                  body: JSON.stringify(
                    resetToken
                      ? { token: resetToken, password: values.password }
                      : { email: values.email },
                  ),
                },
                { skipAuth: true, retryOnUnauthorized: false },
              );
              setDone(true);
            }}
          >
            {resetToken ? (
              <Form.Item name="password" label="New password" rules={[{ required: true }, { min: 12 }]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            ) : (
              <Form.Item name="email" label="Work email" rules={[{ required: true }, { type: "email" }]}>
                <Input type="email" autoComplete="email" />
              </Form.Item>
            )}
            <Button type="primary" htmlType="submit" block>
              {resetToken ? "Update password" : "Send reset link"}
            </Button>
          </Form>
        )}
      </Card>
    </main>
  );
}
