# Run Z-Portal locally (no Docker)

Use this when you want to develop and run the app on your machine without Docker. PostgreSQL must be installed and running locally.

---

## 1. Install and start PostgreSQL (macOS with Homebrew)

If you don’t have PostgreSQL yet:

```bash
brew install postgresql@16
brew services start postgresql@16
```

If you use a different major version (e.g. `postgresql`):

```bash
brew install postgresql
brew services start postgresql
```

Ensure it’s running (use the same path as below if you get “command not found”):

```bash
/opt/homebrew/opt/postgresql@16/bin/psql -U $(whoami) -d postgres -c 'SELECT 1'
```

---

## 2. Create the app database

**If you installed `postgresql@16`** (keg-only), use the full path:

```bash
/opt/homebrew/opt/postgresql@16/bin/createdb zportal
```

If `createdb` is in your PATH (e.g. you ran `export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"` or use plain `postgresql`):

```bash
createdb zportal
```

If that fails, try:

```bash
/opt/homebrew/opt/postgresql@16/bin/psql -U $(whoami) -d postgres -c "CREATE DATABASE zportal;"
```

---

## 3. Server environment

From the **repo root** (`z-portal/`):

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set at least:

- **DATABASE_URL** – use your macOS username (run `whoami` if unsure). Examples:
  - No password (typical Homebrew default):  
    `DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/zportal`
  - With password (if you created a user with a password):  
    `DATABASE_URL=postgresql://zportal:YOUR_PASSWORD@localhost:5432/zportal`
- **JWT_SECRET** – any long random string (e.g. 32+ characters).

Example (replace `muhamedidrizi` with your username):

```
DATABASE_URL=postgresql://muhamedidrizi@localhost:5432/zportal
JWT_SECRET=dev_secret_change_in_production_min_32_chars
NODE_ENV=development
PORT=4001
```

---

## 4. Migrate and seed (create tables + demo user)

From the **repo root**:

```bash
npm run db:migrate
npm run db:seed
```

You should see seed output and “Full demo seed finished!”.

---

## 5. Run the app

**Option A – dev (client + server with hot reload):**

- Terminal 1: `cd client && npm run dev`
- Terminal 2: `cd server && npm run dev`

**Option B – production-style (single process):**

```bash
npm run build
npm start
```

- Frontend: http://localhost:5174 (dev) or http://localhost:4001 (after `npm start`)
- API: http://localhost:4001

---

## 6. Log in

Use the **demo admin** account (all lowercase):

- **Email:** `admin@test.com`
- **Password:** `admin123`

Other demo users (see `server/prisma/seed.ts`): e.g. `worker1@test.com` / `worker123`, `client1@test.com` / `client123`.

---

## Troubleshooting

- **“Can’t reach database server at localhost:5432”**  
  PostgreSQL isn’t running. Start it: `brew services start postgresql@16` (or `postgresql`).

- **“role … does not exist” or “database … does not exist”**  
  Create the DB and/or use the correct username in `DATABASE_URL`. Use `whoami` for your macOS user and `createdb zportal` to create the database.

- **“DATABASE_URL is not set”**  
  Create `server/.env` from `server/.env.example` and set `DATABASE_URL` (and `JWT_SECRET`) as in step 3.

- **“Invalid credentials”**  
  Re-run the seed: `npm run db:seed` (from repo root). Then log in with `admin@test.com` / `admin123`.

---

When you’re ready for deployment with Docker and Nginx, see **DEPLOY.md**.
