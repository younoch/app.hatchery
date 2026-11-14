import { Module } from '@nestjs/common';
import { RepositoriesModule } from '@/common/repositories/repositories.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [RepositoriesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}