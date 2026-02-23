-- Run this in your Supabase SQL Editor to support Partial Payments and Overdue statuses
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'void', 'partial', 'overdue'));

-- Set default to 'draft' if not already
ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'draft';
