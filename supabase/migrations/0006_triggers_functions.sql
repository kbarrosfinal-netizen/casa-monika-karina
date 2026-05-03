-- 0006_triggers_functions.sql
-- Casa & Família — triggers de automação e funções RPC

-- =============================================================
-- TRIGGER 1: receipt_items insert → atualiza products.last_price/last_store_id
-- =============================================================
create or replace function trg_receipt_item_update_product_cache()
returns trigger
language plpgsql
as $$
declare
  v_store_id uuid;
begin
  if new.product_id is null or new.unit_price is null then
    return new;
  end if;

  select store_id into v_store_id from receipts where id = new.receipt_id;

  update products
     set last_price    = new.unit_price,
         last_store_id = coalesce(v_store_id, last_store_id)
   where id = new.product_id;

  return new;
end;
$$;

drop trigger if exists trg_receipt_items_product_cache on receipt_items;
create trigger trg_receipt_items_product_cache
  after insert on receipt_items
  for each row execute function trg_receipt_item_update_product_cache();

-- =============================================================
-- TRIGGER 2: shopping_list (is_missing=true) → sugere em monthly_list do mês corrente
-- =============================================================
create or replace function trg_shopping_suggest_monthly()
returns trigger
language plpgsql
as $$
declare
  v_month date := date_trunc('month', current_date)::date;
begin
  if new.is_missing is not true then
    return new;
  end if;

  insert into monthly_list (product_id, month, quantity, suggested, accepted)
  values (new.product_id, v_month, new.quantity, true, false)
  on conflict (product_id, month) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_shopping_list_suggest_monthly on shopping_list;
create trigger trg_shopping_list_suggest_monthly
  after insert or update of is_missing on shopping_list
  for each row
  when (new.is_missing = true)
  execute function trg_shopping_suggest_monthly();

-- =============================================================
-- TRIGGER 3: monthly_list accepted=true (mês corrente) → garante shopping_list
-- =============================================================
create or replace function trg_monthly_to_shopping()
returns trigger
language plpgsql
as $$
declare
  v_current_month date := date_trunc('month', current_date)::date;
begin
  if new.accepted is not true or new.month <> v_current_month then
    return new;
  end if;

  -- Só insere se não há row com is_missing=true para esse produto
  if not exists (
    select 1 from shopping_list
    where product_id = new.product_id and is_missing = true
  ) then
    insert into shopping_list (product_id, is_missing, quantity, added_by)
    values (new.product_id, true, new.quantity, 'sistema');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_monthly_list_to_shopping on monthly_list;
create trigger trg_monthly_list_to_shopping
  after insert or update of accepted on monthly_list
  for each row
  when (new.accepted = true)
  execute function trg_monthly_to_shopping();

-- =============================================================
-- TRIGGER 4: receipts status='done' → cria finance_entry idempotente
-- =============================================================
create or replace function trg_receipt_to_finance()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'done' or new.total is null then
    return new;
  end if;

  if exists (select 1 from finance_entries where receipt_id = new.id) then
    return new;
  end if;

  insert into finance_entries (type, amount, category, source, receipt_id, date, note)
  values (
    'expense',
    new.total,
    'Compras',
    'receipt',
    new.id,
    coalesce(new.purchased_at::date, current_date),
    'Lançamento automático do cupom'
  );

  return new;
end;
$$;

drop trigger if exists trg_receipts_to_finance on receipts;
create trigger trg_receipts_to_finance
  after insert or update of status on receipts
  for each row
  when (new.status = 'done')
  execute function trg_receipt_to_finance();

-- =============================================================
-- RPC 1: get_monthly_summary(month_str) → totais por categoria e por loja
-- =============================================================
create or replace function get_monthly_summary(month_str text)
returns jsonb
language plpgsql
stable
as $$
declare
  v_start date;
  v_end   date;
  v_result jsonb;
begin
  -- Aceita 'YYYY-MM' ou 'YYYY-MM-DD'
  v_start := date_trunc('month', (month_str || '-01')::date)::date;
  v_end   := (v_start + interval '1 month')::date;

  with
  expenses as (
    select coalesce(category, 'Sem categoria') as category, amount
    from finance_entries
    where type = 'expense'
      and date >= v_start and date < v_end
  ),
  by_category as (
    select category, sum(amount)::numeric as total
    from expenses group by category order by total desc
  ),
  by_store as (
    select coalesce(s.name, 'Sem loja') as store, sum(r.total)::numeric as total
    from receipts r
    left join stores s on s.id = r.store_id
    where r.status = 'done'
      and r.purchased_at >= v_start and r.purchased_at < v_end
    group by s.name
    order by total desc
  ),
  totals as (
    select
      (select coalesce(sum(amount),0) from finance_entries where type='expense' and date >= v_start and date < v_end) as expense_total,
      (select coalesce(sum(amount),0) from finance_entries where type='income'  and date >= v_start and date < v_end) as income_total
  )
  select jsonb_build_object(
    'month', to_char(v_start, 'YYYY-MM'),
    'expense_total', (select expense_total from totals),
    'income_total',  (select income_total  from totals),
    'by_category',   coalesce((select jsonb_agg(jsonb_build_object('category', category, 'total', total)) from by_category), '[]'::jsonb),
    'by_store',      coalesce((select jsonb_agg(jsonb_build_object('store', store, 'total', total)) from by_store), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- =============================================================
-- RPC 2: get_shopping_stats() → itens pendentes + estimativa
-- =============================================================
create or replace function get_shopping_stats()
returns jsonb
language sql
stable
as $$
  with pending as (
    select sl.product_id, sl.quantity, p.last_price
    from shopping_list sl
    join products p on p.id = sl.product_id
    where sl.is_missing = true
  )
  select jsonb_build_object(
    'pending_count',   (select count(*)::int from pending),
    'estimated_total', coalesce((select sum(quantity * coalesce(last_price, 0)) from pending), 0)::numeric
  );
$$;

-- =============================================================
-- RPC 3: get_price_history(product_id) → histórico por loja
-- =============================================================
create or replace function get_price_history(p_product_id uuid)
returns table (
  store_id   uuid,
  store_name text,
  price      numeric,
  date       date,
  source     text
)
language sql
stable
as $$
  select pp.store_id, s.name, pp.price, pp.date, pp.source
  from product_prices pp
  join stores s on s.id = pp.store_id
  where pp.product_id = p_product_id
  order by pp.date desc;
$$;

-- =============================================================
-- RPC 4: suggest_monthly_items() → produtos comprados nos últimos 3 meses
--        que ainda não estão no monthly_list do mês atual
-- =============================================================
create or replace function suggest_monthly_items()
returns table (
  product_id uuid,
  product_name text,
  times_bought int,
  avg_quantity numeric
)
language sql
stable
as $$
  with current_month as (
    select date_trunc('month', current_date)::date as m
  ),
  history as (
    select ri.product_id, count(*)::int as times_bought, avg(ri.quantity)::numeric as avg_qty
    from receipt_items ri
    join receipts r on r.id = ri.receipt_id
    where ri.product_id is not null
      and r.purchased_at >= (current_date - interval '3 months')
    group by ri.product_id
    having count(*) >= 2
  )
  select h.product_id, p.name, h.times_bought, h.avg_qty
  from history h
  join products p on p.id = h.product_id
  where not exists (
    select 1 from monthly_list ml, current_month cm
    where ml.product_id = h.product_id and ml.month = cm.m
  )
  order by h.times_bought desc, p.name;
$$;

-- =============================================================
-- Permissões
-- =============================================================
grant execute on function get_monthly_summary(text)   to anon, authenticated, service_role;
grant execute on function get_shopping_stats()        to anon, authenticated, service_role;
grant execute on function get_price_history(uuid)     to anon, authenticated, service_role;
grant execute on function suggest_monthly_items()     to anon, authenticated, service_role;
