-- Create Engineers Table
create table engineers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text,
  phone text,
  role text default 'Engineer',
  status text check (status in ('active', 'inactive')) default 'active'
);

-- Enable RLS
alter table engineers enable row level security;
create policy "Allow all access" on engineers for all using (true) with check (true);

-- Add some initial dummy data if needed (optional)
-- insert into engineers (name, role) values ('Pat O''Brien', 'Senior Engineer'), ('Sean Murphy', 'Junior Engineer');
