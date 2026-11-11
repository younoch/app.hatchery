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
    const client = tx ?? this.prisma;
    return client.organizationRole.update({
      where: { id },
      data: { permissions },
      include: { role: { select: { id: true, name: true } } },
    });
  }
}
