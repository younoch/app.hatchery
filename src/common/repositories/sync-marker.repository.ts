import { Injectable } from '@nestjs/common';
import { Prisma, SyncResource } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SyncMarkerRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Moves the marker forward with the database clock, strictly: two writes in
  // the same millisecond still give two different values. Call it inside the
  // transaction of the write it belongs to.
  touch(
    organizationId: string,
    resource: SyncResource,
    tx: Prisma.TransactionClient,
  ) {
    return tx.$executeRaw`
      INSERT INTO "SyncMarker" ("organizationId", "resource", "changedAt")
      VALUES (${organizationId}, ${resource}::"SyncResource", clock_timestamp() AT TIME ZONE 'UTC')
      ON CONFLICT ("organizationId", "resource") DO UPDATE
      SET "changedAt" = GREATEST(
        clock_timestamp() AT TIME ZONE 'UTC',
        "SyncMarker"."changedAt" + interval '1 millisecond'
      )
    `;
  }

  findByOrganization(organizationId: string) {
    return this.prisma.syncMarker.findMany({ where: { organizationId } });
  }
}