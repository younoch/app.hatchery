import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UserRepository } from './user.repository';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { OrganizationRoleRepository } from './organization-role.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    OrganizationRoleRepository,
  ],
  exports: [
    UserRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    OrganizationRoleRepository,
  ],
})
export class RepositoriesModule {}
