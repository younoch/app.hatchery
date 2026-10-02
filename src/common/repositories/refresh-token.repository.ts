import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, hashedToken: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { userId, token: hashedToken, expiresAt },
    });
  }

  findByHashedToken(hashedToken: string) {
    return this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
    });
  }

  revoke(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });
  }

  revokeAllForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }
}