-- ==============================================================================
-- SCRIPT DE RESET TOTAL E CORREÇÃO DE SEGURANÇA (MASTER RESET)
-- ==============================================================================
-- Objetivo: Remover todas as políticas antigas e aplicar regras limpas e permissivas.
-- ==============================================================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE (Para limpar a casa)
alter table public.restaurants disable row level security;
alter table public.kitchens_users disable row level security;
alter table public.profiles disable row level security;
alter table public.sheets disable row level security;
alter table public.items disable row level security;

-- 2. REMOVER TODAS AS POLICIES EXISTENTES (Limpeza Profunda)
drop policy if exists "Users can read restaurants they belong to" on public.restaurants;
drop policy if exists "Users can create restaurants" on public.restaurants;
drop policy if exists "Only global admins can create restaurants" on public.restaurants;
drop policy if exists "Owners and admins can update restaurants" on public.restaurants;
drop policy if exists "Owners and admins can delete restaurants" on public.restaurants;
drop policy if exists "Super admin full access" on public.restaurants;
drop policy if exists "Bypass by email restaurants" on public.restaurants;
drop policy if exists "Users can read own restaurants" on public.restaurants;
drop policy if exists "Owners can update" on public.restaurants;

drop policy if exists "Read kitchen members" on public.kitchens_users;
drop policy if exists "Insert kitchen members" on public.kitchens_users;
drop policy if exists "Update kitchen members" on public.kitchens_users;
drop policy if exists "Delete kitchen members" on public.kitchens_users;
drop policy if exists "Super admin full access" on public.kitchens_users;
drop policy if exists "Bypass by email kitchens_users" on public.kitchens_users;

drop policy if exists "Users can read all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile or admins" on public.profiles;
drop policy if exists "Users can insert own profile or admins" on public.profiles;
drop policy if exists "Super admin full access" on public.profiles;

-- 3. RECRIAR FUNÇÃO DE SUPER ADMIN (Simplificada e Segura)
create or replace function public.is_super_admin()
returns boolean
security definer
language plpgsql
as $$
begin
  -- Verifica role super_admin na tabela profiles
  return exists (
    select 1 from public.profiles
    where user_id = auth.uid()
    and role = 'super_admin'
  );
end;
$$;

-- 4. REABILITAR RLS E APLICAR NOVAS REGRAS

-- --- RESTAURANTS ---
alter table public.restaurants enable row level security;

-- Regra 1: Super Admin faz TUDO (Bypass Total)
create policy "Super Admin All Access Restaurants"
  on public.restaurants for all
  using ( public.is_super_admin() )
  with check ( public.is_super_admin() );

-- Regra 2: Usuários comuns (Leitura do que é seu)
create policy "Users read own restaurants"
  on public.restaurants for select
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from public.kitchens_users where kitchen_code = restaurants.kitchen_code and user_id = auth.uid())
  );

-- Regra 3: Donos podem atualizar (apenas update)
create policy "Owners update restaurants"
  on public.restaurants for update
  using ( owner_user_id = auth.uid() );


-- --- KITCHENS_USERS ---
alter table public.kitchens_users enable row level security;

-- Regra 1: Super Admin faz TUDO
create policy "Super Admin All Access KitchensUsers"
  on public.kitchens_users for all
  using ( public.is_super_admin() )
  with check ( public.is_super_admin() );

-- Regra 2: Usuários comuns (Leitura do que é seu)
create policy "Users read own links"
  on public.kitchens_users for select
  using ( user_id = auth.uid() );

-- Regra 3: Auto-Join (Inserir a si mesmo ou convite se for admin da cozinha)
create policy "Users insert links"
  on public.kitchens_users for insert
  with check (
    user_id = auth.uid() -- Entrar
    or exists (select 1 from public.restaurants where kitchen_code = kitchens_users.kitchen_code and owner_user_id = auth.uid()) -- Dono adicionando
  );


-- --- PROFILES ---
alter table public.profiles enable row level security;

-- Regra 1: Super Admin faz TUDO
create policy "Super Admin All Access Profiles"
  on public.profiles for all
  using ( public.is_super_admin() )
  with check ( public.is_super_admin() );

-- Regra 2: Usuários leem tudo (necessário para listar membros)
create policy "Users read profiles"
  on public.profiles for select
  using ( auth.uid() is not null );

-- Regra 3: Usuários editam seu próprio perfil
create policy "Users edit own profile"
  on public.profiles for update
  using ( user_id = auth.uid() );

-- Regra 4: Inserção (ao criar conta)
create policy "Users insert own profile"
  on public.profiles for insert
  with check ( user_id = auth.uid() );

-- 5. CONFIRMAÇÃO
DO $$
BEGIN
  raise notice 'Reset de políticas concluído. Tente criar o restaurante agora.';
END $$;
