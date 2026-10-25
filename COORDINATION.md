# COORDINATION.md — Frontend ↔ Backend log

Temporary working file. It is **identical in both repos** (`hatchery-backend`, `hatchery-frontend`) and is deleted when the project ends.

It records what each side asks of the other (requests and demands), what it recommends, questions, and announcements, with a status. It is **not** the API contract: the contract lives in the backend `progress.md` and the Swagger JSON (`/api-json`). Link to them; do not copy field lists here.

## Rules

1. **Identical copies.** Any edit in one repo is copied to the other repo in the same working session, with the commit message `docs: update coordination log`. Check with:
   ```bash
   diff ../hatchery-backend/COORDINATION.md COORDINATION.md
   ```
2. **Append-only.** Add entries and change statuses. Never delete, renumber or reorder entries. If both copies were edited, merge by entry ID.
3. **IDs.** `B→F-nn` = backend to frontend; `F→B-nn` = frontend to backend. Numbers only go up.
4. **Types.** *Request/Demand* = the receiver should do it. *Recommendation* = the receiver may decline, with a reason. *Question* = needs an answer. *Notice* = announcement of a change.
5. **Status.** `open` → `accepted` → `done`; or `declined` (reason in Note), `superseded` (say by which ID). The receiver sets the status; the sender may reopen.
6. **Contract changes.** The backend updates `progress.md` first, then adds a Notice here. The frontend never builds on a Notice alone.
7. **Done means moved.** When an item is done and its substance lives in the owning doc (backend `progress.md`, frontend plan or `PROGRESS.md`), mark it `done` and put the reference in Ref.
8. **Owner decisions** (product, scope) are recorded in each repo's Decisions log, not decided here.

## Backend → Frontend

| ID | Date | Type | Item | Status | Ref / Note |
|---|---|---|---|---|---|
| B→F-01 | 2026-10-20 | Request | Use `/users…` paths (`/users/me`, `/users/me/password`); no alias for `/user…` | open | T4 |
| B→F-02 | 2026-10-20 | Request | Login with one lowercase `username` field plus `password` | open | T8 |
| B→F-03 | 2026-10-20 | Request | Read the new `GET /users/me` shape: top-level `permissions`, `isSuperAdmin`, `organizationId`, `mustChangePassword` | open | T8; update `meSchema` |
| B→F-04 | 2026-10-20 | Request | Tanks come from `GET /tanks` (cache in Dexie `tanks`, version 2), not `tanks.ts`; hide inactive tanks from new entries, keep history | open | T14 |
| B→F-05 | 2026-10-20 | Request | Forced password-change screen when `mustChangePassword` is true | open | T11 |
| B→F-06 | 2026-10-20 | Request | Map error `code` to i18n keys; never show `message`. Keep the English-string fallback until T6 ships | open | T6; codes in backend `progress.md` |
| B→F-07 | 2026-10-20 | Request | Handle 401 `user_inactive` separately from `session_revoked` | open | T8, T16 |
| B→F-08 | 2026-10-20 | Request | After the first send attempt, a pending reading must not be editable (a lost response plus an edit would come back as `duplicate` with the old values). Fix-and-resend of `rejected` items stays | open | T15 |
| B→F-09 | 2026-10-20 | Request | Refuse a future `recordedAt` at save time and warn about a wrong phone clock (server limit: 10 minutes) | open | T15 |
| B→F-10 | 2026-10-20 | Recommendation | Send sync chunks of 20–50 items (server maximum is 100) | open | T15 |
| B→F-11 | 2026-10-20 | Recommendation | Deploy frontend and API under one registrable domain (`app.` / `api.`) so the cookie works with `SameSite=Lax` | open | needs a domain name |
| B→F-12 | 2026-10-20 | Recommendation | Generate API types from `/api-json` (new dependency: ask the owner first) | open | |
| B→F-13 | 2026-10-20 | Question | Reading Zod field names, types, and the ranges the stepper allows (backend limits must never be narrower) | open | |
| B→F-14 | 2026-10-20 | Question | Retry policy in plan section 8b: backoff values and maximum attempts | open | |
| B→F-15 | 2026-10-20 | Notice | The sync endpoint is `POST /readings/sync`. "Batch" is reserved for the production batch of Step 25 | open | |
| B→F-16 | 2026-10-20 | Notice | The frontend does not implement signup; backend signup is being removed. Users are created by the super admin (first admin) and org admins | open | T13 |

## Frontend → Backend

| ID | Date | Type | Item | Status | Ref / Note |
|---|---|---|---|---|---|
| F→B-01 | 2026-10-17 | Demand | Readings model, idempotent create by client UUID, sync endpoint with per-item results, server-owned `createdById` and `syncedAt`, future-time limit. Blocks Step 21 | accepted | T15; no `isLate`/`needsReview` in the pilot |
| F→B-02 | 2026-10-17 | Demand | `/user/me` must expose `isSuperAdmin` or the full permission list (the super admin has no role and sees nothing otherwise) | accepted | T8 |
| F→B-03 | 2026-10-17 | Demand | Refresh: grace window and a transaction, so a lost response does not log the user out | accepted | T16 |
| F→B-04 | 2026-10-17 | Demand | Single-session takeover and a `session_revoked` code | accepted | T16 |
| F→B-05 | 2026-10-17 | Demand | Machine-readable validation errors `{ field, code, params }` | accepted | T6 |
| F→B-06 | 2026-10-17 | Demand | Refresh cookie `Path` configurable; explicit production cookie flags and `TOKEN_EXPIRATION` | accepted | Flags and `TOKEN_EXPIRATION`: T2 and deployment (F-11). Configurable `Path`: parking lot |
| F→B-07 | 2026-10-17 | Demand | A password change revokes the user's other sessions | accepted | T16 |
| F→B-08 | 2026-10-17 | Question | May unverified users log in? | superseded | Login is by username and there is no email gating; see decisions log |
| F→B-09 | 2026-10-17 | Question | Who sees whose readings; last value per user or per tank | accepted | Last value stays per user and local; organization-wide viewing is online only, later, behind `reading:read-all` |
| F→B-10 | 2026-10-17 | Notice | The login endpoint showed no 429 after 12 calls; the README claim of a strict limit was wrong | done | Docs corrected; limit added in T3 |
| F→B-11 | 2026-10-17 | Notice | The refresh lifetime is sliding, not fixed as the docs said | done | Docs corrected; absolute maximum age is in the parking lot |
| F→B-12 | 2026-10-17 | Request | Tanks backend-driven after client feedback | accepted | T14 |
| F→B-13 | 2026-10-20 | Request | Stable machine codes, all listed in `progress.md`: `session_revoked`, `user_inactive`, `permission_denied`, `must_change_password`, and a code for a user without an organization (403 on sync) | accepted | All five codes are in backend `progress.md` → Error codes; no-organization code is `no_organization`. T6, T8, T16 |
| F→B-14 | 2026-10-20 | Request | `GET /users/me`: `permissions` is always an array (never missing); `role` is `{ name }` or `null` | accepted | Empty array when there are no permissions. T8 |
| F→B-15 | 2026-10-20 | Request | `GET /tanks` returns at least `id`, `name`, `isActive`; inactive tanks stay in the response; any organization member can read it | accepted | Plain array, not paginated. T14 |
| F→B-16 | 2026-10-20 | Request | Sync `duplicate` results carry `identical: true or false` |  accepted | Frontend warns when `false`. T15 |
| F→B-17 | 2026-10-20 | Request | Login 429 includes a `Retry-After` header | accepted | Header set by the throttler; backend also exposes it through CORS (`Access-Control-Expose-Headers`). T3 |