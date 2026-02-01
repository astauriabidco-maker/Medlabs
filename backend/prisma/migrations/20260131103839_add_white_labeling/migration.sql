-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('AVAILABLE', 'USED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "brand_color" TEXT,
ADD COLUMN     "brand_logo_url" TEXT,
ADD COLUMN     "is_auto_sync_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'AVAILABLE',
    "generated_by" TEXT NOT NULL,
    "used_by_tenant_id" TEXT,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licenses_code_key" ON "licenses"("code");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_used_by_tenant_id_fkey" FOREIGN KEY ("used_by_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
