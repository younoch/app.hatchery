import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { Request } from 'express';

const MINUTE = 60_000;
const LOGIN_PATH = '/auth/login';
const REFRESH_PATH = '/auth/refresh';
const MAX_NAME_LENGTH = 64;

export const THROTTLER = {
  USER: 'user',
  IP: 'ip',
  LOGIN_USER: 'login-user',
  LOGIN_IP: 'login-ip',
  REFRESH: 'refresh',
} as const;

export function createThrottlerOptions(
  jwtSecret: string,
): ThrottlerModuleOptions {
  const jwt = new JwtService({ secret: jwtSecret });
  const userIdCache = new WeakMap<object, string | null>();

  // The global throttler runs before controller guards, so req.user does not
  // exist yet: verify the token here and read `sub` ourselves.
  const getUserId = (req: Request): string | null => {
    const cached = userIdCache.get(req);
    if (cached !== undefined) return cached;

    let userId: string | null = null;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify<{ sub?: unknown }>(header.slice(7));
        if (typeof payload.sub === 'string' && payload.sub) {
          userId = payload.sub;
        }
      } catch {
        userId = null;
      }
    }
    userIdCache.set(req, userId);
    return userId;
  };

  const getRequest = (context: ExecutionContext) =>
    context.switchToHttp().getRequest<Request>();
  const isPath = (context: ExecutionContext, path: string) =>
    getRequest(context).path === path;
  const ip = (req: Request) => req.ip ?? 'unknown';

  const getLoginName = (req: Request): string => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const raw = body.username;
    if (typeof raw !== 'string' || !raw.trim()) return ip(req);
    return raw.trim().toLowerCase().slice(0, MAX_NAME_LENGTH);
  };

  // One counter per throttler name and tracker, shared across routes.
  const generateKey = (
    _context: ExecutionContext,
    tracker: string,
    name: string,
  ) => `${name}:${tracker}`;

  return {
    throttlers: [
      {
        name: THROTTLER.USER,
        ttl: MINUTE,
        limit: 120,
        skipIf: (context) => !getUserId(getRequest(context)),
        getTracker: (req) => getUserId(req as Request) ?? ip(req as Request),
        generateKey,
      },
      {
        name: THROTTLER.IP,
        ttl: MINUTE,
        limit: 100,
        skipIf: (context) =>
          !!getUserId(getRequest(context)) ||
          isPath(context, LOGIN_PATH) ||
          isPath(context, REFRESH_PATH),
        getTracker: (req) => ip(req as Request),
        generateKey,
      },
      {
        name: THROTTLER.LOGIN_USER,
        ttl: MINUTE,
        limit: 10,
        skipIf: (context) => !isPath(context, LOGIN_PATH),
        getTracker: (req) => getLoginName(req as Request),
        generateKey,
      },
      {
        name: THROTTLER.LOGIN_IP,
        ttl: MINUTE,
        limit: 120,
        skipIf: (context) => !isPath(context, LOGIN_PATH),
        getTracker: (req) => ip(req as Request),
        generateKey,
      },
      {
        name: THROTTLER.REFRESH,
        ttl: MINUTE,
        limit: 60,
        skipIf: (context) => !isPath(context, REFRESH_PATH),
        getTracker: (req) => ip(req as Request),
        generateKey,
      },
    ],
  };
}
