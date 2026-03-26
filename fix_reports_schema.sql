-- 1. Fix Customers Table Schema
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_service_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_interval_months INTEGER DEFAULT 12;

-- 2. Ensure Service Reports Table Correctness
CREATE TABLE IF NOT EXISTS service_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  job_id uuid references jobs(id) on delete cascade,
  customer_id uuid references customers(id),
  report_data jsonb not null,
  tester text,
  test_date date,
  machine_make text
);

-- Fix RLS for Service Reports
ALTER TABLE service_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage service reports" ON service_reports;
CREATE POLICY "Authenticated users can manage service reports"
  ON service_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow ANON access for testing (Remove in production if needed)
DROP POLICY IF EXISTS "Anon users can manage service reports" ON service_reports;
CREATE POLICY "Anon users can manage service reports"
  ON service_reports FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Ensure Warranty Reports Table Correctness
CREATE TABLE IF NOT EXISTS warranty_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  form_type TEXT NOT NULL,
  machine_model TEXT,
  serial_number TEXT,
  install_date DATE,
  technician_name TEXT,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Fix RLS for Warranty Reports
ALTER TABLE warranty_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users on warranty_reports" ON warranty_reports;
CREATE POLICY "Enable all access for authenticated users on warranty_reports"
  ON warranty_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow ANON access for testing (Remove in production if needed)
DROP POLICY IF EXISTS "Anon users can manage warranty_reports" ON warranty_reports;
CREATE POLICY "Anon users can manage warranty_reports"
  ON warranty_reports FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Fix permissions for related tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for anyone" ON customers;
CREATE POLICY "Enable all access for anyone" ON customers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for anyone" ON jobs;
CREATE POLICY "Enable all access for anyone" ON jobs FOR ALL USING (true) WITH CHECK (true);
