/**
 * Standard MIME types mapped by uppercase file extensions.
 */
export const DOCUMENT_MIME_TYPES: Record<string, string> = {
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  PDF: "application/pdf",
  ODT: "application/vnd.oasis.opendocument.text",
  ODS: "application/vnd.oasis.opendocument.spreadsheet",
  ODP: "application/vnd.oasis.opendocument.presentation",
} as const;
