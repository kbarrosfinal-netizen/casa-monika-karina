-- 0011_consolidate_catalog.sql
-- Consolidação completa do catálogo (138 produtos, 14 categorias)
-- Decisões da Mônika+Karina (sessão 2026-05-03):
--   • Café, Banana → 1 entrada cada
--   • Leite → manter separados (Ninho=pó, integral=tipo)
--   • Pet+Pets → 1 categoria "Pets"
--   • Açougue, Grãos & Cereais, Outros → mesclar nas vizinhas
--   • 12 produtos sem categoria → categoria certa
--   • 14 mesclagens de produto (marcas → genérico)
--   • 3 produtos em categoria errada → corrigir

-- =============================================================
-- HELPER: merge_two_products(keep_name, drop_name)
-- =============================================================
create or replace function merge_two_products(p_keep_name text, p_drop_name text)
returns void
language plpgsql
as $$
declare
  v_keep uuid;
  v_drop uuid;
begin
  select id into v_keep from products where lower(name) = lower(p_keep_name) limit 1;
  select id into v_drop from products where lower(name) = lower(p_drop_name) limit 1;
  if v_keep is null then
    raise notice '  skip: keep_name "%" not found', p_keep_name;
    return;
  end if;
  if v_drop is null then
    raise notice '  skip: drop_name "%" not found', p_drop_name;
    return;
  end if;
  if v_keep = v_drop then
    raise notice '  skip: same id "%"', p_keep_name;
    return;
  end if;
  perform merge_products(v_keep, v_drop);
  raise notice '  merged "%" ← "%"', p_keep_name, p_drop_name;
end;
$$;

-- =============================================================
-- 1. RECATEGORIZAÇÕES (fora-de-lugar e sem categoria)
-- =============================================================

-- Hortifruti
update products set category_id = (select id from categories where name = 'Hortifruti' limit 1)
 where name in ('Abacaxi', 'Couve', 'Mamão', 'Tangerina', 'Banana pagova', 'Batata portuguesa');

-- Carnes & Peixes (de "sem categoria" + Mortadela)
update products set category_id = (select id from categories where name = 'Carnes & Peixes' limit 1)
 where name in ('Coração', 'Lombo', 'Salmão fresco', 'Mortadela');

-- Padaria
update products set category_id = (select id from categories where name = 'Padaria' limit 1)
 where name in ('Pão');

-- Bebidas
update products set category_id = (select id from categories where name = 'Bebidas' limit 1)
 where name in ('Sprite limão', 'Água mineral');

-- Mercearia (Macarrão penne saiu de Padaria; Filtro café saiu de Temperos; Outros)
update products set category_id = (select id from categories where name = 'Mercearia' limit 1)
 where name in ('Macarrão penne', 'Filtro para café nº 2',
                'Açúcar Native Cristal', 'Biscoito Maizena',
                'Castanha caju Duboh', 'Castanha do Pará', 'Sal Jasmine');

-- =============================================================
-- 2. MESCLAGENS DE PRODUTOS (mantém genérico, descarta marcas/duplicatas)
-- =============================================================
do $$
declare
  pair record;
begin
  raise notice '== Mesclando produtos ==';
  for pair in
    select * from (values
      -- Mesclas óbvias
      ('Salmão',      'Salmão fresco'),
      ('Mamão havaí', 'Mamão'),
      ('Água',        'Água mineral'),
      ('Espaguete',   'Macarrao espaguete'),
      ('Penne',       'Macarrão penne'),
      ('Açúcar',      'Açúcar Native Cristal'),
      ('Sal',         'Sal Jasmine'),
      ('Sabonete',    'Sabonete Lux'),
      ('Desodorante', 'Desodorante Rexona'),
      ('Esponja',     'Esponja Bombril'),
      ('Amaciante',   'Amaciante Comfort'),
      ('Manteiga',    'Manteiga C Touro'),
      ('Iogurte',     'Iogurte YoPro'),
      ('Suco',        'Suco Paulista laranja'),
      -- Decisões 2/3 (banana e café apenas 1)
      ('Banana',      'Banana prata'),
      ('Banana',      'Banana pagova'),
      ('Café',        'Café 3 Corações'),
      ('Café',        'Café Santa Clara')
    ) as t(keep_name, drop_name)
  loop
    perform merge_two_products(pair.keep_name, pair.drop_name);
  end loop;
end $$;

-- =============================================================
-- 3. CONSOLIDAÇÃO DE CATEGORIAS
-- =============================================================

-- Açougue → Carnes & Peixes
update products
   set category_id = (select id from categories where name = 'Carnes & Peixes' limit 1)
 where category_id = (select id from categories where name = 'Açougue' limit 1);

-- Grãos & Cereais → Mercearia
update products
   set category_id = (select id from categories where name = 'Mercearia' limit 1)
 where category_id = (select id from categories where name = 'Grãos & Cereais' limit 1);

-- Pet → Pets
update products
   set category_id = (select id from categories where name = 'Pets' limit 1)
 where category_id = (select id from categories where name = 'Pet' limit 1);

-- Outros → Mercearia (resto que não foi mesclado em produtos)
update products
   set category_id = (select id from categories where name = 'Mercearia' limit 1)
 where category_id = (select id from categories where name = 'Outros' limit 1);

-- =============================================================
-- 4. APAGAR CATEGORIAS VAZIAS
-- =============================================================
delete from categories
 where name in ('Açougue', 'Grãos & Cereais', 'Pet', 'Outros')
   and not exists (select 1 from products where category_id = categories.id);

-- =============================================================
-- 5. CLEANUP: remove o helper
-- =============================================================
drop function if exists merge_two_products(text, text);
