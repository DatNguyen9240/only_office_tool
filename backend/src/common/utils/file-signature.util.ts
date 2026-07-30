/**
 * Validates the magic bytes (file signatures) of binary file buffers
 * to prevent file format extension spoofing.
 */
export function validateFileMagicBytes(buffer: Buffer, fileType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  const header = buffer.toString("hex", 0, 4).toUpperCase();
  const type = (fileType || "").toUpperCase();

  // DOCX, XLSX, PPTX, ODT, ODS, ODP are ZIP archives starting with PK\x03\x04 ('504B0304')
  if (["DOCX", "XLSX", "PPTX", "ODT", "ODS", "ODP"].includes(type)) {
    return header.startsWith("504B0304");
  }

  // PDF starts with %PDF ('25504446')
  if (type === "PDF") {
    return header.startsWith("25504446");
  }

  // XLS, DOC, PPT legacy binary formats start with D0CF11E0
  if (["XLS", "DOC", "PPT"].includes(type)) {
    return header.startsWith("D0CF11E0");
  }

  // Default-Deny for unhandled or unsupported binary extensions
  return false;
}
