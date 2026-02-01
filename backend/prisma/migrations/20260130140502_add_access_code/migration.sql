-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "access_code" TEXT;

-- CreateTable
CREATE TABLE "partner_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "laboratory_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "estimated_volume" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "partner_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_access_code_idx" ON "documents"("access_code");
