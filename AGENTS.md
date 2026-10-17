# AGENTS.md — Context for AI Agents

This is a reusable NestJS backend boilerplate and a learning project for a backend beginner with ~6 years of frontend experience.

## Philosophy

* Build features **simple first**, then improve toward industry-standard patterns when needed.
* Do not over-engineer the first implementation.
* Deferred improvements belong in the README Roadmap.
* Existing decisions below are settled unless the user explicitly reopens them.
* When discussing architecture, prefer explaining the reasoning and asking useful architectural questions rather than blindly making decisions.

## Tech Stack

* NestJS + TypeScript + pnpm
* PostgreSQL + Prisma ORM
* JWT auth with Passport + bcrypt
* BullMQ + Redis for background jobs
* Mailpit + Nodemailer for local email
* Pino structured logging
* `@nestjs/throttler` for rate limiting
* `@bull-board/nestjs` at `/queues`
* `@nestjs/terminus` for health checks
* Path alias: `@/*` → `src/*`
* PostgreSQL, Redis and Mailpit run as native local services on Fedora; no Docker for local development.

## Project Structure

```text
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── repositories/
│   ├── permissions/
│   ├── guards/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   ├── email/
│   ├── bullmq/
│   ├── prisma/
│   └── types/
├── config/
├── modules/
│   ├── auth/
│   ├── user/
│   ├── role/
│   └── health/
└── test/
```

### Module conventions

Feature modules normally contain:

```text
controller/
service/
repository/
dto/
```

Small modules may keep files at the module root.

Naming:

* `{feature}.controller.ts`
* `{feature}.service.ts`
* `{entity}.repository.ts`
* `{purpose}.dto.ts`
* `{feature}.module.ts`

### Repository pattern

* Services never call Prisma directly.
* Database access goes through repositories.
* Repository methods accept optional `tx?: Prisma.TransactionClient` for transactions.
* User queries omit passwords by default.
* Explicit `*ForAuth` methods may return the password hash when required for bcrypt comparison.
* Do not use `@Global()` modules; consumers import dependencies explicitly.

## RBAC Architecture

* `Role.permissions` is a `String[]`.
* Permission format: `"resource:action"`, e.g. `"user:delete"`.
* Permissions are generated from `RESOURCES × ACTIONS`.
* Adding a new module normally means adding its resource to `RESOURCES`.
* `permission.constants.ts` provides the permission whitelist used by DTO validation.

### Super Admin

* `User.isSuperAdmin` is a separate DB-only boolean, not a role.
* It cannot be set through the API.
* A partial unique index ensures only one super admin exists.
* Super admin bypasses permission checks.

### Permission resolution

`UserPermissionResolver` is the single abstraction used by `PermissionsGuard` and future permission consumers.

It:

* fetches the user and role
* exposes `getPermissions()`
* exposes `hasPermission()`
* handles the super-admin bypass internally

`UserRepository` lives under `common/repositories/` intentionally to avoid circular dependencies between User and Permissions modules.

### Guard vs business rules

`PermissionsGuard` only checks generic `"resource:action"` permissions.

Business-specific rules belong in the service layer.

Examples:

* Only super admin can assign the literal `admin` role → `UserService`
* A user cannot delete their own account → `UserService.deleteUser(userId, currentUserId)`

Do not put feature-specific business rules inside the generic guard.

### Known RBAC gap

A regular admin with `role:create` / `role:write` can currently create a role containing any permission set, potentially creating an admin-equivalent role without the `admin` name.

This is intentionally deferred and documented in the README Roadmap.

## Auth

### Registration

* `POST /auth/register` — synchronous registration.
* `POST /auth/register-async` — registration with email verification queued through BullMQ.

### Password change

`PATCH /user/me/password`

* Requires `currentPassword` and `newPassword`.
* Current password is verified with bcrypt.
* No permission guard is needed.
* Other JWT sessions are not invalidated; token blacklist/session invalidation is deferred.

### Refresh tokens

* `POST /auth/refresh` / `POST /auth/logout`
* Separate `RefreshToken` model — token stored as a SHA-256 hash (not bcrypt: bcrypt's random salting breaks direct DB lookup by hash, and its slowness is unneeded for high-entropy random tokens).
* Rotation enabled: each `/auth/refresh` call revokes the used token and issues a new access+refresh pair. Reuse of an already-revoked token is rejected with a plain 401 (no theft detection or family revoke yet).
* Refresh lifetime is fixed from login (`REFRESH_TOKEN_TTL_MS`, default 14 days), not sliding.
* Cookie flags come from `COOKIE_SECURE` and `COOKIE_SAME_SITE`; `none` requires `COOKIE_SECURE=true`.
* Logout: `POST /auth/refresh/logout` (the cookie Path is `/auth/refresh`, so `POST /auth/logout` does not receive the cookie from a browser).
* Known gaps (deferred): no grace window, no token family, no reuse-triggered revoke-all, no `session_revoked` error code, no single-active-session takeover, password change does not revoke other sessions.
* `POST /auth/login` returns `access_token` in the response body. The refresh token is set only as an httpOnly cookie named `refresh_token` (Path `/auth/refresh`).

### Password recovery

* `POST /auth/forgot-password`
* `POST /auth/reset-password`

Password reset uses a separate `PasswordResetToken` model.

Important rules:

* Reset requests must be repeatable.
* Always return the same generic forgot-password response regardless of whether the email exists.
* Token expiration is controlled by `PASSWORD_RESET_EXPIRATION`.
* Default expiration: 15 minutes.
* Tokens are single-use through the `used` flag.
* Password reset email is synchronous; queueing is intentionally not used here.

## Environment Variables

Keep the README environment-variable table synchronized with the code.

Important variables:

```text
DATABASE_URL
JWT_SECRET
TOKEN_EXPIRATION
PASSWORD_RESET_EXPIRATION
REDIS_HOST
REDIS_PORT
SMTP_HOST
SMTP_PORT
APP_URL
FRONTEND_URL
LOG_LEVEL
THROTTLE_TTL
THROTTLE_LIMIT
```

`JWT_SECRET` has no fallback and must fail fast when missing.

Default JWT expiration: `24h`.

`PASSWORD_RESET_EXPIRATION` defaults to `15` minutes.
`REDIS_HOST` defaults to `localhost` and `REDIS_PORT` defaults to `6379`.
`SMTP_HOST` defaults to `localhost` and `SMTP_PORT` defaults to `1025` for Mailpit in local dev.
`APP_URL` defaults to `http://localhost:4000` and is used for reset/verification links.
`FRONTEND_URL` is reserved for future frontend integration.

## Known Footguns

### Prisma migration renames

`prisma migrate dev` does not reliably detect renames and may generate drop + add.

For tables containing real data, manually change the generated SQL to use `RENAME` instead of dropping/recreating data.

### Stale build files

After dependency/type changes, stale build files can cause misleading errors.

```bash
rm -rf dist *.tsbuildinfo
```

Do not delete `tsconfig.json`.

### DATABASE_URL

Prisma loads `.env`, but shell commands such as `psql` require `DATABASE_URL` to be exported.

An existing shell-level `DATABASE_URL` also overrides `.env`.

When Prisma appears to use the wrong database:

```bash
echo $DATABASE_URL
```

### Partial unique indexes

Prisma does not provide native partial-unique-index syntax.

For conditional constraints such as:

```sql
WHERE isSuperAdmin = true
```

create the migration with:

```bash
prisma migrate dev --name x --create-only
```

Then manually add the required SQL to the migration before applying it.

### Verify file changes

Do not assume an editor/AI edit was actually written to disk.

After important edits, verify with commands such as:

```bash
cat
grep
```

especially before migrations or server restarts.

### IDs

`Role.id` uses `uuid()`.

All models should use UUID IDs consistently. A `cuid()`-style ID indicates legacy/inconsistent code.

### Swagger

`persistAuthorization: true` is intentionally enabled in `main.ts` so the bearer token survives page refresh.

Do not remove it without a specific reason.

## Versioning

Use Semantic Versioning.

Current version: `v1.1.0`.

* PATCH → bug fixes
* MINOR → backward-compatible features
* MAJOR → breaking changes

## New-project workflow

See `SETUP.md` for the full clone-to-running workflow for starting a
new project from this boilerplate, and `.env.example` for the
expected environment variables.

## Commands

See `Project Commands.md` for the full development, Prisma, PostgreSQL, Git, and troubleshooting command reference.
- Progress and task status: see `progress.md`.
- Database structure: see `database.md` (generated from `prisma/schema.prisma`; update it in the same commit as any schema change).
