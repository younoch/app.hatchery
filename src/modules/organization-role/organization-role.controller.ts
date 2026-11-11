import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { OrganizationRoleService } from './organization-role.service';
import { ListOrganizationRolesQueryDto } from './dto/list-organization-roles-query.dto';
import { UpdateOrganizationRoleDto } from './dto/update-organization-role.dto';
import { ApiEnvelope, ApiErrors } from '@/common/swagger/api-envelope';
import { OrganizationRoleResponseDto } from './dto/organization-role-response.dto';
import {
  ERRORS_PERMISSION,
  ERRORS_SESSION,
  ERRORS_TENANT,
} from '@/common/swagger/error-sets';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@ApiTags('Organization roles')
@Controller('organization-roles')
export class OrganizationRoleController {
  constructor(private readonly service: OrganizationRoleService) {}

  // Any member of the organization may read; no permission key.
  @ApiEnvelope(OrganizationRoleResponseDto, { isArray: true })
  @ApiErrors(...ERRORS_SESSION, ...ERRORS_TENANT, 'validation_failed')
  @Get()
  list(
    @Query() query: ListOrganizationRolesQueryDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.service.list(currentUser, query.organizationId);
  }

  @RequirePermission('organization-role:write')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(OrganizationRoleResponseDto)
  @ApiErrors(...ERRORS_PERMISSION, 'validation_failed', 'not_found')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationRoleDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.service.updatePermissions(id, dto.permissions, currentUser);
  }
}
