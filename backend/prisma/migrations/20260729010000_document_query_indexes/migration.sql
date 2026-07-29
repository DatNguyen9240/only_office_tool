CREATE INDEX "Document_deletedAt_folderId_updatedAt_idx"
  ON "Document"("deletedAt", "folderId", "updatedAt");

CREATE INDEX "Document_deletedAt_name_idx"
  ON "Document"("deletedAt", "name");
