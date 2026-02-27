-- Run this inside your Supabase SQL Editor to support custom OTP webhooks

create table if not exists public.otps (
    id uuid default gen_random_uuid() primary key,
    email text not null,
    otp text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expires_at timestamp with time zone default timezone('utc'::text, now() + interval '5 minutes') not null,
    used boolean default false not null
);

-- Enable RLS (Row Level Security) but allow anon access for now 
-- since users won't be logged in when requesting/verifying OTPs
alter table public.otps enable row level security;

create policy "Allow insert for anyone" 
on public.otps for insert 
with check (true);

create policy "Allow select for anyone" 
on public.otps for select 
using (true);

create policy "Allow update for anyone" 
on public.otps for update 
using (true);

-- Function to allow secure lookup of user ID for password resets
create or replace function get_user_id_by_email(user_email text)
returns uuid
language sql
security definer
as $$
  select id from auth.users where email = user_email limit 1;
$$;
