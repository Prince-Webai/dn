-- Execute this SQL in your Supabase SQL Editor to create the warranty reports table

CREATE TABLE warranty_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Enable Row Level Security
ALTER TABLE warranty_reports ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable read access for authenticated users on warranty_reports"
ON warranty_reports
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users on warranty_reports"
ON warranty_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users on warranty_reports"
ON warranty_reports
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users on warranty_reports"
ON warranty_reports
FOR DELETE
TO authenticated
USING (true);

-- Create simple indexes for quicker lookups
CREATE INDEX idx_warranty_reports_customer_id ON warranty_reports(customer_id);
CREATE INDEX idx_warranty_reports_job_id ON warranty_reports(job_id);
