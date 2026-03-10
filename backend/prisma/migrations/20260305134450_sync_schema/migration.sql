/*
  Warnings:

  - The values [VIEWER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('SUCCESS', 'ERROR', 'PENDING_INFO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('FREE', 'UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('CAMPAY', 'ORANGE_MONEY', 'MTN_MOMO');

-- CreateEnum
CREATE TYPE "WhatsAppNotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppProvider" AS ENUM ('META', 'TWILIO');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('STARTER', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('LAB_VISIT', 'HOME_SAMPLING');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_SMS_BALANCE', 'INACTIVE_TENANT', 'PAYMENT_OVERDUE', 'STORAGE_WARNING', 'SECURITY_EVENT', 'SYSTEM_ERROR', 'NEW_TENANT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET';
ALTER TYPE "AuditAction" ADD VALUE 'IMPERSONATION_START';
ALTER TYPE "AuditAction" ADD VALUE 'IMPERSONATION_END';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_SHARED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'TENANT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TENANT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TENANT_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'MODULE_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'MODULE_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'API_KEY_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'SAMPLE_DATA_GENERATED';

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'PLATFORM_MANAGER', 'PLATFORM_SUPPORT', 'PLATFORM_SALES', 'PLATFORM_ACCOUNTANT', 'LAB_ADMIN', 'BUSINESS_MANAGER', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'RECEPTIONIST';
COMMIT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "civility" TEXT,
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "prescriber_name" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sample_date" TIMESTAMP(3),
ADD COLUMN     "signature_hash" TEXT,
ADD COLUMN     "signed_at" TIMESTAMP(3),
ADD COLUMN     "signed_by_id" TEXT,
ADD COLUMN     "whatsapp_message_id" TEXT,
ADD COLUMN     "whatsapp_sent_at" TIMESTAMP(3),
ADD COLUMN     "whatsapp_status" "WhatsAppNotificationStatus";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "appointment_duration" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "campay_password" TEXT,
ADD COLUMN     "campay_username" TEXT,
ADD COLUMN     "closing_time" TEXT NOT NULL DEFAULT '15:00',
ADD COLUMN     "hl7_integration_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_home_sampling_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_appointments_per_slot" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "mtn_api_key" TEXT,
ADD COLUMN     "mtn_api_user" TEXT,
ADD COLUMN     "mtn_subscription_key" TEXT,
ADD COLUMN     "mtn_target_env" TEXT,
ADD COLUMN     "opening_time" TEXT NOT NULL DEFAULT '07:00',
ADD COLUMN     "orange_auth_token" TEXT,
ADD COLUMN     "orange_msisdn" TEXT,
ADD COLUMN     "orange_password" TEXT,
ADD COLUMN     "orange_username" TEXT,
ADD COLUMN     "payment_provider" "PaymentProviderType",
ADD COLUMN     "pdf_template_header" TEXT,
ADD COLUMN     "plan" "TenantPlan" NOT NULL DEFAULT 'STARTER',
ADD COLUMN     "prescribers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stats_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twilio_account_sid" TEXT,
ADD COLUMN     "twilio_auth_token" TEXT,
ADD COLUMN     "twilio_whatsapp_number" TEXT,
ADD COLUMN     "whatsapp_access_token" TEXT,
ADD COLUMN     "whatsapp_business_account_id" TEXT,
ADD COLUMN     "whatsapp_phone_number_id" TEXT,
ADD COLUMN     "whatsapp_provider" "WhatsAppProvider" NOT NULL DEFAULT 'META',
ALTER COLUMN "features" SET DEFAULT ARRAY['WHATSAPP_BUSINESS']::TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "custom_role_id" TEXT,
ALTER COLUMN "role" SET DEFAULT 'RECEPTIONIST';

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'STARTER',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "billing_cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "price_per_month" INTEGER NOT NULL DEFAULT 0,
    "trial_ends_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "provider" "PaymentProviderType",
    "external_ref" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_alerts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "provider" TEXT NOT NULL,
    "external_ref" TEXT,
    "phone_number" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "patient_phone" TEXT NOT NULL,
    "patient_email" TEXT,
    "type" "AppointmentType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "reminder_day_before_sent" TIMESTAMP(3),
    "reminder_hours_before_sent" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_slots" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT true,
    "start_time" TEXT,
    "end_time" TEXT,
    "reason" TEXT,

    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointment_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT,
    "changed_by" TEXT,
    "changed_by_name" TEXT,
    "details" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "appointment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL,
    "error_message" TEXT,
    "document_id" TEXT,
    "patient_phone" TEXT,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "button_text" TEXT,
    "button_variant" TEXT NOT NULL DEFAULT 'default',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "includedFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "feature_limits" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "icon" TEXT,
    "is_addon" BOOLEAN NOT NULL DEFAULT false,
    "addon_price" INTEGER,
    "addon_color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_exclusion_keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'role',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_exclusion_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_payments_created_at_idx" ON "subscription_payments"("created_at");

-- CreateIndex
CREATE INDEX "system_alerts_created_at_idx" ON "system_alerts"("created_at");

-- CreateIndex
CREATE INDEX "system_alerts_is_read_is_dismissed_idx" ON "system_alerts"("is_read", "is_dismissed");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "transactions_tenant_id_idx" ON "transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "transactions_document_id_idx" ON "transactions"("document_id");

-- CreateIndex
CREATE INDEX "transactions_external_ref_idx" ON "transactions"("external_ref");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_date_idx" ON "appointments"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_status_idx" ON "appointments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "blocked_slots_tenant_id_date_idx" ON "blocked_slots"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "appointment_history_appointment_id_idx" ON "appointment_history"("appointment_id");

-- CreateIndex
CREATE INDEX "integration_logs_tenant_id_created_at_idx" ON "integration_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_slug_key" ON "pricing_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_features_key_key" ON "pricing_features"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_exclusion_keywords_keyword_key" ON "ocr_exclusion_keywords"("keyword");

-- CreateIndex
CREATE INDEX "users_custom_role_id_idx" ON "users"("custom_role_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_custom_role_id_fkey" FOREIGN KEY ("custom_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_history" ADD CONSTRAINT "appointment_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
