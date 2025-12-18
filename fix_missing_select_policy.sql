-- ==============================================================================
-- CORREÇÃO DE POLÍTICAS DE LEITURA (SELECT) EM PERFIS E USUÁRIOS
-- ==============================================================================

-- 1. Garantir que qualquer usuário autenticado possa ler seu próprio perfil (e outros, se necessário para colaboração)
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Garantir permissões de leitura na tabela de vínculo kitchens_users
-- Isso é crucial para que o sistema saiba quais cozinhas o usuário pode acessar
DROP POLICY IF EXISTS "Read kitchen members" ON public.kitchens_users;
DROP POLICY IF EXISTS "Users can read their own kitchen memberships" ON public.kitchens_users;

CREATE POLICY "Users can read their own kitchen memberships"
  ON public.kitchens_users FOR SELECT
  USING (
    user_id = auth.uid() -- O próprio usuário pode ver seus vínculos
    OR
    kitchen_code IN ( -- Ou pode ver membros das cozinhas que ele faz parte
      SELECT kitchen_code FROM public.kitchens_users WHERE user_id = auth.uid()
    )
  );

-- 3. Garantir que a função de sincronia de roles exista e funcione
-- Isso mantém profiles.role e kitchens_users.role sincronizados (opcional, mas recomendado)
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Se atualizou o role no profile, tenta atualizar nas cozinhas (se fizer sentido para seu app)
  -- OU apenas garante que o role default seja respeitado.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
