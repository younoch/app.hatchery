import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

jest.mock('../src/modules/auth/auth.service', () => ({
  AuthService: class AuthService {},
}));

describe('Auth refresh cookie (e2e)', () => {
  let app: INestApplication;
  const revokedTokens = new Set<string>();
  const authService = {
    login: jest.fn().mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'initial-refresh-token',
    }),
    refresh: jest.fn().mockImplementation((token: string) => {
      if (revokedTokens.has(token)) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      revokedTokens.add(token);
      return {
        access_token: 'rotated-access-token',
        refresh_token: 'rotated-refresh-token',
      };
    }),
    logout: jest.fn().mockImplementation((token: string) => {
      revokedTokens.add(token);
      return { message: 'Logged out successfully' };
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                cookieSecure: false,
                cookieSameSite: 'lax',
                refreshTokenTtlMs: 1209600000,
              })[key],
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets, rotates, revokes, rejects reuse, and clears the refresh cookie', async () => {
    const client = request.agent(app.getHttpServer());

    const login = await client
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password' })
      .expect(201);

    expect(login.body.data).toEqual({ access_token: 'access-token' });
    expect(login.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(login.headers['set-cookie'][0]).toMatch(/Path=\/auth\/refresh/i);
    expect(login.headers['set-cookie'][0]).toMatch(/SameSite=Lax/i);
    expect(login.headers['set-cookie'][0]).toMatch(/Max-Age=1209600/i);

    const refresh = await client.post('/auth/refresh').expect(201);
    expect(authService.refresh).toHaveBeenCalledWith('initial-refresh-token');
    expect(refresh.body.data).toEqual({
      access_token: 'rotated-access-token',
    });
    expect(refresh.headers['set-cookie'][0]).toMatch(/rotated-refresh-token/);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', 'refresh_token=initial-refresh-token')
      .expect(401);

    const logout = await client.post('/auth/refresh/logout').expect(200);
    expect(authService.logout).toHaveBeenCalledWith('rotated-refresh-token');
    expect(logout.headers['set-cookie'][0]).toMatch(/Expires=/i);
    expect(logout.headers['set-cookie'][0]).toMatch(/Path=\/auth\/refresh/i);
  });
});
