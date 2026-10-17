# Database

- Engine: PostgreSQL
- ORM: Prisma
- Migrations run via: `pnpm prisma migrate dev --name <name>` (see project-commands.md)
- ID convention: All models use `@default(uuid())`; no cuid() in use.

## Models (current)

### User
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| name | String | no | - | Optional display name; NOT collected at signup |
| email | String | yes | - | Unique |
| password | String | yes | - | Hashed with bcrypt |
| createdAt | DateTime | yes | now() | |
| updatedAt | DateTime | yes | updatedAt | Auto-updated |
| emailVerified | Boolean | yes | false | |
| isSuperAdmin | Boolean | yes | false | DB-only, not settable via API |
| roleId | String | no | - | Foreign key to Role |

Relations: User -> Role (optional), User -> EmailVerification[], User -> PasswordResetToken[], User -> RefreshToken[]
@unique: email
@@index: none

### Role
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| name | String | yes | - | Unique |
| permissions | String[] | yes | - | Array of "resource:action" strings |

Relations: Role -> User[]
@unique: name
@@index: none

### EmailVerification
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| userId | String | yes | - | Foreign key to User |
| token | String | yes | - | Unique verification token |
| status | VerificationStatus | yes | PENDING | Enum: PENDING, SENT, VERIFIED, EXPIRED |
| expiresAt | DateTime | yes | - | |
| createdAt | DateTime | yes | now() | |

Relations: EmailVerification -> User
@unique: userId, token
@@index: none

### PasswordResetToken
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| userId | String | yes | - | Foreign key to User |
| token | String | yes | - | Unique reset token |
| used | Boolean | yes | false | Single-use flag |
| expiresAt | DateTime | yes | - | |
| createdAt | DateTime | yes | now() | |

Relations: PasswordResetToken -> User
@unique: token
@@index: none

### RefreshToken
| field | type | required | default | notes |
|---|---|---|---|---|
| id | String | yes | uuid() | Primary key |
| userId | String | yes | - | Foreign key to User |
| token | String | yes | - | Unique, stored as SHA-256 hash |
| revoked | Boolean | yes | false | |
| expiresAt | DateTime | yes | - | Fixed from login (14 days default) |
| createdAt | DateTime | yes | now() | |

Relations: RefreshToken -> User
@unique: token
@@index: none

### VerificationStatus (enum)
- PENDING
- SENT
- VERIFIED
- EXPIRED

## Constraints and special SQL

### Partial unique index for super admin
Migration file: `20260925105204_init/migration.sql`
SQL:
```sql
CREATE UNIQUE INDEX "User_isSuperAdmin_unique_true" ON "User"("isSuperAdmin") WHERE "isSuperAdmin" = true;
```
Ensures only one super admin exists at a time.

### Manual SQL edits in migrations
- Migration `20260927120000_remove_tax_task` removed TaxTask table and TaskStatus enum (no manual edits, auto-generated).
- No other manual SQL edits detected.

### Soft delete
No models currently use soft delete. PaginationQueryDto has `includeDeleted` field but no deletedAt column exists.

### Hashed vs unhashed storage
- Hashed with bcrypt: User.password
- Hashed with SHA-256: RefreshToken.token (plaintext never stored)
- Not hashed: EmailVerification.token, PasswordResetToken.token (random high-entropy tokens)

## Relationships (short)
- User -> Role (optional, one-to-many users to one role)
- User -> EmailVerification (one-to-one via userId unique)
- User -> PasswordResetToken (one-to-many)
- User -> RefreshToken (one-to-many)

## Migrations
| migration folder name | what it did |
|---|---|
| 20260925105204_init | Created User, Role, EmailVerification, TaxTask models; added partial unique index for super admin |
| 20260926171308_add_password_reset_token | Created PasswordResetToken model |
| 20260927120000_remove_tax_task | Dropped TaxTask table and TaskStatus enum |
| 20260927183537_add_refresh_token | Created RefreshToken model |

## Not implemented yet (planned, NOT in the schema)

> **Open decision (2026-10-17):** user-deletion policy for domain records (Reading, ReadingAudit).
> Options: soft delete (`User.deletedAt`) vs hard delete + `SetNull` + name snapshot.
> Decide before writing the Reading migration. Do not add `createdById` nullability or `userName` until decided.

The following are planned design from frontend needs, not current schema:

### Organization/Hatchery
- A user belongs to one organization
- Tanks are scoped to organization

### Tank
- id (UUID)
- organizationId (foreign key to Organization)
- name (string, unique within organization)
- code (string, optional tank identifier)

### Reading
- id (UUID, client UUID as primary key = idempotency key)
- tankId (foreign key to Tank)
- ph (number)
- temperatureC (number)
- salinityPpt (number)
- oxygenMgL (number)
- note (string, up to 200 chars)
- recordedAt (DateTime, from client)
- syncedAt (DateTime, set by server only)
- createdById (foreign key to User, from token only)
- isLate (Boolean)
- needsReview (Boolean)
- Indexes: [createdById, tankId, recordedAt]

### ReadingAudit
- id (UUID)
- readingId (foreign key to Reading)
- who (foreign key to User)
- when (DateTime)
- field (string)
- oldValue (any)
- newValue (any)

### Session/token family fields (for refresh-token hardening)
- RefreshToken.familyId (UUID, for token family tracking)
- RefreshToken.replacedByTokenId (foreign key to RefreshToken, for grace window)

Verified against schema.prisma at 2026-10-15 (local working directory, no commit made yet).
