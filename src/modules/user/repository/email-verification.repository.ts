import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, VerificationStatus } from '@prisma/client';

@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    token: string,
    expiresAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.emailVerification.create({
      data: { userId, token, expiresAt, status: VerificationStatus.PENDING },
    });
  }

  updateToken(
    userId: string,
    token: string,
    expiresAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.emailVerification.update({
      where: { userId },
      data: { token, expiresAt, status: VerificationStatus.PENDING },
    });
  }
  findByToken(token: string) {
    return this.prisma.emailVerification.findUnique({
      where: { token },
    });
  }

  markVerified(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.emailVerification.update({
      where: { userId },
      data: { status: VerificationStatus.VERIFIED },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.emailVerification.findUnique({
      where: { userId },
    });
  }
}
