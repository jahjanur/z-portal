# Deploying Z-Portal to Cloud Hosting

**Project type:** **Vite + React (frontend)** and **Express (backend)** — single Node.js app in production (Express serves the built React app and the API).

**Node.js:** Use **18.x**, **20.x**, **22.x**, or **24.x** (set in dashboard or `engines` in root `package.json`).

---

## Build & start commands

| Step   | Command         | When to use      |
|--------|------------------|------------------|
| Install | `npm run install:all` | First time / when deps change (or run `npm install` in both `client` and `server`) |
| Build  | `npm run build`  | Every deploy     |
| Start  | `npm run start`  | Run the app      |

If your host runs **only** from the **repository root**:

- **Build command:** `npm run install:all && npm run build`
- **Start command:** `npm run start`

Some hosts expect a single “install” step. Use:

- **Install:** `npm run install:all`  
  (or `npm install --prefix client && npm install --prefix server`)
- **Build:** `npm run build`
- **Start:** `npm run start`

---

## What the build does

1. Installs client and server dependencies (if you use `install:all`).
2. **build:client** — builds the Vite/React app into `client/dist`.
3. **build:server** — runs `prisma generate` and `tsc` in `server/` → output in `server/dist/`.
4. **copy:client** — copies `client/dist` to `server/dist/client` so Express can serve the SPA in production.

In production, a **single process** runs `node server/dist/index.js`; it serves the API and the React app.

---

## Environment variables (server)

Set these in your cloud dashboard (or in a `.env` file only if the host supports it; never commit secrets).

| Variable       | Required | Description |
|----------------|----------|-------------|
| `NODE_ENV`     | Yes      | Set to `production`. |
| `PORT`         | No       | Port the app listens on (default `4001`). Many hosts set this automatically. |
| `DATABASE_URL` | Yes      | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/dbname?sslmode=require`). |
| `JWT_SECRET`   | Yes      | Secret for signing JWTs (use a long random string in production). |
| `CLIENT_URL`   | No       | Full URL of the app (e.g. `https://yourapp.com`) for invite/email links. Defaults to `http://localhost:3000`. |
| `FRONTEND_URL` | No       | Same as `CLIENT_URL` for notification emails. Defaults to `http://localhost:5173`. |
| `SMTP_HOST`    | No*      | SMTP server for emails (e.g. `smtp.gmail.com`). *Required if you use invite/payment/notification emails. |
| `SMTP_PORT`    | No       | SMTP port (e.g. `587`). |
| `SMTP_USER`    | No*      | SMTP username. *Required if using email. |
| `SMTP_PASS`    | No*      | SMTP password. *Required if using email. |
| `ADMIN_EMAIL`  | No       | Admin email used in notifications. |

---

## Database (PostgreSQL)

- Create a PostgreSQL database on your host or use a managed service (e.g. Render, Railway, Supabase, Neon).
- Set `DATABASE_URL` in the app’s environment.
- **First deploy / after schema changes:** run migrations from the **server** directory:
  - In a “release” or “post-build” step, or via SSH/console:
  - `cd server && npx prisma migrate deploy`
- Optional: seed data with `cd server && npx prisma db seed` (only if you use a seed script).

---

## Optional: frontend-only API URL

If you ever split frontend and backend (e.g. frontend on a CDN, API on another URL), set:

- **Build-time (Vite):** `VITE_API_URL=https://your-api.example.com`
- Then the client will use that base URL instead of the same origin.

For the default “single app” deploy, leave `VITE_API_URL` unset so the app uses the same origin.

---

## Hostinger

Z-Portal is set up so Hostinger can detect it as an **Express.js** app (root `package.json` includes `express` and a `main` entry). If you still see *Unsupported framework or invalid project structure*:

1. When adding the Node.js app, choose **Import Git Repository** and select **z-portal**.
2. If the system does not auto-detect, set **Build settings** manually:
   - **Build command:** `npm run build`
   - **Start command:** `npm run start`
3. Ensure **Node.js version** is 18.x, 20.x, 22.x, or 24.x (via **Build settings** or **Node version** in the dashboard).
4. Root `npm install` runs `postinstall`, which installs dependencies for both `client` and `server`; then `npm run build` builds the app and `npm run start` runs the Express server.

---

## Quick reference for support

- **Project type:** Vite + React frontend, Express backend; single Node app in production.
- **Build command:** `npm run install:all && npm run build` (or separate install + build as above).
- **Start command:** `npm run start`
- **Node version:** 18.x / 20.x / 22.x / 24.x
