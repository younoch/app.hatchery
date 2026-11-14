import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { runInTransaction } from '@/common/prisma/run-in-transaction';
import { SyncMarkerRepository } from './sync-marker.repository';

@Injectable()
export class TankRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncMarkers: SyncMarkerRepository,
  ) {}

  findManyByOrganization(organizationId: string) {
    return this.prisma.tank.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  findManyByIds(ids: string[]) {
    return this.prisma.tank.findMany({ where: { id: { in: ids } } });
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.tank.findUnique({ where: { id } });
  }

  findByNameIgnoringCase(
    organizationId: string,
    name: string,
    excludeId?: string,
  ) {
    return this.prisma.tank.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  create(organizationId: string, name: string, tx?: Prisma.TransactionClient) {
    return runInTransaction(this.prisma, tx, async (client) => {
      const tank = await client.tank.create({ data: { organizationId, name } });
      await this.syncMarkers.touch(organizationId, 'tanks', client);
      return tank;
    });
  }

  update(
    id: string,
    data: { name?: string; isActive?: boolean },
    tx?: Prisma.TransactionClient,
  ) {
    return runInTransaction(this.prisma, tx, async (client) => {
      const tank = await client.tank.update({ where: { id }, data });
      await this.syncMarkers.touch(tank.organizationId, 'tanks', client);
      return tank;
    });
  }
}
