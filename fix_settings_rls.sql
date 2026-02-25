-- Enable RLS and add open access policies for settings
-- WARNING: This is for development convenience. In production, you'd want stricter policies.

-- Ensure settings table has RLS enabled
alter table settings enable row level security;

-- Drop any existing policy to avoid conflicts
drop policy if exists "Allow all access" on settings;

-- Create an all-access policy for development (Authenticated users only)
create policy "Allow all access" on settings 
for all 
to authenticated 
using (true) 
with check (true);
