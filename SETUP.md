# SETUP.md — From `git clone` to a Running New Project

This walks through starting a **brand-new project** from this
boilerplate, on Fedora, with all infra run as native local services
(no Docker). Follow it top to bottom for a fresh machine/fresh
project; skip steps you've already done if reusing an existing
environment.

## 1. Clone the boilerplate into your new project folder

```bash
git clone git@github.com:younoch/nestjs-boilerplate.git my-new-project
cd my-new-project
```

If you don't want the boilerplate's git history in your new project
(recommended for a genuinely new project, so commits don't look like
they belong to the boilerplate repo):

```bash
rm -rf .git
git init
git add .
git commit -m "chore: initial commit from nestjs-boilerplate v1.x.x"
```

If instead you want to keep pulling boilerplate updates over time,
keep the `.git` history and add the boilerplate as a remote you can
`git pull` from later, e.g. `git remote rename origin boilerplate`.

## 2. Install dependencies

```bash
pnpm install
```

## 3. Set up native local services (first time on this machine only)

This project expects PostgreSQL, Redis, and Mailpit installed and
running natively on Fedora — not Docker.

```bash
# PostgreSQL
sudo dnf install postgresql postgresql-server
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

# Redis
sudo dnf install redis
sudo systemctl enable --now redis

# Mailpit (local SMTP catcher for dev email)
# See https://github.com/axllent/mailpit for the current install
# method for your architecture — typically a single binary download.
```

Verify each is running:
```bash
sudo systemctl status postgresql
sudo systemctl status redis
```

Mailpit is run manually per dev session (see step 8) rather than as
a systemd service — that's a known deferred roadmap item.

## 4. Create the project's database

Pick a database name for **this** project (don't reuse the
boilerplate's `nestjs_boilerplate_db` name if you're running both
side by side):

```bash
psql -U postgres -c "CREATE DATABASE my_new_project_db;"
```

## 5. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env` and set values for **this** project — at minimum:
- `DATABASE_URL` — point it at the database you just created (see
  step 4), with your actual Postgres user/password
- `JWT_SECRET` — generate a real secret, don't leave the placeholder:
  ```bash
  openssl rand -base64 32
  ```
- `APP_URL` / `FRONTEND_URL` — update once you know your dev ports

See the Environment Variables table in `README.md` and `AGENTS.md`
for what each variable does and its default/fallback behavior —
notably `TOKEN_EXPIRATION`'s dev-vs-code-fallback mismatch is
documented there, worth reading once.

## 6. Run migrations

```bash
npx prisma migrate dev
```

This applies all existing migrations from the boilerplate and
generates the Prisma Client. If you plan to change the schema for
your new project (add/remove models), do that now and generate a
fresh migration:

```bash
npx prisma migrate dev --name your-change-name
```

## 7. Seed initial data (roles + a super admin)

There is currently **no automated seed script** in this boilerplate
(one existed early on and was intentionally removed — see
`AGENTS.md`/project history if curious). Seeding is manual:

**Create the two baseline roles:**
```bash
psql -U postgres -d my_new_project_db -c "INSERT INTO \"Role\" (id, name, permissions) VALUES (gen_random_uuid()::text, 'admin', ARRAY['user:read','user:write','user:delete']), (gen_random_uuid()::text, 'user', ARRAY[]::text[]);"
```
Adjust the permission arrays to whatever `permission.constants.ts`
generates for your project's actual resources (`user`, `role`, plus
any new feature modules you add) — see the RBAC section of
`AGENTS.md` for how the whitelist is generated.

**Register your first user through the API** (app must be running —
see step 9), then promote it to super admin directly in the
database (this is intentionally **not** exposed through any API):
```bash
psql -U postgres -d my_new_project_db -c "UPDATE \"User\" SET \"isSuperAdmin\" = true, \"roleId\" = (SELECT id FROM \"Role\" WHERE name = 'admin') WHERE email = 'you@example.com';"
```

Consider writing this as a one-off script (`prisma/seed.ts` +
`package.json` `"prisma": { "seed": ... }` config) for your new
project if you'll be resetting the dev database often — the
boilerplate itself doesn't ship one by design, but nothing stops a
downstream project from adding one.

## 8. Start background services for this dev session

```bash
mailpit
```
Leave this running in its own terminal. Web UI: http://localhost:8025

Redis and PostgreSQL should already be running as systemd services
from step 3 — no per-session start needed for those.

## 9. Run the app

```bash
pnpm run start:dev
```

Check the startup log for every expected controller/route mapping
(`AuthController`, `UserController`, `RoleController`, `HealthController`,
etc.) with no `UnknownDependenciesException` or similar errors.

- API: http://localhost:4000
- Swagger docs: http://localhost:4000/api
- Queue dashboard: http://localhost:4000/queues
- Health check: http://localhost:4000/health

## 10. Smoke-test the core flows

A quick manual pass, via Swagger, confirms the foundation is intact
before you start building your project-specific features:

1. `POST /auth/register-async` — register a user, confirm the
   verification email arrives in Mailpit
2. `GET /auth/verify-email?token=...` — verify it
+3. `POST /auth/login` — confirm the body has `access_token` and the response sets an httpOnly `refresh_token` cookie (Path `/auth/refresh`)
4. `GET /user/me` (with the access token) — confirm your profile
   returns correctly
5. `POST /auth/refresh` — confirm token rotation works
6. As your super admin, `GET /user` — confirm the user list works
7. `POST /roles`, `GET /roles` — confirm role management works

If all of that passes, the boilerplate's foundation is working
correctly in your new environment, and you're ready to start adding
your project's own modules.

## 11. Rename the project

Update `package.json`'s `name`, `description`, and reset `version`
to `0.1.0` (this is a new project's own initial-development version,
independent of the boilerplate's own version history) — see the
Versioning section in `AGENTS.md` for what each semver segment means
going forward for *this* project.

## Reference

- Full command reference: see `Project Commands.md` (or your own
  equivalent) for the day-to-day Prisma/psql/git commands used
  throughout development.
- Architecture, conventions, and known footguns: `AGENTS.md`.
- Feature list and environment variable reference: `README.md`.