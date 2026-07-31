import { DownloadOutlined, LinkOutlined, LockOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Result, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest, ApiError } from "@/lib/api";

interface SharedLinkResponse {
  document: {
    name: string;
    owner: string;
    type: string;
    sizeBytes: number;
  };
  permission: string;
  expiresAt: string | null;
  url: string;
}

export function ShareLinkPage() {
  const { token } = useParams();
  const [data, setData] = useState<SharedLinkResponse>();
  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [error, setError] = useState<string>();

  const access = async (password?: string) => {
    if (!token) {
      setError("This share link is invalid.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const result = await apiRequest<SharedLinkResponse>(
        `/share/${encodeURIComponent(token)}/access`,
        {
          method: "POST",
          body: JSON.stringify(password ? { password } : {}),
        },
        { skipAuth: true, retryOnUnauthorized: false },
      );
      setData(result);
      setPasswordRequired(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setPasswordRequired(true);
      } else {
        setError(cause instanceof Error ? cause.message : "Share link unavailable");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void access();
  }, [token]);

  if (loading && !data) {
    return <main className="share-link-page"><Card loading /></main>;
  }

  if (passwordRequired) {
    return (
      <main className="share-link-page">
        <Card className="share-link-card">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <LockOutlined className="share-link-icon" />
            <Typography.Title level={3}>Password required</Typography.Title>
            <Typography.Text type="secondary">
              Enter the password provided by the document owner.
            </Typography.Text>
            <Form onFinish={(values: { password: string }) => void access(values.password)}>
              <Form.Item name="password" rules={[{ required: true, message: "Enter the password" }]}>
                <Input.Password autoFocus placeholder="Share link password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Continue
              </Button>
            </Form>
          </Space>
        </Card>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="share-link-page">
        <Result status="warning" title="Share link unavailable" subTitle={error} />
      </main>
    );
  }

  return (
    <main className="share-link-page">
      <Card className="share-link-card">
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <LinkOutlined className="share-link-icon" />
          <Typography.Title level={3}>{data.document.name}</Typography.Title>
          <Typography.Text type="secondary">
            Shared by {data.document.owner} · {data.permission.toLowerCase()}
          </Typography.Text>
          {data.expiresAt && (
            <Alert
              type="info"
              showIcon
              message={`Available until ${new Date(data.expiresAt).toLocaleString()}`}
            />
          )}
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            href={data.url}
            target="_blank"
            rel="noreferrer"
            block
          >
            Download document
          </Button>
        </Space>
      </Card>
    </main>
  );
}
