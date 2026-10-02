<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A reusable NestJS backend boilerplate — auth, background jobs, email verification, and production-grade infra patterns, built for reuse across future projects.</p>

## Description

A learning-driven, production-minded NestJS boilerplate. Started as a domain-specific backend and repositioned into a reusable foundation for future projects (e.g. a multi-vendor/multi-tenant SaaS). Every module is built with explicit imports (no `@Global()`), type-safe env validation, and a repository-pattern data layer.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | NestJS |
| Database / ORM | PostgreSQL + Prisma |
| Env validation | Zod (fail-fast on missing secrets, defaults for infra config) |
| Logging | pino |
| Auth | JWT (`@nestjs/passport`, `passport-jwt`) + bcrypt |
| Rate limiting | `@nestjs/throttler` |
| Background jobs | BullMQ + Redis |
| Email (dev) | Mailpit (local SMTP catcher) + nodemailer |
| Queue dashboard | `@bull-board/nestjs` |
| Health checks | `@nestjs/terminus` |
| Package manager | pnpm |

All infra dependencies (PostgreSQL, Redis, Mailpit) are run as **native local services** on Fedora — no Docker/cloud dependency for local dev.

## Architecture notes

- **Explicit module imports** — no module is `@Global()`. Every consumer imports what it needs directly (see `PrismaModule`, `EmailModule`, `BullmqModule` usage).
- **Repository pattern** — services never call Prisma directly; each domain module has a `repository/` folder (`UserRepository`, `EmailVerificationRepository`, etc.) so query logic stays out of business logic.
- **Global exception handling** — `HttpExceptionFilter` maps Prisma errors to HTTP codes (`P2025` → 404, `P2002` → 409) and logs with stack traces via pino.
- **Consistent response shape** — `ResponseInterceptor` wraps every response as `{ success, statusCode, data, timestamp }`.
- **Generic pagination** — reusable `PaginationQueryDto` / `PaginatedResult` / `paginate()` helper for any list endpoint.
- **Env-driven rate limiting** — global throttling via `@nestjs/throttler`, with a stricter override on `/auth/login` and `/health` exempted.

## Features implemented

### Auth & Users
- Register / login with JWT, bcrypt password hashing — access tokens are returned in the response body and refresh tokens use an httpOnly cookie
- `GET /user/me` (JWT-protected profile endpoint)
- `GET /user` — paginated user list, gated on `user:read` permission
- `PATCH /user/me/password` — update password (requires current password verification, new password must contain at least one letter and one number)
- `POST /auth/forgot-password` / `POST /auth/reset-password` — email-based password recovery (token expires via `PASSWORD_RESET_EXPIRATION` env, default 15 min; single-use tokens; enumeration-safe generic response)
- `POST /auth/refresh` / `POST /auth/logout` — refresh-token flow with rotation (each refresh revokes the old token, returns a new access token, and sets the next refresh token in an httpOnly cookie; reuse of a revoked token is rejected); refresh tokens are stored as SHA-256 hashes

### Async registration + email verification (BullMQ)
- `POST /auth/register-async` — registration is queued (`email-verification` queue) instead of blocking on email delivery
- Worker (`EmailVerificationProcessor`) creates the user + a one-to-one `EmailVerification` record (token, 24h expiry) in a single Prisma transaction, then sends a verification email via Mailpit/nodemailer
- `GET /auth/verify-email?token=...` — validates the token (not found / expired / already verified / success), and atomically marks `EmailVerification.status = VERIFIED` and `User.emailVerified = true`
- **Resend flow** — re-registering with an unverified email regenerates the token and resends the email instead of blocking; a verified email is correctly rejected as a duplicate
- **Retry with backoff** — transient failures (e.g. SMTP unreachable) are retried (`attempts: 3`, exponential backoff); permanent failures (e.g. duplicate-email constraint violations) are not retried
- **Queue observability** — `@bull-board/nestjs` dashboard at `/queues` for inspecting job state (completed/failed/retried) without touching Redis directly

### Platform
- Health check (`/health`) — DB + memory checks via Terminus
- Structured logging (pino) throughout, including background workers

## Project setup

```bash
pnpm install
```

### Local services (native install, Fedora)

This project expects the following services running locally:

| Service | Purpose | Default |
|---|---|---|
| PostgreSQL | Primary database | — |
| Redis | BullMQ job queue backend | `localhost:6379` |
| Mailpit | Local SMTP catcher for dev email | SMTP `:1025`, UI `:8025` |

Start Mailpit manually before testing email flows:
```bash
mailpit
```
Web UI: [http://localhost:8025](http://localhost:8025)

### Environment variables

Copy `.env.example` and fill in real values:
```bash
cp .env.example .env
```

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Postgres connection string |
| `JWT_SECRET` | ✅ | — | No fallback — fails fast if missing |
| `REDIS_HOST` | — | `localhost` | |
| `REDIS_PORT` | — | `6379` | |
| `SMTP_HOST` | — | `localhost` | Mailpit in dev |
| `SMTP_PORT` | — | `1025` | Mailpit in dev |
| `APP_URL` | — | `http://localhost:4000` | Used to build links (e.g. verification email); will move to `FRONTEND_URL` once a frontend exists |
| `FRONTEND_URL` | — | `http://localhost:3000` | Default allowed browser origin |
| `CORS_ORIGINS` | — | `FRONTEND_URL` | Comma-separated explicit allowed origins for credentialed CORS |
| `COOKIE_SECURE` | — | `false` locally, `true` in production | Set to `true` for HTTPS; defaults to `true` when `NODE_ENV=production` |
| `COOKIE_SAME_SITE` | — | `lax` | Use `lax` for same-site deployments; cross-site deployments need `none` and `COOKIE_SECURE=true` |
| `REFRESH_TOKEN_TTL_MS` | — | `1209600000` | Refresh-token lifetime and refresh-cookie max-age in milliseconds (14 days by default) |
| `LOG_LEVEL` | — | — | |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | — | — | |
| `PASSWORD_RESET_EXPIRATION` | — | `15` | Minutes, password-reset token validity |
| `TOKEN_EXPIRATION` | — | `24h` | JWT access token lifetime. Code fallback is `24h` if unset, but this project's dev `.env` currently sets `7d` for convenience — check your actual `.env` value, don't assume the code default |


Run database migrations:
```bash
pnpm prisma migrate dev
```

## Starting a new project from this boilerplate

See `SETUP.md` for the full workflow — cloning, native-service setup,
database creation, manual role/super-admin seeding, and a smoke-test
checklist for a fresh environment.

## Compile and run the project

```bash
# development (watch mode)
pnpm run start:dev

# production mode
pnpm run start:prod
```

Queue dashboard: [http://localhost:4000/queues](http://localhost:4000/queues)

## Run tests

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# test coverage
pnpm run test:cov
```

## Git branches

- `master` — active development

## Roadmap

- [ ] Dead-letter/failed-job alerting beyond the dashboard (Step 8 polish)
- [ ] RBAC: prevent privilege escalation via role permissions — a regular admin with `role:create`/`role:write` can currently grant any permission (including ones equivalent to `admin`) to a new or existing role; needs a check restricting granted permissions to a subset of the granter's own effective permissions
- [ ] Frontend integration (`FRONTEND_URL` swap-in once frontend project starts)
- [ ] Fix race condition: rapid concurrent `register-async` calls with the same email can both pass the sync duplicate-check before either completes — needs a DB-level guard or locking strategy
- [ ] Scheduled cleanup job for expired `EmailVerification` records (candidate for BullMQ's repeatable-job feature, not yet used in this project)
- [ ] Daemonize Mailpit as a systemd service (currently run manually in the foreground for local dev)
- [ ] Add auth in front of the `@bull-board` dashboard (`/queues`) before any non-local exposure
- [ ] Add a timeout to `EmailService.sendMail()` calls to prevent a hung SMTP connection from blocking the worker

## License

MIT