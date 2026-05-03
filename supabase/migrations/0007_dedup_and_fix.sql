-- 0007_dedup_and_fix.sql
-- 1) Remove trigger duplicado introduzido em 0006 (a função OCR e o form manual
--    já inserem finance_entries com contexto rico — store name, payment method).
--    Mantemos a lógica no app, fora do trigger.
-- 2) Dedup shopping_list (mantém mais recente, soma quantidades, OR is_missing)
-- 3) Dedup products via merge_products() (auto-merge por nome normalizado)

-- =============================================================
-- 1. Drop trigger e função de receipts→finance_entries
-- =============================================================
drop trigger if exists trg_receipts_to_finance on receipts;
drop function if exists trg_receipt_to_finance();

-- =============================================================
-- 2. Dedup shopping_list
-- =============================================================
do $$
declare
  v_dup_count int;
begin
  -- Conta duplicatas pra log
  select coalesce(sum(c - 1), 0) into v_dup_count
  from (select count(*) c from shopping_list group by product_id having count(*) > 1) s;

  if v_dup_count = 0 then
    raise notice 'shopping_list: sem duplicatas, nada a fazer';
    return;
  end if;

  raise notice 'shopping_list: removendo % linhas duplicadas', v_dup_count;

  -- Atualiza o "vencedor" (mais recente) com soma de quantidades e OR de is_missing
  with ranked as (
    select id, product_id,
           row_number() over (partition by product_id order by added_at desc, id desc) as rn,
           sum(quantity) over (partition by product_id) as total_qty,
           bool_or(is_missing) over (partition by product_id) as any_missing,
           count(*) over (partition by product_id) as cnt
    from shopping_list
  )
  update shopping_list sl
     set quantity = r.total_qty,
         is_missing = r.any_missing
    from ranked r
   where sl.id = r.id and r.rn = 1 and r.cnt > 1;

  -- Remove os "perdedores"
  with ranked as (
    select id,
           row_number() over (partition by product_id order by added_at desc, id desc) as rn
    from shopping_list
  )
  delete from shopping_list sl
   using ranked r
   where sl.id = r.id and r.rn > 1;
end $$;

-- =============================================================
-- 3. Dedup products via merge_products()
-- Critério: agrupa por nome normalizado (lower + trim + sem acentos básicos)
-- Mantém o produto com mais histórico (price_count + item_count); empate: mais antigo
-- =============================================================
do $$
declare
  pair record;
  v_pair_count int := 0;
begin
  for pair in
    with normalized as (
      select p.id, p.name, p.created_at,
             lower(translate(trim(p.name),
               'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
             )) as norm,
             (select count(*) from product_prices pp where pp.product_id = p.id) as price_count,
             (select count(*) from receipt_items ri where ri.product_id = p.id) as item_count
      from products p
    ),
    ranked as (
      select id, norm,
             row_number() over (
               partition by norm
               order by price_count desc, item_count desc, created_at asc, id asc
             ) as rn,
             count(*) over (partition by norm) as cnt
      from normalized
    )
    select keep.id as keep_id, drop_p.id as drop_id
      from ranked keep
      join ranked drop_p on drop_p.norm = keep.norm
     where keep.rn = 1 and drop_p.rn > 1 and keep.cnt > 1
  loop
    perform merge_products(pair.keep_id, pair.drop_id);
    v_pair_count := v_pair_count + 1;
  end loop;

  if v_pair_count > 0 then
    raise notice 'products: % pares mesclados via merge_products()', v_pair_count;
  else
    raise notice 'products: sem duplicatas exatas detectadas';
  end if;
end $$;
