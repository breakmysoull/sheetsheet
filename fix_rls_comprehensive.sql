-- ==============================================================================
-- SCRIPT DE LIBERAÇÃO TOTAL (COMPREHENSIVE FIX)
-- ==============================================================================

-- 1. Garantir que a função is_super_admin existe e é SEGURA
create or replace function public.is_super_admin()
returns boolean
security definer -- IMPORTANTE: Ignora RLS ao ler a tabela profiles
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

-- 2. Aplicar "Passe Livre" para Super Admin em TODAS as tabelas críticas
-- Isso garante que nenhuma tabela bloqueie o admin

-- Tabela: RESTAURANTS
drop policy if exists "Super admin full access" on public.restaurants;
create policy "Super admin full access" on public.restaurants for all
  using ( public.is_super_admin() ) with check ( public.is_super_admin() );

-- Tabela: KITCHENS_USERS (Onde você estava tendo erro 403 também)
drop policy if exists "Super admin full access" on public.kitchens_users;
create policy "Super admin full access" on public.kitchens_users for all
  using ( public.is_super_admin() ) with check ( public.is_super_admin() );

-- Tabela: PROFILES
drop policy if exists "Super admin full access" on public.profiles;
create policy "Super admin full access" on public.profiles for all
  using ( public.is_super_admin() ) with check ( public.is_super_admin() );

-- Tabela: SHEETS (Garante acesso ao inventário)
drop policy if exists "Super admin full access" on public.sheets;
create policy "Super admin full access" on public.sheets for all
  using ( public.is_super_admin() ) with check ( public.is_super_admin() );

-- Tabela: ITEMS
drop policy if exists "Super admin full access" on public.items;
create policy "Super admin full access" on public.items for all
  using ( public.is_super_admin() ) with check ( public.is_super_admin() );

-- 3. DIAGNÓSTICO FINAL
-- Vai exibir no console do Supabase se ele te reconhece ou não
DO $$
DECLARE
  v_role text;
BEGIN
  select role into v_role from public.profiles where user_id = auth.uid();
  
  IF public.is_super_admin() THEN
    RAISE NOTICE 'SUCESSO TOTAL: O sistema reconhece você como Super Admin (Role: %).', v_role;
  ELSE
    RAISE NOTICE 'ALERTA CRÍTICO: O sistema NÃO te reconhece como Super Admin. Sua role atual é: %. Verifique se você está logado com a conta correta no Editor SQL.', v_role;
  END IF;
END $$;
