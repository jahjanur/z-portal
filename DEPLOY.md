# Z-Portal: Database & deployment setup

Production pattern: **Docker Compose (PostgreSQL)** + **.env.production** + **Prisma** + **admin bootstrap via seed**. App runs behind Nginx Proxy Manager; DB is internal only.

**To run locally without Docker** (PostgreSQL installed on your machine), use **LOCAL_SETUP.md** instead of this file.

---

## 1. File changes summary

| Item | Location | Purpose |
|------|----------|---------|
| Docker Compose | `docker-compose.yml` | PostgreSQL 16, volume `zportal_pgdata`, no public DB port |
| Env template (root) | `.env.example` | All vars: Docker (`POSTGRES_*`), app (`DATABASE_URL`, `JWT_SECRET`, etc.), optional `SEED_ADMIN_*` |
| Env template (server) | `server/.env.example` | App-only vars for `server/.env` or `server/.env.production` |
| Env loading | `server/src/index.ts` | Loads `.env` then `.env.production` (override) when `NODE_ENV=production` |
| Prisma scripts | `server/package.json` | `db:generate`, `db:migrate`, `db:seed` |
| Root scripts | `package.json` | `db:generate`, `db:migrate`, `db:seed` (run in server) |
| Seed | `server/prisma/seed.ts` | If `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` set → upsert one ADMIN; else full demo seed |
| Schema | `server/prisma/schema.prisma` | Unchanged; `url = env("DATABASE_URL")` |

---

## 2. Local (development)

### 2.1 One-time setup

```bash
# From repo root (z-portal/)
cd /path/to/z-portal

# Copy env and set DB password (required by compose)
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and optionally DATABASE_URL for localhost

# For app when running on host: DB must be reachable. Either:
# A) Expose DB only to host: in docker-compose.yml under db, add:
#    ports: ["127.0.0.1:5432:5432"]
# B) Or run app in Docker (same network) and use DATABASE_URL with host `db`.

# Start PostgreSQL
docker compose up -d db

# Wait for healthy (optional)
docker compose ps

# Server env: copy and set DATABASE_URL (localhost if you exposed port)
cp server/.env.example server/.env
# Set DATABASE_URL=postgresql://zportal:YOUR_POSTGRES_PASSWORD@localhost:5432/zportal
```

### 2.2 Migrate and seed (demo data)

```bash
# From repo root
npm run db:migrate
npm run db:seed
# No SEED_ADMIN_* in .env → full demo seed (admin@test.com / admin123, etc.)
```

### 2.3 Run app

```bash
npm run build
npm start
# Or dev: terminal 1: cd client && npm run dev; terminal 2: cd server && npm run dev
```

### 2.4 Login not working?

1. **Server won’t start / “DATABASE_URL is not set”**  
   Create `server/.env` from `server/.env.example` and set `DATABASE_URL` (and `JWT_SECRET`). For local dev without Docker, see **LOCAL_SETUP.md**.

2. **“Invalid credentials” or login does nothing**  
   - Ensure the DB is up (Docker: `docker compose up -d db`; local: see LOCAL_SETUP.md).  
   - Apply schema and create users: `npm run db:migrate` then `npm run db:seed` (from repo root).  
   - Use the **demo admin** (all lowercase, no spaces): **email** `admin@test.com`, **password** `admin123`.  
   - Email is matched case-insensitively; leading/trailing spaces are trimmed.

3. **Still failing**  
   Re-run the seed to reset demo users: `npm run db:seed` (this replaces all demo data; use only in dev).

---

## 3. Server (production)

### 3.1 Assumptions

- Server has Docker and Docker Compose.
- App runs on the same host (or in same Docker network) so it can use hostname `db` for DB.
- Nginx Proxy Manager (or similar) fronts the app; no direct DB port exposed to the internet.

### 3.2 One-time setup

```bash
# On server: clone/copy repo, then from repo root
cd /path/to/z-portal

# Create production env (never commit)
cp .env.example .env
cp server/.env.example server/.env.production

# Edit .env (for Docker Compose):
#   POSTGRES_USER=zportal
#   POSTGRES_PASSWORD=<strong random password>
#   POSTGRES_DB=zportal

# Edit server/.env.production:
#   DATABASE_URL=postgresql://zportal:<same password>@db:5432/zportal
#   JWT_SECRET=<long random secret, e.g. openssl rand -base64 32>
#   NODE_ENV=production
#   PORT=4001
#   SEED_ADMIN_EMAIL=admin@yourcompany.com
#   SEED_ADMIN_PASSWORD=<strong admin password>

# Start DB only (no port exposure)
docker compose up -d db

# From repo root: run migrations (app must have DATABASE_URL; run from server dir so .env.production is used)
cd server
export NODE_ENV=production
npm run db:generate
npm run db:migrate
npm run db:seed
# With SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD set, seed creates/updates that single ADMIN only.

cd ..
npm run build
npm start
# Or run server under systemd/PM2 with NODE_ENV=production.
```

### 3.3 Bootstrap admin (if not done in 3.2)

```bash
cd server
export NODE_ENV=production
# Ensure server/.env.production has SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD
npm run db:seed
# Seed will upsert that ADMIN (bcrypt). Safe to run again to reset password.
```

---

## 4. Commands reference

| Command | Where | Purpose |
|--------|--------|--------|
| `docker compose up -d db` | Repo root | Start PostgreSQL (volume persistent) |
| `docker compose down` | Repo root | Stop containers (volume kept) |
| `npm run db:generate` | Repo root or server | `prisma generate` |
| `npm run db:migrate` | Repo root or server | `prisma migrate deploy` |
| `npm run db:seed` | Repo root or server | `prisma db seed` (admin bootstrap if SEED_* set, else demo) |

Prisma schema path: `server/prisma/schema.prisma` (default when running from server).

---

## 5. Security notes

- **Secrets**: Use strong random values for `POSTGRES_PASSWORD`, `JWT_SECRET`, and `SEED_ADMIN_PASSWORD`. Example: `openssl rand -base64 32`. Never commit `.env` or `.env.production`.
- **DB port**: Do not expose PostgreSQL to the internet. Use no `ports` in compose (app connects via hostname `db` on the Docker network). For local dev only, if the app runs on the host, bind to `127.0.0.1:5432` only.
- **Minimal exposure**: Run app behind Nginx Proxy Manager (HTTPS, internal app port). Restrict DB to localhost or Docker network only.
- **Seed in production**: Use `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` only for the initial bootstrap (or a one-time password reset). Remove or leave unset after first login and prefer changing password via app if that feature exists.
- **Migrations**: Run `npm run db:migrate` after deploy; do not run `prisma migrate dev` in production.

---

## 6. Alternative: one-time bootstrap script

If you prefer not to use the seed for production admin:

1. Create a script `server/scripts/bootstrap-admin.ts` that reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, hashes with bcrypt, and upserts the ADMIN user (same logic as in seed).
2. Run once: `cd server && npx ts-node scripts/bootstrap-admin.ts` (or compile and run with node).
3. Document in DEPLOY.md and do not wire it to `prisma db seed`.

The current setup uses the seed for this so one command (`npm run db:seed`) with env set is enough.
