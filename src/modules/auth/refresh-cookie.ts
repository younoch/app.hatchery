import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';
import { REFRESH_COOKIE_PATH } from './auth.constants';

export function refreshCookieOptions(
  configService: ConfigService,
  includeMaxAge = true,
): CookieOptions {
  return {
    httpOnly: true,
    secure: configService.get<boolean>('cookieSecure') ?? false,
    sameSite:
      configService.get<'strict' | 'lax' | 'none'>('cookieSameSite') ?? 'lax',
    path: REFRESH_COOKIE_PATH,
    ...(includeMaxAge
      ? { maxAge: configService.get<number>('refreshTokenTtlMs') }
      : {}),
  };
}
