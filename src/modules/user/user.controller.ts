import {
  Controller,
  Get,
  Post,
  UseGuards,
  Delete,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { AllowMustChangePassword } from '@/common/decorators/allow-must-change-password.decorator';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @AllowMustChangePassword()
  @Get('me')
  getProfile(@CurrentUser() user: JwtUser) {
    return this.userService.getMe(user.userId);
  }

  @RequirePermission('user:read')
  @UseGuards(PermissionsGuard)
  @Get()
  async listUsers(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.listUsers(query, currentUser);
  }

  @RequirePermission('user:create')
  @UseGuards(PermissionsGuard)
  @Post()
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.createInOrganization(dto, currentUser);
  }

  @RequirePermission('user:delete')
  @UseGuards(PermissionsGuard)
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.deleteUser(id, currentUser.userId);
  }

  @RequirePermission('user:write')
  @UseGuards(PermissionsGuard)
  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.updateUser(id, dto, currentUser);
  }

  @RequirePermission('user:reset-password')
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.resetPassword(id, dto, currentUser);
  }
}
