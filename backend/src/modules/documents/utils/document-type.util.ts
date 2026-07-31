export type OnlyOfficeDocumentType = "word" | "cell" | "slide";

/**
 * Classifies a document filename into ONLYOFFICE editor document types: 'word' | 'cell' | 'slide'.
 */
export function getDocumentType(filename: string): OnlyOfficeDocumentType {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["xlsx", "xls", "csv", "ods"].includes(ext)) return "cell";
  if (["pptx", "ppt", "odp"].includes(ext)) return "slide";
  return "word";
}
