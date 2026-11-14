import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { ApiEnvelope, ApiErrors } from '@/common/swagger/api-envelope';
import { ERRORS_SESSION } from '@/common/swagger/error-sets';
import { SyncService } from './sync.service';
import { SyncStateResponseDto } from './dto/sync-state-response.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @ApiEnvelope(SyncStateResponseDto)
  @ApiErrors(...ERRORS_SESSION, 'no_organization')
  @Get('state')
  state(@CurrentUser() currentUser: JwtUser) {
    return this.syncService.state(currentUser);
  }
}