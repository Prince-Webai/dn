CREATE TABLE IF NOT EXISTS warranty_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    form_type TEXT NOT NULL, -- 'Standard Warranty' or 'Installation & Commissioning'
    machine_model TEXT,
    serial_number TEXT,
    install_date DATE,
    report_data JSONB DEFAULT '{}'::jsonb,
    technician_name TEXT,
    customer_signature TEXT, -- Base64 or URL
    status TEXT DEFAULT 'completed'
);

-- Enable RLS
ALTER TABLE warranty_reports ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now (adjust as needed)
CREATE POLICY "Allow authenticated users to manage warranty reports"
ON warranty_reports FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
