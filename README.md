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
* **Rate limiting** — today a global throttle of 100 requests per 60 s per IP is hard-coded in `app.module.ts`. Per-route limits, keyed by user id on authenticated routes, are planned (T3): see `progress.md` → Rate limits.
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

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string |
| `JWT_SECRET` | yes | — | No fallback; fails fast if missing |
| `TOKEN_EXPIRATION` | — | `1h` | Access-token lifetime, must carry a unit (`15m`, `1h`). Set it explicitly in production. The current Zod default `3600` is a bug (read as milliseconds); fix in T2 |
| `REFRESH_TOKEN_TTL_MS` | — | `1209600000` | Refresh token lifetime and cookie max-age (14 days), counted from each rotation |
| `COOKIE_SECURE` | — | `false` locally, `true` in production | `true` for HTTPS |
| `COOKIE_SAME_SITE` | — | `lax` | `none` needs `COOKIE_SECURE=true`; prefer one registrable domain with `lax` |
| `FRONTEND_URL` | — | `http://localhost:3000` | Default allowed browser origin |
| `CORS_ORIGINS` | — | `FRONTEND_URL` | Comma-separated allowed origins for credentialed CORS |
| `APP_URL` | — | `http://localhost:4000` | Used to build links in emails |
| `REDIS_HOST` / `REDIS_PORT` | — | `localhost` / `6379` | |
| `EMAIL_ENABLED` | — | `false` | Planned (T13). When false, forgot/reset/verify answer 503 `email_disabled` |
| `SMTP_HOST` / `SMTP_PORT` | — | `localhost` / `1025` | Mailpit in dev |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | — | — | Planned (T2). Needed for a real provider |
| `PASSWORD_RESET_EXPIRATION` | — | `15` | Minutes; only used when email is enabled. Not yet in the Zod schema (T2) |
| `READING_FUTURE_TOLERANCE_MS` | — | `600000` | Planned (T15). How far in the future `recordedAt` may be |
| `LOG_LEVEL` | — | — | |
| `SEED_SUPER_ADMIN_USERNAME` / `_EMAIL` / `_PASSWORD` | — | — | Planned (T9). Read only by `prisma/seed.ts` |

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