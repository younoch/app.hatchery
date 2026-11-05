import { Body, Controller, Patch, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AllowMustChangePassword } from '@/common/decorators/allow-must-change-password.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { UpdatePasswordDto } from '@/modules/user/dto/update-password.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { REFRESH_COOKIE_NAME } from './auth.constants';
import { refreshCookieOptions } from './refresh-cookie';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class AccountController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @AllowMustChangePassword()
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
    response.cookie(
      REFRESH_COOKIE_NAME,
      result.refresh_token,
      refreshCookieOptions(this.configService),
    );
    return { message: result.message, access_token: result.access_token };
  }
}
