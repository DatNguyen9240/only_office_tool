CREATE UNIQUE INDEX "Document_currentVersionId_key"
ON "Document"("currentVersionId");

ALTER TABLE "Document"
ADD CONSTRAINT "Document_currentVersionId_fkey"
FOREIGN KEY ("currentVersionId")
REFERENCES "DocumentVersion"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
