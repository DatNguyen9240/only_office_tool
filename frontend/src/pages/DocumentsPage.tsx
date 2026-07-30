import {
  AppstoreOutlined,
  BarsOutlined,
  DownOutlined,
  FilterOutlined,
  FolderAddOutlined,
  FolderOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import {
  App,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Input,
  Modal,
  Segmented,
  Select,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { FileCardGridSkeleton } from "@/components/common/LoadingSkeletons";
import { FileCard } from "@/components/documents/FileCard";
import { FileTable } from "@/components/documents/FileTable";
import { FolderTree } from "@/components/documents/FolderTree";
import { SearchBar } from "@/components/documents/SearchBar";
import { SharePermissionModal } from "@/components/documents/SharePermissionModal";
import { UploadModal } from "@/components/documents/UploadModal";
import { VersionHistoryDrawer } from "@/components/documents/VersionHistoryDrawer";
import { useDocuments } from "@/hooks/useDocuments";
import { useFolders } from "@/hooks/useFolders";
import { translateApiError, useI18n } from "@/i18n";
import { apiRequest, isApiConfigured } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { DocumentItem } from "@share";

interface DocumentsPageProps {
  scope?: "all" | "shared";
}

export function DocumentsPage({ scope = "all" }: DocumentsPageProps) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [shareDocument, setShareDocument] = useState<DocumentItem>();
  const [versionDocument, setVersionDocument] = useState<DocumentItem>();
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [renameDocument, setRenameDocument] = useState<DocumentItem>();
  const [renameValue, setRenameValue] = useState("");
  const [moveDocument, setMoveDocument] = useState<DocumentItem>();
  const [moveFolderId, setMoveFolderId] = useState("all");
  const { data = [], isLoading } = useDocuments(scope);
  const { data: folders = [] } = useFolders();

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      if (isApiConfigured) {
        await apiRequest("/folders", {
          method: "POST",
          body: JSON.stringify({
            name: newFolderName.trim(),
            parentId: selectedFolderId !== "all" ? selectedFolderId : undefined,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["folders"] });
      }
      message.success(`Đã tạo thư mục "${newFolderName}"`);
      setNewFolderName("");
      setCreateFolderOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tạo thư mục thất bại";
      message.error(translateApiError(msg, locale));
    } finally {
      setCreatingFolder(false);
    }
  };
  const {
    selectedFolderId,
    setSelectedFolderId,
    selectedDocumentId,
    selectDocument,
    viewMode,
    setViewMode,
    previewOpen,
    setPreviewOpen,
  } = useAppStore();

  const filtered = useMemo(
    () =>
      data.filter((document) => {
        const folderMatch =
          scope === "shared" || selectedFolderId === "all"
            ? true
            : document.folderId === selectedFolderId;
        const queryMatch = document.name.toLowerCase().includes(query.toLowerCase());
        const typeMatch = typeFilter === "all" || document.type === typeFilter;
        return folderMatch && queryMatch && typeMatch;
      }),
    [data, query, scope, selectedFolderId, typeFilter],
  );

  const selectedDocument = data.find((item) => item.id === selectedDocumentId);
  const isDesktopPreview = Boolean(screens.xl);
  const showPreview = previewOpen && isDesktopPreview;
  const title = scope === "shared" ? "Shared with me" : "Documents";
  const subtitle =
    scope === "shared"
      ? "Documents shared directly with you or your teams."
      : "Organize, edit, and govern your company documents.";

  const openDocument = (document: DocumentItem) => navigate(`/editor/${document.id}`);
  const removeDocument = async (document: DocumentItem) => {
    try {
      await apiRequest(`/documents/${document.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      message.success(`${document.name} moved to trash`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Delete failed";
      message.error(translateApiError(text, locale));
    }
  };

  const downloadDocument = async (document: DocumentItem) => {
    try {
      const response = await apiRequest<{ url: string }>(
        `/documents/${document.id}/download-url`,
      );
      window.location.assign(response.url);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Download failed";
      message.error(translateApiError(text, locale));
    }
  };

  const patchDocument = async (
    document: DocumentItem,
    update: Record<string, unknown>,
    success: string,
  ) => {
    try {
      await apiRequest(`/documents/${document.id}`, {
        method: "PATCH",
        body: JSON.stringify(update),
      });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      message.success(success);
      return true;
    } catch (error) {
      const text = error instanceof Error ? error.message : "Update failed";
      message.error(translateApiError(text, locale));
      return false;
    }
  };

  const toggleStar = async (document: DocumentItem) => {
    try {
      await apiRequest(`/documents/${document.id}/star`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Update failed";
      message.error(translateApiError(text, locale));
    }
  };

  const folderPanel = (
    <FolderTree
      selectedId={selectedFolderId}
      onSelect={(id) => {
        setSelectedFolderId(id);
        setFolderDrawerOpen(false);
      }}
    />
  );

  return (
    <PageContainer
      ghost
      title={title}
      subTitle={subtitle}
      extra={[
        <Button
          key="folder"
          icon={<FolderAddOutlined />}
          onClick={() => setCreateFolderOpen(true)}
        >
          Thư mục mới
        </Button>,
        <Dropdown
          key="upload"
          menu={{
            items: [
              { key: "files", label: "Upload files", icon: <UploadOutlined />, onClick: () => setUploadOpen(true) },
              { key: "folder", label: "Upload folder", icon: <FolderOutlined /> },
            ],
          }}
        >
          <Button type="primary" icon={<UploadOutlined />}>
            Upload <DownOutlined />
          </Button>
        </Dropdown>,
      ]}
    >
      <div className="documents-toolbar">
        {!screens.lg && (
          <Button icon={<FolderOutlined />} onClick={() => setFolderDrawerOpen(true)}>
            Folders
          </Button>
        )}
        <SearchBar value={query} onChange={setQuery} />
        <Select
          className="document-type-filter"
          defaultValue="all"
          value={typeFilter}
          suffixIcon={<FilterOutlined />}
          options={[
            { value: "all", label: "All file types" },
            { value: "docx", label: "Documents" },
            { value: "xlsx", label: "Spreadsheets" },
            { value: "pptx", label: "Presentations" },
            { value: "pdf", label: "PDF files" },
          ]}
          onChange={setTypeFilter}
        />
        <Segmented
          aria-label="Document view"
          value={viewMode}
          options={[
            { value: "list", icon: <BarsOutlined /> },
            { value: "grid", icon: <AppstoreOutlined /> },
          ]}
          onChange={(value) => setViewMode(value as "list" | "grid")}
        />
      </div>

      <div className={`document-workspace${showPreview ? " with-preview" : ""}${scope === "shared" ? " no-folders" : ""}`}>
        {scope === "all" && screens.lg && folderPanel}
        <section className="file-region" aria-label={`${title} list`}>
          <div className="file-region-heading">
            <div>
              <Typography.Text strong>
                {scope === "shared"
                  ? "All shared documents"
                  : folders.find((folder) => folder.id === selectedFolderId)?.name}
              </Typography.Text>
              <Typography.Text type="secondary">{filtered.length} items</Typography.Text>
            </div>
            {!isDesktopPreview && selectedDocument && (
              <Button onClick={() => setPreviewOpen(true)}>Preview</Button>
            )}
          </div>
          {viewMode === "list" ? (
            <FileTable
              documents={filtered}
              loading={isLoading}
              selectedId={selectedDocumentId}
              compact={!screens.md}
              narrow={showPreview || !screens.md}
              onSelect={(document) => {
                selectDocument(document.id);
                if (!isDesktopPreview) setPreviewOpen(true);
              }}
              onOpen={openDocument}
              onShare={setShareDocument}
              onVersions={setVersionDocument}
              onDelete={removeDocument}
              onDownload={downloadDocument}
              onRename={(document) => {
                setRenameDocument(document);
                setRenameValue(document.name);
              }}
              onMove={(document) => {
                setMoveDocument(document);
                setMoveFolderId(document.folderId);
              }}
              onStar={(document) => void toggleStar(document)}
            />
          ) : isLoading ? (
            <FileCardGridSkeleton />
          ) : (
            <div className="file-card-grid">
              {filtered.map((document) => (
                <FileCard
                  key={document.id}
                  document={document}
                  selected={selectedDocumentId === document.id}
                  onSelect={() => selectDocument(document.id)}
                  onOpen={() => openDocument(document)}
                  onShare={() => setShareDocument(document)}
                  onVersions={() => setVersionDocument(document)}
                  onDownload={() => void downloadDocument(document)}
                  onDelete={() => void removeDocument(document)}
                />
              ))}
            </div>
          )}
        </section>
        {showPreview && (
          <DocumentPreview
            document={selectedDocument}
            onOpen={() => selectedDocument && openDocument(selectedDocument)}
            onShare={() => setShareDocument(selectedDocument)}
            onVersions={() => setVersionDocument(selectedDocument)}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>

      <Drawer
        open={folderDrawerOpen}
        title="Folders"
        placement="left"
        width={320}
        onClose={() => setFolderDrawerOpen(false)}
      >
        {folderPanel}
      </Drawer>
      <Drawer
        open={Boolean(selectedDocument) && previewOpen && !isDesktopPreview}
        title="Document preview"
        width="100%"
        onClose={() => setPreviewOpen(false)}
      >
        <DocumentPreview
          document={selectedDocument}
          onOpen={() => selectedDocument && openDocument(selectedDocument)}
          onShare={() => setShareDocument(selectedDocument)}
          onVersions={() => setVersionDocument(selectedDocument)}
        />
      </Drawer>
      <Modal
        destroyOnHidden
        open={createFolderOpen}
        title="Tạo thư mục mới"
        onCancel={() => setCreateFolderOpen(false)}
        onOk={handleCreateFolder}
        confirmLoading={creatingFolder}
        okText="Tạo thư mục"
        cancelText="Hủy"
      >
        <Input
          placeholder="Nhập tên thư mục..."
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onPressEnter={handleCreateFolder}
          autoFocus
        />
      </Modal>
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
      <Modal
        open={Boolean(renameDocument)}
        title="Rename document"
        okText="Rename"
        onCancel={() => setRenameDocument(undefined)}
        onOk={async () => {
          if (!renameDocument || !renameValue.trim()) return;
          if (
            await patchDocument(
              renameDocument,
              { name: renameValue.trim() },
              "Document renamed",
            )
          ) {
            setRenameDocument(undefined);
          }
        }}
      >
        <Input
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
        />
      </Modal>
      <Modal
        open={Boolean(moveDocument)}
        title="Move document"
        okText="Move"
        onCancel={() => setMoveDocument(undefined)}
        onOk={async () => {
          if (!moveDocument) return;
          if (
            await patchDocument(
              moveDocument,
              { folderId: moveFolderId === "all" ? null : moveFolderId },
              "Document moved",
            )
          ) {
            setMoveDocument(undefined);
          }
        }}
      >
        <Select
          style={{ width: "100%" }}
          value={moveFolderId}
          onChange={setMoveFolderId}
          options={[
            { label: "All files", value: "all" },
            ...folders.map((folder) => ({
              label: folder.name,
              value: folder.id,
            })),
          ]}
        />
      </Modal>
    </PageContainer>
  );
}
