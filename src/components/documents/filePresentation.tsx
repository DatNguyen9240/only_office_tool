import {
  FileExcelOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import type { DocumentType } from "@/types";

const styles: Record<DocumentType, { background: string; color: string }> = {
  docx: { background: "#eaf1fb", color: "#275dad" },
  xlsx: { background: "#e8f4ee", color: "#2f7d55" },
  pptx: { background: "#fbefe7", color: "#a6531c" },
  pdf: { background: "#faeaea", color: "#b84444" },
  folder: { background: "#fff5d9", color: "#9a6a0a" },
};

export function fileIcon(type: DocumentType, size = 18) {
  const iconProps = { style: { fontSize: size } };
  const icon = {
    docx: <FileTextOutlined {...iconProps} />,
    xlsx: <FileExcelOutlined {...iconProps} />,
    pptx: <FilePptOutlined {...iconProps} />,
    pdf: <FilePdfOutlined {...iconProps} />,
    folder: <FolderOutlined {...iconProps} />,
  }[type];

  return (
    <span className="file-type-icon" style={styles[type]} aria-hidden="true">
      {icon}
    </span>
  );
}

export const fileTypeLabels: Record<DocumentType, string> = {
  docx: "Document",
  xlsx: "Spreadsheet",
  pptx: "Presentation",
  pdf: "PDF",
  folder: "Folder",
};
