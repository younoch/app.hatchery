import { Injectable } from '@nestjs/common';
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
