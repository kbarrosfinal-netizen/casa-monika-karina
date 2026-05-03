-- 0005_optimization.sql
-- Casa & Família — colunas, índices e realtime adicionais
-- Spec: prompt de otimização Monika & Karina (2026-05-03)

-- =============================================================
-- 1. Remover unique de shopping_list (FE fará upsert por quantidade)
-- =============================================================
drop index if exists shopping_list_product_uniq;

-- =============================================================
-- 2. Colunas novas
-- =============================================================

-- shopping_list
alter table shopping_list add column if not exists updated_at timestamptz not null default now();
alter table shopping_list add column if not exists notes text;
alter table shopping_list add column if not exists priority int not null default 0;

-- monthly_list
alter table monthly_list add column if not exists updated_at timestamptz not null default now();

-- receipts
alter table receipts add column if not exists updated_at timestamptz not null default now();
alter table receipts add column if not exists notes text;

-- products (cache de último preço/loja)
alter table products add column if not exists is_favorite boolean not null default false;
alter table products add column if not exists last_price numeric;
alter table products add column if not exists last_store_id uuid references stores(id) on delete set null;

-- stores / categories (soft-hide)
alter table stores add column if not exists is_active boolean not null default true;
alter table categories add column if not exists is_active boolean not null default true;

-- pets
alter table pets add column if not exists updated_at timestamptz not null default now();
alter table pets add column if not exists next_vet_visit date;
alter table pets add column if not exists next_vaccine date;

-- izete_events
alter table izete_events add column if not exists updated_at timestamptz not null default now();

-- service_orders
alter table service_orders add column if not exists updated_at timestamptz not null default now();
alter table service_orders add column if not exists due_date date;

-- settings
alter table settings add column if not exists theme text not null default 'light';
alter table settings add column if not exists currency text not null default 'BRL';

-- =============================================================
-- 3. Trigger genérico para manter updated_at
-- =============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare tbl text;
begin
  foreach tbl in array array['shopping_list','monthly_list','receipts','pets','izete_events','service_orders','settings']
  loop
    execute format('drop trigger if exists trg_%I_set_updated_at on %I;', tbl, tbl);
    execute format('create trigger trg_%I_set_updated_at before update on %I for each row execute function set_updated_at();', tbl, tbl);
  end loop;
end $$;

-- =============================================================
-- 4. Índices de performance
-- =============================================================

-- shopping_list: pendentes primeiro
create index if not exists shopping_list_missing_added_idx
  on shopping_list (is_missing desc, added_at desc);

-- receipts
create index if not exists receipts_store_purchased_idx
  on receipts (store_id, purchased_at desc);

create index if not exists receipts_status_idx
  on receipts (status);

-- receipt_items
create index if not exists receipt_items_receipt_idx
  on receipt_items (receipt_id);

create index if not exists receipt_items_product_idx
  on receipt_items (product_id);

-- finance_entries
create index if not exists finance_entries_date_type_idx
  on finance_entries (date desc, type);

create index if not exists finance_entries_izete_idx
  on finance_entries (izete_event_id)
  where izete_event_id is not null;

-- monthly_list
create index if not exists monthly_list_month_accepted_idx
  on monthly_list (month desc, accepted);

-- service_orders
create index if not exists service_orders_status_created_idx
  on service_orders (status, created_at desc);

-- izete_events
create index if not exists izete_events_date_paid_idx
  on izete_events (event_date, paid);

-- products: favoritos
create index if not exists products_favorite_idx
  on products (is_favorite)
  where is_favorite = true;

-- =============================================================
-- 5. Realtime publication: adicionar service_orders
-- =============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'service_orders'
  ) then
    execute 'alter publication supabase_realtime add table service_orders';
  end if;
end $$;
