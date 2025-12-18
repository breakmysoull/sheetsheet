-- ==============================================================================
-- SCRIPT "BALA DE PRATA" PARA RLS DE RESTAURANTES
-- ==============================================================================

-- 1. Função Helper: É Super Admin? (Blindada)
create or replace function public.is_super_admin()
returns boolean
security definer
language plpgsql
as $$
begin
  -- Verifica direto na tabela de profiles se o usuário atual tem a role
  return exists (
    select 1 from public.profiles
    where user_id = auth.uid()
    and role = 'super_admin'
  );
end;
$$;

-- 2. Limpar TODAS as policies antigas de restaurants para evitar conflitos
drop policy if exists "Users can read restaurants they belong to" on public.restaurants;
drop policy if exists "Users can create restaurants" on public.restaurants;
drop policy if exists "Only global admins can create restaurants" on public.restaurants;
drop policy if exists "Owners and admins can update restaurants" on public.restaurants;
drop policy if exists "Owners and admins can delete restaurants" on public.restaurants;
drop policy if exists "Super admin full access" on public.restaurants;

-- 3. CRIAR POLICIES LIMPAS

-- 3.1 SUPER ADMIN: Acesso TOTAL e IRRESTRITO (Resolve seu problema)
create policy "Super admin full access"
  on public.restaurants
  for all -- SELECT, INSERT, UPDATE, DELETE
  using ( public.is_super_admin() )
  with check ( public.is_super_admin() );

-- 3.2 USUÁRIOS COMUNS: Leitura (Onde sou membro ou dono)
create policy "Users can read own restaurants"
  on public.restaurants for select
  using (
    -- Sou dono
    owner_user_id = auth.uid()
    OR
    -- Sou membro (via tabela kitchens_users)
    exists (
      select 1 from public.kitchens_users
      where kitchen_code = restaurants.kitchen_code
      and user_id = auth.uid()
    )
  );

-- 3.3 USUÁRIOS COMUNS: Update (Apenas Donos)
create policy "Owners can update"
  on public.restaurants for update
  using ( owner_user_id = auth.uid() );

-- 4. Confirmação
DO $$
BEGIN
  raise notice 'Policies recriadas com sucesso. Super Admin tem passe livre agora.';
END $$;
