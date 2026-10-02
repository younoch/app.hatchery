import { Module } from '@nestjs/common';
import { UserPermissionResolver } from './user-permission.resolver';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  providers: [UserPermissionResolver],
  exports: [UserPermissionResolver],
})
export class PermissionsModule {}