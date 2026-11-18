import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { ListOrganizationReadingsQueryDto } from './dto/list-organization-readings-query.dto';
import {
  ReadingLatestResponseDto,
  ReadingListResponseDto,
  ReadingResponseDto,
} from './dto/reading-response.dto';
import { UpdateReadingDto } from './dto/update-reading.dto';
import { MessageResponseDto } from '@/common/swagger/message-response.dto';

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

  
  @RequirePermission('reading:read-all')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(ReadingListResponseDto)
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'no_organization',
    'validation_failed',
    'tank_not_found',
  )
  @Get('organization')
  listOrganization(
    @Query() query: ListOrganizationReadingsQueryDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.readingService.listOrganization(query, currentUser);
  }

  @RequirePermission('reading:read-all')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(ReadingLatestResponseDto)
  @ApiErrors(...ERRORS_PERMISSION, 'no_organization')
  @Get('organization/latest')
  latestPerTank(@CurrentUser() currentUser: JwtUser) {
    return this.readingService.listLatestPerTank(currentUser);
  }

  @ApiEnvelope(ReadingResponseDto)
  @ApiErrors(...ERRORS_SESSION, 'no_organization', 'reading_not_found')
  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() currentUser: JwtUser) {
    return this.readingService.getOne(id, currentUser);
  }

  @RequirePermission('reading:create')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(ReadingResponseDto)
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'no_organization',
    'validation_failed',
    'reading_not_found',
    'not_author',
    'tank_not_found',
    'edit_window_closed',
    'stale_reading',
  )
  @Patch(':id')
  correct(
    @Param('id') id: string,
    @Body() dto: UpdateReadingDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.readingService.correct(id, dto, currentUser);
  }

  @RequirePermission('reading:create')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(MessageResponseDto)
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'no_organization',
    'reading_not_found',
    'not_author',
    'edit_window_closed',
  )
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: JwtUser) {
    return this.readingService.remove(id, currentUser);
  }
}
