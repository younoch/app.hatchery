import { Module } from '@nestjs/common';
import { RoleRepository } from './repository/role.repository';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { PermissionsModule } from '@/common/permissions/permissions.module';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
  exports: [RoleRepository],
})
export class RoleModule {}