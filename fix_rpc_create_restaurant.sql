-- ==============================================================================
-- SOLUÇÃO VIA RPC (REMOTE PROCEDURE CALL)
-- ==============================================================================
-- Cria uma função que roda com privilégios totais de admin do banco.
-- O frontend chamará esta função em vez de tentar inserir diretamente na tabela.

create or replace function public.admin_create_restaurant(
  p_name text,
  p_kitchen_code text,
  p_owner_user_id uuid default null,
  p_plan text default 'Free'
)
returns void
security definer -- <--- A MÁGICA: Roda como admin do banco, ignora RLS do usuário
language plpgsql
as $$
begin
  -- 1. Inserir ou Atualizar o Restaurante
  insert into public.restaurants (name, kitchen_code, owner_user_id, plan, active, status)
  values (p_name, p_kitchen_code, p_owner_user_id, p_plan, true, 'active')
  on conflict (kitchen_code) do update
  set
    name = excluded.name,
    owner_user_id = coalesce(excluded.owner_user_id, restaurants.owner_user_id),
    plan = excluded.plan;

  -- 2. Se houver dono, garantir vínculo em kitchens_users
  if p_owner_user_id is not null then
    insert into public.kitchens_users (user_id, kitchen_code, role)
    values (p_owner_user_id, p_kitchen_code, 'gerente')
    on conflict (user_id, kitchen_code) do nothing;
  end if;
end;
$$;
