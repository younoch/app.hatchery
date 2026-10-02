import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { REFRESH_TOKEN_TTL_MS } from './auth.constants';

jest.mock('./auth.service', () => ({
  AuthService: class AuthService {},
}));

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn().mockResolvedValue({
              access_token: 'access-token',
              refresh_token: 'refresh-token',
            }),
            refresh: jest.fn().mockResolvedValue({
              access_token: 'new-access-token',
              refresh_token: 'new-refresh-token',
            }),
            logout: jest.fn().mockResolvedValue({
              message: 'Logged out successfully',
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'cookieSecure' ? false : 'strict'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sets the refresh token as a cookie and returns only the access token on login', async () => {
    const setCookie = jest.fn();
    const response = { cookie: setCookie } as unknown as Response;

    const result = await controller.login(
      { email: 'user@example.com', password: 'password' },
      response,
    );

    expect(setCookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/auth',
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
    expect(result).toEqual({ access_token: 'access-token' });
  });

  it('rotates the refresh cookie from the request cookie and returns only the access token', async () => {
    const request = {
      cookies: { refresh_token: 'refresh-token' },
    } as unknown as Request;
    const setCookie = jest.fn();
    const response = { cookie: setCookie } as unknown as Response;

    const result = await controller.refresh(request, response);

    expect(setCookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/auth' }),
    );
    expect(result).toEqual({ access_token: 'new-access-token' });
  });

  it('rejects refresh requests without a refresh cookie', async () => {
    const request = { cookies: {} } as unknown as Request;
    const response = { cookie: jest.fn() } as unknown as Response;

    await expect(controller.refresh(request, response)).rejects.toThrow(
      'Invalid or expired refresh token',
    );
  });

  it('revokes the refresh cookie token and clears the cookie on logout', async () => {
    const request = {
      cookies: { refresh_token: 'refresh-token' },
    } as unknown as Request;
    const clearCookie = jest.fn();
    const response = { clearCookie } as unknown as Response;

    await controller.logout(request, response);

    expect(clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ httpOnly: true, path: '/auth' }),
    );
  });
});
