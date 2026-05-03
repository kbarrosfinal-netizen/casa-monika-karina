-- 0008_ticket_value_4000.sql
-- Confirmado pela Mônika: vale-refeição mensal = R$ 4.000,00 (estava 3.000)

update settings
   set ticket_value = 4000
 where id = 'household';

-- Garante a linha 'household' existir (caso o app nunca tenha gravado settings)
insert into settings (id, ticket_value)
values ('household', 4000)
on conflict (id) do nothing;
