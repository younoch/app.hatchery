import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UserRepository } from './user.repository';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { OrganizationRoleRepository } from './organization-role.repository';
import { TankRepository } from './tank.repository';
import { ReadingRepository } from './reading.repository';
import { SyncMarkerRepository } from './sync-marker.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    OrganizationRoleRepository,
    TankRepository,
    ReadingRepository,
    SyncMarkerRepository,
  ],
  exports: [
    UserRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    OrganizationRoleRepository,
    TankRepository,
    ReadingRepository,
    SyncMarkerRepository,
  ],
})
export class RepositoriesModule {}
