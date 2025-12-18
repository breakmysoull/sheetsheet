-- ==============================================================================
-- SCRIPT DE CORREÇÃO FINAL PARA CRIAÇÃO DE RESTAURANTES
-- ==============================================================================

-- 1. Função Segura para verificar Super Admin (Bypassa RLS)
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

-- 2. Substituir a Policy de Inserção (Criação)
-- Remove versões antigas para evitar conflitos
drop policy if exists "Users can create restaurants" on public.restaurants;
drop policy if exists "Only global admins can create restaurants" on public.restaurants;

-- Cria a nova policy usando a função segura
create policy "Only global admins can create restaurants"
  on public.restaurants for insert
  with check (
    public.is_super_admin()
  );

-- 3. ATRIBUIR SUPER ADMIN AO SEU USUÁRIO
-- IMPORTANTE: Substitua o email abaixo pelo SEU email de login
DO $$
DECLARE
  -- vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
  target_email text := 'admin@cozzi.com'; -- <--- COLOQUE SEU EMAIL AQUI
  -- ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  target_user_id uuid;
BEGIN
  select id into target_user_id from auth.users where email = target_email;
  
  if target_user_id is not null then
    -- Garante que o perfil existe e é super_admin
    insert into public.profiles (user_id, role)
    values (target_user_id, 'super_admin')
    on conflict (user_id) do update
    set role = 'super_admin';
    
    raise notice 'SUCESSO: Usuário % agora tem permissão total (super_admin).', target_email;
  else
    raise notice 'ERRO: Usuário % não encontrado. Você digitou o email correto?', target_email;
  end if;
END $$;
