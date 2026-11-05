# AGENTS.md — Context for AI Agents

NestJS backend for a hatchery water-quality system (shrimp hatcheries, Cox's Bazar). It was cloned from a reusable boilerplate but is now its own professional product, built to be taken to real hatcheries. The owner has ~6 years of frontend experience and is learning backend.

The frontend is a separate repo (`hatchery-frontend`: Vue 3, offline-first PWA, Bangla-first i18n). This repo owns the API contract (`progress.md`).

## Reading order

1. `AGENTS.md` — rules and conventions (this file)
2. `progress.md` — tasks, API contract, error codes, decisions, parking lot
3. `database.md` — schema (target state, with status markers)
4. `COORDINATION.md` — frontend ↔ backend log (temporary; deleted when the project ends)

Each fact lives in one file: rules here, schema in `database.md`, tasks/contract/decisions in `progress.md`, the environment table in `README.md`.

## Working with the owner

* Talk to the owner in Bangla script. Code, docs and commits are in English.
* Explain the reasoning and ask useful architectural questions before deciding. The owner reviews every change.
* Do not rewrite an existing file unless asked. Show exact line-level changes so the owner can apply and understand them. Whole-file output is for new files, or when explicitly requested.
* Suggest when to commit and a Conventional Commit message (`feat(user): ...`). One logical change per commit.
* Docs first: update the relevant doc before the code that depends on it. A schema change and its `database.md` update go in the same commit.
* Verify edits on disk (see Known footguns).

## Philosophy

* Build simple first, then improve when needed. Do not over-engineer.
* Decisions in `progress.md` → Decisions log are settled unless the owner reopens them. Open questions go in "Open decisions"; deferred ideas go in "Parking lot".
* Docs describe the decided design. Anything not yet in code is marked **planned** with its task number (`progress.md`).

## Domain

* **Organization** = one hatchery (a tenant). A user belongs to exactly one organization. The same person in two hatcheries needs two accounts (`username` and `email` are globally unique).
* **Super admin** — the platform owner. DB-only flag, no organization, can act in any organization. Creates organizations and gives each one an admin.
* **Org admin** — exactly one per organization, never zero. Adds users, resets passwords, deactivates users, manages tanks, and decides what each role may do in their organization.
* **Roles** — a global list (`admin`, `manager`, `staff`, seeded). What a role may do is per organization (`OrganizationRole`, copied from the global role when the organization is created).
* **Tank** — belongs to an organization. Deactivated, never deleted.
* **Reading** — one water-quality measurement (pH, temperature, salinity, oxygen) for a tank. Created on phones, often offline, synced later. Immutable in the pilot.
* "Phone = staff, desktop = admin" is only a design lens for the frontend. Access control is RBAC.
* One active session per account: a new login revokes the old device's session (takeover).

## Tech stack

* NestJS + TypeScript + pnpm
* PostgreSQL + Prisma ORM
* JWT auth with Passport + bcrypt
* BullMQ + Redis for background jobs
* Nodemailer (Mailpit locally); email is disabled by default (see Email)
* Pino structured logging
* `@nestjs/throttler` for rate limiting
* `@bull-board/nestjs` at `/queues`
* `@nestjs/terminus` for health checks
* Path alias: `@/*` → `src/*`
* PostgreSQL, Redis and Mailpit run as native services on Fedora; no Docker for local development.

## Project structure

```text
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── repositories/   (shared repositories, e.g. UserRepository)
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
│   ├── health/
│   └── (planned) organization/ organization-role/ tank/ reading/
└── test/
```

### Module conventions

Feature modules normally contain `controller/`, `service/`, `repository/`, `dto/`. Small modules may keep files at the module root.

Naming: `{feature}.controller.ts`, `{feature}.service.ts`, `{entity}.repository.ts`, `{purpose}.dto.ts`, `{feature}.module.ts`.

### Repository pattern

* Services never call Prisma directly; database access goes through repositories.
* Repository methods accept an optional `tx?: Prisma.TransactionClient`.
* User queries omit the password by default. Explicit `*ForAuth` methods may return the hash for bcrypt comparison.
* No `@Global()` modules; consumers import dependencies explicitly.
* `UserRepository` lives under `common/repositories/` on purpose, to avoid a circular dependency between the User and Permissions modules.

## RBAC

* Permission key: `resource:action`. Keys come from a per-resource action map in `permission.constants.ts` (not RESOURCES × ACTIONS: `read-all` makes no sense on every resource). The same file is the whitelist for DTO validation and says which keys are platform-level. (Done in T7. `Role.permissions` templates accept org-level keys only; `RequirePermission` is typed to the map.)
* Two scopes. **Platform** keys are never stored in an `OrganizationRole`; they work only through the super-admin bypass. **Org** keys can be granted to roles by the org admin.

| resource | actions | scope |
|---|---|---|
| `user` | create, read, write, reset-password | org |
| `user` | delete | platform (super admin only) |
| `organization` | create, read, transfer-admin | platform |
| `role` | create, read, write, delete | platform |
| `organization-role` | read, write | org |
| `tank` | create, write | org |
| `reading` | create, read-all | org |

* `GET /tanks` needs no key: any member of the organization can list its tanks.
* `reading:create` covers creating readings and seeing your own. `reading:read-all` is organization-wide viewing.

Default templates (global `Role.permissions`, seeded; copied into each organization's `OrganizationRole` rows when it is created):

| role | permissions |
|---|---|
| `admin` | `user:create`, `user:read`, `user:write`, `user:reset-password`, `organization-role:read`, `organization-role:write`, `tank:create`, `tank:write`, `reading:create`, `reading:read-all` |
| `manager` | `user:read`, `tank:create`, `tank:write`, `reading:create`, `reading:read-all` |
| `staff` | `reading:create` |

### Effective permissions

`UserPermissionResolver` is the single abstraction used by `PermissionsGuard` and `GET /users/me`.

* Super admin: every key (bypass handled inside the resolver).
* Everyone else: `OrganizationRole(user.organizationId, user.roleId).permissions`. A user without an organization or role has none.

### Who may grant what

* Role management (`/roles`) is platform-level: super admin only.
* The org admin edits only the `permissions` of the organization's own `OrganizationRole` rows, and only with org-level keys. The `admin` role's row is not editable.
* The org admin cannot create roles and cannot grant platform keys, so privilege escalation through role editing is closed by design.

### Super admin

* `User.isSuperAdmin` is a DB-only boolean, not a role. It cannot be set through the API.
* A partial unique index allows only one super admin.
* Super admin bypasses permission checks. It does **not** bypass tenant rules: org-scoped endpoints still need an explicit organization (see below).

### Guard vs business rules

`PermissionsGuard` only checks generic `resource:action` keys. Business rules belong in services, never in the guard.

## Tenant isolation (security-critical)

* All organization-scoped data (users, tanks, readings, organization roles) is reached through one helper: `resolveOrganizationId(caller, requested?)` (planned, T10).
  * Normal user: their own organization. A different `requested` organization → 403 `organization_mismatch`. No organization → 403 `no_organization`.
  * Super admin: `organizationId` is required (query or body); missing → 400 `organization_required`.
* There are no global lists. `GET /users` is always "the users of one organization".
* Never filter by a possibly-null `organizationId`: in Prisma, `where: { organizationId: null }` returns the users who have no organization, and silently returns the wrong data.
* Target-specific calls (`PATCH /users/:id`, `PATCH /organization-roles/:id`, reset password, ...) need no organization parameter. A normal caller may touch only targets in their own organization; anything else is **404**, so existence is not revealed. Super admin may touch any target.
* A user without an organization who is not the super admin is rejected (403 `no_organization`) by every organization-scoped endpoint.

## Business rules (service layer)

* **Admin role.** The `admin` role is assigned only (a) when the super admin creates an organization (first admin) and (b) by the super-admin transfer. `PATCH /users/:id` can never set `admin` and cannot change the admin's own role.
* **One admin per organization, never zero.** The organization's admin cannot be deactivated, deleted, or have the role changed except through the transfer. Enforced in the service inside a transaction (`Role` is global, so the database cannot enforce it).
* **Admin transfer** (`organization:transfer-admin`, super admin): the new admin must be an active user of the same organization; the previous admin gets a role chosen by the super admin (not `admin`); one transaction.
* **Deactivation.** `isActive = false` blocks login and refresh and revokes all of the user's refresh tokens. Nobody can deactivate themselves.
* **Delete user** — super admin only; not yourself; not the organization's admin. A user who owns readings cannot be deleted (foreign-key block → 409).
* **Passwords.** The admin creates users with a temporary password and `mustChangePassword = true`. Admin-driven reset (`user:reset-password`, default only the `admin` role) sets a temporary password, `mustChangePassword = true`, and revokes all sessions. Only the super admin can reset an organization's admin. A password change clears `mustChangePassword`, revokes all of the user's existing refresh tokens, and returns a fresh access token plus refresh cookie (the cookie Path is `/auth/refresh`, so this endpoint cannot tell which token is the current one).
* **Usernames.** Chosen by the admin, never changed by the user. Lowercase `a-z 0-9 . _ -`, 3–30 characters, globally unique, normalized to lowercase before lookup.
* **Own account.** A user cannot delete or deactivate their own account.
* **Admin-action log.** Each of these writes one structured pino line `{ action, actorId, organizationId, targetId }`: organization create, user create, role change, deactivate/activate, password reset, admin transfer, organization-role update (planned, T17; no new table yet).

## Auth

### Login and per-request checks

* `POST /auth/login` takes `username` + `password` (lowercased and trimmed before lookup). The body returns `access_token`; the refresh token is set only as an httpOnly cookie `refresh_token` (Path `/auth/refresh`).
* Authenticated routes are rate limited per user id, not per IP (field staff share public IPs); values are in `progress.md` → Rate limits.
* The JWT carries only `sub` (+ `email`). Permissions are never in the token.
* Access token lifetime: \TOKEN_EXPIRATION`, default `1h`; the pilot uses `15m`, because a short access token bounds how long an older device keeps working after a takeover.`
* Password policy: at least one letter and one number.
* Rate limits (planned, T3): routes with a valid token are limited per user id (default 120/min; `POST /readings/sync` 30/min); `/auth/login` 10/min per username (lowercased) plus a loose ceiling of 120/min per IP; `/auth/refresh` 60/min per IP; other tokenless routes 100/min per IP. Authenticated traffic is never limited by IP, because field staff share public IPs (hatchery Wi-Fi, mobile-network CGNAT). The login ceiling per IP is loose for the same reason: it only stops floods, it never identifies a person. Values: `progress.md` → Rate limits.
* A 429 returns `code: rate_limited` and a `Retry-After` header that CORS exposes to the browser.

### Refresh tokens

* `POST /auth/refresh`, `POST /auth/refresh/logout`. (The cookie Path is `/auth/refresh`, so `POST /auth/logout` never receives the cookie from a browser.)
* Separate `RefreshToken` model; the token is stored as a SHA-256 hash (not bcrypt: random salting breaks direct lookup by hash, and slowness is unneeded for high-entropy tokens).
* Rotation: each refresh runs in one transaction. The used token is revoked with a conditional update (`revoked = false`); if no row changed, another request already rotated it. The new token keeps the `familyId`, and the old row stores `replacedByTokenId`.
* Grace window: `REFRESH_GRACE_MS` (default 30000). A revoked token whose successor is younger than the window and still active is accepted once more the use is claimed atomically (`graceUsedAt`) and the new child joins the same family. The earlier child is not revoked, so a stale cookie from reordered responses still works. A second attempt inside the window answers 401 `session_revoked` without revoking the family (it cannot be told apart from a retry, and revoking would log out the client that already succeeded). Only the hash is stored, so the same successor cannot be returned again and still active.
* Reuse: a revoked token outside the grace window revokes its whole family and answers 401 `session_revoked`. An unknown or expired token answers 401 `unauthorized`.
* Single session: a successful login revokes every refresh token of the user, so the older device gets `session_revoked` at its next refresh. Its access token stays valid until it expires (the JWT carries only `sub`), which is why the access lifetime must be short (T16b).
* Password change and reset revoke all refresh tokens (change also issues a fresh pair); deactivation and admin reset do the same in T11. `isActive` is already checked on every request.
* Lifetime: `REFRESH_TOKEN_TTL_MS` (14 days) counted from each rotation, so it is **sliding**. No absolute maximum age yet (parking lot).
* Cookie flags: `COOKIE_SECURE`, `COOKIE_SAME_SITE` (`none` requires `COOKIE_SECURE=true`). Production target: frontend and API under one registrable domain (`app.`/`api.` subdomains) so `lax` works.

### Public signup

There is no public signup. `POST /auth/register` and `/auth/register-async` were removed (T13). Users are created only by the super admin (first admin) and by org admins (`POST /users`). The frontend never implements signup.

## Email

* `EMAIL_ENABLED=false` is the default : no mail service is paid for in the pilot. The email address is mandatory and unique, shown to admins, but unused for login.
* When disabled, `forgot-password`, `reset-password` and `verify-email` answer 503 `email_disabled`. Password recovery is the admin-driven reset.
* The sending code (`EmailService`, BullMQ processor, `EmailVerification`, `PasswordResetToken`) stays dormant. Turning email on later means flipping the flag and setting the SMTP variables (a provider with a free tier, e.g. Brevo, was considered). Verified emails will be required before email-based reset is trusted.

## Error contract

* Envelope: `{ success: false, statusCode, code, path, message, errors?, timestamp }`.
* `code` is a stable machine code (snake_case) and is what the frontend maps to i18n text. `message` is English developer text and is never shown to users.
* A validation error has `code: validation_failed` at the top and the details in `errors[]`.
* Field problems come as `errors: [{ field, code, params }]`. The code list is in `progress.md` → Error codes.
* `HttpExceptionFilter` maps Prisma errors: `P2025` → 404, `P2002` → 409, `P2003` → 409. Services throw `AppException(status, code, message)` when the frontend needs a specific code; plain Nest exceptions get a default code from the status (`src/common/errors/`).

## Readings sync invariants

The full contract is in `progress.md`. The rules that must never break:

* The client never sends `createdById`, `syncedAt` or `organizationId`. The server derives them (token and `now()`).
* The client UUID is the primary key and the idempotency key. The first write wins; a repeat from the same user is a `duplicate`, never an overwrite.
* A tank must belong to the caller's organization (super admin: any); otherwise `tank_not_found`.
* The sync DTO validates only the envelope (`items` is a non-empty array of at most 100; body at most 100 KB). Never use `@ValidateNested` there: items are validated in the service, so one bad item never blocks its chunk.
* Only a bad envelope is HTTP 400 (`validation_failed`, `field: items`). Every item problem is a per-item `rejected`. Every result carries `index`; `id` is echoed only when the item had a string `id`.

## Environment variables

The full table with defaults is in `README.md`; keep it synchronized with `env.validation.ts` and `.env.example`.

* `JWT_SECRET` has no fallback and must fail fast when missing.
* `TOKEN_EXPIRATION` must carry a unit (`1h`, `15m`). A bare number string is read as **milliseconds** by `jsonwebtoken`.
* Set `TOKEN_EXPIRATION` explicitly in production.
* Every variable the code reads must be in the Zod schema, so a wrong value fails at startup instead of becoming `NaN`.

## Known footguns

### Prisma migration renames

`prisma migrate dev` does not reliably detect renames and may generate drop + add. For tables with real data, edit the generated SQL to use `RENAME`.

### Stale build files

```bash
rm -rf dist *.tsbuildinfo
```

Do not delete `tsconfig.json`.

### DATABASE_URL

Prisma loads `.env`, but shell tools such as `psql` need `DATABASE_URL` exported. A shell-level `DATABASE_URL` overrides `.env`. When Prisma seems to use the wrong database: `echo $DATABASE_URL`.

### Partial unique indexes

Prisma has no native syntax for them. Create the migration with `pnpm prisma migrate dev --name x --create-only`, add the SQL by hand, then apply.

### Verify file changes

Do not assume an edit reached the disk. Check with `cat` or `grep` before migrations or server restarts.

### IDs

All models use `@default(uuid())`. A `cuid()` ID is legacy.

### Swagger

`persistAuthorization: true` is intentionally enabled in `main.ts` so the bearer token survives a page refresh. The JSON is served at `/api-json`.

## Versioning

Semantic Versioning. Current version: `0.1.0` (set in `package.json`).

* PATCH → bug fixes
* MINOR → backward-compatible features
* MAJOR → breaking changes

## Referencesp

* Setup: `SETUP.md` and `.env.example`
* Commands: `project-commands.md`
* Tasks, API contract, decisions: `progress.md`
* Schema: `database.md` (update it in the same commit as any schema change)