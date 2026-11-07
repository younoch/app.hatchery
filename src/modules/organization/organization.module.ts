import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RepositoriesModule } from '@/common/repositories/repositories.module';
import { PermissionsModule } from '@/common/permissions/permissions.module';
import { RoleModule } from '../role/role.module';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './repository/organization.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PrismaModule,
    RepositoriesModule,
    PermissionsModule,
    RoleModule,
    UserModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository],
})
export class OrganizationModule {}
