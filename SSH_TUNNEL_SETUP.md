# SSH Tunnel Setup for School Database

## Important Notes
⚠️ **You MUST establish the SSH tunnel BEFORE starting your application server!**
⚠️ **Do NOT double-click the connection in DBeaver before configuring it, as the server will block your IP!**

## Option 1: Using macOS Built-in SSH (Recommended for macOS)

### Step 1: Create SSH Tunnel
Open a terminal and run:
```bash
ssh -N -L 5432:localhost:5432 t_ecore@194.149.135.130
```

When prompted, enter the password: `4b48f2a3`

**Note**: The `-N` flag is required because the account is restricted to port forwarding only (no shell access).

**Keep this terminal window open** - the tunnel will remain active as long as this terminal session is running.

### Step 2: Verify Tunnel is Active
You should see a connection message. The tunnel is active when you see the SSH prompt.

### Step 3: Start Your Application
In a **new terminal window**, start your server:
```bash
cd server
npm run dev
```

## Option 2: Using Putty/Plink (Windows/Linux)

1. Download the SSH tunneling script package from:
   https://bazi.finki.ukim.mk/resources/Software

2. Unpack the package to a folder

3. Edit the batch file with a text editor and update:
   - User: `t_ecore`
   - Password: `4b48f2a3`

4. Run the script from command line

5. Wait until it shows the tunnel is established

6. Keep the terminal/script running

## Database Connection Details

Once the SSH tunnel is established, your application will connect via:
- **Host**: `localhost` (not the SSH server IP!)
- **Port**: `5432`
- **Database**: `db_202526z_va_prj_ecore`
- **Username**: `db_202526z_va_prj_ecore_owner`
- **Password**: `8f23652e29c4`

## Troubleshooting

### Connection Refused
- Make sure SSH tunnel is active and running
- Check that you're connecting to `localhost`, not `194.149.135.130`
- Verify the tunnel is forwarding port 5432

### IP Blocked
- If you see connection errors, you may have been blocked
- Wait a few minutes and try again
- Make sure you configured the connection properly before attempting

### Tunnel Drops
- If the tunnel disconnects, restart it
- Make sure your internet connection is stable
- The tunnel must remain active while your app is running
