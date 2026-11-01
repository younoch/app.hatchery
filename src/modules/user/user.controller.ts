import {
  Controller,
  Get,
  UseGuards,
  Delete,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { UserService } from './user.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { AllowMustChangePassword } from '@/common/decorators/allow-must-change-password.decorator';

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
  async listUsers(@Query() query: PaginationQueryDto) {
    return await this.userService.listUsers(query);
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
  @Patch(':id/role')
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.assignRole(
      id,
      dto.roleId,
      currentUser.userId,
    );
  }

  @AllowMustChangePassword()
  @Patch('me/password')
  async updatePassword(
    @Body() dto: UpdatePasswordDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.updatePassword(
      currentUser.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
