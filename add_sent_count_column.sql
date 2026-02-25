-- Add sent_count column to invoices table
ALTER TABLE invoices ADD COLUMN sent_count INTEGER DEFAULT 0;

-- Update status constraint if necessary (to ensure draft is allowed)
-- Assuming status is already a text field or has a check constraint including 'draft'
