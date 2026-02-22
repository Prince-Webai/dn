-- ==============================================================================
-- CLONMEL GLASS INVOICE HUB - COMPLETE DATABASE SCHEMA
-- ==============================================================================
-- Run this script in the Supabase SQL Editor.
-- It is designed to be idempotent (safe to run multiple times).
-- It handles:
-- 1. Customers Table (CRM)
-- 2. Products Table
-- 3. Invoices Table (with Company, Phone, Reminder fields)
-- 4. Users Table (Auth/Profile)
-- 5. App Settings (Company Logo)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CUSTOMERS TABLE (CRM)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Ireland',
  company TEXT,
  notes TEXT,
  tags TEXT[], -- Array of strings
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT -- Link to User ID
);

-- Index for searching customers efficiently
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(name, email, phone);

-- ------------------------------------------------------------------------------
-- 2. PRODUCTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  unit TEXT DEFAULT 'sqm',
  category TEXT DEFAULT 'General'
);

-- ------------------------------------------------------------------------------
-- 3. INVOICES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  company TEXT DEFAULT 'clonmel', -- 'clonmel' or 'mirrorzone'
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC NOT NULL,
  status TEXT NOT NULL,
  date_issued TEXT NOT NULL,
  due_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  last_reminder_sent TEXT
);

-- SAFEGUARD: Add columns if they were missing in an older version of the table
DO $$
BEGIN
    -- Check for 'company' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='company') THEN
        ALTER TABLE invoices ADD COLUMN company TEXT DEFAULT 'clonmel';
    END IF;

    -- Check for 'customer_phone'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='customer_phone') THEN
        ALTER TABLE invoices ADD COLUMN customer_phone TEXT;
    END IF;

    -- Check for 'last_reminder_sent'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='last_reminder_sent') THEN
        ALTER TABLE invoices ADD COLUMN last_reminder_sent TEXT;
    END IF;
END
$$;

-- ------------------------------------------------------------------------------
-- 4. USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  avatar TEXT
);

-- Seed Initial Admin User if not exists
INSERT INTO users (id, name, email, role, avatar)
VALUES ('u1', 'Admin User', 'admin@clonmel.com', 'ADMIN', 'https://i.pravatar.cc/150?u=admin')
ON CONFLICT (email) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. APP SETTINGS TABLE (For Global Config like Logo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ------------------------------------------------------------------------------
-- 6. SECURITY SETTINGS (DISABLE RLS FOR DEVELOPMENT)
-- ------------------------------------------------------------------------------
-- We disable Row Level Security to allow all operations by the anon key.
-- IMPORTANT: For production, enable RLS and add specific policies.

ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- END OF SCRIPT
-- ==============================================================================
