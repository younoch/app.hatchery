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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { TankService } from './tank.service';
import { ListTanksQueryDto } from './dto/list-tanks-query.dto';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { ApiEnvelope, ApiErrors } from '@/common/swagger/api-envelope';
import { TankResponseDto } from './dto/tank-response.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@ApiTags('Tanks')
@ApiErrors(400, 401, 403, 404, 409, 429)
@Controller('tanks')
export class TankController {
  constructor(private readonly tankService: TankService) {}

  @ApiEnvelope(TankResponseDto, { isArray: true })
  @Get()
  list(@Query() query: ListTanksQueryDto, @CurrentUser() currentUser: JwtUser) {
    return this.tankService.list(currentUser, query.organizationId);
  }

  @RequirePermission('tank:create')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(TankResponseDto, { status: 201 })
  @Post()
  create(@Body() dto: CreateTankDto, @CurrentUser() currentUser: JwtUser) {
    return this.tankService.create(dto, currentUser);
  }

  @RequirePermission('tank:write')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(TankResponseDto)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTankDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.tankService.update(id, dto, currentUser);
  }
}
