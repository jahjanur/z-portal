# Database Access Guide for macOS

## Method 1: Prisma Studio (Easiest - Already Running)

1. **Open your browser** (Safari, Chrome, or Firefox)
2. **Go to**: http://localhost:5555
3. **Wait 10-15 seconds** for it to load
4. If you see a white screen:
   - Press `Cmd + Shift + R` to hard refresh
   - Or try `Cmd + Option + I` to open Developer Tools and check for errors

## Method 2: DBeaver for macOS

### Step 1: Download DBeaver
1. Go to: https://bazi.finki.ukim.mk/resources/Software
2. Download the macOS version (should be a `.dmg` or `.zip` file)
3. Or download directly from: https://dbeaver.io/download/ (choose macOS)

### Step 2: Install DBeaver
1. Open the downloaded file
2. Drag DBeaver to your Applications folder
3. Open DBeaver from Applications (you may need to right-click and select "Open" the first time due to macOS security)

### Step 3: Start SSH Tunnel (IMPORTANT!)
**Before connecting to database, you MUST start the SSH tunnel:**

Open Terminal and run:
```bash
cd /Users/zulbearijahjanur/Desktop/EpageBP/ECORE
./start-ssh-tunnel.sh
```

Or manually:
```bash
ssh -N -L 5432:localhost:5432 t_ecore@194.149.135.130
# Password: 4b48f2a3
```

**Keep this terminal window open!**

### Step 4: Create Database Connection in DBeaver
1. Open DBeaver
2. Click the **"New Database Connection"** button (plug icon) or go to `Database` → `New Database Connection`
3. Select **PostgreSQL** and click Next
4. Fill in the connection details:
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `db_202526z_va_prj_ecore`
   - **Username**: `db_202526z_va_prj_ecore_owner`
   - **Password**: `8f23652e29c4`
5. Click **Test Connection** to verify
6. Click **Finish**

### Step 5: Browse Your Data
- Expand the connection in the left sidebar
- Navigate to: `Schemas` → `public` → `Tables`
- Double-click any table to view data:
  - `User` - All user accounts
  - `Task` - All tasks
  - `Invoice` - All invoices
  - `Project` - All projects
  - `Domain` - All domains
  - etc.

## Method 3: Command Line (Terminal) - macOS

If you have PostgreSQL client installed:

```bash
# Make sure SSH tunnel is running first!
psql -h localhost -p 5432 -U db_202526z_va_prj_ecore_owner -d db_202526z_va_prj_ecore
# When prompted, enter password: 8f23652e29c4
```

### Useful SQL Commands:
```sql
-- List all tables
\dt

-- View all users
SELECT id, email, name, role FROM "User";

-- Count records in each table
SELECT 'User' as table_name, COUNT(*) FROM "User"
UNION ALL
SELECT 'Task', COUNT(*) FROM "Task"
UNION ALL
SELECT 'Invoice', COUNT(*) FROM "Invoice";

-- Exit
\q
```

## Method 4: TablePlus (macOS Native - Recommended for Mac)

TablePlus is a beautiful, native macOS database client:

1. **Download**: https://tableplus.com/ (free version available)
2. **Install**: Drag to Applications folder
3. **Start SSH tunnel** (same as above)
4. **Create connection**:
   - Click "Create a new connection"
   - Choose PostgreSQL
   - Host: `localhost`
   - Port: `5432`
   - Database: `db_202526z_va_prj_ecore`
   - User: `db_202526z_va_prj_ecore_owner`
   - Password: `8f23652e29c4`
5. **Connect** and browse!

## Troubleshooting

### "Connection refused" or "Can't connect"
- ✅ Make sure SSH tunnel is running (check Terminal)
- ✅ Verify tunnel is active: `ps aux | grep "ssh.*5432"`

### "Authentication failed"
- ✅ Double-check username and password
- ✅ Make sure you're using `localhost`, not the SSH server IP

### Prisma Studio shows white screen
- ✅ Try hard refresh: `Cmd + Shift + R`
- ✅ Check browser console: `Cmd + Option + I`
- ✅ Try different browser (Safari, Chrome, Firefox)
- ✅ Use DBeaver or TablePlus instead

## Quick Checklist

Before accessing database:
- [ ] SSH tunnel is running (Terminal 1)
- [ ] Using `localhost` as host (not `194.149.135.130`)
- [ ] Port is `5432`
- [ ] Correct database name: `db_202526z_va_prj_ecore`
- [ ] Correct username: `db_202526z_va_prj_ecore_owner`
- [ ] Correct password: `8f23652e29c4`
