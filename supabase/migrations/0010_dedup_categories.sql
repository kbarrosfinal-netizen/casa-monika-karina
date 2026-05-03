-- 0010_dedup_categories.sql
-- Mescla categorias duplicadas por nome normalizado (lowercase + sem acentos
-- + sem espaços extras). Mantém a categoria com mais produtos (empate: mais
-- antiga). Reaponta products.category_id pro vencedor antes de apagar.
--
-- Sintoma: "Hortifruti" aparecendo 2x na lista de compras.

do $$
declare
  pair record;
  v_pairs int := 0;
begin
  for pair in
    with normalized as (
      select c.id, c.name, c.created_at,
             lower(translate(trim(c.name),
               'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
             )) as norm,
             (select count(*) from products p where p.category_id = c.id) as prod_count
      from categories c
    ),
    ranked as (
      select id, norm, prod_count, created_at,
             row_number() over (
               partition by norm
               order by prod_count desc, created_at asc, id asc
             ) as rn,
             count(*) over (partition by norm) as cnt
      from normalized
    )
    select keep.id as keep_id, drop_c.id as drop_id, keep.norm
      from ranked keep
      join ranked drop_c on drop_c.norm = keep.norm
     where keep.rn = 1 and drop_c.rn > 1 and keep.cnt > 1
  loop
    -- Reaponta produtos
    update products set category_id = pair.keep_id where category_id = pair.drop_id;
    -- Remove duplicada
    delete from categories where id = pair.drop_id;
    v_pairs := v_pairs + 1;
  end loop;

  if v_pairs > 0 then
    raise notice 'categories: % duplicatas mescladas', v_pairs;
  else
    raise notice 'categories: sem duplicatas exatas detectadas';
  end if;
end $$;
