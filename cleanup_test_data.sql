-- cleanup_test_data.sql
-- This script will safely delete all test data (jobs, invoices, quotes, statements, payments)
-- while KEEPING all customers and inventory parts.

-- 1. Delete all child items to avoid foreign key errors
DELETE FROM job_items;
DELETE FROM invoice_items;
DELETE FROM quote_items;

-- 2. Delete all parent documents
DELETE FROM jobs;
DELETE FROM invoices;
DELETE FROM quotes;
DELETE FROM statements;

-- 3. Reset customer balances to 0 (since all their bills/payments are deleted)
UPDATE customers SET account_balance = 0;

-- Note: 'customers' and 'inventory' tables are untouched.
