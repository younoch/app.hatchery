import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { TankService } from './tank.service';
import { ListTanksQueryDto } from './dto/list-tanks-query.dto';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tanks')
export class TankController {
  constructor(private readonly tankService: TankService) {}

  @Get()
  list(
    @Query() query: ListTanksQueryDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.tankService.list(currentUser, query.organizationId);
  }

  @RequirePermission('tank:create')
  @UseGuards(PermissionsGuard)
  @Post()
  create(@Body() dto: CreateTankDto, @CurrentUser() currentUser: JwtUser) {
    return this.tankService.create(dto, currentUser);
  }

  @RequirePermission('tank:write')
  @UseGuards(PermissionsGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTankDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.tankService.update(id, dto, currentUser);
  }
}