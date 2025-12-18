-- ==============================================================================
-- SCRIPT PARA TORNAR UM USUÁRIO SUPER ADMIN
-- ==============================================================================

-- 1. Substitua 'SEU_EMAIL_AQUI' pelo email do usuário que você quer tornar Super Admin
--    Mantenha as aspas simples! Exemplo: 'admin@cozzi.com'
DO $$
DECLARE
  target_email text := 'admin@cozzi.com'; -- <--- COLOQUE SEU EMAIL AQUI
  target_user_id uuid;
BEGIN
  -- Buscar o ID do usuário pelo email
  select id into target_user_id from auth.users where email = target_email;

  if target_user_id is null then
    raise notice 'Usuário com email % não encontrado!', target_email;
  else
    -- Inserir ou atualizar o perfil
    insert into public.profiles (user_id, role)
    values (target_user_id, 'super_admin')
    on conflict (user_id) do update
    set role = 'super_admin';
    
    raise notice 'Sucesso! O usuário % agora é super_admin.', target_email;
  end if;
END $$;
