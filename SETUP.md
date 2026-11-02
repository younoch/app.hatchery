# SETUP.md — From `git clone` to a Running Backend

How to get this project running on a fresh machine (Fedora, native services, no Docker). Skip steps you have already done.

This guide describes the target flow. Steps that need unfinished work carry a task number from `progress.md`; until that task lands, use "Fallback bootstrap" (step 7).

## 1. Clone

```bash
git clone <repo-url> hatchery-backend
cd hatchery-backend
```

## 2. Install dependencies

```bash
pnpm install
```

## 3. Native services (first time on this machine)

```bash
# PostgreSQL
sudo dnf install postgresql postgresql-server
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

# Redis
sudo dnf install redis
sudo systemctl enable --now redis

# Mailpit (local SMTP catcher; only needed when EMAIL_ENABLED=true)
# See https://github.com/axllent/mailpit for the install method for your architecture.
```

Verify:

```bash
sudo systemctl status postgresql
sudo systemctl status redis
```

Mailpit is started by hand when needed (`mailpit`); running it as a service is a parking-lot item.

## 4. Create the database

```bash
psql -U postgres -c "CREATE DATABASE hatchery_db;"
```

## 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`. At minimum:

* `DATABASE_URL` — the database from step 4, with your real Postgres user and password
* `JWT_SECRET` — a real secret:
  ```bash
  openssl rand -base64 32
  ```
* `TOKEN_EXPIRATION` — with a unit (`1h`). A bare number is read as milliseconds.
* `SEED_SUPER_ADMIN_USERNAME`, `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` — your platform account (used by the seed, T9)

Every variable and its default is in the table in `README.md`.

## 6. Run migrations

```bash
pnpm prisma migrate dev
```

Applies all migrations and generates the Prisma Client.

## 7. Seed roles and the super admin

Seed script (T9):

```bash
pnpm prisma db seed
```

It creates the global roles `admin`, `manager`, `staff` with their default permissions (`AGENTS.md` → RBAC) and the super admin from the `SEED_SUPER_ADMIN_*` variables.

## 8. Run the app

```bash
pnpm run start:dev
```

Check the startup log: every controller mapped, no `UnknownDependenciesException`.

* API: http://localhost:4000
* Swagger: http://localhost:4000/api
* Queue dashboard: http://localhost:4000/queues
* Health: http://localhost:4000/health

## 9. Smoke test (through Swagger)

1. `POST /auth/login` as the super admin: the body has `access_token`, and the response sets an httpOnly `refresh_token` cookie (Path `/auth/refresh`).
2. `GET /users/me`: `isSuperAdmin: true`, full `permissions` (T8; today `/user/me`).
3. `POST /organizations` with an admin account (T10): the organization and its admin are created.
4. Log in as that admin: only `GET /users/me`, `PATCH /users/me/password` and logout work until the password is changed (`must_change_password`, T11).
5. As the admin: `POST /users` (a `staff` user), `POST /tanks` (T11, T14).
6. As staff: `GET /tanks`; `POST /readings/sync` with one reading → `created`; send the same `id` again → `duplicate` (T15).
7. `POST /auth/refresh`: the token rotates.
8. `GET /health`: DB and memory checks pass.

If everything passes, the environment is ready for development.

## Reference

* Commands: `project-commands.md`
* Rules, RBAC, conventions, footguns: `AGENTS.md`
* Tasks and API contract: `progress.md`
* Schema: `database.md`