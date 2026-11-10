import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { ApiEnvelope, ApiErrors } from '@/common/swagger/api-envelope';
import { RoleResponseDto } from './dto/role-response.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@ApiTags('Roles')
@ApiErrors(400, 401, 403, 404, 409, 429)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiEnvelope(RoleResponseDto, { isArray: true })
  @Get()
  @RequirePermission('role:read')
  @UseGuards(PermissionsGuard)
  findAll() {
    return this.roleService.findAll();
  }

  @ApiEnvelope(RoleResponseDto, { status: 201 })
  @Post()
  @RequirePermission('role:create')
  @UseGuards(PermissionsGuard)
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @ApiEnvelope(RoleResponseDto)
  @Patch(':id')
  @RequirePermission('role:write')
  @UseGuards(PermissionsGuard)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }
}
