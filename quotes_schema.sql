-- Quotes Table
create table quotes (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  quote_number text unique not null, -- QT-YYYY-XXX
  customer_id uuid references customers(id),
  description text not null,
  date_issued date default current_date,
  valid_until date,
  subtotal decimal(10, 2) not null,
  vat_rate decimal(5, 2) default 13.5,
  vat_amount decimal(10, 2) not null,
  total_amount decimal(10, 2) not null,
  status text check (status in ('draft', 'pending', 'accepted', 'rejected')) default 'draft',
  notes text
);

-- Quote Items
create table quote_items (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  quote_id uuid references quotes(id) on delete cascade,
  description text not null,
  quantity decimal(10, 2) default 1,
  unit_price decimal(10, 2) default 0.00,
  total decimal(10, 2) generated always as (quantity * unit_price) stored
);
