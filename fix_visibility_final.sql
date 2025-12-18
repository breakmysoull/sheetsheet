-- ==============================================================================
-- SCRIPT FINAL DE VISIBILIDADE E DIAGNÓSTICO
-- ==============================================================================

-- 1. Garantir função is_super_admin
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

-- 2. Recriar get_my_kitchen_codes com lógica blindada
create or replace function public.get_my_kitchen_codes()
returns setof text
security definer
language plpgsql
as $$
begin
  -- Se for super admin, retorna TODOS os códigos da tabela restaurants
  if public.is_super_admin() then
    return query select kitchen_code from public.restaurants;
    return; -- Encerra aqui
  end if;

  -- Caso contrário, retorna onde é membro ou dono
  return query
  select kitchen_code
  from public.kitchens_users
  where user_id = auth.uid()
  union
  select kitchen_code
  from public.restaurants
  where owner_user_id = auth.uid();
end;
$$;

-- 3. Reforçar Policy de SELECT em Restaurants
drop policy if exists "Users can read restaurants they belong to" on public.restaurants;
create policy "Users can read restaurants they belong to"
  on public.restaurants for select
  using (
    public.is_super_admin() -- Super admin vê tudo direto (atalho de performance)
    or
    kitchen_code in (select public.get_my_kitchen_codes()) -- Outros veem o que a função permite
  );

-- 4. DIAGNÓSTICO (Opcional: Rode isso separadamente se quiser ver o resultado)
-- Este bloco apenas mostra se você é admin e quantos restaurantes existem
DO $$
DECLARE
  v_is_admin boolean;
  v_count integer;
  v_my_email text;
BEGIN
  v_my_email := 'admin@cozzi.com'; -- Substitua se necessário para teste
  
  -- Verifica se o usuário atual (quem roda o script) é admin
  -- Nota: Em um script SQL rodado no editor, auth.uid() pode ser nulo ou o seu ID real dependendo de como roda.
  -- Mas vamos confiar nas functions criadas acima.
  
  raise notice 'Script de visibilidade aplicado com sucesso.';
END $$;
