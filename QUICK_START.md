# 🚀 ECORE Quick Start Guide

## Step-by-Step to Run Your App

### 1️⃣ Start SSH Tunnel (Terminal 1)
**⚠️ DO THIS FIRST - Keep this terminal open!**

```bash
./start-ssh-tunnel.sh
```

Or manually:
```bash
ssh -N -L 5432:localhost:5432 t_ecore@194.149.135.130
# Password: 4b48f2a3
# Note: -N flag is required (tunnel only, no shell)
```

**Keep this terminal running!** The tunnel must stay active.

---

### 2️⃣ Set Up Database (Terminal 2)
**Only needed once, or when schema changes:**

```bash
cd server
npx prisma migrate deploy
```

This will create all the database tables.

---

### 3️⃣ Start Server (Terminal 2)
```bash
cd server
npm run dev
```

Server runs on: **http://localhost:4000**

---

### 4️⃣ Start Client (Terminal 3)
```bash
cd client
npm run dev
```

Client runs on: **http://localhost:5173**

---

### 5️⃣ Open in Browser
- **Frontend**: http://localhost:5173
- **API Test**: http://localhost:4000/api

---

## Summary

You need **3 terminal windows**:
1. **Terminal 1**: SSH Tunnel (keep running)
2. **Terminal 2**: Server (`npm run dev` in `server/`)
3. **Terminal 3**: Client (`npm run dev` in `client/`)

---

## Troubleshooting

### "Connection refused" or "Can't connect to database"
- ✅ Check that SSH tunnel is running (Terminal 1)
- ✅ Make sure you're connecting to `localhost`, not the SSH server IP
- ✅ Verify the tunnel shows it's active

### "Port already in use"
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Database migration errors
```bash
cd server
npx prisma generate
npx prisma migrate deploy
```

---

## Need More Help?

- See `SETUP_GUIDE.md` for detailed instructions
- See `SSH_TUNNEL_SETUP.md` for SSH tunnel details
