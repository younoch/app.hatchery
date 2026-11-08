import { Module } from '@nestjs/common';
import { RepositoriesModule } from '@/common/repositories/repositories.module';
import { PermissionsModule } from '@/common/permissions/permissions.module';
import { TankController } from './tank.controller';
import { TankService } from './tank.service';
import { AuditModule } from '@/common/audit/audit.module';

@Module({
  imports: [RepositoriesModule, PermissionsModule, AuditModule],
  controllers: [TankController],
  providers: [TankService],
})
export class TankModule {}