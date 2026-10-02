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
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth } from '@nestjs/swagger';
import { Request, Response, CookieOptions } from 'express';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { REFRESH_TOKEN_TTL_MS } from './auth.constants';
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Post('register-async')
  @HttpCode(HttpStatus.ACCEPTED)
  registerAsync(@Body() dto: RegisterDto) {
    return this.authService.registerAsync(dto.email, dto.password);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.login(dto.email, dto.password);
    response.cookie(
      'refresh_token',
      tokens.refresh_token,
      this.refreshCookieOptions(),
    );
    return { access_token: tokens.access_token };
  }
  @Get('verify-email')
  verifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.verifyEmail(query.token);
  }
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('refresh')
  @ApiCookieAuth('refresh-cookie')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = (
      request.cookies as unknown as Record<string, unknown> | undefined
    )?.refresh_token;
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.authService.refresh(refreshToken);
    response.cookie(
      'refresh_token',
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
    )?.refresh_token;
    const result =
      typeof refreshToken === 'string' && refreshToken
        ? await this.authService.logout(refreshToken)
        : { message: 'Logged out successfully' };

    response.clearCookie('refresh_token', this.refreshCookieOptions(false));
    return result;
  }

  private refreshCookieOptions(includeMaxAge = true): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('cookieSecure') ?? false,
      sameSite:
        this.configService.get<'strict' | 'lax' | 'none'>('cookieSameSite') ??
        'strict',
      path: '/auth',
      ...(includeMaxAge ? { maxAge: REFRESH_TOKEN_TTL_MS } : {}),
    };
  }
}
