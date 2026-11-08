import { Module } from '@nestjs/common';
import { RepositoriesModule } from '@/common/repositories/repositories.module';
import { PermissionsModule } from '@/common/permissions/permissions.module';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';

@Module({
  imports: [RepositoriesModule, PermissionsModule],
  controllers: [ReadingController],
  providers: [ReadingService],
})
export class ReadingModule {}