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
| B→F-01 | 2026-10-20 | Request | Use `/users…` paths (`/users/me`, `/users/me/password`); no alias for `/user…` | accepted | T4 |
| B→F-02 | 2026-10-20 | Request | Login with one lowercase `username` field plus `password` | accepted | T8 |
| B→F-03 | 2026-10-20 | Request | Read the new `GET /users/me` shape: top-level `permissions`, `isSuperAdmin`, `organizationId`, `mustChangePassword` | accepted | T8; update `meSchema` |
| B→F-04 | 2026-10-20 | Request | Tanks come from `GET /tanks` (cache in Dexie `tanks`, version 3), not `tanks.ts`; hide inactive tanks from new entries, keep history | accepted | T14. Built after Step 21 against the mock |
| B→F-05 | 2026-10-20 | Request | Forced password-change screen when `mustChangePassword` is true | accepted | T11 |
| B→F-06 | 2026-10-20 | Request | Map error `code` to i18n keys; never show `message`. Keep the English-string fallback until T6 ships | accepted | T6; codes in backend `progress.md` |
| B→F-07 | 2026-10-20 | Request | Handle 401 `user_inactive` separately from `session_revoked` | accepted | T8, T16 |
| B→F-08 | 2026-10-20 | Request | After the first send attempt, a pending reading must not be editable (a lost response plus an edit would come back as `duplicate` with the old values). Fix-and-resend of `rejected` items stays | accepted | T15. Step 21 (replaces the Step 16 rule "edit while pending") |
| B→F-09 | 2026-10-20 | Request | Refuse a future `recordedAt` at save time and warn about a wrong phone clock (server limit: 10 minutes) | accepted | T15. Step 20.7. Frontend limit: 5 minutes at save, stricter than the server's 10 |
| B→F-10 | 2026-10-20 | Recommendation | Send sync chunks of 20–50 items (server maximum is 100) | accepted | T15. Step 21 uses chunks of 20 |
| B→F-11 | 2026-10-20 | Recommendation | Deploy frontend and API under one registrable domain (`app.` / `api.`) so the cookie works with `SameSite=Lax` | open | needs a domain name |
| B→F-12 | 2026-10-20 | Recommendation | Generate API types from `/api-json` (new dependency: ask the owner first) | declined | Swagger has no response schemas. Backend parking lot: add `@ApiProperty`/`@ApiResponse` to response DTOs. Frontend also declines for now: few endpoints, and hand-written Zod validates at runtime |
| B→F-13 | 2026-10-20 | Question | Reading Zod field names, types, and the ranges the stepper allows (backend limits must never be narrower) | accepted | Field names and types: `src/shared/schemas/waterQuality.schema.ts`. Ranges are samples until the owner confirms real values; check them against the backend limits before release |
| B→F-14 | 2026-10-20 | Question | Retry policy in plan section 8b: backoff values and maximum attempts | done | Plan section 8b, Retry policy: about 3 attempts, 2 s doubling, sync timeout 15-20 s; 429, 413, 401 and 403 rules |
| B→F-15 | 2026-10-20 | Notice | The sync endpoint is `POST /readings/sync`. "Batch" is reserved for the production batch of Step 25 | done | Acknowledged. The frontend says "sync" for readings and keeps "batch" for Step 25 |
| B→F-16 | 2026-10-20 | Notice | The frontend does not implement signup; backend signup is being removed. Users are created by the super admin (first admin) and org admins | done | Acknowledged. There is no signup screen in the frontend |
| B→F-17 | 2026-10-26 | Request | When `organizationId` from `GET /users/me` is null (super admin), do not call `GET /tanks` or `POST /readings/sync`; show an empty state | accepted | T14, T15. Applied when tanks and sync meet the real backend; the mock sync is unaffected |
| B→F-18 | 2026-10-26 | Request | `PATCH /users/me/password` returns `{ message, access_token }` and sets a new refresh cookie; replace the stored access token, no extra refresh or login | accepted | T11, T16. Applied with the forced password screen (needs `setAccessToken`) |
| B→F-19 | 2026-10-26 | Request | Treat 429 on `POST /readings/sync` as transient: keep the items pending and retry after the `Retry-After` header; never mark items `failed` because of it | accepted | T3, T15. Step 21: 429 waits for `Retry-After` (falls back to backoff if the header is missing); login 429 shows a toast |
| B→F-20 | 2026-10-26 | Notice | Backend delivers T4 (`/users` paths) and T8 (username login, new `/users/me`) as one release; until then `/user…` paths and email login keep working | done | Acknowledged. The frontend switches in one step at delivery |
| B→F-21 | 2026-10-29 | Request | Match `POST /readings/sync` results to items by `index` (always present), not by `id`; `id` is echoed only when the item had a string `id`. A bad item never causes HTTP 400, only a bad envelope does | accepted | T15. Step 21 maps results by `index`; a whole-request 400 is treated as a frontend bug (chunk stays pending, reported to errorStore) |

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
| F→B-18 | 2026-10-25 | Request | Sync chunks: please state in `progress.md` the request body size limit and the exact whole-request 400 shape (`{ field, code, params }`), so the client can tell a bad chunk from a bad item | done | Step 21. In `progress.md` → Readings sync: body limit 100 KB (413 `payload_too_large`). Whole-request 400 only for a bad envelope (items missing, not an array, empty, over 100): `code: validation_failed`, `errors[]` with `field: items`. Any item problem is a per-item `rejected`. T15 |
| F→B-19 | 2026-10-25 | Request | `POST /readings/sync` must accept the same item again after a `rejected` result (same `id`, corrected values) and treat it as new | accepted | Yes: a `rejected` item is not stored, so it is processed as new (except `id_conflict`: new UUID). T15 |
| F→B-20 | 2026-10-25 | Request | Add the error code for a malformed or missing `tankId` format and for a note longer than 200 characters to the code list (`note_too_long` or the generic `out_of_range` with params) | accepted | No new codes: malformed `tankId` = `invalid_uuid`, missing = `required`, note over 200 = `too_long { max: 200 }`. Params: `too_long { max }`, `too_short { min }`, `out_of_range { min, max }`. T15 |
| F→B-22 | 2026-10-25 | Question | After `must_change_password` is cleared by `PATCH /users/me/password`, does the response return a new access token, or must the client call refresh or login again? | done | Answered by B→F-18: returns `{ message, access_token }` and sets a new refresh cookie |
| F→B-23 | 2026-10-26 | Request | Throttling on authenticated routes (`POST /readings/sync`, `GET /tanks`, `GET /users/me`) should be keyed by user id, not only by IP. Please state the values per route in `progress.md` | done | Field staff on mobile networks often share one public IP, so an IP-only limit can block many users at once. Backend: per user id on authenticated routes (default 120/min, sync 30/min); per IP on login (10/min), refresh (60/min) and other tokenless routes (100/min). Values: `progress.md` → Rate limits. T3 |
| F→B-24 | 2026-10-28 | Question | Which malformed-item cases give a whole-request 400 (`validation_failed`, path `items.N.field`) and which give a per-item `rejected` (`invalid_type`, `invalid_uuid`)? One bad item must not block its whole chunk | done | Only a bad envelope gives 400 (field `items`); every item problem, including a bad `id`, is a per-item `rejected`. Results carry `index`. T15 |
| F→B-25 | 2026-10-28 | Recommendation | Key the login limit by IP plus username (not IP alone), so staff sharing one hatchery IP do not block each other. Keep a looser per-IP ceiling | open | Optional; owner decision. Related: refresh is limited per IP too |
| F→B-26 | 2026-10-29 | Notice | Housekeeping: the B→F-18 row is missing (F→B-22 cites it) and two rows sit in the wrong table (F→B-18 in Backend → Frontend, B→F-21 in Frontend → Backend). Please re-add B→F-18 (the answer that `PATCH /users/me/password` returns `{ message, access_token }` and sets a new refresh cookie) and keep both copies identical. Rows are not moved (rule 2); their Notes point to the current copy | done | Restored B→F-18. The two stray rows (F→B-18 in the Backend → Frontend table, B→F-21 in the Frontend → Backend table) were copy errors and were removed in both repos; the current copies are in the right tables |