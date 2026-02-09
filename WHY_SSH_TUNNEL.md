# Why We Use the SSH Tunnel for the Database

## The Problem: Database Is Not Directly Accessible

Your school's database server is **not open to the internet**. You cannot connect to it directly from your laptop or from your app by typing the database server's IP or hostname.

**Why?**
- **Security:** If the database were publicly reachable, anyone on the internet could try to connect and attack it.
- **Access control:** The school controls who can reach the database by requiring you to go through a specific **tunneling server** first.
- **Firewall:** The database is behind a firewall. Only the tunneling server is allowed to talk to it.

So: **Your app cannot connect directly to the database.**  
That’s why we need something in between: the **SSH tunnel**.

---

## What Is the SSH Tunnel?

An **SSH tunnel** is a **secure, encrypted “pipe”** from your computer to the school’s network.

- You connect to a **tunneling server** (e.g. `194.149.135.130`) using **SSH** (username `t_ecore`, password from the professor).
- That server is allowed to talk to the **database server**.
- SSH creates a **tunnel**:  
  “Anything you send to `localhost:5432` on your machine will be forwarded through this secure connection to the database server’s port 5432.”

So from your app’s point of view:
- It connects to **localhost:5432** (your own machine).
- In reality, that traffic is **sent through the SSH tunnel** to the school’s database.

**In short:**  
SSH tunnel = secure bridge from your laptop to the database, so your app can use `localhost:5432` and still reach the real database.

---

## Why We Use It (Summary)

1. **Database is not on the internet**  
   The DB is only reachable from inside the school’s network. Your app runs on your laptop, so it needs a way to “get inside” that network. The tunnel does that.

2. **Security**  
   All traffic between you and the database goes through an **encrypted** SSH connection. No one on the network can easily read or change your database traffic.

3. **Access control**  
   Only people with SSH tunnel credentials (e.g. `t_ecore` / password) can create the tunnel and thus reach the database. The school (and professor) control who has those credentials.

4. **Same connection method for everyone**  
   The professor gives one procedure: “Use this SSH tunnel, then connect to localhost.” Everyone (you, other students, tools like DBeaver/TablePlus) uses the same approach.

5. **Your app doesn’t need to know about SSH**  
   Your app only needs a connection string like:  
   `Host: localhost, Port: 5432, Database: ..., User: ..., Password: ...`  
   It doesn’t need to implement SSH; the tunnel is started **separately** (e.g. `./start-ssh-tunnel.sh`) before you run the app.

---

## Flow (Simple Picture)

**Without tunnel (does not work):**
```
Your app  --X-->  Database server
                  (blocked by firewall / not on internet)
```

**With tunnel (what we do):**
```
Your app  -->  localhost:5432  -->  SSH tunnel  -->  Tunneling server  -->  Database server
              (on your laptop)      (encrypted)      (school server)        (school DB)
```

- Your app thinks it is talking to “localhost”.
- In reality, the SSH tunnel forwards that to the school’s database.

---

## What We Run and Why

1. **Start the SSH tunnel (once, keep it running)**  
   - Example: `./start-ssh-tunnel.sh` or  
     `ssh -N -L 5432:localhost:5432 t_ecore@194.149.135.130`  
   - This opens the secure “pipe” from your laptop to the school’s network.

2. **Use `localhost` in the app**  
   - In `server/.env`:  
     `DATABASE_URL="postgresql://...@localhost:5432/db_202526z_va_prj_ecore?..."`  
   - So the app connects to **localhost:5432**; the tunnel sends that traffic to the real database.

3. **Start the app (server + client)**  
   - The server uses `DATABASE_URL` and Prisma to connect to “localhost:5432”, which is actually the database through the tunnel.

If you **don’t** start the tunnel, `localhost:5432` on your machine is nothing, and the app cannot reach the database.  
So: **we use the SSH tunnel so that the app can reach the school database in a secure, controlled way.**

---

## Short Answer for “Why did we use the SSH tunnel?”

- **Because the database is not directly accessible from the internet.**  
- The school only allows access through a **tunneling server** via **SSH**.  
- The **SSH tunnel** creates a secure path from your laptop to that server and then to the database, so your app can connect to **localhost:5432** and still reach the real DB.  
- So we use the SSH tunnel to **reach the database securely** and **the way the school requires**.
