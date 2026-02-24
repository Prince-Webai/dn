-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    type TEXT CHECK (type IN ('part', 'labor', 'service')) DEFAULT 'part'
);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Access" ON invoice_items FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated Update" ON invoice_items FOR UPDATE USING (true);
CREATE POLICY "Authenticated Delete" ON invoice_items FOR DELETE USING (true);
