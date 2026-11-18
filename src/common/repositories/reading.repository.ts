import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { runInTransaction } from '@/common/prisma/run-in-transaction';
import { SyncMarkerRepository } from './sync-marker.repository';

export type ReadingOrder = 'asc' | 'desc';

const READING_WITH_AUTHOR = {
  createdBy: { select: { id: true, username: true, name: true } },
} satisfies Prisma.ReadingInclude;

export type ReadingWithAuthor = Prisma.ReadingGetPayload<{
  include: typeof READING_WITH_AUTHOR;
}>;

const READING_DETAIL = {
  ...READING_WITH_AUTHOR,
  tank: { select: { organizationId: true } },
} satisfies Prisma.ReadingInclude;

export type ReadingDetail = Prisma.ReadingGetPayload<{
  include: typeof READING_DETAIL;
}>;

export type ReadingChanges = Pick<
  Prisma.ReadingUncheckedUpdateManyInput,
  'tankId' | 'recordedAt' | 'ph' | 'temperatureC' | 'salinityPpt' | 'oxygenMgL' | 'note'
>;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncMarkers: SyncMarkerRepository,
  ) {}

  // Includes deleted readings: their ids stay taken.
  findDetail(id: string) {
    return this.prisma.reading.findUnique({
      where: { id },
      include: READING_DETAIL,
    });
  }

  // False when the reading changed or was deleted since `reading` was read.
  correct(params: {
    reading: ReadingDetail;
    expectedUpdatedAt: Date;
    changedById: string;
    changes: ReadingChanges;
  }): Promise<boolean> {
    const { reading, expectedUpdatedAt, changedById, changes } = params;
    return runInTransaction(this.prisma, undefined, async (tx) => {
      const updatedAt = new Date(
        Math.max(Date.now(), reading.updatedAt.getTime() + 1),
      );
      const result = await tx.reading.updateMany({
        where: { id: reading.id, updatedAt: expectedUpdatedAt, deletedAt: null },
        data: { ...changes, updatedAt, updatedById: changedById },
      });
      if (result.count === 0) return false;
      await this.recordRevision(tx, reading, 'correction', changedById);
      await this.syncMarkers.touch(reading.tank.organizationId, 'readings', tx);
      return true;
    });
  }

  // False when somebody else deleted it first.
  softDelete(reading: ReadingDetail, changedById: string): Promise<boolean> {
    return runInTransaction(this.prisma, undefined, async (tx) => {
      const result = await tx.reading.updateMany({
        where: { id: reading.id, deletedAt: null },
        data: { deletedAt: new Date(), deletedById: changedById },
      });
      if (result.count === 0) return false;
      await this.recordRevision(tx, reading, 'delete', changedById);
      await this.syncMarkers.touch(reading.tank.organizationId, 'readings', tx);
      return true;
    });
  }

  private recordRevision(
    tx: Prisma.TransactionClient,
    reading: ReadingDetail,
    kind: 'correction' | 'delete',
    changedById: string,
  ) {
    return tx.readingRevision.create({
      data: {
        readingId: reading.id,
        kind,
        changedById,
        previousUpdatedAt: reading.updatedAt,
        previousTankId: reading.tankId,
        previousRecordedAt: reading.recordedAt,
        previousPh: reading.ph,
        previousTemperatureC: reading.temperatureC,
        previousSalinityPpt: reading.salinityPpt,
        previousOxygenMgL: reading.oxygenMgL,
        previousNote: reading.note,
      },
    });
  }

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
        { createdById: userId, deletedAt: null, ...(tankId ? { tankId } : {}) },
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
          deletedAt: null,
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
        AND r."deletedAt" IS NULL
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
