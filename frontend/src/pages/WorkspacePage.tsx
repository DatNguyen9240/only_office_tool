import {
  ArrowRightOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilterOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Breadcrumb,
  Button,
  Checkbox,
  Empty,
  Form,
  Grid,
  Input,
  Layout,
  List,
  Modal,
  Progress,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  type FormInstance,
} from "antd";
import { useMemo, useState, type Key } from "react";
import { useNavigate } from "react-router-dom";
import { SharePermissionModal } from "@/components/documents/SharePermissionModal";
import { UploadModal } from "@/components/documents/UploadModal";
import { VersionHistoryDrawer } from "@/components/documents/VersionHistoryDrawer";
import { fileIcon } from "@/components/documents/filePresentation";
import { WorkspaceDetailsDrawer } from "@/components/workspace/WorkspaceDetailsDrawer";
import {
  WorkspaceFileBrowser,
  type WorkspaceFileActions,
} from "@/components/workspace/WorkspaceFileBrowser";
import {
  WorkspaceBottomNav,
  WorkspaceHeader,
  WorkspaceSidebar,
  type WorkspaceSection,
} from "@/components/workspace/WorkspaceNavigation";
import {
  activities,
  documents as initialDocuments,
  folders as initialFolders,
  trashDocuments,
} from "@/data/sampleData";
import { useI18n } from "@/i18n";
import { useAppStore } from "@/store/useAppStore";
import type { DocumentItem, FolderItem } from "@share";

type SortValue = "modified" | "name" | "owner";

const sectionTranslationKeys = {
  drive: { title: "page.drive.title", description: "page.drive.description" },
  shared: { title: "page.shared.title", description: "page.shared.description" },
  recent: { title: "page.recent.title", description: "page.recent.description" },
  favorites: {
    title: "page.favorites.title",
    description: "page.favorites.description",
  },
  trash: { title: "page.trash.title", description: "page.trash.description" },
} as const;

interface NameModalProps {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  form: FormInstance;
  confirmText: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

function NameModal({
  open,
  title,
  label,
  initialValue,
  form,
  confirmText,
  onCancel,
  onConfirm,
}: NameModalProps) {
  const { t } = useI18n();
  return (
    <Modal
      destroyOnHidden
      open={open}
      title={title}
      okText={confirmText}
      onCancel={onCancel}
      onOk={async () => {
        const values = await form.validateFields();
        onConfirm(String(values.name).trim());
      }}
      afterOpenChange={(isOpen: boolean) => {
        if (isOpen) form.setFieldsValue({ name: initialValue ?? "" });
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={label}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t("form.required", { label }),
            },
            { max: 120, message: t("form.maxLength") },
          ]}
        >
          <Input autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function WorkspacePage() {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { t } = useI18n();
  const screens = Grid.useBreakpoint();
  const [section, setSection] = useState<WorkspaceSection>("drive");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<SortValue>("modified");
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [documents, setDocuments] = useState(initialDocuments);
  const [deletedDocuments, setDeletedDocuments] = useState(trashDocuments);
  const [folderItems, setFolderItems] = useState(initialFolders);
  const [detailsDocument, setDetailsDocument] = useState<DocumentItem>();
  const [shareDocument, setShareDocument] = useState<DocumentItem>();
  const [versionDocument, setVersionDocument] = useState<DocumentItem>();
  const [renameDocument, setRenameDocument] = useState<DocumentItem>();
  const [moveDocument, setMoveDocument] = useState<DocumentItem>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [renameForm] = Form.useForm();
  const [moveForm] = Form.useForm();
  const { viewMode, setViewMode, selectedFolderId, setSelectedFolderId } = useAppStore();

  const tabletCollapsed = Boolean(screens.md && !screens.xl);
  const activeFolder = folderItems.find((folder) => folder.id === selectedFolderId);
  const visibleFolders = folderItems.filter(
    (folder) =>
      folder.id !== "all" &&
      (selectedFolderId === "all"
        ? !folder.parentId
        : folder.parentId === selectedFolderId),
  );

  const filteredDocuments = useMemo(() => {
    let collection = section === "trash" ? deletedDocuments : documents;

    if (section === "shared") collection = collection.filter((document) => document.shared);
    if (section === "favorites") collection = collection.filter((document) => document.starred);
    if (section === "drive" && selectedFolderId !== "all") {
      collection = collection.filter((document) => document.folderId === selectedFolderId);
    }
    if (typeFilter !== "all") {
      collection = collection.filter((document) => document.type === typeFilter);
    }
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch) {
      collection = collection.filter(
        (document) =>
          document.name.toLowerCase().includes(normalizedSearch) ||
          document.owner.toLowerCase().includes(normalizedSearch),
      );
    }

    return [...collection].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "owner") return a.owner.localeCompare(b.owner);
      return a.id.localeCompare(b.id);
    });
  }, [deletedDocuments, documents, search, section, selectedFolderId, sort, typeFilter]);

  const changeSection = (nextSection: WorkspaceSection) => {
    setSection(nextSection);
    setSearch("");
    setTypeFilter("all");
    setSelectedKeys([]);
    setDetailsDocument(undefined);
    setTabletSidebarOpen(false);
    if (nextSection !== "drive") setSelectedFolderId("all");
  };

  const removeDocument = (document: DocumentItem) => {
    if (section === "trash") {
      modal.confirm({
        title: t("trash.deleteTitle"),
        content: t("trash.deleteDescription", { name: document.name }),
        okText: t("context.deleteForever"),
        okButtonProps: { danger: true },
        onOk: () => {
          setDeletedDocuments((current) => current.filter((item) => item.id !== document.id));
          message.success(t("trash.deleted"));
        },
      });
      return;
    }

    modal.confirm({
      title: t("trash.moveTitle"),
      content: t("trash.moveDescription", { name: document.name }),
      okText: t("context.moveTrash"),
      okButtonProps: { danger: true },
      onOk: () => {
        setDocuments((current) => current.filter((item) => item.id !== document.id));
        setDeletedDocuments((current) => [
          { ...document, status: "deleted", deletedAt: "Just now" },
          ...current,
        ]);
        if (detailsDocument?.id === document.id) setDetailsDocument(undefined);
        message.success(t("trash.moved"));
      },
    });
  };

  const restoreDocument = (document: DocumentItem) => {
    setDeletedDocuments((current) => current.filter((item) => item.id !== document.id));
    setDocuments((current) => [
      { ...document, status: "ready", deletedAt: undefined },
      ...current,
    ]);
    message.success(t("trash.restored"));
  };

  const fileActions: WorkspaceFileActions = {
    open: (document) => navigate(`/editor/${document.id}`),
    details: (document) => setDetailsDocument(document),
    rename: (document) => setRenameDocument(document),
    move: (document) => setMoveDocument(document),
    share: (document) => setShareDocument(document),
    download: (document) =>
      message.success(t("file.downloading", { name: document.name })),
    versions: (document) => setVersionDocument(document),
    remove: removeDocument,
    restore: restoreDocument,
    favorite: (document) =>
      setDocuments((current) =>
        current.map((item) =>
          item.id === document.id ? { ...item, starred: !item.starred } : item,
        ),
      ),
  };

  const batchDelete = () => {
    const selected = filteredDocuments.filter((document) => selectedKeys.includes(document.id));
    if (!selected.length) return;
    modal.confirm({
      title: t("trash.batchMoveTitle", { count: selected.length }),
      content: t("trash.batchMoveDescription"),
      okText: t("context.moveTrash"),
      okButtonProps: { danger: true },
      onOk: () => {
        const selectedIds = new Set(selected.map((document) => document.id));
        setDocuments((current) => current.filter((document) => !selectedIds.has(document.id)));
        setDeletedDocuments((current) => [
          ...selected.map((document) => ({
            ...document,
            status: "deleted" as const,
            deletedAt: "Just now",
          })),
          ...current,
        ]);
        setSelectedKeys([]);
        message.success(t("trash.batchMoved", { count: selected.length }));
      },
    });
  };

  const batchRestore = () => {
    const selected = deletedDocuments.filter((document) => selectedKeys.includes(document.id));
    if (!selected.length) return;
    const selectedIds = new Set(selected.map((document) => document.id));
    setDeletedDocuments((current) =>
      current.filter((document) => !selectedIds.has(document.id)),
    );
    setDocuments((current) => [
      ...selected.map((document) => ({
        ...document,
        status: "ready" as const,
        deletedAt: undefined,
      })),
      ...current,
    ]);
    setSelectedKeys([]);
    message.success(t("trash.batchRestored", { count: selected.length }));
  };

  const batchDeletePermanently = () => {
    const selected = deletedDocuments.filter((document) => selectedKeys.includes(document.id));
    if (!selected.length) return;
    modal.confirm({
      title: t("trash.batchDeleteTitle", { count: selected.length }),
      content: t("trash.batchDeleteDescription"),
      okText: t("context.deleteForever"),
      okButtonProps: { danger: true },
      onOk: () => {
        const selectedIds = new Set(selected.map((document) => document.id));
        setDeletedDocuments((current) =>
          current.filter((document) => !selectedIds.has(document.id)),
        );
        setSelectedKeys([]);
        message.success(t("trash.batchDeleted", { count: selected.length }));
      },
    });
  };

  const title = {
    title: t(sectionTranslationKeys[section].title),
    description: t(sectionTranslationKeys[section].description),
  };
  const translateActivity = (action: string) => {
    const keys = {
      edited: "activity.edited",
      shared: "activity.shared",
      approved: "activity.approved",
      "commented on": "activity.commented",
    } as const;
    return action in keys ? t(keys[action as keyof typeof keys]) : action;
  };
  const quickAccess = documents.slice(0, 4);
  const sharedPreview = documents.filter((document) => document.shared).slice(0, 3);

  return (
    <Layout className="workspace-shell">
      <WorkspaceSidebar
        active={section}
        collapsed={tabletCollapsed}
        expandedOnTablet={tabletSidebarOpen}
        onSelect={changeSection}
      />
      {tabletSidebarOpen && (
        <button
          type="button"
          className="workspace-sidebar-scrim"
          aria-label={t("header.closeNav")}
          onClick={() => setTabletSidebarOpen(false)}
        />
      )}
      <Layout className="workspace-main-layout">
        <WorkspaceHeader
          searchValue={search}
          sidebarOpen={tabletSidebarOpen}
          onSearch={setSearch}
          onToggleSidebar={() => setTabletSidebarOpen((current) => !current)}
          onCreateFolder={() => setCreateFolderOpen(true)}
          onUpload={() => setUploadOpen(true)}
        />
        <Layout.Content className="workspace-content">
          <div className="workspace-page-heading">
            <div>
              <Typography.Title level={2}>{title.title}</Typography.Title>
              <Typography.Text type="secondary">{title.description}</Typography.Text>
            </div>
            {section === "trash" && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => message.info(t("trash.refreshed"))}
              >
                {t("common.refresh")}
              </Button>
            )}
          </div>

          <div className={`workspace-content-grid${section === "drive" ? " with-rail" : ""}`}>
            <main className="workspace-primary">
              {section === "drive" && selectedFolderId === "all" && (
                <section className="workspace-overview" aria-labelledby="quick-access-title">
                  <div className="workspace-section-heading">
                    <Typography.Title level={5} id="quick-access-title">
                      {t("overview.frequent")}
                    </Typography.Title>
                    <Button type="link" size="small" onClick={() => changeSection("recent")}>
                      {t("overview.viewRecent")}
                    </Button>
                  </div>
                  <div className="workspace-quick-grid">
                    {quickAccess.map((document) => (
                      <button
                        type="button"
                        key={document.id}
                        className="workspace-quick-file"
                        onClick={() => setDetailsDocument(document)}
                        onDoubleClick={() => navigate(`/editor/${document.id}`)}
                      >
                        {fileIcon(document.type)}
                        <span className="workspace-quick-file-copy">
                          <strong>{document.name}</strong>
                          <small>{document.modifiedAt}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {section === "drive" && (visibleFolders.length > 0 || selectedFolderId !== "all") && (
                <section className="workspace-folder-section" aria-labelledby="folders-title">
                  <div className="workspace-section-heading">
                    <Typography.Title level={5} id="folders-title">
                      {t("folders.title")}
                    </Typography.Title>
                    <Button
                      type="text"
                      size="small"
                      icon={<FolderAddOutlined />}
                      onClick={() => setCreateFolderOpen(true)}
                    >
                      {t("folders.new")}
                    </Button>
                  </div>
                  {visibleFolders.length ? (
                    <div className="workspace-folder-grid">
                      {visibleFolders.map((folder) => (
                        <button
                          type="button"
                          key={folder.id}
                          className="workspace-folder"
                          onClick={() => setSelectedFolderId(folder.id)}
                        >
                          <FolderOpenOutlined />
                          <span>
                            <strong>{folder.name}</strong>
                            <small>{t("folders.items", { count: folder.count })}</small>
                          </span>
                          <ArrowRightOutlined />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t("folders.empty")}
                    />
                  )}
                </section>
              )}

              <section className="workspace-browser-surface" aria-labelledby="files-title">
                <div className="workspace-browser-heading">
                  <Breadcrumb
                    items={[
                      {
                        title: (
                          <button
                            type="button"
                            className="workspace-breadcrumb-button"
                            onClick={() => setSelectedFolderId("all")}
                          >
                            {section === "drive" ? t("nav.drive") : title.title}
                          </button>
                        ),
                      },
                      ...(section === "drive" && activeFolder && activeFolder.id !== "all"
                        ? [{ title: activeFolder.name }]
                        : []),
                    ]}
                  />
                  <Typography.Text type="secondary">
                    {t(
                      filteredDocuments.length === 1
                        ? "files.oneItem"
                        : "files.items",
                      { count: filteredDocuments.length },
                    )}
                  </Typography.Text>
                </div>

                <div className="workspace-toolbar">
                  <Space size={8}>
                    <Select
                      aria-label={t("filter.type")}
                      className="workspace-filter-select"
                      prefix={<FilterOutlined />}
                      value={typeFilter}
                      options={[
                        { value: "all", label: t("filter.all") },
                        { value: "docx", label: t("filter.documents") },
                        { value: "xlsx", label: t("filter.spreadsheets") },
                        { value: "pptx", label: t("filter.presentations") },
                        { value: "pdf", label: t("filter.pdfs") },
                      ]}
                      onChange={setTypeFilter}
                    />
                    <Select
                      aria-label={t("sort.label")}
                      className="workspace-sort-select"
                      prefix={<SortAscendingOutlined />}
                      value={sort}
                      options={[
                        { value: "modified", label: t("sort.modified") },
                        { value: "name", label: t("sort.name") },
                        { value: "owner", label: t("sort.owner") },
                      ]}
                      onChange={setSort}
                    />
                  </Space>
                  <Segmented
                    aria-label={t("files.view")}
                    value={viewMode}
                    options={[
                      { value: "list", label: t("files.list") },
                      { value: "grid", label: t("files.grid") },
                    ]}
                    onChange={(value) => setViewMode(value as "list" | "grid")}
                  />
                </div>

                {selectedKeys.length > 0 && (
                  <div className="workspace-selection-bar">
                    <Checkbox
                      checked
                      aria-label={t("selection.clear")}
                      onChange={() => setSelectedKeys([])}
                    />
                    <Typography.Text strong>
                      {t("selection.count", { count: selectedKeys.length })}
                    </Typography.Text>
                    <Space size={4}>
                      {section === "trash" ? (
                        <>
                          <Button
                            type="text"
                            icon={<ReloadOutlined />}
                            onClick={batchRestore}
                          >
                            {t("common.restore")}
                          </Button>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={batchDeletePermanently}
                          >
                            {t("context.deleteForever")}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="text"
                            icon={<DownloadOutlined />}
                            onClick={() => message.success(t("selection.downloading"))}
                          >
                            {t("common.download")}
                          </Button>
                          <Button
                            type="text"
                            icon={<ShareAltOutlined />}
                            onClick={() => {
                              const first = filteredDocuments.find((document) =>
                                selectedKeys.includes(document.id),
                              );
                              if (first) setShareDocument(first);
                            }}
                          >
                            {t("common.share")}
                          </Button>
                        </>
                      )}
                      {section !== "trash" && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={batchDelete}
                        >
                          {t("common.delete")}
                        </Button>
                      )}
                    </Space>
                  </div>
                )}

                <WorkspaceFileBrowser
                  documents={filteredDocuments}
                  mode={viewMode}
                  selectedKeys={selectedKeys}
                  trash={section === "trash"}
                  actions={fileActions}
                  onSelectionChange={setSelectedKeys}
                />
              </section>
            </main>

            {section === "drive" && (
              <aside className="workspace-rail" aria-label={t("workspace.summary")}>
                <section className="workspace-rail-section">
                  <div className="workspace-rail-title">
                    <Typography.Title level={5}>{t("storage.title")}</Typography.Title>
                    <Tag bordered={false}>68%</Tag>
                  </div>
                  <Progress percent={68} showInfo={false} strokeColor="#275dad" />
                  <Typography.Text type="secondary">{t("storage.used")}</Typography.Text>
                  <div className="workspace-storage-breakdown">
                    <span>{t("storage.documents")} <strong>42 GB</strong></span>
                    <span>{t("storage.media")} <strong>18 GB</strong></span>
                    <span>{t("storage.other")} <strong>8 GB</strong></span>
                  </div>
                </section>
                <section className="workspace-rail-section">
                  <div className="workspace-rail-title">
                    <Typography.Title level={5}>{t("shared.title")}</Typography.Title>
                    <Button type="link" size="small" onClick={() => changeSection("shared")}>
                      {t("shared.viewAll")}
                    </Button>
                  </div>
                  <List
                    className="workspace-rail-list"
                    dataSource={sharedPreview}
                    renderItem={(document) => (
                      <List.Item onClick={() => setDetailsDocument(document)}>
                        <List.Item.Meta
                          avatar={fileIcon(document.type)}
                          title={<Typography.Text ellipsis>{document.name}</Typography.Text>}
                          description={t("shared.by", { name: document.owner })}
                        />
                      </List.Item>
                    )}
                  />
                </section>
                <section className="workspace-rail-section">
                  <div className="workspace-rail-title">
                    <Typography.Title level={5}>{t("activity.title")}</Typography.Title>
                  </div>
                  <List
                    className="workspace-activity-list"
                    dataSource={activities.slice(0, 4)}
                    renderItem={(activity) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar size={28}>{activity.actor.split(" ").map((part) => part[0]).join("")}</Avatar>}
                          title={
                            <Typography.Text>
                              <strong>{activity.actor}</strong>{" "}
                              {translateActivity(activity.action)}
                            </Typography.Text>
                          }
                          description={
                            <>
                              <span>{activity.resource}</span>
                              <small>{activity.at}</small>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </section>
              </aside>
            )}
          </div>
        </Layout.Content>
      </Layout>

      <WorkspaceBottomNav active={section} onSelect={changeSection} />
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <SharePermissionModal
        open={Boolean(shareDocument)}
        document={shareDocument}
        onClose={() => setShareDocument(undefined)}
      />
      <VersionHistoryDrawer
        open={Boolean(versionDocument)}
        document={versionDocument}
        onClose={() => setVersionDocument(undefined)}
      />
      <WorkspaceDetailsDrawer
        open={Boolean(detailsDocument)}
        document={detailsDocument}
        onClose={() => setDetailsDocument(undefined)}
        onOpenEditor={(document) => navigate(`/editor/${document.id}`)}
        onShare={setShareDocument}
      />
      <NameModal
        open={createFolderOpen}
        title={t("folder.createTitle")}
        label={t("folder.name")}
        form={createForm}
        confirmText={t("common.create")}
        onCancel={() => setCreateFolderOpen(false)}
        onConfirm={(name) => {
          const folder: FolderItem = {
            id: `folder-${Date.now()}`,
            name,
            count: 0,
            parentId: selectedFolderId === "all" ? undefined : selectedFolderId,
          };
          setFolderItems((current) => [...current, folder]);
          setCreateFolderOpen(false);
          createForm.resetFields();
          message.success(t("folder.created", { name }));
        }}
      />
      <NameModal
        open={Boolean(renameDocument)}
        title={t("file.renameTitle")}
        label={t("file.name")}
        initialValue={renameDocument?.name}
        form={renameForm}
        confirmText={t("common.rename")}
        onCancel={() => setRenameDocument(undefined)}
        onConfirm={(name) => {
          if (!renameDocument) return;
          setDocuments((current) =>
            current.map((document) =>
              document.id === renameDocument.id ? { ...document, name } : document,
            ),
          );
          setRenameDocument(undefined);
          renameForm.resetFields();
          message.success(t("file.renamed"));
        }}
      />
      <Modal
        open={Boolean(moveDocument)}
        title={t("file.moveTitle")}
        okText={t("common.move")}
        onCancel={() => setMoveDocument(undefined)}
        onOk={async () => {
          const values = await moveForm.validateFields();
          if (!moveDocument) return;
          setDocuments((current) =>
            current.map((document) =>
              document.id === moveDocument.id
                ? { ...document, folderId: String(values.folderId) }
                : document,
            ),
          );
          setMoveDocument(undefined);
          moveForm.resetFields();
          message.success(t("file.moved"));
        }}
      >
        <Typography.Paragraph type="secondary">
          {t("file.moveDescription", { name: moveDocument?.name ?? "" })}
        </Typography.Paragraph>
        <Form form={moveForm} layout="vertical">
          <Form.Item
            name="folderId"
            label={t("file.destination")}
            rules={[{ required: true, message: t("file.chooseFolder") }]}
          >
            <Select
              placeholder={t("file.selectFolder")}
              options={folderItems
                .filter((folder) => folder.id !== "all")
                .map((folder) => ({ value: folder.id, label: folder.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
