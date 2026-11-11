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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { AllowMustChangePassword } from '@/common/decorators/allow-must-change-password.decorator';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ApiAllowedWhileMustChangePassword,
  ApiEnvelope,
  ApiErrors,
  ApiPaginatedEnvelope,
} from '@/common/swagger/api-envelope';
import {
  ERRORS_PERMISSION,
  ERRORS_SESSION_TEMP_PASSWORD_OK,
  ERRORS_TENANT,
} from '@/common/swagger/error-sets';
import { MessageResponseDto } from '@/common/swagger/message-response.dto';
import { MeResponseDto, UserResponseDto } from './dto/user-response.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @AllowMustChangePassword()
  @ApiEnvelope(MeResponseDto)
  @ApiAllowedWhileMustChangePassword()
  @ApiErrors(...ERRORS_SESSION_TEMP_PASSWORD_OK)
  @Get('me')
  getProfile(@CurrentUser() user: JwtUser) {
    return this.userService.getMe(user.userId);
  }

  @RequirePermission('user:read')
  @UseGuards(PermissionsGuard)
  @ApiPaginatedEnvelope(UserResponseDto)
  @ApiErrors(...ERRORS_PERMISSION, ...ERRORS_TENANT, 'validation_failed')
  @Get()
  async listUsers(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.listUsers(query, currentUser);
  }

  @RequirePermission('user:create')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(UserResponseDto, { status: 201 })
  @ApiErrors(
    ...ERRORS_PERMISSION,
    ...ERRORS_TENANT,
    'validation_failed',
    'bad_request',
    'username_taken',
    'email_taken',
  )
  @Post()
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.createInOrganization(dto, currentUser);
  }

  @RequirePermission('user:delete')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(MessageResponseDto)
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'cannot_target_self',
    'not_found',
    'org_admin_protected',
  )
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.deleteUser(id, currentUser.userId);
  }

  @RequirePermission('user:write')
  @UseGuards(PermissionsGuard)
  @ApiEnvelope(UserResponseDto)
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'validation_failed',
    'bad_request',
    'cannot_target_self',
    'org_admin_protected',
    'not_found',
  )
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
  @ApiEnvelope(MessageResponseDto)
  @ApiErrors(
    ...ERRORS_PERMISSION,
    'validation_failed',
    'cannot_target_self',
    'not_found',
  )
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return await this.userService.resetPassword(id, dto, currentUser);
  }
}
