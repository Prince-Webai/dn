-- Add guest_name column to invoices table to support One-Time Invoices
alter table invoices 
add column guest_name text;
