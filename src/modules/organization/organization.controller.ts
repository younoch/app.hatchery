import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtUser } from '@/common/types/jwt-user.type';
import {
  ApiEnvelope,
  ApiErrors,
  ApiPaginatedEnvelope,
} from '@/common/swagger/api-envelope';
import { MessageResponseDto } from '@/common/swagger/message-response.dto';
import { ERRORS_PERMISSION } from '@/common/swagger/error-sets';
import {
  OrganizationCreatedDto,
  OrganizationListItemDto,
} from './dto/organization-response.dto';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { TransferAdminDto } from './dto/transfer-admin.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @RequirePermission('organization:create')
  @ApiEnvelope(OrganizationCreatedDto, { status: 201 })
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'validation_failed',
    'username_taken',
    'email_taken',
  )
  @Post()
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.organizationService.create(dto, currentUser);
  }

  @RequirePermission('organization:read')
  @ApiPaginatedEnvelope(OrganizationListItemDto)
  @ApiErrors(...ERRORS_PERMISSION, 'validation_failed')
  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.organizationService.list(query);
  }

  @RequirePermission('organization:transfer-admin')
  @ApiEnvelope(MessageResponseDto)
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'validation_failed',
    'bad_request',
    'not_found',
    'conflict',
  )
  @Post(':id/transfer-admin')
  @HttpCode(HttpStatus.OK)
  transferAdmin(
    @Param('id') id: string,
    @Body() dto: TransferAdminDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.organizationService.transferAdmin(id, dto, currentUser);
  }
}
