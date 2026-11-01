# Progress

## Current state

Implemented: auth (login by email, httpOnly refresh cookie with rotation, password change, forgot/reset password, email verification through BullMQ), RBAC with global roles and a DB-only super admin, user list / delete / role assignment, pagination, response envelope, health checks, pino logging.

Not implemented: everything marked **planned** below — organizations, per-organization permissions, username login, admin user management, tanks, readings sync, the error-code contract, session hardening.

Known bugs today:

* The refresh token lifetime is sliding, not fixed (each rotation gets a fresh 14 days).

Frontend (`hatchery-frontend`): Step 21 (offline sync) waits on the Readings contract below and builds a mock adapter from it.

## Task plan

Recommended build order is the numeric order. "Docs first": each task updates its docs in the same commit.

| # | Task | Status | Depends on |
|---|---|---|---|
| T1 | Rewrite the six docs for the hatchery design | in progress (this commit) | |
| T2 | Env/config: `TOKEN_EXPIRATION` default `1h` + format check (`/^\d+[smhd]$/`); add `PASSWORD_RESET_EXPIRATION`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_ENABLED`, `READING_FUTURE_TOLERANCE_MS` to Zod; remove `THROTTLE_TTL`/`THROTTLE_LIMIT` (limits are per-route constants, see Rate limits); `.env.example` and the README table match the Zod schema | done | |
| T3 | Rate limits per the "Rate limits" table (user-id tracker from the verified JWT `sub`, IP fallback; the global throttler runs before controller guards, so the tracker cannot rely on `req.user`); 429 carries `Retry-After`, exposed through CORS | Done | |
| T4 | Rename controller `/user` → `/users` (and `/user/me` → `/users/me`); update docs and Swagger. Done together with T8 as one breaking release for the frontend (paths, username login, new `/users/me`): until then the old `/user…` paths and email login must keep working | Done | T8 |
| T5 | `onDelete: Cascade` on the three auth tables; map Prisma `P2003` to 409 `conflict`; `deleteUser` blocks self, the org admin, and users who own readings (self-block now; org admin with T10, readings with T15) | done | |
| T6 | Error contract: `code` on every error, `errors: [{ field, code, params }]` via a `ValidationPipe` `exceptionFactory`, code list as constants; validation errors carry the top-level code `validation_failed`; oversized bodies answer 413 `payload_too_large` | Done | |
| T7 | Permission map refactor (per-resource actions, platform vs org scope); resolver stays on `Role.permissions` until T10 | Done | |
| T8 | (released together with T4) User fields `username`, `name`, `isActive`, `mustChangePassword`; login by username; `GET /users/me` new shape; `JwtStrategy.validate` loads the user per request; `user_inactive`, `must_change_password` | Done | T6, T7 | status 201
| T9 | `prisma/seed.ts`: global roles + super admin from `SEED_SUPER_ADMIN_USERNAME`, `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` | not started | T7, T8 |
| T10 | `Organization`, `OrganizationRole`, `User.organizationId`; `resolveOrganizationId`; `POST/GET /organizations`; `POST /organizations/:id/transfer-admin`; resolver switches to `OrganizationRole`; `assignRole` can no longer assign `admin` | not started | T8, T9 |
| T11 | Admin user management: `POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password`, `GET /users?organizationId=`; `mustChangePassword` enforcement | not started | T10 |
| T12 | `GET/PATCH /organization-roles` | not started | T10 |
| T13 | Remove `/auth/register`, `/auth/register-async`; `EMAIL_ENABLED` gating (503 `email_disabled`) | not started | T9, T11 |
| T14 | `Tank` model; `POST/GET/PATCH /tanks` | not started | T10 |
| T15 | `Reading` model; `POST /readings/sync` | not started | T6, T14 |
| T16 | Session hardening: transaction + grace window + token family + `session_revoked` + takeover; revoke all older refresh tokens on password change (the response issues a fresh pair), reset and deactivation | not started | T8 (best before T15) |
| T17 | Structured admin-action log lines | not started | T10, T11 |

## API contract

Responses use the envelope `{ success, statusCode, data, timestamp }`. "Status": **implemented** = exists today; **planned** = decided, task in brackets. Organization-scoped endpoints take `organizationId` (query for GET, body for POST) from the **super admin only** (required); everyone else uses their own organization.

| endpoint | auth / permission | request | `data` | status |
|---|---|---|---|---|
| `POST /auth/login` | none | `{ username, password }` (today `{ email, password }`) | `{ access_token }` + cookie `refresh_token` (httpOnly, Path `/auth/refresh`, 14 days) | implemented; username planned (T8) |
| `POST /auth/refresh` | cookie | — | `{ access_token }` + new cookie | implemented; hardening planned (T16) |
| `POST /auth/refresh/logout` | cookie | — | `{ message }`, cookie cleared | implemented |
| `POST /auth/logout` | cookie | — | `{ message }` | implemented but unusable from a browser (wrong cookie Path); see parking lot |
| `POST /auth/register`, `/auth/register-async` | none | `{ email, password }` | user / `{ message }` (202) | implemented; being removed (T13) |
| `GET /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password` | none | token / email / `{ token, newPassword }` | `{ message }` | implemented; 503 `email_disabled` when email is off (T13) |
| `GET /users/me` | Bearer | — | `{ id, email, username, name, isSuperAdmin, organizationId, permissions (always an array, never missing), mustChangePassword, role: { name } \| null }` | implemented (T4, T8). `organizationId` is always `null` until T10 |
| `PATCH /users/me/password` | Bearer | `{ currentPassword, newPassword }` | `{ message, access_token }` + new `refresh_token` cookie | implemented as `/user/me/password` returning `{ message }` (T4); T11/T16: clears `mustChangePassword`, revokes all older refresh tokens, issues a fresh pair (the cookie Path means the endpoint cannot tell which token is the current one) |
| `GET /users` | `user:read` | `page, pageSize, organizationId` | `{ items, meta }` (below) | implemented as global list; org-scoped (T11) |
| `POST /users` | `user:create` | `{ username, email, name?, roleId, temporaryPassword, organizationId? }` | user | planned (T11). `roleId` can never be `admin` |
| `PATCH /users/:id` | `user:write` | `{ roleId?, isActive?, name? }` | user | planned (T11) |
| `POST /users/:id/reset-password` | `user:reset-password` | `{ temporaryPassword }` | `{ message }` | planned (T11) |
| `DELETE /users/:id` | `user:delete` (super admin) | — | `{ message }` | implemented as `/user/:id` (T4, T5) |
| `GET/POST /roles`, `/roles/:id` | super admin | see Swagger | Role | implemented (global role CRUD) |
| `POST /organizations` | `organization:create` | `{ name, admin: { username, email, name?, temporaryPassword } }` | organization + admin | planned (T10). One transaction: organization, `OrganizationRole` rows copied from the global roles, the admin user (`admin` role, `mustChangePassword`) |
| `GET /organizations` | `organization:read` | `page, pageSize` | `{ items, meta }` | planned (T10) |
| `POST /organizations/:id/transfer-admin` | `organization:transfer-admin` | `{ newAdminUserId, previousAdminRoleId }` | `{ message }` | planned (T10) |
| `GET /organization-roles` | `organization-role:read` | `organizationId` (super admin) | `[{ id, roleId, name, permissions, editable }]` | planned (T12) |
| `PATCH /organization-roles/:id` | `organization-role:write` | `{ permissions }` (org-level keys only; `admin` row rejected) | the row | planned (T12) |
| `GET /tanks` | any organization member | `organizationId` (super admin) | `[{ id, name, isActive }]` (inactive tanks included; not paginated). Super admin without `organizationId` → 400 `organization_required`; user without an organization → 403 `no_organization` | planned (T14) |
| `POST /tanks`, `PATCH /tanks/:id` | `tank:create`, `tank:write` | `{ name }`; `{ name?, isActive? }` | tank | planned (T14) |
| `POST /readings/sync` | `reading:create` | see below | see below | planned (T15) |
| `GET /health` | none | — | `{ status, info, error, details }` | implemented |

Pagination (inside `data`): `{ "items": [], "meta": { "total", "page", "pageSize", "totalPages", "hasNextPage" } }`. Defaults: `page=1`, `pageSize=10`.

Error envelope: see `AGENTS.md` → Error contract. Today: `{ success:false, statusCode, path, message, timestamp }`.

### Readings sync (T15)

"Batch" is reserved for the hatchery production batch (frontend Step 25); this endpoint is "sync".

Request: `{ items: [{ id, tankId, recordedAt, ph, temperatureC, salinityPpt, oxygenMgL, note? }] }`, 1–100 items (the frontend sends 20–50 per call on weak networks). `id` is a client UUID v4, `recordedAt` is ISO 8601.

Response `data`: `{ results: [{ index, id?, status, identical?, errors? }], totals: { created, duplicate, rejected } }`. HTTP 200 for any well-formed request, even when every item is rejected (the server logs a warning then).
`index` is the item's position in the request (always present); `id` is echoed only when the item had a string `id`. Match results by `index`.

Whole-request failures: 400 only if the envelope is bad: `items` missing, not an array, empty, or longer than 100 (a bad item never causes a 400, it comes back `rejected`); 401 session ended; 403 `permission_denied` or `no_organization`. Pending items stay pending on 401/403/429/5xx and on network errors; on 429 wait for the `Retry-After` header before retrying.

The body limit is 100 KB (Express default); above it, 413 `payload_too_large`. A whole-request 400 uses the normal error envelope with `code: validation_failed` and `errors: [{ field, code, params }]`, where `field` is `items`. Inside `results`, item `field` values are bare names (`ph`, `tankId`, `note`). HTTP 400 means the chunk is bad and nothing was processed; HTTP 200 with `rejected` means that item is bad. Params: `too_long { max }`, `too_short { min }`, `out_of_range { min, max }`. A malformed `tankId` is `invalid_uuid`, a missing one `required`, a note over 200 characters `too_long { max: 200 }`.

Per item:

| status | meaning | client action |
|---|---|---|
| `created` | stored | mark synced |
| `duplicate` | same `id` already stored by the same user (first write wins; the new payload is ignored). `identical: true\|false` says whether the stored values equal the sent ones | mark synced; warn if `identical: false` |
| `rejected` | not stored; `errors: [{ field, code, params }]` | mark failed, show the code's text, allow fix-and-resend (same `id` is fine) — except `id_conflict`, which needs a new UUID |

Server rules:

* `createdById` from the token, `syncedAt = now()`. The client must not send `createdById`, `syncedAt`, `organizationId`; such fields reject the item (`not_allowed`).
* `recordedAt` more than `READING_FUTURE_TOLERANCE_MS` (default 10 minutes) in the future → `recorded_at_in_future`.
* Hard limits cover impossible values only: numbers must be finite and not negative; pH 0–14; `note` ≤ 200 chars. The frontend's sample ranges stay samples until the owner confirms real ranges (Open decisions).
* `tankId` must belong to the caller's organization (super admin: any organization), else `tank_not_found`. Inactive tanks are accepted.
* Same `id` from another user → `id_conflict`.
* No edit or delete after sync: a correction is a new reading. "Last value" prefill stays per user and local to the phone. Organization-wide viewing is online only, later, behind `reading:read-all`.
* Permission changes reach the client at its next `GET /users/me`; the server enforces them immediately (403 `permission_denied`, pending items kept).

### Changes the frontend must follow

See the Backend → Frontend rows in `COORDINATION.md`. This file keeps only the contract.

## Rate limits (T3)

| route | key | limit per minute |
|---|---|---|
| routes with a valid token (default) | user id | 120 |
| `POST /readings/sync` | user id | 30 |
| `POST /auth/login` | username (lowercased) | 10 |
| `POST /auth/login` | IP (loose ceiling, floods only) | 120 |
| `POST /auth/refresh` | IP | 60 |
| everything else without a token | IP | 100 |

Field staff often share one public IP, so authenticated traffic is never limited by IP. Per-username login lockout stays in the parking lot.

## Error codes (starter list, finalized in T6)

| code | HTTP | meaning |
|---|---|---|
| `required`, `invalid_type`, `invalid_format`, `too_short`, `too_long`, `out_of_range`, `invalid_uuid`, `invalid_datetime`, `not_allowed` | 400 (field level) | validation, reported in `errors[]` with `field` and `params` |
| `weak_password`, `invalid_username` | 400 (field level) | password / username rules |
| `organization_required` | 400 | super admin did not name an organization |
| `invalid_credentials` | 401 | wrong username or password |
| `user_inactive` | 401 | account deactivated |
| `session_revoked` | 401 | another device logged in (T16) |
| `unauthorized` | 401 | missing or invalid token |
| `must_change_password` | 403 | change the temporary password first |
| `permission_denied` | 403 | missing permission |
| `no_organization` | 403 | user has no organization |
| `organization_mismatch` | 403 | asked for another organization |
| `org_admin_protected` | 409 | action not allowed on the organization's admin (deactivate, delete, role change) |
| `cannot_target_self` | 409 | cannot delete or deactivate yourself |
| `username_taken`, `email_taken`, `conflict` | 409 | uniqueness or foreign-key conflict |
| `not_found`, `tank_not_found` | 404 | missing or outside your organization |
| `id_conflict`, `recorded_at_in_future` | item level (sync) | see Readings sync |
| `email_disabled` | 503 | email features are switched off |
| `rate_limited` | 429 | throttled; the response has a `Retry-After` header (seconds), exposed through CORS |
| `validation_failed` | 400 | top-level code of a validation error; the details are in `errors[]` |
| `payload_too_large` | 413 | request body over 100 KB |
| `bad_request` | 400 | generic bad request without a specific code (default for plain 400) |
| `internal_error` | 500 | unexpected server error |

## Decisions log

* 2026-10-15: Repository pattern; no `@Global()` modules; refresh token stored as SHA-256 hash; super admin is a DB-only boolean; password reset repeatable, generic response, single-use, synchronous; refresh token only in an httpOnly cookie (Path `/auth/refresh`); permissions never in the JWT.
* 2026-10-17: User deletion is super-admin only. Reading foreign keys stay required (no SetNull, no name snapshot).
* 2026-10-18: Project is the hatchery backend, no longer a boilerplate, and a professional product (no charge until the modules hatcheries need exist). Prototype scope: organization, user, tank, reading.
* 2026-10-18: Super admin creates an organization and its one admin; the admin adds users. A user belongs to one organization. One admin per organization, never zero; transfer is super-admin-only and the super admin picks the previous admin's new role.
* 2026-10-18: Roles are a global list (`admin`, `manager`, `staff`); per-organization permissions via `OrganizationRole`, copy-on-create. The org admin cannot edit the `admin` row or grant platform keys.
* 2026-10-18: Login by `username` (lowercase, globally unique). `email` is mandatory and unique, not a login key. Frontend has no signup; backend signup is removed (T13) after the seed script and admin user creation exist.
* 2026-10-18: Admin creates users with a temporary password; the backend enforces `mustChangePassword`. Admin-driven password reset replaces email reset.
* 2026-10-18: No paid mail service for now (`EMAIL_ENABLED=false`); the sending code stays dormant and is switched on later with SMTP variables.
* 2026-10-18: `isActive` on users and tanks (deactivate, never delete tanks). Inactive tanks still accept readings.
* 2026-10-18: Readings: sync endpoint with per-item results; first write wins; `identical` flag; PATCH/audit, `isLate`, `needsReview`, pull sync are out of the pilot.
* 2026-10-18: Super admin can act in any organization but must name it; there are no global lists. `reading:read-all` is separate from `reading:create`.
* 2026-10-19: Access token default lifetime `1h`; login throttle 10/min/IP; refresh absolute max age deferred. `/user` renamed to `/users`.
* 2026-10-20: Auth tables cascade on user delete; domain records restrict.
* 2026-10-26: `/user` → `/users` ships together with username login and the new `/users/me` as one breaking release (T4 + T8). A password change returns a fresh access token and refresh cookie and revokes all older refresh tokens.
* 2026-10-28: Rate limits are per route; authenticated routes are keyed by user id (field staff share a public IP). Sync: only a bad envelope is a 400; every item problem is a per-item `rejected`; results carry `index`.
* 2026-10-29: Build order: auth first (T2, T3, T5, T6, T7, T4+T8, T9, T13, T16), then organizations and the domain (T10–T12, T14, T15, T17).
* 2026-10-30: Login throttling for the pilot is by username (10/min) plus a loose per-IP ceiling (120/min), because mobile-network IPs are shared and unstable. Account lockout is deferred until after the pilot presentation.
## Open decisions

| # | Decision | Needed by |
|---|---|---|
| 1 | Real hatchery value ranges (pH, temperature, salinity, oxygen) for review flags — the frontend's sample ranges are not confirmed | before `needsReview` is ever built |
| 2 | Mail provider and the day email is switched on (Brevo free tier is the candidate; needs a domain with SPF/DKIM) | when admins stop being able to handle resets |
| 3 | Whether to bring back `ReadingAudit` + PATCH | before the dashboard |

## Parking lot

* Refresh token absolute maximum age (e.g. 90 days) together with token families (T16)
* `ReadingAudit` and an audited PATCH for synced readings; `isLate` derived from `syncedAt - recordedAt`; `needsReview` once ranges are confirmed
* Pull sync (cursor `syncedAt`, not `recordedAt`), `GET /readings` (organization-wide, `reading:read-all`), dashboard index `[tankId, recordedAt]`
* Email: switch-on checklist, verification flow, email-based reset, invitation flow
* Deployment: one registrable domain with `app.` and `api.` subdomains (cookie `SameSite=lax`); production checklist (HTTPS, backups, secrets)
* Swagger response schemas (`@ApiProperty`/`@ApiResponse` on response DTOs) so frontend types can be generated from `/api-json` (frontend declined type generation for now: B→F-12)
* Configurable refresh cookie `Path` (frontend request F→B-06); today it is hard-coded to `/auth/refresh` in `auth.constants.ts`
* Brute-force protection beyond rate limits (decided 2026-10-30: after the pilot presentation): per-account lockout (counter with a time window, `account_locked` code, admin reset unlocks, super admin exempt), optional `deviceId` for audit logs only (never a security barrier; MAC addresses are not readable from a browser)
* Fix or remove `POST /auth/logout` (the cookie Path means browsers never send the cookie)
* `PATCH /users/me` (edit own name)
* Database-level one-admin-per-organization guard (e.g. `Organization.adminId @unique`) if the service rule proves fragile
* A CHECK that non-super-admin users always have an organization and role
* Organization: more fields, rename endpoint, own module permissions
* Custom roles per organization
* Remove or implement the inert `includeDeleted` pagination field
* Per-species value ranges
* bull-board `/queues`: put authentication in front before any non-local exposure
* Dead-letter/failed-job alerting; cleanup job for expired `EmailVerification`; timeout on `EmailService.sendMail()`; Mailpit as a systemd service
* Repo hygiene: `package.json` name and version, `.env.example` database name (`nestjs_boilerplate_db`)
* Unit and e2e specs are stale after the refactors (`pnpm test` fails); update or rewrite them before the first release
* Brute-force protection beyond rate limits (decided 2026-10-30: after the pilot presentation): per-account lockout (counter with a time window, `account_locked` code, admin reset unlocks, super admin exempt), optional `deviceId` for audit logs only (never a security barrier; MAC addresses are not readable from a browser)