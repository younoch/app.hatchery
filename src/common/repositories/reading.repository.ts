import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';


export type ReadingOrder = 'asc' | 'desc';

const READING_WITH_AUTHOR = {
  createdBy: { select: { id: true, username: true, name: true } },
} satisfies Prisma.ReadingInclude;

export type ReadingWithAuthor = Prisma.ReadingGetPayload<{
  include: typeof READING_WITH_AUTHOR;
}>;

interface PageParams {
  from?: Date;
  to?: Date;
  order: ReadingOrder;
  after?: { recordedAt: Date; id: string };
  take: number;
}

// One keyset rule for every list: "after" means later for asc, earlier for desc.
function pageWhere(
  scope: Prisma.ReadingWhereInput,
  { from, to, order, after }: Omit<PageParams, 'take'>,
): Prisma.ReadingWhereInput {
  const beyondDate = (value: Date) =>
    order === 'asc' ? { gt: value } : { lt: value };
  const beyondId = (value: string) =>
    order === 'asc' ? { gt: value } : { lt: value };
  return {
    ...scope,
    ...(from || to
      ? {
          recordedAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
    ...(after
      ? {
          AND: [
            {
              OR: [
                { recordedAt: beyondDate(after.recordedAt) },
                { recordedAt: after.recordedAt, id: beyondId(after.id) },
              ],
            },
          ],
        }
      : {}),
  };
}

@Injectable()
export class ReadingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByIds(ids: string[]) {
    return this.prisma.reading.findMany({ where: { id: { in: ids } } });
  }

  findById(id: string) {
    return this.prisma.reading.findUnique({ where: { id } });
  }

  findPageForUser(
    params: PageParams & { userId: string; tankId?: string },
  ) {
    const { userId, tankId, take, ...page } = params;
    return this.prisma.reading.findMany({
      where: pageWhere(
        { createdById: userId, ...(tankId ? { tankId } : {}) },
        page,
      ),
      include: READING_WITH_AUTHOR,
      orderBy: [{ recordedAt: page.order }, { id: page.order }],
      take,
    });
  }

  findPageForOrganization(
    params: PageParams & {
      organizationId: string;
      tankId?: string;
      userId?: string;
    },
  ) {
    const { organizationId, tankId, userId, take, ...page } = params;
    return this.prisma.reading.findMany({
      where: pageWhere(
        {
          tank: { organizationId },
          ...(tankId ? { tankId } : {}),
          ...(userId ? { createdById: userId } : {}),
        },
        page,
      ),
      include: READING_WITH_AUTHOR,
      orderBy: [{ recordedAt: page.order }, { id: page.order }],
      take,
    });
  }

  // The newest reading of every tank of the organization that has one.
  async findLatestPerTank(organizationId: string) {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT ON (r."tankId") r."id"
      FROM "Reading" r
      JOIN "Tank" t ON t."id" = r."tankId"
      WHERE t."organizationId" = ${organizationId}
      ORDER BY r."tankId", r."recordedAt" DESC, r."id" DESC
    `;
    if (rows.length === 0) return [];
    return this.prisma.reading.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      include: READING_WITH_AUTHOR,
    });
  }

  create(data: {
    id: string;
    tankId: string;
    createdById: string;
    ph: number;
    temperatureC: number;
    salinityPpt: number;
    oxygenMgL: number;
    note: string | null;
    recordedAt: Date;
  }) {
    return this.prisma.reading.create({ data });
  }
}
