-- 1. Add low stock threshold feature to the inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;

-- 2. Update the jobs status constraint to allow 'awaiting_parts'
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status in ('scheduled', 'in_progress', 'awaiting_parts', 'completed', 'cancelled'));
