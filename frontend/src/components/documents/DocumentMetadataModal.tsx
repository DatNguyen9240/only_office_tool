import { PlusOutlined, TagsOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import type { DocumentItem } from "@share";
import { apiRequest } from "@/lib/api";

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface DocumentMetadataModalProps {
  document?: DocumentItem;
  onClose: () => void;
  onSaved?: () => void;
}

export function DocumentMetadataModal({
  document,
  onClose,
  onSaved,
}: DocumentMetadataModalProps) {
  const { message } = App.useApp();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [metadata, setMetadata] = useState("{}");
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: tags = [], refetch } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiRequest<TagItem[]>("/tags"),
  });

  useEffect(() => {
    setSelectedTags(document?.tags?.map((tag) => tag.id) ?? []);
    setMetadata(JSON.stringify(document?.metadata ?? {}, null, 2));
  }, [document]);

  const save = async () => {
    if (!document) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      message.error("Metadata must be valid JSON");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        apiRequest(`/documents/${document.id}/tags`, {
          method: "PUT",
          body: JSON.stringify({ tagIds: selectedTags }),
        }),
        apiRequest(`/documents/${document.id}/metadata`, {
          method: "PATCH",
          body: JSON.stringify({ metadata: parsed }),
        }),
      ]);
      onSaved?.();
      onClose();
      message.success("Metadata saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(document)}
      title={`Metadata · ${document?.name ?? ""}`}
      onCancel={onClose}
      onOk={() => void save()}
      confirmLoading={saving}
      width={640}
    >
      <Typography.Text strong>Tags</Typography.Text>
      <Select
        mode="multiple"
        value={selectedTags}
        onChange={setSelectedTags}
        style={{ width: "100%", marginTop: 8 }}
        prefix={<TagsOutlined />}
        options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
      />
      <Space.Compact style={{ width: "100%", marginTop: 8 }}>
        <Input
          value={newTag}
          onChange={(event) => setNewTag(event.target.value)}
          placeholder="New tag"
        />
        <Button
          icon={<PlusOutlined />}
          disabled={!newTag.trim()}
          onClick={async () => {
            const created = await apiRequest<TagItem>("/tags", {
              method: "POST",
              body: JSON.stringify({ name: newTag.trim() }),
            });
            setSelectedTags((current) => [...new Set([...current, created.id])]);
            setNewTag("");
            await refetch();
          }}
        >
          Add
        </Button>
      </Space.Compact>
      <Typography.Text strong style={{ display: "block", marginTop: 20 }}>
        Custom metadata (JSON)
      </Typography.Text>
      <Input.TextArea
        value={metadata}
        onChange={(event) => setMetadata(event.target.value)}
        autoSize={{ minRows: 8, maxRows: 18 }}
        spellCheck={false}
        style={{ fontFamily: "ui-monospace, monospace", marginTop: 8 }}
      />
    </Modal>
  );
}
