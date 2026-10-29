import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UserRepository } from './user.repository';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
  ],
  exports: [
    UserRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
  ],
})
export class RepositoriesModule {}
