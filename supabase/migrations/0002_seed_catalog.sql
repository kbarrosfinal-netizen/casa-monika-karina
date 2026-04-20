-- Seed: lojas, categorias, produtos base

insert into stores (name, color, "order") values
  ('Supermercados DB', '#1565c0', 1),
  ('Mercantil Nova Era', '#2e7d32', 2),
  ('Mercadinho do Japonês', '#6a1b9a', 3)
on conflict (name) do nothing;

insert into categories (name, icon, "order") values
  ('Hortifrúti', '🥦', 1),
  ('Laticínios', '🥛', 2),
  ('Padaria', '🍞', 3),
  ('Açougue', '🥩', 4),
  ('Mercearia', '🍚', 5),
  ('Bebidas', '🥤', 6),
  ('Limpeza', '🧽', 7),
  ('Higiene', '🧼', 8),
  ('Pet', '🐾', 9),
  ('Outros', '📦', 10)
on conflict (name) do nothing;

-- Produtos base (nome, icone, categoria)
with c as (
  select name, id from categories
)
insert into products (name, icon, category_id, unit) values
  ('Leite', '🥛', (select id from c where name = 'Laticínios'), 'L'),
  ('Iogurte', '🥣', (select id from c where name = 'Laticínios'), 'un'),
  ('Queijo', '🧀', (select id from c where name = 'Laticínios'), 'kg'),
  ('Manteiga', '🧈', (select id from c where name = 'Laticínios'), 'un'),
  ('Ovos', '🥚', (select id from c where name = 'Laticínios'), 'dz'),

  ('Pão Francês', '🥖', (select id from c where name = 'Padaria'), 'kg'),
  ('Pão de Forma', '🍞', (select id from c where name = 'Padaria'), 'un'),
  ('Bolo', '🍰', (select id from c where name = 'Padaria'), 'un'),

  ('Banana', '🍌', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Maçã', '🍎', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Tomate', '🍅', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Cebola', '🧅', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Alho', '🧄', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Batata', '🥔', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Cenoura', '🥕', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Alface', '🥬', (select id from c where name = 'Hortifrúti'), 'un'),
  ('Limão', '🍋', (select id from c where name = 'Hortifrúti'), 'kg'),

  ('Carne Bovina', '🥩', (select id from c where name = 'Açougue'), 'kg'),
  ('Frango', '🍗', (select id from c where name = 'Açougue'), 'kg'),
  ('Peixe', '🐟', (select id from c where name = 'Açougue'), 'kg'),
  ('Bacon', '🥓', (select id from c where name = 'Açougue'), 'kg'),

  ('Arroz', '🍚', (select id from c where name = 'Mercearia'), 'kg'),
  ('Feijão', '🫘', (select id from c where name = 'Mercearia'), 'kg'),
  ('Macarrão', '🍝', (select id from c where name = 'Mercearia'), 'un'),
  ('Açúcar', '🍬', (select id from c where name = 'Mercearia'), 'kg'),
  ('Sal', '🧂', (select id from c where name = 'Mercearia'), 'kg'),
  ('Óleo', '🛢️', (select id from c where name = 'Mercearia'), 'L'),
  ('Café', '☕', (select id from c where name = 'Mercearia'), 'kg'),
  ('Farinha', '🌾', (select id from c where name = 'Mercearia'), 'kg'),

  ('Água', '💧', (select id from c where name = 'Bebidas'), 'L'),
  ('Refrigerante', '🥤', (select id from c where name = 'Bebidas'), 'L'),
  ('Suco', '🧃', (select id from c where name = 'Bebidas'), 'L'),
  ('Cerveja', '🍺', (select id from c where name = 'Bebidas'), 'un'),

  ('Detergente', '🧴', (select id from c where name = 'Limpeza'), 'un'),
  ('Sabão em Pó', '🧺', (select id from c where name = 'Limpeza'), 'un'),
  ('Amaciante', '🧴', (select id from c where name = 'Limpeza'), 'L'),
  ('Desinfetante', '🧪', (select id from c where name = 'Limpeza'), 'L'),
  ('Esponja', '🧽', (select id from c where name = 'Limpeza'), 'un'),
  ('Papel Toalha', '🧻', (select id from c where name = 'Limpeza'), 'un'),

  ('Papel Higiênico', '🧻', (select id from c where name = 'Higiene'), 'un'),
  ('Shampoo', '🧴', (select id from c where name = 'Higiene'), 'un'),
  ('Sabonete', '🧼', (select id from c where name = 'Higiene'), 'un'),
  ('Creme Dental', '🦷', (select id from c where name = 'Higiene'), 'un'),
  ('Desodorante', '🧴', (select id from c where name = 'Higiene'), 'un'),

  ('Ração Cachorro', '🐕', (select id from c where name = 'Pet'), 'kg'),
  ('Ração Gato', '🐈', (select id from c where name = 'Pet'), 'kg'),
  ('Areia Gato', '🪨', (select id from c where name = 'Pet'), 'kg')
on conflict (name) do nothing;

-- Settings row única
insert into settings (id, ticket_value, diaria_value, transp_value, whatsapp_phone)
values ('household', 3000, 150, 10, null)
on conflict (id) do nothing;
