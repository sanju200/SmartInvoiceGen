-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "lastImportedInvoiceDate" TIMESTAMP(3),
ADD COLUMN     "workPeriod" TEXT;
