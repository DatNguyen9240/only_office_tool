import { SendOutlined, BulbOutlined } from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { App, Button, Input, Space, Typography } from "antd";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { translateApiError, useI18n } from "@/i18n";

export function AssistantPage() {
  const { message } = App.useApp();
  const { locale, t } = useI18n();
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
      const text = cause instanceof Error ? cause.message : "Assistant unavailable";
      message.error(translateApiError(text, locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      ghost
      title={locale === "vi" ? "Trợ lý AI" : "AI assistant"}
      subTitle={locale === "vi" ? "Đặt câu hỏi tra cứu trên các tài liệu bạn có quyền truy cập." : "Ask questions across documents you are authorized to access."}
    >
      <ProCard style={{ maxWidth: 880 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Input.TextArea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            autoSize={{ minRows: 4, maxRows: 10 }}
            maxLength={4000}
            placeholder={locale === "vi" ? "Hỏi về quy định, quy trình hoặc nội dung tài liệu..." : "Ask about policies, procedures, or a document..."}
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
            {locale === "vi" ? "Gửi câu hỏi" : "Ask assistant"}
          </Button>
          {answer && (
            <div className="assistant-answer">
              <Typography.Title level={5}>
                <BulbOutlined /> {locale === "vi" ? "Câu trả lời" : "Answer"}
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
