-- CORREÇÃO PARA ERRO 400 (Bad Request) EM DAILY_INVENTORIES
-- O erro ocorre porque o cliente Supabase Realtime tenta buscar a coluna 'id' para sincronização,
-- mas a tabela daily_inventories não tinha essa coluna (usava apenas chave composta).

-- 1. Adicionar coluna ID (UUID)
alter table public.daily_inventories 
add column if not exists id uuid default gen_random_uuid();

-- 2. Tornar a coluna ID a Chave Primária (Primary Key)
-- Nota: Mantemos a constraint unique(date, plaza, kitchen_code) para garantir unicidade lógica.
do $$
begin
  -- Se não existir PK, define o ID como PK
  if not exists (
    select 1 from information_schema.table_constraints 
    where table_name = 'daily_inventories' 
    and constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.daily_inventories add primary key (id);
  end if;
end $$;

-- 3. Atualizar réplica de identidade (importante para Realtime)
alter table public.daily_inventories replica identity default;
