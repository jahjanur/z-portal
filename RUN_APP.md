# How to Run the Z-Portal App

Open **3 separate terminals** and run these commands:

---

## Terminal 1: SSH Tunnel (required for database)

```bash
cd /Users/zulbearijahjanur/Desktop/EpageBP/ECORE
./start-ssh-tunnel.sh
```

- Enter password when prompted: `4b48f2a3`
- **Keep this terminal open** while using the app

---

## Terminal 2: Server

```bash
cd /Users/zulbearijahjanur/Desktop/EpageBP/ECORE/server
npm run dev
```

- Wait until you see: `🚀 Server running on http://localhost:4001`
- **Keep this terminal open**

---

## Terminal 3: Client

```bash
cd /Users/zulbearijahjanur/Desktop/EpageBP/ECORE/client
npm run dev
```

- Wait until you see the Vite dev server URL (e.g. `http://localhost:5174`)
- **Keep this terminal open**

---

## Open the app

In your browser go to:
- **http://localhost:5174** (or the URL shown in Terminal 3)

## Login
- **Email:** admin@test.com
- **Password:** admin123

---

## Order matters
1. Start Terminal 1 (SSH tunnel) first
2. Then Terminal 2 (server)
3. Then Terminal 3 (client)

All 3 terminals must stay open while you use the app.
