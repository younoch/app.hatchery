import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service'; // তোমার actual path বসাও

@Injectable()
export class RoleRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.role.findUnique({ where: { id } });
  }

  async findByName(name: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.role.findUnique({ where: { name } });
  }

  async findAll(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.role.findMany();
  }

  async create(data: Prisma.RoleCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.role.create({ data });
  }

  async update(
    id: string,
    data: Prisma.RoleUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.role.update({ where: { id }, data });
  }
}
