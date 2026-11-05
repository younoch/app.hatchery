import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth } from '@nestjs/swagger';
import { Request, Response, CookieOptions } from 'express';
import { LoginDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailEnabledGuard } from '@/common/guards/email-enabled.guard';
import { REFRESH_COOKIE_NAME } from './auth.constants';
import { refreshCookieOptions } from './refresh-cookie';
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.login(dto.username, dto.password);
    response.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refresh_token,
      this.refreshCookieOptions(),
    );
    return { access_token: tokens.access_token };
  }
  @UseGuards(EmailEnabledGuard)
  @Get('verify-email')
  verifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.verifyEmail(query.token);
  }

  @UseGuards(EmailEnabledGuard)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @UseGuards(EmailEnabledGuard)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh-cookie')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = (
      request.cookies as unknown as Record<string, unknown> | undefined
    )?.[REFRESH_COOKIE_NAME];
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.authService.refresh(refreshToken);
    response.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refresh_token,
      this.refreshCookieOptions(),
    );
    return { access_token: tokens.access_token };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh-cookie')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = (
      request.cookies as unknown as Record<string, unknown> | undefined
    )?.[REFRESH_COOKIE_NAME];
    const result =
      typeof refreshToken === 'string' && refreshToken
        ? await this.authService.logout(refreshToken)
        : { message: 'Logged out successfully' };

    response.clearCookie(REFRESH_COOKIE_NAME, this.refreshCookieOptions(false));
    return result;
  }

  @Post('refresh/logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh-cookie')
  logoutFromRefreshRoute(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.logout(request, response);
  }

  private refreshCookieOptions(includeMaxAge = true): CookieOptions {
    return refreshCookieOptions(this.configService, includeMaxAge);
  }
}
