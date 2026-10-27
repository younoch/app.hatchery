# Progress

## Current state
Auth, RBAC, email verification, password recovery, and refresh tokens are implemented. Registration can be synchronous or queued via BullMQ. Users can be listed, deleted, and assigned roles with permission checks. Health checks cover DB and memory. Missing: domain models for water-quality (Organization, Tank, Reading), audit trails, and advanced refresh-token hardening.
Known issue: `DELETE /user/:id` fails with FK error (P2003 → 500) for any user who has a RefreshToken or PasswordResetToken, because `deleteUser` only clears EmailVerification.

## Backend task list
| Task | Name | Status | Evidence (file/endpoint) | Open issue |
|---|---|---|---|---|
| 1 | Refresh token in httpOnly cookie | done | POST /auth/login sets refresh_token cookie, Path /auth/refresh | |
| 2 | 14-day TTL, sliding, rotation grace window | partial | TTL 14 days fixed (not sliding), rotation works, no grace window | |
| 2b | Single active session + session_revoked code | not started | No session_revoked error code, no family tracking | |
| 3 | Idempotent create + batch sync (readings) | not started | Reading model NOT IMPLEMENTED | blocks Step 21 sync |
| 4 | Server trust rules (createdById, syncedAt, future-date, isLate/needsReview) | not started | Reading model NOT IMPLEMENTED | blocks Step 21 sync |
| 5 | Audited PATCH for synced readings | not started | ReadingAudit model NOT IMPLEMENTED | |
| 6 | Error contract (per-field codes, 4xx/5xx consistency, list shape) | partial | Global error envelope exists, per-field codes not implemented | |
| 7 | Expose isSuperAdmin (or effective permissions) on GET /user/me | not started | GET /user/me returns id, email, role (name, permissions) only; isSuperAdmin omitted | |
| 8 | Refresh-token hardening: transaction around rotation, family id, reuse revoke | not started | Rotation is non-transactional, no family id, reuse detection returns plain 401 | |
| 9 | Configurable refresh cookie Path | not started | Path hardcoded to /auth/refresh in auth.constants.ts | |
| 10 | Revoke other sessions on password change | not started | PATCH /user/me/password does not revoke other refresh tokens | |
| 11 | Decide: may unverified users log in? | not started | Currently yes; business rule not enforced | |
| 12 | Water-quality domain: Tank, Reading (+ ReadingAudit) models and endpoints | not started | Models NOT IMPLEMENTED | blocks Step 21 sync; needs Task 17 (Organization) first |
| 13 | Optional `User.name` (signup unchanged) | in progress | schema + getMe pending | |
| 14 | `DELETE /user/:id`: clear RefreshToken/PasswordResetToken before delete; map P2003 to 409 instead of 500 | not started | `UserRepository.deleteUser`, `HttpExceptionFilter` | does not block Task 12 |
| 15 | Env validation: `TOKEN_EXPIRATION` Zod default is `'3600'` (= 3.6s in jsonwebtoken); change to `'24h'` + format check | not started | env.validation.ts | |
| 16 | Env validation: add `PASSWORD_RESET_EXPIRATION`, `SMTP_HOST`, `SMTP_PORT` to Zod | not started | env.validation.ts | |
| 17 | Organization model (id, name only) + User.organizationId + Tank.organizationId | not started | schema | part of Task 12 migration |
| 18 | Admin transfer (super admin only): new admin gets `admin`, old admin gets a chosen role, one transaction, same organization | not started | new UserService method | needs Organization first |

## Verified API facts (frontend contract)
| endpoint | method | auth | request | success response | notes |
|---|---|---|---|---|---|
| /auth/login | POST | none | { email, password } | { access_token } + Set-Cookie: refresh_token (httpOnly, Path=/auth/refresh, Max-Age=1209600) | access_token in body only; refresh token only in cookie |
| /auth/refresh | POST | cookie (refresh_token) | refresh_token cookie | { access_token } + Set-Cookie: new refresh_token | Rotation: old token revoked, new pair issued |
| /auth/refresh/logout | POST | cookie (refresh_token) | refresh_token cookie | { message } + Set-Cookie: refresh_token cleared | Path must be /auth/refresh for cookie to be sent |
| /auth/logout | POST | cookie (refresh_token) | refresh_token cookie | { message } + Set-Cookie: refresh_token cleared | Does not receive cookie from browser (wrong path) |
| /auth/register | POST | none | { email, password } | { id, email, createdAt, updatedAt, emailVerified, isSuperAdmin, roleId } | Synchronous |
| /auth/register-async | POST | none | { email, password } | { message } | Queued via BullMQ, returns 202 |
| /auth/verify-email | GET | none | token query param | { message } | Validates token, marks User.emailVerified=true |
| /auth/forgot-password | POST | none | { email } | { message } | Generic response regardless of email existence |
| /auth/reset-password | POST | none | { token, newPassword } | { message } | Token single-use via used flag |
| /user/me | GET | Bearer (access_token) | none | { id, email, name, role: { name, permissions } } | name is nullable; isSuperAdmin NOT exposed |
| /user | GET | Bearer + user:read | query: page, pageSize, includeDeleted | envelope data = { items: User[], meta: { total, page, pageSize, totalPages, hasNextPage } } | Paginated, requires permission |
| /user/{id} | DELETE | Bearer + user:delete | none | { message } | Cannot delete own account (business rule) |
| /user/{id}/role | PATCH | Bearer + user:write | { roleId } | { message } | Only super admin can assign admin role |
| /user/me/password | PATCH | Bearer | { currentPassword, newPassword } | { message } | No permission guard, requires current password |
| /roles | GET | Bearer + role:read | none | Role[] | List all roles |
| /roles/{id} | PATCH | Bearer + role:write | { name, permissions } | Role | Update role |
| /health | GET | none | none | { status, info, error, details } | DB + memory checks, no throttling |

Response envelope (all successful responses):
```json
{ "success": true, "statusCode": number, "data": any, "timestamp": "ISO-8601" }
```

Error envelope:
```json
{ "success": false, "statusCode": number, "path": string, "message": string | object, "timestamp": "ISO-8601" }
```
Validation error shape (message is object):
```json
{ "statusCode": 400, "message": ["error1", "error2"], "error": "Bad Request" }
```

Throttle values per endpoint:
- Global: 100 requests per 60 seconds (hard-coded in app.module.ts, not from env)
- /health: exempt from throttling (unverified: AGENTS.md says exempt, code not checked)
- /auth/login: no override (uses global)
- env.example has THROTTLE_TTL=60 but Zod default is 60000 (ms). Currently unused by code; fix the unit before wiring env into app.module.ts.

Pagination shape:
```json
{ "items": T[], "meta": { "total": number, "page": number, "pageSize": number, "totalPages": number, "hasNextPage": boolean } }
```
Default: page=1, pageSize=10. includeDeleted query param exists but no soft-delete model currently.

Permission list (RESOURCES × ACTIONS):
- user:create, user:read, user:write, user:delete
- role:create, role:read, role:write, role:delete

Default roles: none seeded in code; must be created manually via API or DB.

## Decisions log
- 2026-10-15: Repository pattern — services never call Prisma directly; database access goes through repositories.
- 2026-10-15: No @Global() modules — consumers import dependencies explicitly.
- 2026-10-15: Refresh token stored as SHA-256 hash (not bcrypt) to enable direct DB lookup and avoid bcrypt's slowness for high-entropy tokens.
- 2026-10-15: Super admin is a DB-only boolean (User.isSuperAdmin), not a role; cannot be set through API.
- 2026-10-15: Password reset rules — repeatable requests, generic response regardless of email existence, single-use tokens via used flag, synchronous email.
- 2026-10-15: Refresh token only in httpOnly cookie with Path /auth/refresh; not in response body.
- 2026-10-15: Permissions only from /user/me, not in JWT; JWT carries only sub and email.
- 2026-10-15: Throttling hard-coded to 60s TTL / 100 limit globally; not using env vars.
- 2026-10-17: User.name is optional (String?); signup (email + password) stays unchanged.
- 2026-10-17: User deletion is super-admin-only for now. Domain-record deletion policy is deferred until the Organization module; Reading FKs stay required.

## Doc corrections
- AGENTS.md line 155 said login returns refresh_token in body; code returns only access_token in body, refresh_token only in cookie.
- README table showed env vars THROTTLE_TTL and THROTTLE_LIMIT with defaults; code hard-codes 60000ms and 100 limit, ignoring env.
- README line 107 said code fallback is 24h for TOKEN_EXPIRATION; code has no fallback, requires env or fails fast.
- progress.md pagination shape was wrong (said `data` + `total`); real shape is `items` + `meta` with totalPages/hasNextPage.
- SETUP.md smoke test step 3 said login returns refresh_token in body; it is cookie-only.
- TOKEN_EXPIRATION: AGENTS.md/README say 24h, env.example says 7d, Zod default is '3600'. Code fix tracked as Task 15.
- 2026-10-17: Organization starts with id + name only. One admin per organization, always present (for now). Admin transfer is super-admin-only; the super admin chooses the previous admin's new role. Enforced in service layer.

## Open decisions (settle in docs before the code that depends on them)
| # | Decision | Blocks |
|---|---|---|
| 1 | Organization module endpoints (create org, assign user to org, transfer admin, rename) | Task 17, 18 |
| 2 | Where the super-admin transfer-admin endpoint lives (new endpoint vs existing PATCH /user/:id/role) | Task 18 |
| 3 | After Organization exists, should `assignRole` stop assigning `admin` entirely? | Task 18 |
| 4 | Work order: Organization module before Readings | planning |
| 5 | Reading rules: future-date limit, `isLate` threshold, `needsReview` condition | Task 12 |
| 6 | Batch response shape (proposal: per item `{ id, status: created/duplicate/rejected, error? }`, whole batch always 200) | Task 12 |
| 7 | Validation error contract `{ field, code, params }` and its code list | Task 6, 12 |
| 8 | May unverified users log in? | Task 11 |
| 9 | `TOKEN_EXPIRATION` default: `24h` or short (e.g. `15m`) leaning on refresh | Task 15 |

## Parking lot
- Dead-letter/failed-job alerting beyond dashboard (Step 8 polish)
- RBAC: prevent privilege escalation via role permissions (regular admin with role:create/role:write can grant any permission)
- Frontend integration (FRONTEND_URL swap-in)
- Fix race condition: rapid concurrent register-async with same email can both pass sync duplicate-check
- Scheduled cleanup job for expired EmailVerification records
- Daemonize Mailpit as systemd service
- Add auth in front of @bull-board dashboard (/queues)
- Add timeout to EmailService.sendMail() calls
- Refresh-token hardening: transaction around rotation, family id, reuse-triggered revoke-all, session_revoked error code, single-active-session takeover
- Revoke other sessions on password change
- Decide: may unverified users log in?
- Expose isSuperAdmin or effective permissions on GET /user/me
- Configurable refresh cookie Path
- Error contract: per-field error codes, 4xx/5xx consistency, list shape
- Domain models: Organization, Tank, Reading, ReadingAudit (blocks Step 21 sync)
- Revisit user-deletion policy (soft delete vs snapshot) when Organization module is designed
- PATCH /user/me to edit name
- Organization: extra fields and its own module (controller/service/permissions)
- Enforce one-admin-per-org at DB level (e.g. Organization.adminId @unique) if the service-layer rule proves fragile
- Task 14 must also refuse to delete an organization's admin until the role is transferred (super admin deletes; still must not leave an org without admin)
- OPEN (decide when designing Organization module): where the super-admin transfer-admin endpoint lives (new endpoint vs existing PATCH /user/:id/role)
- OPEN (same time): once Organization exists, should `assignRole` stop assigning the `admin` role entirely, leaving only the transfer endpoint? (Leaving it open allows a second admin in one org.)
- Seed script (`prisma/seed.ts`) for roles + super admin, needed before removing public signup
- Reposition docs: README intro/Description, SETUP.md, `.env.example` DB name (`nestjs_boilerplate_db`), package.json name/version
- Configurable refresh cookie `Path` (frontend request F→B-06); today it is hard-coded to `/auth/refresh` in `auth.constants.ts`
  +* Swagger response schemas (`@ApiProperty`/`@ApiResponse` on response DTOs), so generated frontend types become possible (frontend declined type generation for now: B→F-12)
