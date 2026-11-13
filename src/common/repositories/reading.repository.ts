import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ReadingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByIds(ids: string[]) {
    return this.prisma.reading.findMany({ where: { id: { in: ids } } });
  }

  findById(id: string) {
    return this.prisma.reading.findUnique({ where: { id } });
  }

    findPageForUser(params: {
    userId: string;
    tankId?: string;
    from?: Date;
    to?: Date;
    after?: { recordedAt: Date; id: string };
    take: number;
  }) {
    const { userId, tankId, from, to, after, take } = params;
    const and: Prisma.ReadingWhereInput[] = [];
    if (after) {
      and.push({
        OR: [
          { recordedAt: { lt: after.recordedAt } },
          { recordedAt: after.recordedAt, id: { lt: after.id } },
        ],
      });
    }
    return this.prisma.reading.findMany({
      where: {
        createdById: userId,
        ...(tankId ? { tankId } : {}),
        ...(from || to
          ? {
              recordedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lt: to } : {}),
              },
            }
          : {}),
        AND: and,
      },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take,
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
