import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { runInTransaction } from '@/common/prisma/run-in-transaction';
import { SyncMarkerRepository } from '@/common/repositories/sync-marker.repository';

@Injectable()
export class OrganizationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncMarkers: SyncMarkerRepository,
  ) {}

  create(name: string, tx?: Prisma.TransactionClient) {
    return runInTransaction(this.prisma, tx, async (client) => {
      const organization = await client.organization.create({
        data: { name },
      });
      await this.syncMarkers.touch(organization.id, 'organization', client);
      return organization;
    });
  }

  // Serializes concurrent admin transfers of one organization.
  async lockById(id: string, tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Organization" WHERE id = ${id} FOR UPDATE
    `;
    return rows.length > 0;
  }

  findAll(skip: number, take: number) {
    return this.prisma.organization.findMany({
      skip,
      take,
      orderBy: { name: 'asc' },
    });
  }

  count() {
    return this.prisma.organization.count();
  }
}
