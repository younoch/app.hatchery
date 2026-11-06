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
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { TransferAdminDto } from './dto/transfer-admin.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @RequirePermission('organization:create')
  @Post()
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationService.create(dto);
  }

  @RequirePermission('organization:read')
  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.organizationService.list(query);
  }

  @RequirePermission('organization:transfer-admin')
  @Post(':id/transfer-admin')
  @HttpCode(HttpStatus.OK)
  transferAdmin(@Param('id') id: string, @Body() dto: TransferAdminDto) {
    return this.organizationService.transferAdmin(id, dto);
  }
}
