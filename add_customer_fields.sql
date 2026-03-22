-- Add machine_model and plant_type to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS machine_model TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS plant_type TEXT;

-- Update existing data if needed (optional)
-- UPDATE customers SET plant_type = 'DTL' WHERE plant_type IS NULL;
