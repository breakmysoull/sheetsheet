-- ==============================================================================
-- SCRIPT "NUCLEAR" - BYPASS POR EMAIL (DIAGNÓSTICO FINAL)
-- ==============================================================================
-- Este script cria uma regra que permite TUDO baseado diretamente no seu email.
-- Isso elimina qualquer dúvida sobre a tabela 'profiles' ou a função 'is_super_admin'.

-- 1. Substitua o email abaixo pelo seu email de login exato
DO $$
DECLARE
  v_my_email text := 'admin@cozzi.com'; -- <--- COLOQUE SEU EMAIL AQUI (ex: erick@...)
BEGIN
  -- Remover policies anteriores para limpar a área
  execute 'drop policy if exists "Bypass by email restaurants" on public.restaurants';
  execute 'drop policy if exists "Bypass by email kitchens_users" on public.kitchens_users';

  -- Criar Policy Direta no RESTAURANTS
  execute format('
    create policy "Bypass by email restaurants"
      on public.restaurants
      for all
      using ( auth.jwt() ->> ''email'' = %L )
      with check ( auth.jwt() ->> ''email'' = %L )
  ', v_my_email, v_my_email);

  -- Criar Policy Direta no KITCHENS_USERS
  execute format('
    create policy "Bypass by email kitchens_users"
      on public.kitchens_users
      for all
      using ( auth.jwt() ->> ''email'' = %L )
      with check ( auth.jwt() ->> ''email'' = %L )
  ', v_my_email, v_my_email);

  raise notice 'Regras de Bypass criadas para o email: %', v_my_email;
END $$;
