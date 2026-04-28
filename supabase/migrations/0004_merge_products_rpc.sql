-- 0004_merge_products_rpc.sql
-- Mescla um produto duplicado em um produto principal, atualizando todas as referências
-- e removendo o duplicado. Atômico (transação implícita dentro da function).

create or replace function merge_products(
  keep_id uuid,
  drop_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  if keep_id = drop_id then
    raise exception 'keep_id e drop_id não podem ser iguais';
  end if;

  -- 1. receipt_items: aponta o histórico para o produto principal
  update receipt_items set product_id = keep_id where product_id = drop_id;

  -- 2. product_prices: idem (mantém histórico de preços nos dois nomes do mesmo produto)
  update product_prices set product_id = keep_id where product_id = drop_id;

  -- 3. shopping_list: se o principal já está lá, deleta o duplicado; senão, repointa.
  if exists (select 1 from shopping_list where product_id = keep_id) then
    delete from shopping_list where product_id = drop_id;
  else
    update shopping_list set product_id = keep_id where product_id = drop_id;
  end if;

  -- 4. monthly_list: mesmo padrão, mas por (product_id, month) — preserva uma linha por mês
  delete from monthly_list ml_drop
  using monthly_list ml_keep
  where ml_drop.product_id = drop_id
    and ml_keep.product_id = keep_id
    and ml_drop.month = ml_keep.month;
  update monthly_list set product_id = keep_id where product_id = drop_id;

  -- 5. Remove o produto duplicado
  delete from products where id = drop_id;
end;
$$;

-- Permissões: authenticated users (anon key) podem chamar
grant execute on function merge_products(uuid, uuid) to anon, authenticated, service_role;
