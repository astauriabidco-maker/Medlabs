-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "license_key" TEXT;
