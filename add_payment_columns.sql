-- Run this in your Supabase SQL Editor to support Invoice Payments
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone;
