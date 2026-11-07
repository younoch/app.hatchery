import { Module } from '@nestjs/common';
import { RepositoriesModule } from '@/common/repositories/repositories.module';
import { PermissionsModule } from '@/common/permissions/permissions.module';
import { OrganizationRoleController } from './organization-role.controller';
import { OrganizationRoleService } from './organization-role.service';

@Module({
  imports: [RepositoriesModule, PermissionsModule],
  controllers: [OrganizationRoleController],
  providers: [OrganizationRoleService],
})
export class OrganizationRoleModule {}