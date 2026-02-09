# What Is an SSH Tunnel?

## Simple Definition

An **SSH tunnel** is a **secure, encrypted connection** between your computer and another server. It can **forward** traffic: something that goes to a port on your computer gets sent through that connection to a port on the other side (e.g. the database server).

So: **SSH tunnel = secure “pipe” that forwards your local port to a remote port.**

---

## The Two Parts

### 1. SSH (Secure Shell)

- **SSH** = a way to connect to a remote computer in a **secure, encrypted** way.
- You log in with username and password (or a key).
- Everything sent over SSH is **encrypted**, so others on the network can’t easily read it.

### 2. Tunnel (Port Forwarding)

- **Tunnel** here means **port forwarding**: “Send everything that arrives at port X on my machine through this SSH connection to port Y on the other side.”
- So your app connects to **localhost:X**; that traffic is carried through SSH and delivered to the **remote** machine’s port Y.

**SSH tunnel** = use an SSH connection to create that kind of forwarding.

---

## In Our Project: What We Do

We run something like:

```bash
ssh -N -L 5432:localhost:5432 t_ecore@194.149.135.130
```

Meaning:

- **`ssh`** – Start a secure connection.
- **`t_ecore@194.149.135.130`** – Log in to the **tunneling server** (user `t_ecore`, host `194.149.135.130`).
- **`-L 5432:localhost:5432`** – **Forward**:
  - **Left 5432** = on **your** computer (localhost), port 5432.
  - **Right localhost:5432** = on the **other** side of the SSH connection (the tunneling server), connect to its localhost port 5432 (where the database is).

So:

- Your app connects to **localhost:5432** on your laptop.
- That connection is **forwarded through SSH** to the tunneling server.
- The tunneling server then talks to the database on **its** localhost:5432.
- To your app, it looks like the database is “on your machine”; in reality it’s on the school’s network.

---

## Picture (Simple)

```
Your laptop                    School network
─────────────                  ─────────────

  Your app                          Database
      |                                 ^
      | (connects to                    |
      |  localhost:5432)                |
      v                                 |
  localhost:5432  ─── SSH tunnel ───  Tunneling server
  (on your PC)    (encrypted pipe)    (forwards to DB)
```

So: **SSH tunnel = that encrypted pipe that carries your “localhost:5432” traffic to the database.**

---

## Why “Tunnel”?

The word **tunnel** is used because:

- Your traffic goes **inside** the SSH connection (encrypted).
- From the outside it looks like one secure stream; the actual “destination” (database) is **inside** the school’s network, reached through that stream.

So: **SSH tunnel = traffic “tunneled” through SSH from your machine to the other side.**

---

## Short Summary

- **SSH** = secure, encrypted login to a remote server.
- **Tunnel** = forwarding a port: “localhost:5432 on my machine” → “localhost:5432 on the other side of SSH.”
- **SSH tunnel** = we use SSH to create that secure pipe so our app can reach the school’s database by connecting to localhost:5432.

**One sentence:** An SSH tunnel is a secure connection that forwards traffic from a port on your computer to a port on a remote server (in our case, so we can reach the database through the school’s tunneling server).
