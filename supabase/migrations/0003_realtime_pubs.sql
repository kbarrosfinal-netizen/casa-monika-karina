-- Habilitar realtime nas tabelas que a UI vai ouvir
alter publication supabase_realtime add table shopping_list;
alter publication supabase_realtime add table monthly_list;
alter publication supabase_realtime add table receipts;
alter publication supabase_realtime add table receipt_items;
alter publication supabase_realtime add table finance_entries;
alter publication supabase_realtime add table izete_events;
alter publication supabase_realtime add table pets;
