import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailVerificationRepository } from './repository/email-verification.repository';
import { RoleModule } from '../role/role.module';
import { PermissionsModule } from '@/common/permissions/permissions.module';
import { RepositoriesModule } from '@/common/repositories/repositories.module';
import { AuditModule } from '@/common/audit/audit.module';

@Module({
  imports: [PrismaModule, RoleModule, RepositoriesModule, PermissionsModule, AuditModule],
  providers: [UserService, EmailVerificationRepository],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
