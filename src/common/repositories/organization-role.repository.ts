import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { runInTransaction } from '@/common/prisma/run-in-transaction';
import { SyncMarkerRepository } from './sync-marker.repository';

@Injectable()
export class OrganizationRoleRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncMarkers: SyncMarkerRepository,
  ) {}

  findByOrganizationAndRole(
    organizationId: string,
    roleId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.organizationRole.findUnique({
      where: { organizationId_roleId: { organizationId, roleId } },
    });
  }

  createMany(
    organizationId: string,
    rows: { roleId: string; permissions: string[] }[],
    tx?: Prisma.TransactionClient,
  ) {
    return runInTransaction(this.prisma, tx, async (client) => {
      const result = await client.organizationRole.createMany({
        data: rows.map((row) => ({
          organizationId,
          roleId: row.roleId,
          permissions: row.permissions,
        })),
      });
      await this.syncMarkers.touch(organizationId, 'organizationRoles', client);
      return result;
    });
  }

  findManyByOrganization(organizationId: string) {
    return this.prisma.organizationRole.findMany({
      where: { organizationId },
      include: { role: { select: { id: true, name: true } } },
      orderBy: { role: { name: 'asc' } },
    });
  }

  findByIdWithRole(id: string) {
    return this.prisma.organizationRole.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true } } },
    });
  }

  updatePermissions(
    id: string,
    permissions: string[],
    tx?: Prisma.TransactionClient,
  ) {
    return runInTransaction(this.prisma, tx, async (client) => {
      const row = await client.organizationRole.update({
        where: { id },
        data: { permissions },
        include: { role: { select: { id: true, name: true } } },
      });
      await this.syncMarkers.touch(row.organizationId, 'organizationRoles', client);
      return row;
    });
  }
}
