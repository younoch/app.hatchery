import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { ReadingService } from './reading.service';
import { SyncReadingsDto } from './dto/sync-readings.dto';
import { ApiEnvelope, ApiErrors } from '@/common/swagger/api-envelope';
import { SyncReadingsResponseDto } from './dto/sync-readings-response.dto';
import { ERRORS_PERMISSION } from '@/common/swagger/error-sets';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@ApiTags('Readings')
@Controller('readings')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @RequirePermission('reading:create')
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(SyncReadingsResponseDto)
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'no_organization',
    'validation_failed',
    'payload_too_large',
  )
  @Post('sync')
  sync(@Body() dto: SyncReadingsDto, @CurrentUser() currentUser: JwtUser) {
    return this.readingService.sync(dto, currentUser);
  }
}
