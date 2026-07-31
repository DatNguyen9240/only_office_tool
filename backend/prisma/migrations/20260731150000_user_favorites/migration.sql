CREATE TABLE "DocumentFavorite" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentFavorite_documentId_userId_key"
ON "DocumentFavorite"("documentId", "userId");

CREATE INDEX "DocumentFavorite_userId_createdAt_idx"
ON "DocumentFavorite"("userId", "createdAt");

ALTER TABLE "DocumentFavorite"
ADD CONSTRAINT "DocumentFavorite_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentFavorite"
ADD CONSTRAINT "DocumentFavorite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
