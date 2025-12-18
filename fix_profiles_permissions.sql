-- ==============================================================================
-- SCRIPT DE CORREÇÃO DE PERMISSÕES E PERFIS (CORRIGIDO E IDEMPOTENTE)
-- ==============================================================================

-- 1. Função Helper Segura para verificar Super Admin
create or replace function public.is_super_admin()
returns boolean
security definer
language plpgsql
as $$
begin
  return exists (
    select 1 from public.profiles
    where user_id = auth.uid()
    and role = 'super_admin'
  );
end;
$$;

-- 2. Atualizar Policies de Perfis (Profiles)

-- UPDATE POLICY
-- Removemos tanto a policy antiga quanto a nova (caso já exista) para evitar erro 42710
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update own profile or admins" on public.profiles;

create policy "Users can update own profile or admins"
  on public.profiles for update
  using (
    user_id = auth.uid()
    or public.is_super_admin()
  );

-- INSERT POLICY
-- Removemos tanto a policy antiga quanto a nova (caso já exista)
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can insert own profile or admins" on public.profiles;

create policy "Users can insert own profile or admins"
  on public.profiles for insert
  with check (
    user_id = auth.uid()
    or public.is_super_admin()
  );

-- 3. (OPCIONAL) SEU SETUP DE SUPER ADMIN
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email
DO $$
DECLARE
  target_email text := 'admin@cozzi.com'; -- <--- COLOQUE SEU EMAIL AQUI
  target_user_id uuid;
BEGIN
  select id into target_user_id from auth.users where email = target_email;
  
  if target_user_id is not null then
    insert into public.profiles (user_id, role)
    values (target_user_id, 'super_admin')
    on conflict (user_id) do update
    set role = 'super_admin';
    raise notice 'Usuário % definido como super_admin', target_email;
  else
    raise notice 'Usuário % não encontrado. Verifique se o email está correto.', target_email;
  end if;
END $$;
