<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">NestJS backend for a hatchery water-quality system: organizations, users and roles, tanks, and offline-synced water readings.</p>

## Description

The backend for an offline-first system used by shrimp-hatchery owners and field staff in Cox's Bazar. Hatcheries are separate organizations; staff record water readings (pH, temperature, salinity, oxygen) on phones, often without internet, and the app syncs them later. The frontend lives in a separate repository (`hatchery-frontend`).

The project began as a reusable NestJS boilerplate and is now its own product. Modules use explicit imports (no `@Global()`), type-safe env validation, and a repository-pattern data layer.

## Documentation

| File | What it is |
|---|---|
| `AGENTS.md` | Rules and conventions: domain, RBAC, tenant isolation, business rules, auth, error contract |
| `progress.md` | Task plan, API contract, error codes, decisions, parking lot |
| `database.md` | Schema (target state, planned parts marked) |
| `SETUP.md` | Fresh-machine setup and smoke test |
| `project-commands.md` | Command reference |

Features are built one task at a time; the current state and the plan are in `progress.md`.

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
| Email | Nodemailer (Mailpit in dev); disabled by default |
| Queue dashboard | `@bull-board/nestjs` |
| Health checks | `@nestjs/terminus` |
| Package manager | pnpm |

PostgreSQL, Redis and Mailpit run as native local services on Fedora; no Docker for local development.

## Architecture notes

* **Explicit module imports** — no `@Global()` module.
* **Repository pattern** — services never call Prisma directly.
* **Global exception handling** — `HttpExceptionFilter` maps Prisma errors to HTTP codes and logs with pino.
* **Consistent response shape** — `ResponseInterceptor` wraps every response as `{ success, statusCode, data, timestamp }`.
* **Generic pagination** — `PaginationQueryDto` / `PaginatedResult` / `paginate()`.
* **Rate limiting** — `@nestjs/throttler` with named limits (`src/common/throttler/`): per user id on authenticated routes, per IP on tokenless routes, per username plus a loose per-IP ceiling on `/auth/login`. Values: `progress.md` → Rate limits.
* **Multi-tenant by organization** — see `AGENTS.md` → Tenant isolation.

## Features

Implemented: login with JWT and a rotating httpOnly refresh-token cookie, password change, password recovery by email, email verification through BullMQ, RBAC with a DB-only super admin, paginated user list, health checks, structured logging, queue dashboard at `/queues`.

Planned (see `progress.md`): organizations and per-organization role permissions, username login, admin-managed users, tanks, `POST /readings/sync`, machine-readable error codes, session hardening.

## Project setup

```bash
pnpm install
```

### Local services (native, Fedora)

| Service | Purpose | Default |
|---|---|---|
| PostgreSQL | Primary database | — |
| Redis | BullMQ queue backend | `localhost:6379` |
| Mailpit | Local SMTP catcher (only needed when email is enabled) | SMTP `:1025`, UI `:8025` |

Start Mailpit manually when testing email flows: `mailpit` (UI: http://localhost:8025).

### Environment variables

```bash
cp .env.example .env
```

Every variable the code reads is validated at startup in `src/config/env.validation.ts` (Zod); a wrong value stops the app with `Invalid environment configuration`. Keep this table, the schema and `.env.example` identical.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | — | `development` | `development`, `production` or `test` |
| `PORT` | — | `3000` | The dev `.env` sets `4000` |
| `DATABASE_URL` | yes | — | Postgres connection string |
| `JWT_SECRET` | yes | — | No fallback; fails fast if missing |
| `TOKEN_EXPIRATION` | — | `1h` | Access-token lifetime. Must be a number with a unit (`15m`, `1h`, `7d`); a bare number such as `3600` is rejected at startup, because `jsonwebtoken` would read it as milliseconds. Set it explicitly in production |
| `REFRESH_TOKEN_TTL_MS` | — | `1209600000` | Refresh token lifetime and cookie max-age (14 days), counted from each rotation |
| `COOKIE_SECURE` | — | `false` locally, `true` in production | `true` for HTTPS. Must be `true` in production |
| `COOKIE_SAME_SITE` | — | `lax` | `strict`, `lax` or `none`. `none` needs `COOKIE_SECURE=true`; prefer one registrable domain with `lax` |
| `FRONTEND_URL` | — | `http://localhost:3000` | Default allowed browser origin. No wildcard |
| `CORS_ORIGINS` | — | `FRONTEND_URL` | Comma-separated allowed origins for credentialed CORS. No wildcard |
| `APP_URL` | — | `http://localhost:4000` | Used to build links in emails |
| `REDIS_HOST` / `REDIS_PORT` | — | `localhost` / `6379` | |
| `EMAIL_ENABLED` | — | `false` | Validated since T2; the gating itself lands in T13. When false, forgot/reset/verify answer 503 `email_disabled` |
| `SMTP_HOST` / `SMTP_PORT` | — | `localhost` / `1025` | Mailpit in dev |
| `SMTP_USER` / `SMTP_PASS` | — | — | Optional. Needed for a real provider |
| `SMTP_SECURE` | — | `false` | `true` for implicit TLS (usually port 465) |
| `PASSWORD_RESET_EXPIRATION` | — | `15` | Minutes; only used when email is enabled |
| `READING_FUTURE_TOLERANCE_MS` | — | `600000` | Validated since T2; used from T15. How far in the future `recordedAt` may be |
| `LOG_LEVEL` | — | `info` | `fatal`, `error`, `warn`, `info`, `debug` or `trace` |
| `SEED_SUPER_ADMIN_USERNAME` / `_EMAIL` / `_PASSWORD` | yes for `pnpm prisma db seed` | — | Read only by `prisma/seed.ts` (not by the app). Username: 3–30 chars `a-z 0-9 . _ -`; password at least 8 chars with a letter and a number |

Run migrations:

```bash
pnpm prisma migrate dev
```

Full clone-to-running walkthrough: `SETUP.md`.

## Compile and run

```bash
# development (watch mode)
pnpm run start:dev

# production mode
pnpm run start:prod
```

* API: http://localhost:4000
* Swagger: http://localhost:4000/api (JSON at `/api-json`)
* Queue dashboard: http://localhost:4000/queues

## Run tests

```bash
pnpm run test
pnpm run test:e2e
pnpm run test:cov
```

## Git

* `master` — active development
* Conventional Commits, one logical change per commit.

## License

MIT