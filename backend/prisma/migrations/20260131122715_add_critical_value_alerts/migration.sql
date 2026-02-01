-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "is_critical" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "biologist_phone" TEXT;

-- CreateTable
CREATE TABLE "critical_rules" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "must_contain_all" BOOLEAN NOT NULL DEFAULT true,
    "alert_message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "critical_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "critical_rules_tenant_id_is_active_idx" ON "critical_rules"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "critical_rules" ADD CONSTRAINT "critical_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
