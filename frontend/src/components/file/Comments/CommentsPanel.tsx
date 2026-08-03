import {
  CheckCircleOutlined,
  DeleteOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Avatar,
  Button,
  Empty,
  Input,
  List,
  Popconfirm,
  Space,
  Typography,
} from "antd";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { translateApiError, useI18n } from "@/i18n";

interface CommentItem {
  id: string;
  content: string;
  resolved: boolean;
  editedAt: string | null;
  createdAt: string;
  author: { id: string; name: string; email: string };
}

interface CommentsPanelProps {
  documentId: string;
  canComment: boolean;
}

export function CommentsPanel({
  documentId,
  canComment,
}: CommentsPanelProps) {
  const { message } = App.useApp();
  const { locale, t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["documents", documentId, "comments"],
    queryFn: () =>
      apiRequest<CommentItem[]>(`/documents/${documentId}/comments`),
  });

  const createComment = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest(`/documents/${documentId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: content.trim() }),
      });
      setContent("");
      await refetch();
      message.success(locale === "vi" ? "Đã thêm bình luận" : "Comment added");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Comment failed";
      message.error(translateApiError(text, locale));
    } finally {
      setSubmitting(false);
    }
  };

  const updateResolved = async (comment: CommentItem) => {
    await apiRequest(`/documents/${documentId}/comments/${comment.id}`, {
      method: "PATCH",
      body: JSON.stringify({ resolved: !comment.resolved }),
    });
    await refetch();
  };

  const remove = async (comment: CommentItem) => {
    await apiRequest(`/documents/${documentId}/comments/${comment.id}`, {
      method: "DELETE",
      body: JSON.stringify({}),
    });
    await refetch();
  };

  return (
    <section className="comments-panel" aria-label="Document comments">
      <div className="comments-panel-heading">
        <Space>
          <MessageOutlined />
          <Typography.Text strong>{locale === "vi" ? "Bình luận" : "Comments"}</Typography.Text>
        </Space>
        <Typography.Text type="secondary">{data.length}</Typography.Text>
      </div>
      <List
        loading={isLoading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={locale === "vi" ? "Chưa có bình luận nào" : "No comments yet"}
            />
          ),
        }}
        dataSource={data}
        renderItem={(comment) => (
          <List.Item
            className={comment.resolved ? "comment-item is-resolved" : "comment-item"}
            actions={[
              <Button
                key="resolve"
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => void updateResolved(comment)}
              >
                {comment.resolved
                  ? (locale === "vi" ? "Mở lại" : "Reopen")
                  : (locale === "vi" ? "Đã giải quyết" : "Resolve")}
              </Button>,
              ...(comment.author.id === user?.id
                ? [
                    <Popconfirm
                      key="delete"
                      title={locale === "vi" ? "Xóa bình luận này?" : "Delete this comment?"}
                      onConfirm={() => remove(comment)}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        aria-label="Delete comment"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>,
                  ]
                : []),
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar size={28}>
                  {comment.author.name
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Avatar>
              }
              title={
                <Space size={6}>
                  <Typography.Text strong>{comment.author.name}</Typography.Text>
                  <Typography.Text type="secondary">
                    {new Date(comment.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                  </Typography.Text>
                </Space>
              }
              description={
                <Typography.Paragraph className="comment-content">
                  {comment.content}
                </Typography.Paragraph>
              }
            />
          </List.Item>
        )}
      />
      {canComment ? (
        <div className="comment-composer">
          <Input.TextArea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={5000}
            placeholder={locale === "vi" ? "Viết bình luận. Nhắc tới người khác bằng @email" : "Add a comment. Mention someone with @name@company.com"}
            onPressEnter={(event) => {
              if ((event.ctrlKey || event.metaKey) && content.trim()) {
                void createComment();
              }
            }}
          />
          <Button
            type="primary"
            loading={submitting}
            disabled={!content.trim()}
            onClick={() => void createComment()}
          >
            {locale === "vi" ? "Gửi bình luận" : "Comment"}
          </Button>
        </div>
      ) : (
        <Typography.Text type="secondary">
          {locale === "vi" ? "Cần quyền Người bình luận hoặc Người chỉnh sửa để bình luận." : "Commenter or Editor access is required to comment."}
        </Typography.Text>
      )}
    </section>
  );
}
