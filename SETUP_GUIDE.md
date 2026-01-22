# ECORE Setup Guide

## Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (your school database)
- npm or yarn
- SSH access (for school database tunnel)

## ⚠️ IMPORTANT: SSH Tunnel Setup (MUST DO FIRST!)

**You MUST establish an SSH tunnel before starting the application!**

### Quick Setup (macOS/Linux)
```bash
# Run the SSH tunnel script (keep this terminal open!)
./start-ssh-tunnel.sh
```

Or manually:
```bash
ssh -N -L 5432:localhost:5432 t_ecore@194.149.135.130
# Password: 4b48f2a3
# Note: -N flag is required (tunnel only, no shell access)
```

**Keep this terminal window open** - the tunnel must remain active while using the app.

See `SSH_TUNNEL_SETUP.md` for detailed instructions.

## Step 1: Install Dependencies

### Server
```bash
cd server
npm install
```

### Client
```bash
cd client
npm install
```

## Step 2: Configure Database Connection

✅ **Already configured!** The `.env` file has been set up with your school database credentials.

The database connection is configured to use:
- **Host**: `localhost` (via SSH tunnel)
- **Database**: `db_202526z_va_prj_ecore`
- **Username**: `db_202526z_va_prj_ecore_owner`
- **Password**: `8f23652e29c4`

**Note**: The database is accessible via `localhost` only after the SSH tunnel is established.

## Step 3: Set Up Database Schema

Run Prisma migrations to create the database tables:

```bash
cd server
npx prisma migrate deploy
```

Or if you want to reset and apply all migrations:
```bash
npx prisma migrate reset
```

Generate Prisma Client:
```bash
npx prisma generate
```

## Step 4: (Optional) Seed Database

If you have seed data:
```bash
cd server
npx prisma db seed
```

## Step 5: Run the Application

**⚠️ Make sure the SSH tunnel is running before starting the server!**

### Terminal 1 - SSH Tunnel (Keep Running!)
```bash
./start-ssh-tunnel.sh
# Or: ssh -N -L 5432:localhost:5432 t_ecore@194.149.135.130
```

### Terminal 2 - Start the Server
```bash
cd server
npm run dev
```

The server will run on `http://localhost:4000`

### Terminal 3 - Start the Client
```bash
cd client
npm run dev
```

The client will run on `http://localhost:5173` (or another port if 5173 is taken)

## Step 6: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:4000/api

## Troubleshooting

### Database Connection Issues
- **Most common issue**: SSH tunnel is not active! Make sure the tunnel is running.
- Verify your DATABASE_URL is correct (should use `localhost`, not the SSH server IP)
- Ensure SSH tunnel is forwarding port 5432 correctly
- Check that you're connecting to `localhost:5432`, not `194.149.135.130`
- Verify database credentials
- If IP is blocked, wait a few minutes and ensure tunnel is properly configured

### Port Already in Use
- Change PORT in `.env` file (server)
- Or kill the process using the port:
  ```bash
  # Find process on port 4000
  lsof -ti:4000 | xargs kill -9
  ```

### Prisma Issues
- Make sure Prisma Client is generated: `npx prisma generate`
- Check database connection: `npx prisma db pull`
- View database in Prisma Studio: `npx prisma studio`

## Quick Start Script

You can also create a script to run both server and client. Create `start.sh` in the root:

```bash
#!/bin/bash
# Start server in background
cd server && npm run dev &
# Start client
cd client && npm run dev
```

Make it executable:
```bash
chmod +x start.sh
./start.sh
```
