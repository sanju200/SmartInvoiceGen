# PostgreSQL Setup Instructions

## Step 1: Check if PostgreSQL is Running

### Windows:
```cmd
# Check PostgreSQL service status
net start | findstr postgres

# Start PostgreSQL if not running
net start postgresql-x64-15
```

### macOS/Linux:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Or with Homebrew on macOS
brew services start postgresql
```

## Step 2: Test PostgreSQL Connection

Try connecting with different passwords:

```bash
# Try with no password
psql -U postgres -h localhost

# Try with common passwords
psql -U postgres -h localhost
# When prompted, try: password, postgres, admin, 123456, root
```

## Step 3: Create Database

Once connected to PostgreSQL:

```sql
-- Create the database
CREATE DATABASE smartinvogen;

-- List databases to verify
\l

-- Exit
\q
```

## Step 4: Update .env File

Based on your successful connection, update the DATABASE_URL in .env:

```bash
# If no password:
DATABASE_URL="postgresql://postgres:@localhost:5432/smartinvogen"

# If password is "postgres":
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartinvogen"

# If password is "admin":
DATABASE_URL="postgresql://postgres:admin@localhost:5432/smartinvogen"

# Replace with your actual password
```

## Step 5: Test with Prisma

After updating .env:

```bash
npm run db:push
```

## Common Issues:

1. **PostgreSQL not installed**: Download from https://www.postgresql.org/download/
2. **Service not running**: Start the PostgreSQL service
3. **Wrong password**: Reset password with: `ALTER USER postgres PASSWORD 'newpassword';`
4. **Database doesn't exist**: Create it with: `CREATE DATABASE smartinvogen;`

## Quick Setup with Docker (Alternative):

```bash
# Run PostgreSQL in Docker
docker run --name postgres-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=smartinvogen \
  -p 5432:5432 \
  -d postgres:15

# Use this DATABASE_URL:
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartinvogen"
```
