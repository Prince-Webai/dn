
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
