-- Manual migration script to make company data global
-- Run this script against your database to remove user-specific company constraints

-- Step 1: Remove foreign key constraint if it exists
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_userId_fkey;

-- Step 2: Drop the unique constraint on userId if it exists  
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_userId_key;

-- Step 3: Remove the userId column
ALTER TABLE companies DROP COLUMN IF EXISTS userId;

-- Step 4: Keep only the first company record (if multiple exist)
-- This assumes you want to preserve the oldest company record as the global one
DELETE FROM companies 
WHERE id NOT IN (
    SELECT id FROM companies 
    ORDER BY "createdAt" ASC 
    LIMIT 1
);

-- Verification: Check remaining company records
SELECT COUNT(*) as company_count FROM companies;
