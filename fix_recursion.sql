
-- CORREÇÃO DE RECURSÃO INFINITA EM KITCHENS_USERS (Versão Simplificada e Idempotente)
--
-- O erro 500 persiste porque a subquery "kitchen_code in (select ...)" dentro da policy "Read kitchen members"
-- ainda aciona a própria policy para filtrar o select interno, causando recursão.
--
-- Solução Definitiva: Usar SECURITY DEFINER numa função helper para listar os kitchen_codes do usuário.
-- Isso faz a consulta rodar com permissões de sistema, bypassando o RLS da tabela kitchens_users na verificação.

-- 1. Função segura para listar cozinhas do usuário (bypassa RLS)
create or replace function public.get_my_kitchen_codes()
returns setof text
security definer
language plpgsql
as $$
begin
  return query
  select kitchen_code
  from public.kitchens_users
  where user_id = auth.uid();
end;
$$;

-- 2. Função segura para checar admin/gerente (bypassa RLS)
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
  );
end;
$$;

-- 3. Corrigir policies de LEITURA (SELECT)
drop policy if exists "Read kitchen members" on public.kitchens_users;

-- Nova policy: usa a função security definer para obter a lista de cozinhas.
-- Como a função é security definer, ela não aciona esta policy recursivamente.
create policy "Read kitchen members"
  on public.kitchens_users for select
  using (
    kitchen_code in (select public.get_my_kitchen_codes())
  );

-- 4. Corrigir policies de INSERÇÃO (INSERT)
drop policy if exists "Insert kitchen members" on public.kitchens_users;

create policy "Insert kitchen members"
  on public.kitchens_users for insert
  with check (
    user_id = auth.uid()
    or
    public.is_admin_or_manager(kitchen_code)
  );

-- 5. Corrigir policies de ATUALIZAÇÃO (UPDATE)
drop policy if exists "Update kitchen members" on public.kitchens_users;

create policy "Update kitchen members"
  on public.kitchens_users for update
  using (public.is_admin_or_manager(kitchen_code));

-- 6. Corrigir policies de EXCLUSÃO (DELETE)
drop policy if exists "Delete kitchen members" on public.kitchens_users;

create policy "Delete kitchen members"
  on public.kitchens_users for delete
  using (
    user_id = auth.uid()
    or
    public.is_admin_or_manager(kitchen_code)
  );

-- 7. Correção para RESTAURANTS (usa a mesma lógica segura)
drop policy if exists "Users can read restaurants they belong to" on public.restaurants;

create policy "Users can read restaurants they belong to"
  on public.restaurants for select
  using (
    kitchen_code in (select public.get_my_kitchen_codes())
  );
