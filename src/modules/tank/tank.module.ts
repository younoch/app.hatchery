import { Module } from '@nestjs/common';
import { RepositoriesModule } from '@/common/repositories/repositories.module';
import { PermissionsModule } from '@/common/permissions/permissions.module';
import { TankController } from './tank.controller';
import { TankService } from './tank.service';

@Module({
  imports: [RepositoriesModule, PermissionsModule],
  controllers: [TankController],
  providers: [TankService],
})
export class TankModule {}