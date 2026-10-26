# 🪟 Windows PostgreSQL Setup Checklist

## ✅ Pre-Setup Checklist

- [ ] Node.js installed (v16+ recommended)
- [ ] PostgreSQL downloaded from postgresql.org
- [ ] Project cloned and dependencies installed (`npm install`)

## 📋 Step-by-Step Setup

### **Step 1: Install PostgreSQL**
- [ ] Run PostgreSQL installer as Administrator
- [ ] Set strong password for `postgres` user
- [ ] Keep default port `5432`
- [ ] Ensure pgAdmin 4 is included in installation
- [ ] Complete installation

### **Step 2: Open pgAdmin 4**
- [ ] Launch pgAdmin 4 from Start Menu
- [ ] Set master password for pgAdmin (if prompted)
- [ ] Connect to PostgreSQL 15 server
- [ ] Enter postgres password from installation

### **Step 3: Create Database & User**
- [ ] Right-click "Databases" → Create → Database
- [ ] Name: `smartinvogen`
- [ ] Right-click "Login/Group Roles" → Create → Login/Group Role
- [ ] Name: `invoice_user`, Password: `invoice_secure_password`
- [ ] Grant privileges: Check "Can login?"
- [ ] Grant database permissions: Properties → Security → Add privilege for `invoice_user`

### **Step 4: Test Connection**
- [ ] Right-click `smartinvogen` → Query Tool
- [ ] Run: `SELECT version();`
- [ ] Should show PostgreSQL version

### **Step 5: Configure Application**
- [ ] Set DATABASE_URL environment variable:
  ```
  postgresql://invoice_user:invoice_secure_password@localhost:5432/smartinvogen
  ```

### **Step 6: Initialize Database**
Open Command Prompt in project directory:
- [ ] `npm run db:generate` (Generate Prisma client)
- [ ] `npm run db:push` (Create tables)
- [ ] `npm run db:seed` (Add sample data)

### **Step 7: Start Application**
- [ ] `npm run dev` (Start development server)
- [ ] Open browser to see application running

## 🚨 Common Issues & Solutions

### **Issue: "Can't reach database server"**
**Solution:**
- [ ] Check PostgreSQL service is running:
  - Press `Win + R` → type `services.msc`
  - Find "postgresql-x64-15" → Start if stopped
- [ ] Try restarting PostgreSQL service

### **Issue: "Password authentication failed"**
**Solution:**
- [ ] Use correct password from installation
- [ ] Try `postgres` user instead of `invoice_user`
- [ ] Update DATABASE_URL with correct credentials

### **Issue: "Database does not exist"**
**Solution:**
- [ ] Create database manually in pgAdmin
- [ ] Use exact name: `smartinvogen`

### **Issue: npm commands fail**
**Solution:**
- [ ] Run Command Prompt as Administrator
- [ ] Check Node.js is installed: `node --version`
- [ ] Navigate to correct project directory

## 🎯 Success Indicators

- [ ] pgAdmin shows `smartinvogen` database
- [ ] `projects` and `employees` tables exist
- [ ] Sample data visible in tables
- [ ] `npm run dev` starts without database errors
- [ ] Application loads in browser

## 📞 Need Help?

If you encounter issues:
1. Check Windows-specific troubleshooting in DATABASE_SETUP.md
2. Use pgAdmin Query Tool for manual table creation
3. Consider cloud alternatives like Supabase via [MCP integrations](#open-mcp-popover)

## 🔗 Quick Links

- **PostgreSQL Download**: https://www.postgresql.org/download/windows/
- **pgAdmin Documentation**: https://www.pgadmin.org/docs/
- **Project Database Setup**: DATABASE_SETUP.md
