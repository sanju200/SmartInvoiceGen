-- CreateTable
CREATE TABLE "generic_excel_uploads" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT,
    "sheetName" TEXT NOT NULL,
    "invoiceDate" TEXT,
    "headers" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generic_excel_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generic_excel_uploads_projectId_idx" ON "generic_excel_uploads"("projectId");

-- AddForeignKey
ALTER TABLE "generic_excel_uploads" ADD CONSTRAINT "generic_excel_uploads_projectId_fkey" FOREIGN KEY("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "isCopy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalProjectId" TEXT;
