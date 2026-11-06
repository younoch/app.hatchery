import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(name: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.organization.create({ data: { name } });
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
