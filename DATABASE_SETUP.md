# Database Setup - PostgreSQL with Prisma

This application now supports PostgreSQL database with Prisma ORM for data persistence.

## 🚀 Quick Setup

### Option 1: Windows PostgreSQL with pgAdmin (Recommended for Windows)

#### **Step 1: Install PostgreSQL on Windows**

1. **Download PostgreSQL**:
   - Go to https://www.postgresql.org/download/windows/
   - Download the latest PostgreSQL installer (version 15+ recommended)
   - Run the installer as Administrator

2. **Installation Settings**:
   - **Installation Directory**: Default is fine (`C:\Program Files\PostgreSQL\15\`)
   - **Data Directory**: Default is fine (`C:\Program Files\PostgreSQL\15\data\`)
   - **Password**: Set a strong password for the `postgres` superuser (REMEMBER THIS!)
   - **Port**: Keep default `5432`
   - **Locale**: Default is fine
   - **Components**: Make sure pgAdmin 4 is selected

3. **Complete Installation**:
   - Click "Next" through all steps
   - Let it finish installation (may take a few minutes)

#### **Step 2: Open pgAdmin 4**

1. **Launch pgAdmin**:
   - Find pgAdmin 4 in your Start Menu or Desktop
   - It will open in your web browser (this is normal)
   - You may need to set a master password for pgAdmin

2. **Connect to PostgreSQL Server**:
   - In the left panel, you should see "Servers" → "PostgreSQL 15"
   - Right-click on "PostgreSQL 15" → "Connect Server"
   - Enter the password you set during installation
   - Server should now show as connected (green icon)

#### **Step 3: Create Database and User in pgAdmin**

1. **Create the Application Database**:
   - Right-click on "Databases" → "Create" → "Database..."
   - **Database**: `smartinvogen`
   - **Owner**: `postgres` (for now)
   - Click "Save"

2. **Create Application User** (Recommended for security):
   - Right-click on "Login/Group Roles" → "Create" → "Login/Group Role..."
   - **General Tab**:
     - Name: `invoice_user`
   - **Definition Tab**:
     - Password: `invoice_secure_password` (or your preferred password)
   - **Privileges Tab**:
     - Check "Can login?"
     - Check "Create databases?" (optional)
   - Click "Save"

3. **Grant Database Permissions**:
   - Right-click on `smartinvogen` database → "Properties"
   - Go to "Security" tab
   - Click "+" (Add) to add a new privilege
   - **Grantee**: `invoice_user`
   - **Privileges**: Check "ALL"
   - Click "Save"

#### **Step 4: Test Connection with Query Tool**

1. **Open Query Tool**:
   - Right-click on `smartinvogen` database
   - Select "Query Tool"

2. **Test with Simple Query**:
   ```sql
   SELECT version();
   ```
   - Click the "Execute" button (⚡) or press F5
   - You should see PostgreSQL version information

#### **Step 5: Configure Your Application**

1. **Update Environment Variable**:
   - Your DATABASE_URL should be:
   ```
   postgresql://invoice_user:invoice_secure_password@localhost:5432/smartinvogen
   ```

2. **Alternative if using postgres user**:
   ```
   postgresql://postgres:your_postgres_password@localhost:5432/smartinvogen
   ```

### Option 2: Local PostgreSQL (macOS/Linux)

1. **Install PostgreSQL**
   ```bash
   # macOS (with Homebrew)
   brew install postgresql
   brew services start postgresql

   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database**
   ```bash
   # Create database user and database
   sudo -u postgres psql
   CREATE USER invoice_user WITH PASSWORD 'your_password';
   CREATE DATABASE smartinvogen OWNER invoice_user;
   GRANT ALL PRIVILEGES ON DATABASE smartinvogen TO invoice_user;
   \q
   ```

3. **Update Environment Variable**
   ```bash
   # Update DATABASE_URL in your environment
   DATABASE_URL="postgresql://invoice_user:your_password@localhost:5432/smartinvogen"
   ```

### Option 2: Docker PostgreSQL (Easy Setup)

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       restart: always
       environment:
         POSTGRES_DB: smartinvogen
         POSTGRES_USER: invoice_user
         POSTGRES_PASSWORD: invoice_password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Start Database**
   ```bash
   docker-compose up -d
   ```

3. **Set Environment Variable**
   ```bash
   DATABASE_URL="postgresql://invoice_user:invoice_password@localhost:5432/smartinvogen"
   ```

### Option 3: Supabase (Cloud Solution)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy the database URL from Settings > Database

2. **Set Environment Variable**
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
   ```

## 📊 Database Commands

### **For Windows Users:**

1. **Open Command Prompt or PowerShell** as Administrator (optional but recommended)

2. **Navigate to your project directory**:
   ```cmd
   cd path\to\your\smartinvogen-project
   ```

3. **Run Database Commands**:
   ```cmd
   # Generate Prisma client
   npm run db:generate

   # Push schema to database (for development)
   npm run db:push

   # Create and run migrations (for production)
   npm run db:migrate

   # Seed database with sample data
   npm run db:seed

   # Open Prisma Studio (database GUI)
   npm run db:studio

   # Reset database (careful! deletes all data)
   npm run db:reset
   ```

### **For macOS/Linux Users:**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Create and run migrations (for production)
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (careful! deletes all data)
npm run db:reset
```

## 🔧 Development Workflow

### **Windows Setup Steps:**

1. **Initial Setup** (Run in Command Prompt/PowerShell):
   ```cmd
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # Seed with sample data
   npm run db:seed
   ```

2. **Making Schema Changes**:
   ```cmd
   # Edit prisma/schema.prisma
   # Then push changes
   npm run db:push

   # Or create migration for production
   npm run db:migrate
   ```

3. **Start Development**:
   ```cmd
   npm run dev
   ```

### **Alternative: Manual Setup in pgAdmin (if commands fail)**

If the npm commands don't work, you can set up tables manually in pgAdmin:

1. **Open pgAdmin** → Connect to your server
2. **Right-click** on `smartinvogen` database → "Query Tool"
3. **Copy and paste this SQL** then click Execute:

```sql
-- Create projects table
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "customerName" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TEXT NOT NULL,
    "paymentDueDate" TEXT NOT NULL,
    "workPeriod" TEXT NOT NULL,
    "sowRef" TEXT NOT NULL,
    "poNumber" TEXT,
    "invoicePurpose" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Create employees table
CREATE TABLE IF NOT EXISTS "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratePerHour" DOUBLE PRECISION NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "projects_invoiceNumber_key" ON "projects"("invoiceNumber");

-- Add foreign key constraint
ALTER TABLE "employees" ADD CONSTRAINT "employees_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
```

4. **Insert Sample Data** (optional):
```sql
-- Sample project data
INSERT INTO "projects" VALUES
('clv1', 'West Horminics', NULL, 'ABC Corp', '221 Baker Street London 12345',
 'Andy Sorowsky', 'Andys@abccorp.sd', 'INVOICE-WEST-JAN25', '2025-01-31',
 '2025-02-15', 'January 2025', 'Professional Services Agreement', '',
 'Software service provided to ABC Corp', 'EUR', 5160.00, 'active',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Sample employee data
INSERT INTO "employees" VALUES
('emp1', 'John Doe', 15.25, 160, 2440.00, 'clv1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('emp2', 'Jane Smith', 17.00, 160, 2720.00, 'clv1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

## 📋 API Endpoints

The following REST API endpoints are now available:

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Employees
- `POST /api/projects/:id/employees` - Add employee to project
- `DELETE /api/projects/:id/employees/:employeeId` - Remove employee

### Example API Usage

```typescript
import { api } from '@/services/api';

// Get all projects
const projects = await api.getProjects();

// Create new project
const newProject = await api.createProject({
  name: 'New Project',
  customerName: 'Customer Name',
  // ... other required fields
});

// Update project
const updatedProject = await api.updateProject('project-id', {
  name: 'Updated Name'
});
```

## 🔄 Migration from Context to Database

Your existing ProjectContext has been replaced with:
- **Database storage** via PostgreSQL + Prisma
- **API endpoints** for CRUD operations
- **React Query hooks** for data fetching
- **Type-safe API client** for frontend

## 🎯 Next Steps

1. Choose your preferred database setup option above
2. Run the setup commands
3. Your application will now persist data to PostgreSQL
4. Use the new API hooks in your components:

```typescript
import { useProjects, useCreateProject } from '@/hooks/useProjects';

function MyComponent() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  
  // Your component logic here
}
```

## 🛠️ Troubleshooting

### **Windows-Specific Issues:**

1. **"Can't reach database server at localhost:5432"**:
   - **Check PostgreSQL Service**:
     - Press `Win + R`, type `services.msc`, press Enter
     - Look for "postgresql-x64-15" (or similar)
     - Make sure Status is "Running"
     - If stopped, right-click → "Start"

   - **Check pgAdmin Connection**:
     - Open pgAdmin 4
     - Try to connect to your PostgreSQL server
     - If connection fails, PostgreSQL service isn't running

2. **"Password authentication failed"**:
   - Make sure you're using the correct password
   - Try connecting with `postgres` user and installation password
   - Update DATABASE_URL with correct credentials

3. **"Database does not exist"**:
   - Create database manually in pgAdmin
   - Right-click "Databases" → "Create" → "Database..."
   - Name: `smartinvogen`

4. **"Permission denied"**:
   - Run Command Prompt as Administrator
   - Make sure user has correct permissions in pgAdmin
   - Grant ALL privileges to your user

5. **"npm command not found"**:
   - Make sure Node.js is installed
   - Restart Command Prompt after installing Node.js
   - Try running commands in PowerShell instead

### **General Issues:**

- **Connection refused**: Make sure PostgreSQL is running
- **Database doesn't exist**: Create the database manually in pgAdmin
- **Permission denied**: Check user permissions in pgAdmin Security tab
- **Schema out of sync**: Run `npm run db:push` or use manual SQL setup

### **Windows PostgreSQL Service Management:**

**Start PostgreSQL Service:**
```cmd
net start postgresql-x64-15
```

**Stop PostgreSQL Service:**
```cmd
net stop postgresql-x64-15
```

**Restart PostgreSQL Service:**
```cmd
net stop postgresql-x64-15
net start postgresql-x64-15
```

### **Testing Your Setup:**

1. **Test PostgreSQL Connection**:
   - Open pgAdmin 4
   - Connect to your server
   - Right-click on `smartinvogen` → "Query Tool"
   - Run: `SELECT version();`
   - Should return PostgreSQL version

2. **Test Application Connection**:
   ```cmd
   npm run db:generate
   npm run db:push
   ```
   - Should complete without errors

3. **Verify Tables Created**:
   - In pgAdmin, refresh `smartinvogen` database
   - You should see `projects` and `employees` tables

For additional help with setup, you can also explore Supabase, Neon, or other PostgreSQL providers via the [MCP integrations](#open-mcp-popover).
