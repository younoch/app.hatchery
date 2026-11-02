import { UnauthorizedException } from '@nestjs/common';
import { UserService } from '@/modules/user/user.service';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordResetTokenRepository } from '@/common/repositories/password-reset-token.repository';
import { RefreshTokenRepository } from '@/common/repositories/refresh-token.repository';
import { EmailService } from '@/common/email/email.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  it('should be defined', () => {
    expect(AuthService).toBeDefined();
  });

  it('rejects reuse of a refresh token after rotation revokes it', async () => {
    const storedToken = {
      id: 'refresh-token-id',
      userId: 'user-id',
      revoked: false,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const refreshTokenRepository = {
      findByHashedToken: jest.fn().mockResolvedValue(storedToken),
      revoke: jest.fn().mockImplementation(() => {
        storedToken.revoked = true;
      }),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      {
        sign: jest.fn().mockReturnValue('access-token'),
      } as unknown as JwtService,
      {
        getMe: jest.fn().mockResolvedValue({
          id: 'user-id',
          email: 'user@example.com',
        }),
      } as unknown as UserService,
      {} as PasswordResetTokenRepository,
      refreshTokenRepository as unknown as RefreshTokenRepository,
      {} as EmailService,
      {} as ConfigService,
    );

    await expect(service.refresh('old-refresh-token')).resolves.toMatchObject({
      access_token: 'access-token',
    });
    await expect(service.refresh('old-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshTokenRepository.revoke).toHaveBeenCalledTimes(1);
  });
});
