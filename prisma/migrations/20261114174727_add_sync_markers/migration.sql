-- CreateEnum
CREATE TYPE "SyncResource" AS ENUM ('organization', 'tanks', 'organizationRoles');

-- CreateTable
CREATE TABLE "SyncMarker" (
    "organizationId" TEXT NOT NULL,
    "resource" "SyncResource" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncMarker_pkey" PRIMARY KEY ("organizationId","resource")
);

-- AddForeignKey
ALTER TABLE "SyncMarker" ADD CONSTRAINT "SyncMarker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
