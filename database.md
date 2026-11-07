# Database

* Engine: PostgreSQL. ORM: Prisma.
* Migrations: `pnpm prisma migrate dev --name <name>` (see `project-commands.md`).
* IDs: every model uses `@default(uuid())`. No `cuid()`.
* This file describes the **target schema**. Fields and models marked **PLANNED** are not in `prisma/schema.prisma` yet; the task numbers are in `progress.md`. Update this file in the same commit as any schema change.
* Behavior rules (tenant isolation, admin rules, permissions) are in `AGENTS.md`, not repeated here.

## Models

### User
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| username | String | yes | - | Unique, stored lowercase, 3–30 chars `a-z 0-9 . _ -`. Login key |
| email | String | yes | - | Unique. Mandatory; not a login key |
| name | String | no | - | Optional display name |
| password | String | yes | - | bcrypt hash |
| emailVerified | Boolean | yes | false | Informational while email is disabled |
| isActive | Boolean | yes | true | false blocks login and refresh |
| mustChangePassword | Boolean | yes | false ||
| isSuperAdmin | Boolean | yes | false | DB-only, not settable via API |
| organizationId | String | no | - | FK to Organization. Null only for the super admin (and legacy signup users) |
| roleId | String | no | - | FK to Role (global). Null for the super admin |
| createdAt | DateTime | yes | now() | |
| updatedAt | DateTime | yes | updatedAt | |

Relations: Role (optional), Organization (optional), EmailVerification[], PasswordResetToken[], RefreshToken[], Reading[].
Unique: `username`, `email`. Index: `[organizationId]`.

### Role (global)
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| name | String | yes | - | Unique: `admin`, `manager`, `staff` (seeded, T9) |
| permissions | String[] | yes | - | Default template of `resource:action` keys. Copied into `OrganizationRole` when an organization is created |

Relations: User[], OrganizationRole[]. Deleting a role that is in use is blocked (Restrict).

### Organization
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| name | String | yes | - | Not unique for now |

Nothing else for now (no timestamps, no other fields). Relations: User[], OrganizationRole[], Tank[].
The "exactly one admin" rule is enforced in the service layer, not by the database.

### OrganizationRole
The permissions a role has inside one organization.
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| organizationId | String | yes | - | FK to Organization |
| roleId | String | yes | - | FK to Role |
| permissions | String[] | yes | - | Org-level keys only. Copied from `Role.permissions` at organization creation, then edited by the org admin. The `admin` row is created with the rest but never read: the `admin` role always gets every org key in the resolver |

Unique: `[organizationId, roleId]`.
A user's effective permissions are the row matching `(user.organizationId, user.roleId)` (the `admin` role is the exception: every org key).

### Tank
PLANNED (T14).
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| organizationId | String | yes | - | FK to Organization |
| name | String | yes | - | Unique within the organization |
| isActive | Boolean | yes | true | Deactivated, never deleted. Readings of an inactive tank are still accepted |

Unique: `[organizationId, name]`. Index: `[organizationId]`.

### Reading
PLANNED (T15). Immutable in the pilot.
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | - | Client UUID = primary key = idempotency key |
| tankId | String | yes | - | FK to Tank |
| createdById | String | yes | - | FK to User. From the token only. Required, onDelete Restrict |
| ph | Float | yes | - | |
| temperatureC | Float | yes | - | |
| salinityPpt | Float | yes | - | |
| oxygenMgL | Float | yes | - | |
| note | String | no | - | Max 200 chars |
| recordedAt | DateTime | yes | - | From the client (ISO 8601) |
| syncedAt | DateTime | yes | now() | Set by the server only |

Index: `[createdById, tankId, recordedAt]` (matches the frontend's local index). Add `[tankId, recordedAt]` when the dashboard needs per-tank charts.
Value limits (impossible values only) and the future-time limit are validated in the service; see `progress.md` → Readings sync.
Deliberately absent in the pilot: `isLate`, `needsReview` (derive `isLate` from `syncedAt - recordedAt` later), `ReadingAudit`, any edit path.

### EmailVerification
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| userId | String | yes | - | FK to User, unique (one-to-one) |
| token | String | yes | - | Unique, high-entropy, not hashed |
| status | VerificationStatus | yes | PENDING | PENDING, SENT, VERIFIED, EXPIRED |
| expiresAt | DateTime | yes | - | |
| createdAt | DateTime | yes | now() | |

Dormant while `EMAIL_ENABLED=false`. onDelete Cascade.

### PasswordResetToken
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| userId | String | yes | - | FK to User |
| token | String | yes | - | Unique, not hashed |
| used | Boolean | yes | false | Single-use flag |
| expiresAt | DateTime | yes | - | |
| createdAt | DateTime | yes | now() | |

Dormant while `EMAIL_ENABLED=false`. onDelete Cascade.

### RefreshToken
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| userId | String | yes | - | FK to User |
| token | String | yes | - | Unique, SHA-256 hash (plaintext never stored) |
| revoked | Boolean | yes | false | |
| expiresAt | DateTime | yes | - | `REFRESH_TOKEN_TTL_MS` from each rotation (sliding) |
| createdAt | DateTime | yes | now() | |
| familyId | String | yes | - | Token family for reuse detection |
| replacedByTokenId | String | no | - | Self FK for the grace window |
| graceUsedAt | DateTime | no | - | Set once when the token is accepted again inside the grace window |

### VerificationStatus (enum)
PENDING, SENT, VERIFIED, EXPIRED.

## Deleting users

* The three auth tables above use `onDelete: Cascade`: they are throwaway when the user goes (T5; this also fixes `DELETE /users/:id` failing with a foreign-key error).
* Domain records use Restrict: a user who owns readings cannot be deleted; the API answers 409. Only the super admin can delete users.
* No soft delete. `PaginationQueryDto` still has an `includeDeleted` field that does nothing (parking lot).
* Revisit (soft delete vs snapshot of the user's name) only if the product ever needs to remove users who own readings.

## Constraints and special SQL

### Partial unique index for the super admin
Migration `20260925105204_init`:
```sql
CREATE UNIQUE INDEX "User_isSuperAdmin_unique_true" ON "User"("isSuperAdmin") WHERE "isSuperAdmin" = true;
```
Only one super admin can exist.

### Manual SQL edits in migrations
None besides the index above. (`20260927120000_remove_tax_task` is auto-generated.)

## Seed data

Global roles `admin`, `manager`, `staff` with the default templates from `AGENTS.md`, plus the super admin from env (`prisma/seed.ts`, T9).

## Hashed vs unhashed storage

* bcrypt: `User.password`
* SHA-256: `RefreshToken.token`
* Not hashed: `EmailVerification.token`, `PasswordResetToken.token`

## Migrations (applied)

| migration folder | what it did |
|---|---|
| 20260925105204_init | User, Role, EmailVerification, TaxTask; partial unique index for the super admin |
| 20260926171308_add_password_reset_token | PasswordResetToken |
| 20260927120000_remove_tax_task | Dropped TaxTask and TaskStatus |
| 20260927183537_add_refresh_token | RefreshToken |
| 20261030195922_cascade_auth_tables | onDelete Cascade on EmailVerification, PasswordResetToken, RefreshToken |
| 20261104144709_refresh_token_family | RefreshToken: familyId, replacedByTokenId, graceUsedAt, indexes |
| 20261106065951_add_organizations | Organization, OrganizationRole, User.organizationId |

Add a row here after each migration is run (the folder name carries a timestamp).

Last checked against `prisma/schema.prisma`: 2026-10-15.