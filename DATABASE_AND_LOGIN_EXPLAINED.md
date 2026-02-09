# Z-Portal: Database & Login – Explained for Professor Meeting

This document explains how the database and login work so you can answer questions clearly.

---

## 1. How Does Login Work? (Step by Step)

### Flow Overview
```
User enters email + password → Frontend sends to API → Server queries database → 
Compares password with bcrypt → If valid: creates JWT → Returns token + user info → 
Frontend stores token → User is logged in
```

### Step-by-Step (with code locations)

**Step 1: User enters email and password**
- **Where:** Login page = `client/src/pages/Authpage.tsx`
- User types in the form and clicks "Sign in"

**Step 2: Frontend sends request to backend**
- **Where:** `client/src/services/auth.ts` – `login(email, password)` function
- **API call:** `POST http://localhost:4001/auth/login` with body `{ email, password }`
- **Where API is defined:** `client/src/api.ts` – base URL points to server

**Step 3: Server receives request**
- **Where:** `server/src/routes/auth.ts` – login route
- **Route:** `POST /auth/login` (mounted in `server/src/index.ts` as `app.use("/auth", authRoutes)`)

**Step 4: Server looks up user in database**
- **Code:** `const user = await prisma.user.findUnique({ where: { email } });`
- **What it does:** Queries the **User** table in PostgreSQL for a row where `email` matches
- **Database:** PostgreSQL (school database `db_202526z_va_prj_ecore`)
- **ORM:** Prisma – schema in `server/prisma/schema.prisma`

**Step 5: If user not found → return "Invalid credentials"**
- **Code:** `if (!user) return res.status(401).json({ message: "Invalid credentials" });`

**Step 6: If user found → check password**
- **Code:** `const valid = await bcrypt.compare(password, user.password);`
- **Why:** Passwords are **never stored in plain text**. They are hashed with **bcrypt** when the user is created. Login compares the entered password with the stored hash.
- **Where hashing happens:** When creating a user (seed or admin) – `bcrypt.hash(password, 10)`

**Step 7: If password wrong → return "Invalid credentials"**
- **Code:** `if (!valid) return res.status(401).json({ message: "Invalid credentials" });`

**Step 8: If password correct → create JWT (token)**
- **Code:** `const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });`
- **What is JWT:** A signed token that contains `userId` and `role`. Used so the server knows who is making requests without asking for password again.
- **JWT_SECRET:** Stored in `server/.env` – used to sign and verify tokens

**Step 9: Server sends back token + user info**
- **Response:** `{ token, user: { id, email, role, name, company, logo, colorHex } }`
- **Note:** Password is **never** sent back to the client – only safe user fields

**Step 10: Frontend stores token and redirects**
- **Where:** `client/src/pages/Authpage.tsx` – after successful login
- **Code:** `localStorage.setItem("token", res.token);` and `localStorage.setItem("role", res.user.role);` etc.
- **Then:** `window.location.href = "/dashboard";` – user goes to dashboard

**Step 11: Later requests use the token**
- **Where:** `client/src/api.ts` – axios interceptor
- **Code:** Every API request adds header `Authorization: Bearer <token>`
- **Server:** `server/src/middleware/auth.ts` – `verifyJWT` reads the token, checks it with JWT, and puts `userId` and `role` on the request so routes know who is logged in

---

## 2. Where Are User Details Stored?

### In the database: **User** table

- **Table name:** `User` (in PostgreSQL schema `public`)
- **Schema definition:** `server/prisma/schema.prisma` – model `User`

**Main columns used for login and identity:**
| Column       | Type     | Purpose                          |
|-------------|----------|----------------------------------|
| id          | Int      | Primary key, unique user ID      |
| email       | String   | Unique, used to find user at login |
| password    | String   | Bcrypt hash – never plain text   |
| role        | String   | "ADMIN", "WORKER", or "CLIENT"   |
| name        | String   | Display name                     |
| createdAt   | DateTime | When account was created        |

**Extra columns (e.g. for clients):**
- company, logo, colorHex, address, postalAddress, phoneNumber, extraEmails, brandPattern, shortInfo, profileStatus, inviteToken, inviteExpires

**Relations (other tables linked to User):**
- Tasks (as client or worker)
- Invoices (as client)
- Domains (as client)
- Projects, TimesheetProject, Comments, etc.

So: **all login-related and profile details live in the `User` table** in your PostgreSQL database.

---

## 3. Where Do the Login Users (e.g. admin@test.com) Come From?

Two sources:

### A) Seed data (initial test users)

- **Where:** `server/prisma/seed.ts`
- **When:** Run once with `npx prisma db seed` to fill the database with test data
- **What it does:**
  - Defines users in code (e.g. admin@test.com, worker1@test.com, client1@test.com)
  - Hashes passwords with `bcrypt.hash(password, 10)`
  - Inserts them into the **User** table via `prisma.user.create(...)`
- **Example:** Admin user: email `admin@test.com`, password `admin123` (stored as bcrypt hash in DB)

So: **“Where did we add the details?”** – For these test accounts, the details are **added in code in `seed.ts`**, then **stored in the `User` table** when you run the seed.

### B) Users created by Admin in the app

- **Where:** `server/src/routes/users.ts` – `POST /users` (create user)
- **Who can call it:** Only logged-in **ADMIN** (protected by `verifyJWT` and `verifyAdmin` in `server/src/middleware/auth.ts`)
- **What it does:**
  - Receives email, password, role, name (and optional fields for clients)
  - Checks email is not already in DB: `prisma.user.findUnique({ where: { email } })`
  - Hashes password: `bcrypt.hash(password, SALT_ROUNDS)`
  - Inserts new row: `prisma.user.create({ data: userData })`
- **Frontend:** Admin dashboard – e.g. “Add Worker” / “Add Client” forms that call this API

So: **those details are added in the Admin UI**, then **saved in the same `User` table** via the `/users` API.

---

## 4. Database Connection (How the App Talks to the DB)

- **Database:** PostgreSQL (your school DB: `db_202526z_va_prj_ecore`)
- **Access:** Via **SSH tunnel** – you connect to the tunnel server, which forwards to the DB. So the app uses **localhost:5432** in code, but traffic goes through the tunnel to the real DB.
- **Connection string:** In `server/.env`:
  - `DATABASE_URL="postgresql://db_202526z_va_prj_ecore_owner:...@localhost:5432/db_202526z_va_prj_ecore?schema=public&sslmode=disable"`
- **Who uses it:** **Prisma** (ORM). It reads `DATABASE_URL` and connects to PostgreSQL. All queries (login, users, tasks, etc.) go through Prisma to this DB.
- **Schema:** Tables are defined in `server/prisma/schema.prisma`. Tables were created in the DB with `npx prisma db push` (because the school DB doesn’t allow creating a “shadow” DB for migrations).

So: **“How does the app use the database?”** – Through **Prisma**, using **DATABASE_URL** in `.env`, over the **SSH tunnel** to the school PostgreSQL.

---

## 5. Security in Short

- **Passwords:** Only bcrypt hashes stored in `User.password`; never plain text. Login uses `bcrypt.compare(plainPassword, user.password)`.
- **Sessions:** No server-side session store. After login, the client gets a **JWT** and sends it on each request. Server verifies JWT and gets `userId` and `role` from it.
- **Protected routes:** Routes that need login use `verifyJWT`; admin-only routes use `verifyJWT` + `verifyAdmin` (checks `role === "ADMIN"`).

---

## 6. Quick Answers for “How does login work?” and “Where did we add the details?”

**“How does login work?”**  
User enters email and password → frontend calls `POST /auth/login` → server finds the user in the **User** table by email → checks password with **bcrypt** → if OK, creates a **JWT** and returns it with user info → frontend saves the token and uses it for later requests. All of this uses the **same PostgreSQL database** (school DB) via **Prisma**.

**“Where did we add the details?”**  
- **Test users (e.g. admin@test.com):** Details are **defined in code** in `server/prisma/seed.ts` and **inserted into the User table** when we run `npx prisma db seed`.  
- **Other users:** Details are **entered in the app** by the Admin (Add Worker / Add Client), and **saved in the User table** through the `POST /users` API in `server/src/routes/users.ts`.

**“Where is the database?”**  
PostgreSQL database provided by the school (`db_202526z_va_prj_ecore`). We connect to it from the app via an **SSH tunnel**; the app uses `localhost:5432` and the connection string in `server/.env` (DATABASE_URL). Prisma uses that to run all queries (login, users, tasks, invoices, etc.).

---

## 7. File Reference (Where to Show the Professor)

| Topic              | File path |
|--------------------|-----------|
| Login API          | `server/src/routes/auth.ts` |
| User table schema  | `server/prisma/schema.prisma` (model User) |
| Seed (test users)  | `server/prisma/seed.ts` |
| Create user (Admin)| `server/src/routes/users.ts` (POST /) |
| Password hashing   | bcrypt in auth.ts and users.ts |
| JWT check          | `server/src/middleware/auth.ts` |
| Frontend login     | `client/src/pages/Authpage.tsx` |
| Frontend API call  | `client/src/services/auth.ts` |
| DB connection      | `server/.env` (DATABASE_URL), Prisma schema |

You can open these files and walk through: “Login starts here in the frontend, goes to this route, then we query the User table here and check the password here.”
