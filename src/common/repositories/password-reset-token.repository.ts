import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    token: string,
    expiresAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });
  }

  findByToken(token: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.passwordResetToken.findUnique({ where: { token } });
  }

  markUsed(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }
}