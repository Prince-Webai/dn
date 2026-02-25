-- Add contact_name column to settings table for Account Manager name in PDFs
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS contact_name TEXT DEFAULT 'Admin';
