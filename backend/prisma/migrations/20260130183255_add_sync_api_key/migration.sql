/*
  Warnings:

  - A unique constraint covering the columns `[sync_api_key]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "sync_api_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_sync_api_key_key" ON "tenants"("sync_api_key");
