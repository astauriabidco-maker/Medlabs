ALTER TABLE "documents"
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "purge_requested_at" TIMESTAMP(3),
ADD COLUMN "purged_at" TIMESTAMP(3);

CREATE INDEX "documents_deleted_at_idx" ON "documents"("deleted_at");
CREATE INDEX "documents_purge_requested_at_purged_at_idx" ON "documents"("purge_requested_at", "purged_at");
