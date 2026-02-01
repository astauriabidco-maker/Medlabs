-- CreateTable
CREATE TABLE "patient_sessions" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_sessions_phone_number_tenant_id_idx" ON "patient_sessions"("phone_number", "tenant_id");

-- CreateIndex
CREATE INDEX "documents_patient_phone_idx" ON "documents"("patient_phone");
