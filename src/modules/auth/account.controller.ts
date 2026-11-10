import { Body, Controller, Patch, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AllowMustChangePassword } from '@/common/decorators/allow-must-change-password.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { UpdatePasswordDto } from '@/modules/user/dto/update-password.dto';
import { AdminActionLogger } from '@/common/audit/admin-action-logger';
import {
  ApiEnvelope,
  ApiErrors,
  REFRESH_COOKIE_HEADER,
} from '@/common/swagger/api-envelope';
import { PasswordChangedResponseDto } from './dto/auth-response.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { REFRESH_COOKIE_NAME } from './auth.constants';
import { refreshCookieOptions } from './refresh-cookie';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiErrors(400, 401, 403, 429)
@Controller('users')
export class AccountController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly adminActionLogger: AdminActionLogger,
  ) {}

  @AllowMustChangePassword()
  @ApiEnvelope(PasswordChangedResponseDto, { headers: REFRESH_COOKIE_HEADER })
  @Patch('me/password')
  async changePassword(
    @Body() dto: UpdatePasswordDto,
    @CurrentUser() currentUser: JwtUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(
      currentUser.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    this.adminActionLogger.log({
      action: 'user.password_change',
      actorId: currentUser.userId,
      organizationId: currentUser.organizationId,
      targetId: currentUser.userId,
    });
    response.cookie(
      REFRESH_COOKIE_NAME,
      result.refresh_token,
      refreshCookieOptions(this.configService),
    );
    return { message: result.message, access_token: result.access_token };
  }
}
