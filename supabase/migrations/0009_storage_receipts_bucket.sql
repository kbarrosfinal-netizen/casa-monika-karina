-- 0009_storage_receipts_bucket.sql
-- Garante que o bucket 'receipts' existe e que anon pode upload/read/update/delete.
-- Modelo de segurança do app é "obscuridade por URL" (mesma escolha de RLS no public).
-- Sintoma sem essa policy: frontend retorna "new row violates row-level security policy"
-- ao tentar fazer upload da foto da nota fiscal.

-- 1. Bucket público (idempotente)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update
   set public = true;

-- 2. Policy permissiva pra anon no bucket receipts
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'anon_all_receipts_bucket'
  ) then
    create policy "anon_all_receipts_bucket"
      on storage.objects
      for all
      to anon
      using (bucket_id = 'receipts')
      with check (bucket_id = 'receipts');
  end if;
end $$;
