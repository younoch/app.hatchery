-- CreateEnum
CREATE TYPE "ReadingRevisionKind" AS ENUM ('correction', 'delete');

-- AlterEnum
ALTER TYPE "SyncResource" ADD VALUE 'readings';

-- AlterTable
ALTER TABLE "Reading" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT;

-- CreateTable
CREATE TABLE "ReadingRevision" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "kind" "ReadingRevisionKind" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousUpdatedAt" TIMESTAMP(3) NOT NULL,
    "previousTankId" TEXT NOT NULL,
    "previousRecordedAt" TIMESTAMP(3) NOT NULL,
    "previousPh" DOUBLE PRECISION NOT NULL,
    "previousTemperatureC" DOUBLE PRECISION NOT NULL,
    "previousSalinityPpt" DOUBLE PRECISION NOT NULL,
    "previousOxygenMgL" DOUBLE PRECISION NOT NULL,
    "previousNote" TEXT,

    CONSTRAINT "ReadingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingRevision_readingId_changedAt_idx" ON "ReadingRevision"("readingId", "changedAt");

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingRevision" ADD CONSTRAINT "ReadingRevision_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingRevision" ADD CONSTRAINT "ReadingRevision_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "Reading" SET "updatedAt" = "syncedAt";
