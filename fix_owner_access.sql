-- CORREÇÃO DE ACESSO PARA DONOS (OWNERS)
-- O erro 403 ocorre porque a função get_my_kitchen_codes() olhava apenas a tabela kitchens_users.
-- Se o usuário fosse dono (owner_user_id na tabela restaurants) mas não estivesse em kitchens_users,
-- ele perdia acesso a todos os itens, sheets, etc.

-- 1. Atualizar get_my_kitchen_codes para incluir cozinhas onde o usuário é dono
create or replace function public.get_my_kitchen_codes()
returns setof text
security definer
language plpgsql
as $$
begin
  return query
  select kitchen_code
  from public.kitchens_users
  where user_id = auth.uid()
  union
  select kitchen_code
  from public.restaurants
  where owner_user_id = auth.uid();
end;
$$;

-- 2. Atualizar is_admin_or_manager para considerar o dono como admin supremo
create or replace function public.is_admin_or_manager(target_kitchen_code text)
returns boolean
security definer
language plpgsql
as $$
begin
  return exists (
    select 1 from public.kitchens_users
    where user_id = auth.uid()
      and kitchen_code = target_kitchen_code
      and role in ('super_admin', 'gerente')
  )
  or exists (
    select 1 from public.restaurants
    where owner_user_id = auth.uid()
      and kitchen_code = target_kitchen_code
  );
end;
$$;
