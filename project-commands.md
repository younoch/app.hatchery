# Project Commands

## Project Setup
### Install dependencies
pnpm install

### Run development server (watch mode)
pnpm run start:dev

### Run production build
pnpm run start:prod

### Build project
pnpm run build

### Lint & auto-fix
pnpm run lint

### Format code
pnpm run format

## Testing
### Unit tests
pnpm run test

### Unit tests (watch mode)
pnpm run test:watch

### Test coverage
pnpm run test:cov

### E2E tests
pnpm run test:e2e

## Prisma Commands
### Initialize Prisma (first time)
npx prisma init

### Create a new migration (generate + apply)
npx prisma migrate dev --name <migration-name>

### Create migration SQL without applying (for manual SQL edits)
npx prisma migrate dev --name <migration-name> --create-only

### Apply pending migrations (after manual SQL edit, or normal apply)
npx prisma migrate dev

### Generate Prisma Client only (no migration)
npx prisma generate

### Open Prisma Studio (DB GUI)
npx prisma studio

### Reset database (⚠️ all data will be lost)
npx prisma migrate reset

### Run seed script (if configured in package.json)
npx prisma db seed

## PostgreSQL (psql) — direct DB queries
### Connect to a database
psql -U postgres -d <db_name>

### Run a single query inline
psql -U postgres -d <db_name> -c "<SQL query>"

### Create a new database
psql -U postgres -c "CREATE DATABASE <db_name>;"

## Background Services (local dev)
### Start Mailpit (SMTP catcher for dev email)
mailpit
# Web UI: http://localhost:8025

### Queue dashboard (Bull Board) — no command, just visit
http://localhost:4000/queues

## Git
### Check status before staging
git status

### Stage specific files
git add <file1> <file2> ...

### Commit (conventional commit format)
git commit -m "type(scope): summary

- detail 1
- detail 2"

### Tag a release (annotated, recommended)
git tag -a v1.0.0 -m "First stable release: auth, RBAC, password recovery, background jobs"

### Push a tag to remote
git push origin v1.0.0

### Push all tags
git push origin --tags

## Package Management
### Remove a dependency
pnpm remove <package-name>

### Remove a dev dependency
pnpm remove -D <package-name>

### Add a dependency
pnpm add <package-name>

### Add a dev dependency
pnpm add -D <package-name>