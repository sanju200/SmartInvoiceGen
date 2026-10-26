# PostgreSQL Setup Guide for Invoice Generator

## 🚀 Quick Setup Options

### Option 1: Docker PostgreSQL (Recommended - Fastest)

```bash
# Run PostgreSQL in Docker
docker run --name invoice-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=smartinvogen \
  -p 5432:5432 \
  -d postgres:15

# Use this DATABASE_URL:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartinvogen"
```

### Option 2: Install PostgreSQL Locally

#### Windows:
1. Download from: https://www.postgresql.org/download/windows/
2. Install with password: `postgres` or `admin`
3. Create database: `smartinvogen`

#### macOS:
```bash
brew install postgresql
brew services start postgresql
createdb smartinvogen
```

#### Linux/Ubuntu:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb smartinvogen
```

## 🔧 Database Connection

### Test Connection
Try these DATABASE_URL options in your `.env` file:

```bash
# Most common (password: postgres)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartinvogen"

# No password
DATABASE_URL="postgresql://postgres:@localhost:5432/smartinvogen"

# Password: admin
DATABASE_URL="postgresql://postgres:admin@localhost:5432/smartinvogen"

# Password: password
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartinvogen"
```

### Verify Connection
```bash
# Test with psql
psql -U postgres -h localhost -d smartinvogen

# Or test with our app
npm run db:push
```

## 🗄️ Database Setup Commands

After PostgreSQL is running:

```bash
# 1. Generate Prisma client
npm run db:generate

# 2. Push schema to database
npm run db:push

# 3. (Optional) Seed with sample data
npm run db:seed

# 4. Restart dev server
npm run dev
```

## ✅ Verify Everything Works

Once connected, test these features:
- ✅ **Signup**: Create new account
- ✅ **Login**: Sign in with email/password
- ✅ **Add Project**: Create new projects
- ✅ **Edit Project**: Update project details
- ✅ **Delete Project**: Remove projects
- ✅ **Preview**: View project details
- ✅ **Download**: Generate invoices

## 🔄 Fallback to SQLite

If PostgreSQL setup is complex, you can temporarily use SQLite:

```bash
# Switch back to SQLite
# Edit prisma/schema.prisma:
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

# Then run:
npm run db:push
npm run dev
```

## 🆘 Troubleshooting

- **"Can't reach database"**: PostgreSQL not running
- **"Password authentication failed"**: Wrong password in DATABASE_URL
- **"Database does not exist"**: Create database first
- **Permission denied**: Check user permissions

## 📱 Quick Test

Test the full API integration:
1. Start PostgreSQL
2. Update `.env` with correct DATABASE_URL
3. Run: `npm run db:push`
4. Run: `npm run dev`
5. Test signup → login → create project → edit → delete
