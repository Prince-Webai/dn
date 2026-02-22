-- Enable RLS and add open access policies for quotes and quote_items
-- WARNING: This is for development convenience. In production, you'd want stricter policies.

alter table quotes enable row level security;
create policy "Allow all access" on quotes for all using (true) with check (true);

alter table quote_items enable row level security;
create policy "Allow all access" on quote_items for all using (true) with check (true);
