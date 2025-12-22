-- ==============================================================================
-- CORREÇÃO DE RECURSÃO INFINITA EM POLICIES (RLS)
-- Execute este script no Editor SQL do Supabase
-- ==============================================================================

-- 1. Recriar a função get_my_kitchen_codes com SECURITY DEFINER explícito e search_path seguro
create or replace function public.get_my_kitchen_codes()
returns setof text
security definer
set search_path = public
language plpgsql
as $$
begin
  -- Se for super admin global, retorna todos os kitchen_codes
  if exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin') then
    return query select kitchen_code from public.restaurants;
  else
    -- Retorna cozinhas onde é membro OU dono
    return query
    select kitchen_code
    from public.kitchens_users
    where user_id = auth.uid()
    union
    select kitchen_code
    from public.restaurants
    where owner_user_id = auth.uid();
  end if;
end;
$$;

-- 2. Recriar a função is_admin_or_manager com SECURITY DEFINER e search_path seguro
create or replace function public.is_admin_or_manager(target_kitchen_code text)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
begin
  -- Verifica se é admin/gerente na tabela de membros
  if exists (
    select 1 from public.kitchens_users
    where user_id = auth.uid()
      and kitchen_code = target_kitchen_code
      and role in ('super_admin', 'gerente')
  ) then
    return true;
  end if;

  -- Verifica se é dono do restaurante
  if exists (
    select 1 from public.restaurants
    where owner_user_id = auth.uid()
      and kitchen_code = target_kitchen_code
  ) then
    return true;
  end if;

  -- Verifica se é super admin global
  if exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'super_admin'
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- 3. Redefinir a policy problemática na tabela kitchens_users
drop policy if exists "Read kitchen members" on public.kitchens_users;
create policy "Read kitchen members"
  on public.kitchens_users for select
  using (
    -- Usuário vê a si mesmo
    user_id = auth.uid() 
    OR 
    -- OU vê membros das cozinhas que ele tem acesso (usando a função segura)
    kitchen_code in (select public.get_my_kitchen_codes())
  );

-- 4. Garantir que RLS está ativo
alter table public.kitchens_users enable row level security;
