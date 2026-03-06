
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Customers Table
create table customers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  address text,
  contact_person text,
  email text,
  phone text,
  account_balance decimal(10, 2) default 0.00,
  payment_terms text default 'Net 30'
);

-- Inventory Table
create table inventory (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sku text unique not null,
  name text not null,
  category text,
  description text,
  cost_price decimal(10, 2) default 0.00,
  sell_price decimal(10, 2) default 0.00,
  stock_level integer default 0,
  location text
);

-- Jobs Table
create table jobs (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  job_number serial, -- Auto-incrementing job number (display only)
  customer_id uuid references customers(id),
  engineer_name text, -- For now, just a text field or we could make an engineers table
  service_type text,
  status text check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')) default 'scheduled',
  date_scheduled timestamp with time zone,
  date_completed timestamp with time zone,
  notes text
);

-- Job Items (Parts & Labor)
create table job_items (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  job_id uuid references jobs(id) on delete cascade,
  inventory_id uuid references inventory(id), -- Optional, if it's a part from inventory
  description text not null, -- Copy name from inventory or custom text for labor
  quantity decimal(10, 2) default 1,
  unit_price decimal(10, 2) default 0.00,
  total decimal(10, 2) generated always as (quantity * unit_price) stored,
  type text check (type in ('part', 'labor', 'service')) default 'part'
);

-- Invoices (Accountant View)
create table invoices (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  invoice_number text unique not null, -- INV-YYYY-XXX
  customer_id uuid references customers(id),
  job_id uuid references jobs(id),
  date_issued date default current_date,
  due_date date,
  subtotal decimal(10, 2) not null,
  vat_rate decimal(5, 2) check (vat_rate in (13.5, 23.0, 0)),
  vat_amount decimal(10, 2) not null,
  total_amount decimal(10, 2) not null,
  custom_description text, -- The single line item description for the accountant
  status text check (status in ('draft', 'sent', 'paid', 'void')) default 'draft',
  pdf_url text
);

-- Statements (Customer View - Detailed)
create table statements (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  statement_number text unique not null, -- STMT-YYYY-XXX
  customer_id uuid references customers(id),
  job_id uuid references jobs(id),
  date_generated date default current_date,
  total_amount decimal(10, 2) not null,
  pdf_url text
);

-- Storage Bucket Policy (You must create a bucket named 'documents' in Supabase Storage)
-- insert into storage.buckets (id, name) values ('documents', 'documents');
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'documents' );
-- create policy "Authenticated Upload" on storage.objects for insert with check ( bucket_id = 'documents' );
-- Quotes Table
create table quotes (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  quote_number text unique not null, -- QT-YYYY-XXX
  customer_id uuid references customers(id),
  description text not null,
  date_issued date default current_date,
  valid_until date,
  subtotal decimal(10, 2) not null,
  vat_rate decimal(5, 2) default 13.5,
  vat_amount decimal(10, 2) not null,
  total_amount decimal(10, 2) not null,
  status text check (status in ('draft', 'pending', 'accepted', 'rejected')) default 'draft',
  notes text
);

-- Quote Items
create table quote_items (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  quote_id uuid references quotes(id) on delete cascade,
  description text not null,
  quantity decimal(10, 2) default 1,
  unit_price decimal(10, 2) default 0.00,
  total decimal(10, 2) generated always as (quantity * unit_price) stored
);
-- Leads Table
create table leads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text,
  phone text,
  source text,
  status text check (status in ('new', 'contacted', 'qualified', 'unqualified', 'converted')) default 'new',
  notes text,
  assigned_to uuid references engineers(id) -- Assuming engineers can be assigned leads
);

-- Enable RLS
alter table leads enable row level security;
create policy "Allow all access" on leads for all using (true) with check (true);
-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    type TEXT CHECK (type IN ('part', 'labor', 'service')) DEFAULT 'part'
);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Access" ON invoice_items FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated Update" ON invoice_items FOR UPDATE USING (true);
CREATE POLICY "Authenticated Delete" ON invoice_items FOR DELETE USING (true);
-- Run this inside your Supabase SQL Editor to support custom OTP webhooks

create table if not exists public.otps (
    id uuid default gen_random_uuid() primary key,
    email text not null,
    otp text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expires_at timestamp with time zone default timezone('utc'::text, now() + interval '5 minutes') not null,
    used boolean default false not null
);

-- Enable RLS (Row Level Security) but allow anon access for now 
-- since users won't be logged in when requesting/verifying OTPs
alter table public.otps enable row level security;

create policy "Allow insert for anyone" 
on public.otps for insert 
with check (true);

create policy "Allow select for anyone" 
on public.otps for select 
using (true);

create policy "Allow update for anyone" 
on public.otps for update 
using (true);

-- Function to allow secure lookup of user ID for password resets
create or replace function get_user_id_by_email(user_email text)
returns uuid
language sql
security definer
as $$
  select id from auth.users where email = user_email limit 1;
$$;
-- Create Engineers Table
create table engineers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text,
  phone text,
  role text default 'Engineer',
  status text check (status in ('active', 'inactive')) default 'active'
);

-- Enable RLS
alter table engineers enable row level security;
create policy "Allow all access" on engineers for all using (true) with check (true);

-- Add some initial dummy data if needed (optional)
-- insert into engineers (name, role) values ('Pat O''Brien', 'Senior Engineer'), ('Sean Murphy', 'Junior Engineer');
-- Service Reports Table
-- Run this in the Supabase SQL editor

create table if not exists service_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  job_id uuid references jobs(id) on delete cascade,
  customer_id uuid references customers(id),
  report_data jsonb not null,
  tester text,
  test_date date,
  machine_make text
);

-- Enable RLS
alter table service_reports enable row level security;

-- Allow authenticated users full access
create policy "Authenticated users can manage service reports"
  on service_reports
  for all
  to authenticated
  using (true)
  with check (true);
-- Settings Table
create table if not exists settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000000'::uuid,
  company_name text,
  company_address text,
  company_phone text,
  company_email text,
  contact_name text default 'Admin',
  bank_name text,
  account_name text,
  iban text,
  bic text,
  vat_reg_number text,
  webhook_url text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table settings enable row level security;
create policy "Allow all access" on settings for all using (true) with check (true);

-- Insert initial settings row if it doesn't exist
insert into settings (id, company_name, company_email, company_phone, company_address)
values (
  '00000000-0000-0000-0000-000000000000', 
  'TN Solar', 
  'info@tnsolar.ie', 
  '000-000-0000', 
  'Address TBD'
)
on conflict (id) do nothing;
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS contact_name TEXT DEFAULT 'Admin';
-- Run this in your Supabase SQL Editor to support Invoice Payments
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone;
-- 1. Add low stock threshold feature to the inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;

-- 2. Update the jobs status constraint to allow 'awaiting_parts'
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status in ('scheduled', 'in_progress', 'awaiting_parts', 'completed', 'cancelled'));
-- Add sent_count column to invoices table
ALTER TABLE invoices ADD COLUMN sent_count INTEGER DEFAULT 0;

-- Update status constraint if necessary (to ensure draft is allowed)
-- Assuming status is already a text field or has a check constraint including 'draft'
