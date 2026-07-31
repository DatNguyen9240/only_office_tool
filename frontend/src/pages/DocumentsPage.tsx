import {
  AppstoreOutlined,
  BarsOutlined,
  DownOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilterOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  ShareAltOutlined,
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
  Space,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { FolderPermissionModal } from "@/components/documents/FolderPermissionModal";
import { DocumentMetadataModal } from "@/components/documents/DocumentMetadataModal";
import { FileCardGridSkeleton } from "@/components/common/LoadingSkeletons";
import { FileCard } from "@/components/documents/FileCard";
import { FileTable } from "@/components/documents/FileTable";
import { FolderTree } from "@/components/documents/FolderTree";
import { SearchBar } from "@/components/documents/SearchBar";
import { SharePermissionModal } from "@/components/documents/SharePermissionModal";
import { UploadModal } from "@/components/documents/UploadModal";
import { VersionHistoryDrawer } from "@/components/documents/VersionHistoryDrawer";
import { useDocuments } from "@/hooks/useDocuments";
import { useFolders, type FolderItem } from "@/hooks/useFolders";
import { translateApiError, useI18n } from "@/i18n";
import { apiRequest, isApiConfigured } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { DocumentItem } from "@share";

interface DocumentsPageProps {
  scope?: "all" | "shared" | "recent" | "favorites";
}

export function DocumentsPage({ scope = "all" }: DocumentsPageProps) {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDirectory, setUploadDirectory] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem>();
  const [movingFolder, setMovingFolder] = useState<FolderItem>();
  const [moveParentId, setMoveParentId] = useState("root");
  const [shareDocument, setShareDocument] = useState<DocumentItem>();
  const [versionDocument, setVersionDocument] = useState<DocumentItem>();
  const [metadataDocument, setMetadataDocument] = useState<DocumentItem>();
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [shareFolder, setShareFolder] = useState<FolderItem>();
  const [typeFilter, setTypeFilter] = useState("all");
  const [renameDocument, setRenameDocument] = useState<DocumentItem>();
  const [renameValue, setRenameValue] = useState("");
  const [moveDocument, setMoveDocument] = useState<DocumentItem>();
  const [moveFolderId, setMoveFolderId] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMoveOpen, setBatchMoveOpen] = useState(false);
  const [batchShareOpen, setBatchShareOpen] = useState(false);
  const [batchTargetFolder, setBatchTargetFolder] = useState("all");
  const [batchShareEmail, setBatchShareEmail] = useState("");
  const [batchShareRole, setBatchShareRole] = useState("VIEWER");
  const { data = [], isLoading } = useDocuments(scope);
  const { data: folders = [] } = useFolders();

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      if (editingFolder) {
        await apiRequest(`/folders/${editingFolder.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: newFolderName.trim() }),
        });
        await queryClient.invalidateQueries({ queryKey: ["folders"] });
        message.success("Folder renamed");
      } else if (isApiConfigured) {
        await apiRequest("/folders", {
          method: "POST",
          body: JSON.stringify({
            name: newFolderName.trim(),
            parentId: selectedFolderId !== "all" ? selectedFolderId : undefined,
          }),
        });
        await queryClient.invalidateQueries({ queryKey: ["folders"] });
        message.success(`Đã tạo thư mục "${newFolderName}"`);
      }
      setNewFolderName("");
      setCreateFolderOpen(false);
      setEditingFolder(undefined);
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

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    if (scope === "all") {
      setSelectedFolderId(searchParams.get("folderId") ?? "all");
    }
    const documentId = searchParams.get("documentId");
    if (documentId) {
      selectDocument(documentId);
      setPreviewOpen(true);
    }
  }, [
    scope,
    searchParams,
    selectDocument,
    setPreviewOpen,
    setSelectedFolderId,
  ]);

  const deleteFolder = async (folder: FolderItem) => {
    try {
      await apiRequest(`/folders/${folder.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      if (selectedFolderId === folder.id) setSelectedFolderId("all");
      message.success("Folder deleted");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Folder deletion failed";
      message.error(translateApiError(text, locale));
    }
  };

  const moveFolder = async () => {
    if (!movingFolder) return;
    try {
      await apiRequest(`/folders/${movingFolder.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          parentId: moveParentId === "root" ? null : moveParentId,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      message.success("Folder moved");
      setMovingFolder(undefined);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Folder move failed";
      message.error(translateApiError(text, locale));
    }
  };

  const filtered = useMemo(
    () =>
      data.filter((document) => {
        const folderMatch =
          scope !== "all" || selectedFolderId === "all"
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
  const title =
    scope === "shared"
      ? "Shared with me"
      : scope === "recent"
        ? "Recent"
        : scope === "favorites"
          ? "Favorites"
          : "Documents";
  const collectionHeading =
    scope === "shared"
      ? "All shared documents"
      : scope === "recent"
        ? "Recent documents"
        : scope === "favorites"
          ? "Starred documents"
          : folders.find((folder) => folder.id === selectedFolderId)?.name;
  const subtitle =
    scope === "shared"
      ? "Documents shared directly with you or your teams."
      : scope === "recent"
        ? "Documents you have opened or changed most recently."
        : scope === "favorites"
          ? "Documents you have starred for quick access."
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

  const selectedDocuments = data.filter((document) =>
    selectedIds.includes(document.id),
  );

  const batchDelete = async () => {
    await Promise.all(
      selectedDocuments.map((document) =>
        apiRequest(`/documents/${document.id}`, { method: "DELETE" }),
      ),
    );
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    setSelectedIds([]);
    message.success(`${selectedDocuments.length} documents moved to trash`);
  };

  const batchDownload = async () => {
    const downloads = await Promise.all(
      selectedDocuments.map((document) =>
        apiRequest<{ url: string }>(`/documents/${document.id}/download-url`),
      ),
    );
    downloads.forEach(({ url }) => window.open(url, "_blank", "noopener,noreferrer"));
  };

  const batchMove = async () => {
    await Promise.all(
      selectedDocuments.map((document) =>
        apiRequest(`/documents/${document.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            folderId: batchTargetFolder === "all" ? null : batchTargetFolder,
          }),
        }),
      ),
    );
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    setBatchMoveOpen(false);
    setSelectedIds([]);
    message.success("Documents moved");
  };

  const batchShare = async () => {
    if (!batchShareEmail.trim()) return;
    await Promise.all(
      selectedDocuments.map((document) =>
        apiRequest(`/documents/${document.id}/permissions`, {
          method: "POST",
          body: JSON.stringify({
            email: batchShareEmail.trim(),
            role: batchShareRole,
          }),
        }),
      ),
    );
    setBatchShareOpen(false);
    setBatchShareEmail("");
    setSelectedIds([]);
    message.success("Access granted");
  };

  const folderPanel = (
    <FolderTree
      selectedId={selectedFolderId}
      onSelect={(id) => {
        setSelectedFolderId(id);
        setFolderDrawerOpen(false);
      }}
      onRename={(folder) => {
        setEditingFolder(folder);
        setNewFolderName(folder.name);
      }}
      onMove={(folder) => {
        setMovingFolder(folder);
        setMoveParentId(folder.parentId ?? "root");
      }}
      onShare={setShareFolder}
      onDelete={(folder) => {
        modal.confirm({
          title: `Delete ${folder.name}?`,
          content: "The folder must be empty before it can be deleted.",
          okText: "Delete folder",
          okButtonProps: { danger: true },
          onOk: () => deleteFolder(folder),
        });
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
              {
                key: "files",
                label: "Upload files",
                icon: <UploadOutlined />,
                onClick: () => {
                  setUploadDirectory(false);
                  setUploadOpen(true);
                },
              },
              {
                key: "folder",
                label: "Upload folder",
                icon: <FolderOutlined />,
                onClick: () => {
                  setUploadDirectory(true);
                  setUploadOpen(true);
                },
              },
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
        {scope === "all" && !screens.lg && (
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
                {collectionHeading}
              </Typography.Text>
              <Typography.Text type="secondary">{filtered.length} items</Typography.Text>
            </div>
            {!isDesktopPreview && selectedDocument && (
              <Button onClick={() => setPreviewOpen(true)}>Preview</Button>
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="document-selection-bar">
              <Typography.Text strong>{selectedIds.length} selected</Typography.Text>
              <Space wrap>
                <Button
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={() => setBatchMoveOpen(true)}
                >
                  Move
                </Button>
                <Button
                  size="small"
                  icon={<ShareAltOutlined />}
                  onClick={() => setBatchShareOpen(true)}
                >
                  Share
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => void batchDownload()}
                >
                  Download
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    modal.confirm({
                      title: `Move ${selectedIds.length} documents to trash?`,
                      onOk: batchDelete,
                    })
                  }
                >
                  Delete
                </Button>
                <Button type="text" size="small" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </Space>
            </div>
          )}
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
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
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
                  onRename={() => {
                    setRenameDocument(document);
                    setRenameValue(document.name);
                  }}
                  onMove={() => {
                    setMoveDocument(document);
                    setMoveFolderId(document.folderId);
                  }}
                  onStar={() => void toggleStar(document)}
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
            onMetadata={() => setMetadataDocument(selectedDocument)}
            onDownload={() =>
              selectedDocument && void downloadDocument(selectedDocument)
            }
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
          onMetadata={() => setMetadataDocument(selectedDocument)}
          onDownload={() =>
            selectedDocument && void downloadDocument(selectedDocument)
          }
        />
      </Drawer>
      <Modal
        destroyOnHidden
        open={createFolderOpen || Boolean(editingFolder)}
        title={editingFolder ? "Rename folder" : "Tạo thư mục mới"}
        onCancel={() => {
          setCreateFolderOpen(false);
          setEditingFolder(undefined);
          setNewFolderName("");
        }}
        onOk={handleCreateFolder}
        confirmLoading={creatingFolder}
        okText={editingFolder ? "Rename" : "Tạo thư mục"}
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
      <Modal
        open={Boolean(movingFolder)}
        title={`Move ${movingFolder?.name ?? "folder"}`}
        okText="Move"
        onCancel={() => setMovingFolder(undefined)}
        onOk={() => void moveFolder()}
      >
        <Select
          style={{ width: "100%" }}
          value={moveParentId}
          onChange={setMoveParentId}
          options={[
            { label: "Root", value: "root" },
            ...folders
              .filter((folder) => folder.id !== movingFolder?.id)
              .map((folder) => ({ label: folder.name, value: folder.id })),
          ]}
        />
      </Modal>
      <UploadModal
        open={uploadOpen}
        directory={uploadDirectory}
        onClose={() => {
          setUploadOpen(false);
          setUploadDirectory(false);
        }}
      />
      <SharePermissionModal
        open={Boolean(shareDocument)}
        document={shareDocument}
        onClose={() => setShareDocument(undefined)}
      />
      <FolderPermissionModal
        folder={shareFolder}
        onClose={() => setShareFolder(undefined)}
      />
      <VersionHistoryDrawer
        open={Boolean(versionDocument)}
        document={versionDocument}
        onClose={() => setVersionDocument(undefined)}
      />
      <DocumentMetadataModal
        document={metadataDocument}
        onClose={() => setMetadataDocument(undefined)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["documents"] });
        }}
      />
      <Modal
        open={batchMoveOpen}
        title={`Move ${selectedIds.length} documents`}
        okText="Move"
        onCancel={() => setBatchMoveOpen(false)}
        onOk={() => void batchMove()}
      >
        <Select
          style={{ width: "100%" }}
          value={batchTargetFolder}
          onChange={setBatchTargetFolder}
          options={[
            { label: "All files", value: "all" },
            ...folders.map((folder) => ({
              label: folder.name,
              value: folder.id,
            })),
          ]}
        />
      </Modal>
      <Modal
        open={batchShareOpen}
        title={`Share ${selectedIds.length} documents`}
        okText="Share"
        onCancel={() => setBatchShareOpen(false)}
        onOk={() => void batchShare()}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Input
            type="email"
            value={batchShareEmail}
            placeholder="name@company.com"
            onChange={(event) => setBatchShareEmail(event.target.value)}
          />
          <Select
            style={{ width: "100%" }}
            value={batchShareRole}
            onChange={setBatchShareRole}
            options={[
              { label: "Viewer", value: "VIEWER" },
              { label: "Commenter", value: "COMMENTER" },
              { label: "Editor", value: "EDITOR" },
            ]}
          />
        </Space>
      </Modal>
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
