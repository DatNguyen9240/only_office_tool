import {
  CommentOutlined,
  ExportOutlined,
  HistoryOutlined,
  LockOutlined,
  SendOutlined,
  ShareAltOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Button,
  Descriptions,
  Drawer,
  Input,
  List,
  Popconfirm,
  Space,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { permissions, versions } from "@/data/sampleData";
import { useI18n } from "@/i18n";
import type { DocumentItem } from "@/types";
import { fileIcon, fileTypeLabels } from "@/components/documents/filePresentation";

interface CommentItem {
  id: string;
  author: string;
  initials: string;
  body: string;
  at: string;
}

const initialComments: CommentItem[] = [
  {
    id: "comment-1",
    author: "Minh Nguyen",
    initials: "MN",
    body: "The finance assumptions are updated. Please review section three.",
    at: "Today, 09:54",
  },
  {
    id: "comment-2",
    author: "Priya Shah",
    initials: "PS",
    body: "Approved from my side. The delivery dates now match the operating plan.",
    at: "Yesterday, 16:20",
  },
];

interface WorkspaceDetailsDrawerProps {
  open: boolean;
  document?: DocumentItem;
  onClose: () => void;
  onOpenEditor: (document: DocumentItem) => void;
  onShare: (document: DocumentItem) => void;
}

export function WorkspaceDetailsDrawer({
  open,
  document,
  onClose,
  onOpenEditor,
  onShare,
}: WorkspaceDetailsDrawerProps) {
  const { message } = App.useApp();
  const { t } = useI18n();
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const permissionLabel = (role: "Viewer" | "Commenter" | "Editor" | "Owner") => {
    const keys = {
      Viewer: "role.viewer",
      Commenter: "role.commenter",
      Editor: "role.editor",
      Owner: "role.owner",
    } as const;
    return t(keys[role]);
  };

  if (!document) return null;

  const submitComment = () => {
    const body = draft.trim();
    if (!body) return;
    setComments((current) => [
      ...current,
      {
        id: `comment-${Date.now()}`,
        author: "Anika Verma",
        initials: "AV",
        body,
        at: "Just now",
      },
    ]);
    setDraft("");
    message.success(t("comments.added"));
  };

  return (
    <Drawer
      className="workspace-details-drawer"
      open={open}
      width={440}
      title={t("details.title")}
      onClose={onClose}
    >
      <div className="workspace-detail-heading">
        {fileIcon(document.type, 26)}
        <div>
          <Typography.Title level={4}>{document.name}</Typography.Title>
          <Typography.Text type="secondary">
            {fileTypeLabels[document.type]} · {document.size}
          </Typography.Text>
        </div>
      </div>
      <Space.Compact block className="workspace-detail-actions">
        <Button
          type="primary"
          icon={<ExportOutlined />}
          onClick={() => onOpenEditor(document)}
        >
          {t("details.openEditor")}
        </Button>
        <Button icon={<ShareAltOutlined />} onClick={() => onShare(document)}>
          {t("common.share")}
        </Button>
      </Space.Compact>
      <Tabs
        defaultActiveKey="details"
        items={[
          {
            key: "details",
            label: t("details.tab"),
            children: (
              <div className="workspace-detail-section">
                <Descriptions
                  column={1}
                  size="small"
                  items={[
                    { key: "owner", label: t("common.owner"), children: document.owner },
                    {
                      key: "modified",
                      label: t("common.modified"),
                      children: document.modifiedAt,
                    },
                    {
                      key: "location",
                      label: t("common.location"),
                      children: t("details.defaultLocation"),
                    },
                    {
                      key: "access",
                      label: t("details.yourAccess"),
                      children: (
                        <Tag bordered={false}>
                          {permissionLabel(document.permission ?? "Owner")}
                        </Tag>
                      ),
                    },
                  ]}
                />
                <div className="workspace-section-heading">
                  <Space size={8}>
                    <TeamOutlined />
                    <Typography.Text strong>{t("details.peopleAccess")}</Typography.Text>
                  </Space>
                  <Button type="link" size="small" onClick={() => onShare(document)}>
                    {t("common.manage")}
                  </Button>
                </div>
                <Avatar.Group max={{ count: 4 }}>
                  {permissions.map((permission) => (
                    <Avatar key={permission.id}>
                      {permission.initials}
                    </Avatar>
                  ))}
                </Avatar.Group>
                <div className="workspace-access-note">
                  <LockOutlined />
                  <Typography.Text type="secondary">
                    {t("details.restricted")}
                  </Typography.Text>
                </div>
              </div>
            ),
          },
          {
            key: "versions",
            label: (
              <Space size={6}>
                <HistoryOutlined />
                {t("details.versions")}
              </Space>
            ),
            children: (
              <Timeline
                className="workspace-version-list"
                items={versions.map((version) => ({
                  color: version.current ? "#275dad" : "gray",
                  children: (
                    <div className="workspace-version-entry">
                      <Space>
                        <Typography.Text strong>{version.version}</Typography.Text>
                        {version.current && (
                          <Tag color="blue" bordered={false}>
                            {t("common.current")}
                          </Tag>
                        )}
                      </Space>
                      <Typography.Text type="secondary">{version.note}</Typography.Text>
                      <Typography.Text type="secondary">
                        {version.author}, {version.createdAt}
                      </Typography.Text>
                      {!version.current && (
                        <Popconfirm
                          title={t("versions.restoreTitle")}
                          description={t("versions.restoreDescription")}
                          onConfirm={() =>
                            message.success(
                              t("versions.restored", { version: version.version }),
                            )
                          }
                        >
                          <Button size="small">{t("common.restore")}</Button>
                        </Popconfirm>
                      )}
                    </div>
                  ),
                }))}
              />
            ),
          },
          {
            key: "comments",
            label: (
              <Space size={6}>
                <CommentOutlined />
                {t("details.comments")}
              </Space>
            ),
            children: (
              <div className="workspace-comments">
                <List
                  dataSource={comments}
                  renderItem={(comment) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar>{comment.initials}</Avatar>}
                        title={
                          <Space>
                            <Typography.Text strong>{comment.author}</Typography.Text>
                            <Typography.Text type="secondary">{comment.at}</Typography.Text>
                          </Space>
                        }
                        description={comment.body}
                      />
                    </List.Item>
                  )}
                />
                <div className="workspace-comment-compose">
                  <Input.TextArea
                    aria-label={t("comments.placeholder")}
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    placeholder={t("comments.placeholder")}
                    value={draft}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setDraft(event.target.value)
                    }
                    onPressEnter={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                      if (!event.shiftKey) {
                        event.preventDefault();
                        submitComment();
                      }
                    }}
                  />
                  <Button
                    type="primary"
                    aria-label={t("comments.send")}
                    icon={<SendOutlined />}
                    disabled={!draft.trim()}
                    onClick={submitComment}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  );
}
