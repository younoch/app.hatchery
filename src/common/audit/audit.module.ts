import { Module } from '@nestjs/common';
import { AdminActionLogger } from './admin-action-logger';

@Module({
  providers: [AdminActionLogger],
  exports: [AdminActionLogger],
})
export class AuditModule {}
