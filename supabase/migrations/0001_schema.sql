-- Casa & Família — Schema inicial
-- Spec ref: §5 do design doc

-- Extensões
create extension if not exists "uuid-ossp";

-- Catálogo
create table stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  color text not null default '#64748b',
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text not null default '📦',
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text not null default '🛒',
  category_id uuid references categories(id) on delete set null,
  unit text not null default 'un',
  created_at timestamptz not null default now()
);

-- Estado de compra
create table shopping_list (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  is_missing boolean not null default false,
  quantity numeric not null default 1,
  added_at timestamptz not null default now(),
  added_by text
);
create unique index shopping_list_product_uniq on shopping_list(product_id);

create table monthly_list (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  month date not null,
  quantity numeric not null default 1,
  added_at timestamptz not null default now(),
  suggested boolean not null default false,
  accepted boolean not null default true
);
create unique index monthly_list_product_month_uniq on monthly_list(product_id, month);

-- Histórico e preços
create table product_prices (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  price numeric not null,
  date date not null,
  source text not null check (source in ('receipt', 'manual'))
);
create index product_prices_product_store_date_idx on product_prices(product_id, store_id, date desc);

create table receipts (
  id uuid primary key default uuid_generate_v4(),
  photo_url text not null,
  store_id uuid references stores(id) on delete set null,
  total numeric,
  purchased_at timestamptz,
  ocr_raw text,
  ocr_json jsonb,
  status text not null default 'processing' check (status in ('processing', 'done', 'failed')),
  created_at timestamptz not null default now()
);

create table receipt_items (
  id uuid primary key default uuid_generate_v4(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name_raw text not null,
  quantity numeric not null default 1,
  unit_price numeric,
  total_price numeric
);

-- Finanças
create table finance_entries (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  source text not null check (source in ('receipt', 'izete', 'manual')),
  receipt_id uuid references receipts(id) on delete cascade,
  izete_event_id uuid,
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

-- Pets
create table pets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  species text,
  birthdate date,
  notes text,
  avatar text,
  created_at timestamptz not null default now()
);

-- Izete
create table izete_events (
  id uuid primary key default uuid_generate_v4(),
  event_date date not null,
  description text,
  paid_amount numeric,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- OS
create table service_orders (
  id uuid primary key default uuid_generate_v4(),
  os_number text,
  client_name text,
  client_doc text,
  items jsonb not null default '[]',
  total numeric,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

-- Settings (single row)
create table settings (
  id text primary key,
  ticket_value numeric not null default 3000,
  diaria_value numeric not null default 150,
  transp_value numeric not null default 10,
  whatsapp_phone text,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- FK retroativa de finance_entries.izete_event_id
alter table finance_entries
  add constraint finance_entries_izete_fk
  foreign key (izete_event_id) references izete_events(id) on delete cascade;

-- RLS + policies anônimas (sem login — acesso por URL obscura)
alter table stores enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table shopping_list enable row level security;
alter table monthly_list enable row level security;
alter table product_prices enable row level security;
alter table receipts enable row level security;
alter table receipt_items enable row level security;
alter table finance_entries enable row level security;
alter table pets enable row level security;
alter table izete_events enable row level security;
alter table service_orders enable row level security;
alter table settings enable row level security;

-- Policies: anon tem CRUD completo em tudo (sem login, controle por obscuridade da URL)
do $$
declare tbl text;
begin
  foreach tbl in array array['stores','categories','products','shopping_list','monthly_list','product_prices','receipts','receipt_items','finance_entries','pets','izete_events','service_orders','settings']
  loop
    execute format('create policy "anon_all_%I" on %I for all to anon using (true) with check (true);', tbl, tbl);
  end loop;
end $$;
