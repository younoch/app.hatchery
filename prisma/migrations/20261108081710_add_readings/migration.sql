-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "ph" DOUBLE PRECISION NOT NULL,
    "temperatureC" DOUBLE PRECISION NOT NULL,
    "salinityPpt" DOUBLE PRECISION NOT NULL,
    "oxygenMgL" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reading_createdById_tankId_recordedAt_idx" ON "Reading"("createdById", "tankId", "recordedAt");

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
