# Why We Have Both Prisma and PostgreSQL

## Short Answer

- **PostgreSQL** = the **database** (where data is stored).
- **Prisma** = the **tool** we use to talk to PostgreSQL from our Node.js/TypeScript app.

We don’t choose “Prisma **or** PostgreSQL.” We use **PostgreSQL** as the database and **Prisma** as the way our code connects to it.

---

## What Is PostgreSQL?

**PostgreSQL** is a **database management system** (DBMS).

- It **stores** the data: users, tasks, invoices, etc.
- It runs on a **server** (in your case, the school’s server).
- It understands **SQL** (e.g. `SELECT * FROM "User" WHERE email = 'admin@test.com'`).
- It handles things like: tables, rows, indexes, transactions, security.

So: **PostgreSQL = the actual database** where your data lives.

---

## What Is Prisma?

**Prisma** is an **ORM** (Object-Relational Mapping) for Node.js/TypeScript.

- It **does not replace** PostgreSQL. It sits **between** your app and PostgreSQL.
- It lets you work with the database using **JavaScript/TypeScript** and **objects**, instead of writing raw SQL strings everywhere.
- You define your tables once in a **schema** (`schema.prisma`), and Prisma:
  - Generates a **client** (`PrismaClient`) with type-safe methods.
  - Can create/update the database structure (migrations / `db push`).
  - Translates your code into SQL and sends it to PostgreSQL.

So: **Prisma = the bridge from our Node.js app to PostgreSQL.**

---

## How They Work Together

```
Our Node.js app  →  Prisma (ORM)  →  PostgreSQL (database)
                   (TypeScript)      (stores data)
```

**Without Prisma (raw):**
- We would write SQL by hand: `const user = await db.query('SELECT * FROM "User" WHERE email = $1', [email]);`
- We would manually map rows to JavaScript objects.
- No automatic types, no schema in code.

**With Prisma:**
- We write: `const user = await prisma.user.findUnique({ where: { email } });`
- Prisma generates the SQL and talks to PostgreSQL.
- We get TypeScript types and a single schema file that describes the database.

So: **PostgreSQL stores the data; Prisma is how our app accesses that data.**

---

## Why Use Prisma (Why Not Only PostgreSQL)?

1. **Type safety** – Prisma generates types from `schema.prisma`, so we get autocomplete and fewer typos.
2. **Less raw SQL** – We use methods like `prisma.user.findUnique`, `prisma.task.create`, instead of long SQL strings.
3. **One schema** – `schema.prisma` describes tables, columns, relations; Prisma keeps code and database in sync.
4. **Migrations / db push** – Prisma can create or update tables in PostgreSQL from the schema.
5. **Easier to maintain** – Changes to the database are done in one place (schema), then we regenerate the client.

So: **We have PostgreSQL to store data, and Prisma to talk to PostgreSQL in a clean, type-safe way from our app.**

---

## In Our Project

| Thing | Role |
|-------|------|
| **PostgreSQL** | The real database (school’s `db_202526z_va_prj_ecore`). Stores User, Task, Invoice, etc. |
| **Prisma** | Library in our Node.js server. Reads `schema.prisma` and `DATABASE_URL`, connects to PostgreSQL, gives us `prisma.user`, `prisma.task`, etc. |
| **schema.prisma** | Defines models (User, Task, Invoice, …) and the connection (`datasource db` with `env("DATABASE_URL")`). |
| **DATABASE_URL** | In `.env`. Tells Prisma how to connect to PostgreSQL (host, port, user, password, database name). |

So: **We have Prisma and PostgreSQL because PostgreSQL is the database and Prisma is the way we use that database from our Node.js app.**

---

## One-Sentence Summary

**PostgreSQL is the database where data is stored; Prisma is the ORM we use in our Node.js app to read and write that data in a type-safe, convenient way.**
