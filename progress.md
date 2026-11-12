# Progress

## Current state

Implemented (T2–T18): login by username (httpOnly refresh cookie with rotation, grace window, single session with takeover), password change and admin-driven password reset, organizations with their admin (and admin transfer), per-organization role rows and their editing by the org admin, user management (list, create, update, deactivate, reset password, delete), tanks (list, create, rename, deactivate), offline readings sync (`POST /readings/sync`), the admin-action log, the error-code contract, per-route rate limits, RBAC with a DB-only super admin, pagination, response envelope, health checks, pino logging, Swagger response schemas. Email features (verification, forgot/reset password) exist but answer 503 `email_disabled` while `EMAIL_ENABLED=false`.

Not implemented (marked **planned** below): the password maximum (T22), the deployment guide and backups (T20).

Known bugs today:

* The refresh token lifetime is sliding, not fixed (each rotation gets a fresh 14 days).

Frontend (`hatchery-frontend`): Step 21d switches to the real auth, organization and user API (B→F-25); Step 21 (offline sync) follows against a mock built from the Readings contract below.

## Task plan

Recommended build order is the numeric order. "Docs first": each task updates its docs in the same commit.

| # | Task | Status | Depends on |
|---|---|---|---|
| T1 | Rewrite the six docs for the hatchery design | done | |
| T2 | Env/config: `TOKEN_EXPIRATION` default `1h` + format check (`/^\d+[smhd]$/`); add `PASSWORD_RESET_EXPIRATION`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_ENABLED`, `READING_FUTURE_TOLERANCE_MS` to Zod; remove `THROTTLE_TTL`/`THROTTLE_LIMIT` (limits are per-route constants, see Rate limits); `.env.example` and the README table match the Zod schema | done | |
| T3 | Rate limits per the "Rate limits" table (user-id tracker from the verified JWT `sub`, IP fallback; the global throttler runs before controller guards, so the tracker cannot rely on `req.user`); 429 carries `Retry-After`, exposed through CORS | Done | |
| T4 | Rename controller `/user` → `/users` (and `/user/me` → `/users/me`); update docs and Swagger. Done together with T8 as one breaking release for the frontend (paths, username login, new `/users/me`): until then the old `/user…` paths and email login must keep working | Done | T8 |
| T5 | `onDelete: Cascade` on the three auth tables; map Prisma `P2003` to 409 `conflict`; `deleteUser` blocks self, the org admin, and users who own readings (self-block now; org admin with T10, readings with T15) | done | |
| T6 | Error contract: `code` on every error, `errors: [{ field, code, params }]` via a `ValidationPipe` `exceptionFactory`, code list as constants; validation errors carry the top-level code `validation_failed`; oversized bodies answer 413 `payload_too_large` | Done | |
| T7 | Permission map refactor (per-resource actions, platform vs org scope); resolver stays on `Role.permissions` until T10 | Done | |
| T8 | (released together with T4) User fields `username`, `name`, `isActive`, `mustChangePassword`; login by username; `GET /users/me` new shape; `JwtStrategy.validate` loads the user per request; `user_inactive`, `must_change_password` | Done | T6, T7 |
| T9 | `prisma/seed.ts`: global roles + super admin from `SEED_SUPER_ADMIN_USERNAME`, `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` | Done | T7, T8 |
| T10a | `Organization`, `OrganizationRole`, `User.organizationId` (migration, dev DB reset); `resolveOrganizationId`; resolver switches to `OrganizationRole`; `GET /users/me` returns the real `organizationId` | done | T8, T9 |
| T10b | `POST/GET /organizations`; `POST /organizations/:id/transfer-admin`; `assignRole` can no longer assign `admin` and rejects targets outside the caller's organization; `deleteUser` refuses the organization's admin | done | T10a |
| T11a | `GET /users` scoped to one organization; `POST /users` (temporary password, `mustChangePassword`); one user response shape; a shared username and email availability check | done | T10b |
| T11b | `PATCH /users/:id` (role, active, name); `POST /users/:id/reset-password`; deactivation revokes sessions; the temporary `PATCH /users/:id/role` is removed | done | T11a |
| T12 | `GET/PATCH /organization-roles`; the `admin` role gets every org key in the resolver; remove the `organization-role:read` key (map, templates, seed) | done | T10b |
| T13 | Remove `/auth/register`, `/auth/register-async`; `EMAIL_ENABLED` gating (503 `email_disabled`) | done | T9 |
| T14 | `Tank` model; `POST/GET/PATCH /tanks` | done | T10a |
| T15 | `Reading` model; `POST /readings/sync` | done | T6, T14 |
| T16 | Session hardening: transaction + grace window + token family + `session_revoked` + takeover; revoke all older refresh tokens on password change (the response issues a fresh pair), reset and deactivation | done | T8 (best before T15) |
| T17 | `AdminActionLogger` (`common/audit/`) and one structured pino line per successful admin action, catalog in `AGENTS.md` → Business rules (including the user's own password change, user delete and tank create/update); required before the pilot goes live | done | T10b, T11b, T14 |
| T18 | Swagger response schemas for every endpoint (response DTOs with `@ApiProperty`, one decorator that describes the `{ success, statusCode, data, timestamp }` envelope), after the shapes are settled | done | T14, T15, T17 |
| T19 | Production readiness in code: `REFRESH_COOKIE_PATH` (env, default `/auth/refresh`) and `TRUST_PROXY` (hop count, default 0) settings; Swagger (`/api`, `/api-json`) off in production unless `SWAGGER_ENABLED=true`; queues (BullMQ, Redis) and the `/queues` dashboard load only when `EMAIL_ENABLED=true`; `x-powered-by` off (code in commit 06373c5, which also carries a COORDINATION.md row under a frontend commit message) | done | T18 |
| T20 | `DEPLOY.md` (Render + Neon + Vercel rewrite step by step, production env table, build and start commands, finding the right `TRUST_PROXY`) and a nightly `pg_dump` backup workflow (GitHub Actions); required before real hatchery data enters production | not started | T19 |
| T21a | Per-endpoint error declarations (F→B-29 items 1 and 4): `@ApiErrors(...codes)` on every endpoint lists only the response-level codes it can return (the status comes from `RESPONSE_ERROR_STATUS` in `error-codes.ts`; the schema narrows `statusCode` and `code` per status); `ErrorCode` and `FieldErrorCode` are named enum schemas; `Retry-After` declared on every 429; the refresh cookie (name, path) on the auth endpoints; `x-works-while-must-change-password` on the endpoints that work while the password is temporary | done | T18, T19 |
| T21b | Request limits and nullability (F→B-29 items 2 and 3): limits live in shared constants used by both the validators and `@ApiProperty` (`recordedAt` date-time, uuid formats, the measurement limits, `maxItems` 100, `maxLength` 200, name and password lengths), `nullable` and `required` checked on every response DTO; the Swagger setup moves to `src/swagger.ts`; `pnpm swagger:export` writes the committed `openapi.json` without a database (Swagger is off in production) and `pnpm swagger:check` fails when it is stale | done | T21a |
| T22 | Password maximum (Open decision #4): new passwords are 6 to 72 characters, with a letter and a number as before; `PASSWORD_MAX` in `limits.ts`, enforced inside `IsCustomStrongPassword()` and declared as `maxLength` in the schema; login keeps no maximum | not started | T21b |

## API contract

Responses use the envelope `{ success, statusCode, data, timestamp }`. "Status": **implemented** = exists today; **planned** = decided, task in brackets. Organization-scoped endpoints take `organizationId` (query for GET, body for POST) from the **super admin only** (required); everyone else uses their own organization.

| endpoint | auth / permission | request | `data` | status |
|---|---|---|---|---|
| `POST /auth/login` | none | `{ username, password }` | `{ access_token }` + cookie `refresh_token` (httpOnly, Path `/auth/refresh`, 14 days) | implemented; answers 200 |
| `POST /auth/refresh` | cookie | — | `{ access_token }` + new cookie | implemented; answers 200; rotation, grace window and single session (T16); 401 `user_inactive` for a deactivated user (T11b) |
| `POST /auth/refresh/logout` | cookie | — | `{ message }`, cookie cleared | implemented |
| `POST /auth/logout` | cookie | — | `{ message }` | implemented but unusable from a browser (wrong cookie Path); see parking lot |
| `GET /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password` | none | token / email / `{ token, newPassword }` | `{ message }` | implemented; 503 `email_disabled` when `EMAIL_ENABLED=false` |
| `GET /users/me` | Bearer | — | `{ id, email, username, name, isSuperAdmin, organizationId, permissions (always an array, never missing), mustChangePassword, role: { name } \| null }` | implemented (T4, T8). `organizationId` is `null` for the super admin |
| `PATCH /users/me/password` | Bearer | `{ currentPassword, newPassword }` | `{ message, access_token }` + new `refresh_token` cookie | implemented (T16): clears `mustChangePassword`, revokes all older refresh tokens and issues a fresh pair (the cookie Path means the endpoint cannot tell which token is the current one) |
| `GET /users` | `user:read` | `page, pageSize, organizationId` (required for the super admin; a normal caller may only name their own) | `{ items, meta }`; each item is the user shape below | implemented (T11a). Always one organization, newest first. 400 `organization_required`, 403 `no_organization` or `organization_mismatch` |
| `POST /users` | `user:create` | `{ username, email, name?, roleId, temporaryPassword, organizationId? }` | the user shape | implemented (T11a). `mustChangePassword` is true. `roleId` can never be `admin` (403 `permission_denied`) and must exist among the organization's roles (400 `bad_request`). 409 `username_taken` or `email_taken`. `organizationId` only for the super admin |
| `PATCH /users/:id` | `user:write` | `{ roleId?, isActive?, name? }` (at least one field) | the user shape | implemented (T11b). A target outside your organization (or a super admin account): 404. Role change or deactivation of the organization's admin: 409 `org_admin_protected`. Changing your own role or active flag: 409 `cannot_target_self`. `roleId` admin: 403 `permission_denied`. Deactivating revokes all of the user's refresh tokens |
| `POST /users/:id/reset-password` | `user:reset-password` | `{ temporaryPassword }` | `{ message }` | implemented (T11b). Sets `mustChangePassword` and revokes all sessions. A target outside your organization: 404. The organization's admin: only the super admin (else 403 `permission_denied`). Your own account: 409 `cannot_target_self` (use `PATCH /users/me/password`) |
| `DELETE /users/:id` | `user:delete` (super admin) | — | `{ message }` | implemented (T4, T5). Super admin only. 404 for an unknown user; 409 `cannot_target_self`; 409 `org_admin_protected` for an organization's admin |
| `GET/POST /roles`, `/roles/:id` | super admin | see Swagger | Role | implemented (global role CRUD) |
| `POST /organizations` | `organization:create` | `{ name, admin: { username, email, name?, temporaryPassword } }` | `{ id, name, admin: { id, username, email, name } }` | One transaction: organization, `OrganizationRole` rows copied from the global roles, the admin user (`admin` role, `mustChangePassword`) |
| `GET /organizations` | `organization:read` | `page, pageSize` | `{ items: [{ id, name }], meta }` | |
| `POST /organizations/:id/transfer-admin` | `organization:transfer-admin` | `{ newAdminUserId, previousAdminRoleId }` | `{ message }` | 404 for an unknown organization or a user outside it; 409 `conflict` if the new admin is inactive; 400 `bad_request` if the user is already the admin or `previousAdminRoleId` is the admin role |
| `GET /organization-roles` | any organization member (no key) | `organizationId` (super admin; required) | `[{ id, roleId, name, permissions, editable }]`, not paginated. The `admin` entry lists every org key and has `editable: false`. Super admin without `organizationId` → 400 `organization_required`; user without an organization → 403 `no_organization` | implemented (T12) |
| `PATCH /organization-roles/:id` | `organization-role:write` | `{ permissions }` (the full new list; org-level keys only; duplicates ignored) | the row, same shape as a list item | implemented (T12). A row of another organization: 404. The `admin` row: 403 `permission_denied`. Adding a key the caller does not hold: 403 `permission_denied` (removing is allowed). A platform or unknown key: 400 `validation_failed` with `field: permissions`, `code: not_allowed`. Effective on the next request; the client sees it at its next `GET /users/me` |
| `GET /tanks` | any organization member | `organizationId` (super admin) | `[{ id, name, isActive }]` (inactive tanks included; ordered by name; not paginated). Super admin without `organizationId` → 400 `organization_required`; user without an organization → 403 `no_organization` | implemented (T14) |
| `POST /tanks`, `PATCH /tanks/:id` | `tank:create`, `tank:write` | `{ name, organizationId? }` (`organizationId` is required for the super admin); `{ name?, isActive? }` (at least one) | the tank, same shape as a list item | implemented (T14). `name` is trimmed, 1–50 characters, unique within the organization ignoring case: a duplicate is 409 `tank_name_taken`. `PATCH` with no field: 400 `bad_request`. An inactive tank can still be renamed. A tank of another organization: 404 `tank_not_found` |
| `POST /readings/sync` | `reading:create` | see below | see below | implemented (T15) |
| `GET /health` | none | — | `{ status, info, error, details }` | implemented |

**User shape** (T11a): `{ id, username, email, name, isActive, mustChangePassword, organizationId, role: { id, name } | null, createdAt }`. The role carries no permissions: the global role's list is only a template, the real permissions are per organization.

Pagination (inside `data`): `{ "items": [], "meta": { "total", "page", "pageSize", "totalPages", "hasNextPage" } }`. Defaults: `page=1`, `pageSize=10`.

Error envelope: see `AGENTS.md` → Error contract. Today: `{ success:false, statusCode, path, message, timestamp }`.

### Validation rules (T21b)

The same numbers are declared in `/api-json` and `openapi.json`. The frontend does not copy these rules; it trims, lowercases and leaves the rest to the backend answer.

* `username`: lowercased and trimmed first; `a-z 0-9 . _ -`, 3–30 characters (`invalid_username`).
* New passwords (`temporaryPassword`, `newPassword`): 6 to 72 characters (`too_short { min: 6 }`, `too_long { max: 72 }`) with at least one letter and one number (`weak_password`). 72 is bcrypt's limit: it silently ignores anything past 72 bytes, so a longer limit would give a false sense of strength. `POST /auth/login` wants 6 or more characters in `password` and has no maximum, so a shorter one answers 400 `validation_failed` (`too_short`) and not 401 `invalid_credentials`, and an account with an older, longer password can still sign in.
* `email`: a valid address, lowercased and trimmed.
* User `name`: optional, at most 100 characters. Organization `name`: trimmed, 1–100. Tank `name`: trimmed, 1–50. Role `name`: at least 2.
* Role and organization-role `permissions`: only organization-level keys (`not_allowed`).
* Lists: `page` 1 or more (default 1), `pageSize` 1–100 (default 10).
* Readings sync: 1–100 items per call; the item rules are in the next section.

### Readings sync (T15)

"Batch" is reserved for the hatchery production batch (frontend Step 25); this endpoint is "sync".

Request: `{ items: [{ id, tankId, recordedAt, ph, temperatureC, salinityPpt, oxygenMgL, note? }] }`, 1–100 items (the frontend sends 20–50 per call on weak networks). `id` is a client UUID v4 (`invalid_uuid` otherwise). `recordedAt` is ISO 8601 with a time zone (`Z` or `±hh:mm`; otherwise `invalid_datetime`).

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
* `recordedAt` before 2020-01-01T00:00:00Z → `out_of_range` with `params: { min }` (an ISO string). An older value means a wrong phone clock.
* Hard limits cover impossible values only, not ideal ranges: numbers must be finite; pH 0–14, temperature 0–60 °C, salinity 0–100 ppt, oxygen 0–30 mg/L, outside → `out_of_range { min, max }`. A dangerous but possible reading (low oxygen, odd pH) is stored. Ideal ranges and review flags wait for the owner (Open decisions). `note` is trimmed, at most 200 characters, and an empty note is stored as null.
* `tankId` must belong to the caller's organization (super admin: any organization), else `tank_not_found`. Inactive tanks are accepted.
* Same `id` from another user → `id_conflict`.
* `identical` compares `tankId`, `recordedAt` (as an instant), the four values and `note`.
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
| `session_revoked` | 401 | the session ended: another device logged in, a refresh token was reused, or the password changed |
| `unauthorized` | 401 | missing or invalid token |
| `must_change_password` | 403 | change the temporary password first |
| `permission_denied` | 403 | missing permission, or an action the caller may not perform (granting a key you do not hold, editing the `admin` row) |
| `no_organization` | 403 | user has no organization |
| `organization_mismatch` | 403 | asked for another organization |
| `org_admin_protected` | 409 | action not allowed on the organization's admin (deactivate, delete, role change) |
| `cannot_target_self` | 409 | cannot delete, deactivate, change the role of, or reset the password of yourself |
| `username_taken`, `email_taken`, `tank_name_taken`, `conflict` | 409 | uniqueness or foreign-key conflict |
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
* 2026-11-05: `POST /auth/login` and `/auth/refresh` answer 200, not 201. Access token lifetime is 15m in the pilot (a short token bounds how long an older device works after a takeover). Password change and reset revoke all refresh tokens; the change route lives in `AuthModule` to avoid a circular module dependency.
* 2026-11-06: The frontend starts its backend integration after T10 and T11 (auth, organizations and user management together). The `COORDINATION.md` go-signal (B→F-25) and the frontend repo sync happen then. T10 is delivered in two commits: T10a (schema, resolver, helper) and T10b (organization endpoints and admin rules).
* 2026-11-06: Admin transfer locks the organization row (`SELECT ... FOR UPDATE`) so two transfers cannot leave two admins. `PATCH /users/:id/role` stays until T11 replaces it with `PATCH /users/:id`; until then it can never assign `admin`, never touches the organization's admin, and answers 404 for a target outside the caller's organization.
* 2026-11-06: T11 is delivered in two commits (T11a list and create, T11b change and reset). A user cannot change their own role or active flag through `PATCH /users/:id` (409 `cannot_target_self`), so `user:write` is never a self-escalation path. Super admin accounts are never targets of `/users/:id` routes (404).
* 2026-11-07: `POST /auth/refresh` answers 401 `user_inactive` (not the generic 401) when the user was deactivated, the same code as login and the per-request check, so the frontend handles one case. Deactivation revokes every refresh token of the user; the per-request `isActive` check already stops the access token at once.
* 2026-11-07: Role permissions stay per organization and are edited by the org admin (`OrganizationRole`). Global-only permissions (one place, edited by the super admin) were considered and dropped: the per-organization model is already built, and hatcheries may need different permissions.
* 2026-11-07: Nobody can grant a key they do not hold (removing is allowed). The `admin` role always has every org key in the resolver (its row is never read), so a new key reaches existing organizations without a data migration. `GET /organization-roles` is readable by any organization member, so the `organization-role:read` key is removed; the create-user form needs the list.
* 2026-11-07: Users leave an organization by deactivation; hard delete stays super-admin only (reaffirms 2026-10-17). Admin-driven password reset stays for now. Accountability comes from the admin-action log: the reset and the user's own password change are logged with the actor, and T17 is required before the pilot goes live.
* 2026-11-08: Tank names are trimmed, 1–50 characters, unique within an organization ignoring case (checked in the service; the database index stays case-sensitive and only catches a race), duplicate → 409 `tank_name_taken`. Tank create and update (name, active) go into the admin-action log. Build order from here: T14, T15, T17, T18, then the frontend connects to the production server; T17 must be done before real hatchery data enters. Swagger response schemas wait until the shapes are settled (T18).
* 2026-11-08: Readings sync details. Value limits are impossible-value guards, never ideal ranges (pH 0–14, temperature 0–60 °C, salinity 0–100 ppt, oxygen 0–30 mg/L): a dangerous reading must be stored. `recordedAt` needs a time zone and is not accepted before 2020-01-01 (UTC); the future limit stays (10 minutes, `recorded_at_in_future`). `note` is trimmed, empty becomes null. `GET /readings` is not part of T15.
* 2026-11-08: Admin-action log (T17). One pino line (`msg: "admin_action"`) with `{ action, actorId, organizationId, targetId, details }`, written by `AdminActionLogger` after the change is saved; failed attempts are not logged. `details` records what changed (role `{ from, to }`, permissions `{ added, removed }`, tank fields `{ from, to }`) and never a password, hash or token. `user.delete` (super admin) is added to the list; a user's `name` change is not logged. The log is pino output, not durable or tamper-evident: the `AuditLog` table stays in the parking lot. No frontend impact.
* 2026-11-09: Swagger response schemas (T18). Every endpoint declares its response through `ApiEnvelope`, `ApiPaginatedEnvelope` and `ApiErrors` (`common/swagger/`); response shapes are `*ResponseDto` classes and the mappers and services are typed with them, so a drift between code and documented shape fails the build. `DELETE /users/:id` now returns `{ message }` as the contract always said (it returned the raw user record). `/health` keeps its own documentation. The contract stays in `progress.md`; `/api-json` must say the same.
* 2026-11-10: Pilot hosting: backend on Render's free web service, database on Neon's free Postgres (Render's own free Postgres expires after 30 days), frontend on Vercel Hobby, no domain yet. The browser talks only to the Vercel origin: the frontend proxies `/api/*` to the backend with a Vercel rewrite, so the refresh cookie is first-party (`SameSite=lax`, no CORS needed) and `REFRESH_COOKIE_PATH` becomes `/api/auth/refresh`. Cross-site cookies (`SameSite=none` between `vercel.app` and `onrender.com`) are rejected because some browsers block them. Render has no shell, so migrations and the seed run in the build step (`prisma migrate deploy`, `prisma db seed`; the seed is idempotent). Render's free tier is not meant for production (its docs say so) and sleeps after 15 minutes (about a minute to wake); that is acceptable for the pilot because sync is offline-first, but the first request after a sleep can be slow and the frontend must retry. Real hatchery data waits for the nightly backup (T20). Configuration stays in environment variables only, so a move to a dedicated VPS is a data restore plus an env change. Redis is not deployed: queues and the `/queues` dashboard (which has no login) load only when `EMAIL_ENABLED=true`. Swagger is off in production unless `SWAGGER_ENABLED=true`.
* 2026-11-11: T19 verified on a real server: no Redis needed with email off, `/queues` answers 404, the refresh cookie path and `TRUST_PROXY` follow their settings (65 refresh calls with different `X-Forwarded-For`: 5 answers 429 with `TRUST_PROXY=0`, none with `1`), Swagger answers 404 when `SWAGGER_ENABLED=false`. F→B-29 is accepted as T21, done before T20 because the frontend's Step 21d waits for it. The sync limit is 100 items (not the 20 that F→B-29 assumed).
* 2026-11-11: T21 is split. T21a (error declarations, `Retry-After`, cookie, the must-change-password marker) comes first because the frontend's Step 21d waits for it; T21b (request limits, nullability, exported `openapi.json`) follows before Step 21. `@ApiErrors` takes only response-level codes (typed `ResponseErrorCode`); field-level codes are in `errors[]` (`FieldErrorCode`).
* 2026-11-11: T21b design. Numeric limits live in one shared constant per module (for example `TANK_NAME_MAX`, the reading `LIMITS`) that both the validator and `@ApiProperty` use, so the code and the schema cannot drift apart. The Swagger setup moves to `src/swagger.ts` and `main.ts` and the export script share it. `pnpm swagger:export` builds the document in preview mode (no database) and writes `openapi.json`; `pnpm swagger:check` fails when the file is stale. The frontend reads `openapi.json` (the owner copies it, like `COORDINATION.md`). New "Validation rules" section in the API contract; the new-password minimum is 6 today (the seed script wants 8): see Open decisions #4.
* 2026-11-12: T21b is done. `openapi.json` at the repository root is generated by `pnpm swagger:export` in preview mode (no database needed) and checked with `pnpm swagger:check`; it equals the running server's `/api-json`. The response class for a created organization's admin is `OrganizationCreatedAdminDto` (it shared a name with the request class, so Swagger had merged the two schemas). `.env` is loaded as the first import of `main.ts`; with the import last, `EMAIL_ENABLED` in `.env` was read after the module list was built, so the queues did not load.
* 2026-11-12: Open decision #4 closed by the owner: the new-password minimum stays 6 (the seed script's 8 is only its own rule); a maximum of 72 is added because bcrypt ignores everything beyond 72 bytes (the owner's idea of a maximum of 10 was declined: short maximums push users to weaker passwords). Login keeps no maximum. A letter and a number stay required.

## Open decisions

| # | Decision | Needed by |
|---|---|---|
| 1 | Real hatchery value ranges (pH, temperature, salinity, oxygen) for review flags — the frontend's sample ranges are not confirmed | before `needsReview` is ever built |
| 2 | Mail provider and the day email is switched on (Brevo free tier is the candidate; needs a domain with SPF/DKIM) | when admins stop being able to handle resets |
| 3 | Whether to bring back `ReadingAudit` + PATCH | before the dashboard |
| 4 | Minimum length for new passwords: 6 today (plus a letter and a number); the seed script already demands 8. Raise the API to 8 for `temporaryPassword` and `newPassword` (login keeps accepting 6 or more, so existing accounts still sign in)? | before real users are created |

## Parking lot

* Refresh token absolute maximum age (e.g. 90 days) together with token families (T16)
* `ReadingAudit` and an audited PATCH for synced readings; `isLate` derived from `syncedAt - recordedAt`; `needsReview` once ranges are confirmed
* Pull sync (cursor `syncedAt`, not `recordedAt`), `GET /readings` (organization-wide, `reading:read-all`), dashboard index `[tankId, recordedAt]`
* Email: switch-on checklist, verification flow, email-based reset, invitation flow
* Dedicated VPS later: buy a domain and use `app.` and `api.` subdomains (cookie `SameSite=lax`, `REFRESH_COOKIE_PATH` back to `/auth/refresh`); HTTPS with Caddy; a mail provider needs the same domain
* Security headers with `helmet` (new dependency: ask the owner first)
* Optional uptime pinger to keep the Render free service awake
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
* Move the Prisma seed config from package.json#prisma to prisma.config.ts before upgrading to Prisma 7
* The username rule (`/^[a-z0-9._-]{3,30}$/`) went away with `RegisterDto`. Re-create it in `CreateUserDto` (T11).
* Admin-driven password reset: an admin can take over an account (set a temporary password, then change it). The log makes this traceable, not impossible. Revisit, together with the super admin being the only recovery path for a forgotten admin password (kept for now, decided 2026-11-07)
* Durable `AuditLog` table (tamper-evident, with retention) for the admin-action log: before the first real hatchery
* A reading's `createdById` identifies an account, not a person (shared or reset accounts)
* A phone clock that runs ahead blocks its readings (`recorded_at_in_future`). Owner's idea (2026-11-08): store the server time instead of rejecting, with a flag on the result. Revisit if field staff get stuck during the pilot.
* A wrong current password on `PATCH /users/me/password` answers 403 with the generic `permission_denied`; a dedicated code (for example `invalid_current_password`) would be clearer, but it changes the contract for the frontend
### Repository pattern
* Protect the `/queues` dashboard with a login before email is switched on in production
* `includeDeleted` appears in every paginated list query (from the boilerplate) although nothing is soft-deleted; remove it from `PaginationQueryDto` when the lists are next touched