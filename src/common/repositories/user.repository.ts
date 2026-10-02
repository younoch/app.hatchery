import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Safe default: password কখনো রিটার্ন করবে না
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      omit: { password: true },
    });
  }

  // শুধু AuthService.validateUser() ব্যবহার করবে (bcrypt compare করতে)
  findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByIdForAuth(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findAll(skip: number, take: number) {
    return this.prisma.user.findMany({
      skip,
      take,
      omit: { password: true },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  count() {
    return this.prisma.user.count();
  }

  create(email: string, hashedPassword: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.create({
      data: { email, password: hashedPassword },
      omit: { password: true },
    });
  }
  markEmailVerified(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  updatePassword(userId: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      omit: { password: true },
    });
  }
  updateRole(userId: string, roleId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data: { roleId },
      omit: { password: true },
    });
  }
  async findByIdWithRole(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.emailVerification.deleteMany({ where: { userId: id } });

      return tx.user.delete({
        where: { id },
        omit: { password: true },
      });
    });
  }
}
