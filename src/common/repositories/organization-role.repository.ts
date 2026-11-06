import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class OrganizationRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const client = tx ?? this.prisma;
    return client.organizationRole.createMany({
      data: rows.map((row) => ({
        organizationId,
        roleId: row.roleId,
        permissions: row.permissions,
      })),
    });
  }
}
