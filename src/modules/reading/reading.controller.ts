import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
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
import { ERRORS_PERMISSION, ERRORS_SESSION } from '@/common/swagger/error-sets';
import { ListReadingsQueryDto } from './dto/list-readings-query.dto';
import { ReadingListResponseDto } from './dto/reading-response.dto';

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

  @ApiEnvelope(ReadingListResponseDto)
  @ApiErrors(...ERRORS_SESSION, 'no_organization', 'validation_failed')
  @Get()
  list(
    @Query() query: ListReadingsQueryDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.readingService.list(query, currentUser);
  }
}
