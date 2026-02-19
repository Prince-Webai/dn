-- Enable RLS on customers but add a policy to allow all access
-- WARNING: This is for development convenience. In production, you'd want stricter policies.
alter table customers enable row level security;
create policy "Allow all access" on customers for all using (true) with check (true);

-- Repeat for other tables if necessary
alter table inventory enable row level security;
create policy "Allow all access" on inventory for all using (true) with check (true);

alter table jobs enable row level security;
create policy "Allow all access" on jobs for all using (true) with check (true);

alter table job_items enable row level security;
create policy "Allow all access" on job_items for all using (true) with check (true);

alter table invoices enable row level security;
create policy "Allow all access" on invoices for all using (true) with check (true);

alter table statements enable row level security;
create policy "Allow all access" on statements for all using (true) with check (true);
