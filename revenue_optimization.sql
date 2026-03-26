-- Proactive Service Reminders & VAT Automation
-- This migration adds support for tracking service history and automating VAT rates.

-- 1. VAT Rate Automation
-- Add default_vat_rate to settings if it doesn't already exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='default_vat_rate') THEN
        ALTER TABLE settings ADD COLUMN default_vat_rate decimal(5, 2) DEFAULT 13.50;
    END IF;
END $$;

-- 2. Proactive Service Tracking
-- Add last_service_date and service_interval_months to customers
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='last_service_date') THEN
        ALTER TABLE customers ADD COLUMN last_service_date date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='service_interval_months') THEN
        ALTER TABLE customers ADD COLUMN service_interval_months integer DEFAULT 12;
    END IF;
END $$;

-- 3. Job Image Attachments
-- This table stores links to images/files uploaded to jobs
CREATE TABLE IF NOT EXISTS job_attachments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    file_url text NOT NULL,
    file_name text,
    file_type text,
    file_size integer,
    uploaded_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on job_attachments
ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for job_attachments
CREATE POLICY "Users can view attachments for their jobs" 
    ON job_attachments FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upload attachments" 
    ON job_attachments FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own uploaded attachments" 
    ON job_attachments FOR DELETE 
    USING (auth.uid() = uploaded_by);

-- 4. Storage Bucket Setup (Information Only)
-- You MUST create a bucket named 'photos' in Supabase Storage.
-- Policies for 'photos' bucket:
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'photos' );
-- CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'photos' );
