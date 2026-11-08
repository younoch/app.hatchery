import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UserRepository } from './user.repository';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { OrganizationRoleRepository } from './organization-role.repository';
import { TankRepository } from './tank.repository';
import { ReadingRepository } from './reading.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    OrganizationRoleRepository,
    TankRepository,
    ReadingRepository,
  ],
  exports: [
    UserRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    OrganizationRoleRepository,
    TankRepository,
    ReadingRepository,
  ],
})
export class RepositoriesModule {}
