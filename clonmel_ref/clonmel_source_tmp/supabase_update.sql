-- Enable UUID extension for generating IDs if needed (though app sends text IDs)
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PRODUCTS TABLE
-- -----------------------------------------------------------------------------
create table if not exists products (
  id text primary key,
  name text,
  description text,
  price numeric,
  unit text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table products enable row level security;
drop policy if exists "Enable all for products" on products;
create policy "Enable all for products" on products for all using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 2. USERS TABLE
-- -----------------------------------------------------------------------------
create table if not exists users (
  id text primary key,
  name text,
  email text,
  role text,
  avatar text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table users enable row level security;
drop policy if exists "Enable all for users" on users;
create policy "Enable all for users" on users for all using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 3. INVOICES TABLE
-- -----------------------------------------------------------------------------
create table if not exists invoices (
  id text primary key,
  invoice_number text,
  customer_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  company text,
  items jsonb,
  subtotal numeric,
  tax_rate numeric,
  tax_amount numeric,
  total numeric,
  amount_paid numeric,
  balance_due numeric,
  status text,
  date_issued text, -- Storing as text (ISO) to match app logic or date
  due_date text,
  notes text,
  created_by text,
  last_reminder_sent text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add missing columns for existing table updates
alter table invoices add column if not exists company text default 'clonmel';
alter table invoices add column if not exists customer_phone text;
alter table invoices add column if not exists last_reminder_sent text;

-- RLS
alter table invoices enable row level security;
drop policy if exists "Enable all for invoices" on invoices;
create policy "Enable all for invoices" on invoices for all using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 4. CUSTOMERS TABLE (CRM)
-- -----------------------------------------------------------------------------
create table if not exists customers (
  id text primary key,
  name text,
  email text,
  phone text,
  gender text,
  address text,
  city text,
  postal_code text,
  country text,
  company text,
  notes text,
  tags text[],
  created_at text,
  updated_at text,
  created_by text
);

-- RLS
alter table customers enable row level security;
drop policy if exists "Enable all for customers" on customers;
create policy "Enable all for customers" on customers for all using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 5. APP SETTINGS (For Logo)
-- -----------------------------------------------------------------------------
create table if not exists app_settings (
  key text primary key,
  value text
);

-- RLS
alter table app_settings enable row level security;
drop policy if exists "Enable all for app_settings" on app_settings;
create policy "Enable all for app_settings" on app_settings for all using (true) with check (true);
