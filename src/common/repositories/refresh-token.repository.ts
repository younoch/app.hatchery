import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
    familyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.refreshToken.create({
      data: { userId, token: hashedToken, expiresAt, familyId },
    });
  }

  findByHashedToken(hashedToken: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { replacedBy: true },
    });
  }

  // Returns 1 if this call revoked the token, 0 if it was already revoked.
  async revokeIfActive(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const result = await client.refreshToken.updateMany({
      where: { id, revoked: false },
      data: { revoked: true },
    });
    return result.count;
  }

  setReplacedBy(id: string, childId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.refreshToken.update({
      where: { id },
      data: { replacedByTokenId: childId },
    });
  }

  // Returns 1 for the first grace use of a revoked token, 0 afterwards.
  async claimGrace(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const result = await client.refreshToken.updateMany({
      where: { id, revoked: true, graceUsedAt: null },
      data: { graceUsedAt: new Date() },
    });
    return result.count;
  }

  revokeFamily(familyId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.refreshToken.updateMany({
      where: { familyId, revoked: false },
      data: { revoked: true },
    });
  }

  revokeAllForUser(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
