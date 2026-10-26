/*
  Warnings:

  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "testColumn" TEXT DEFAULT 'test';

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "phone";
