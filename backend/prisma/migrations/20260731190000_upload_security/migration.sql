CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED');

ALTER TABLE "DocumentVersion"
ADD COLUMN "scanStatus" "ScanStatus" NOT NULL DEFAULT 'CLEAN',
ADD COLUMN "scanMessage" TEXT,
ADD COLUMN "scannedAt" TIMESTAMP(3);

CREATE TABLE "UploadIntent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "expectedSizeBytes" BIGINT NOT NULL,
    "contentType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadIntent_objectKey_key" ON "UploadIntent"("objectKey");
CREATE INDEX "UploadIntent_expiresAt_completedAt_idx" ON "UploadIntent"("expiresAt", "completedAt");
CREATE INDEX "UploadIntent_documentId_idx" ON "UploadIntent"("documentId");
ALTER TABLE "UploadIntent" ADD CONSTRAINT "UploadIntent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
