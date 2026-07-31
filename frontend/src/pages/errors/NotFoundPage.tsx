import { FileUnknownOutlined } from "@ant-design/icons";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Result
      icon={<FileUnknownOutlined />}
      status="404"
      title="Page not found"
      subTitle="The page may have moved or you may not have permission to view it."
      extra={
        <Button type="primary" onClick={() => navigate("/dashboard")}>
          Return to dashboard
        </Button>
      }
    />
  );
}
