import { SendOutlined, BulbOutlined } from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { App, Button, Input, Space, Typography } from "antd";
import { useState } from "react";
import { apiRequest } from "@/lib/api";

export function AssistantPage() {
  const { message } = App.useApp();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const response = await apiRequest<{ answer: string }>("/ai/ask", {
        method: "POST",
        body: JSON.stringify({ question: question.trim() }),
      });
      setAnswer(response.answer);
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : "Assistant unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      ghost
      title="AI assistant"
      subTitle="Ask questions across documents you are authorized to access."
    >
      <ProCard style={{ maxWidth: 880 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Input.TextArea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            autoSize={{ minRows: 4, maxRows: 10 }}
            maxLength={4000}
            placeholder="Ask about policies, procedures, or a document..."
            onPressEnter={(event) => {
              if ((event.ctrlKey || event.metaKey) && question.trim()) {
                void ask();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            disabled={!question.trim()}
            onClick={() => void ask()}
          >
            Ask assistant
          </Button>
          {answer && (
            <div className="assistant-answer">
              <Typography.Title level={5}>
                <BulbOutlined /> Answer
              </Typography.Title>
              <Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>
                {answer}
              </Typography.Paragraph>
            </div>
          )}
        </Space>
      </ProCard>
    </PageContainer>
  );
}
