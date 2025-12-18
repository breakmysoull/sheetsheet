-- SOLUÇÃO DEFINITIVA V3: SIMPLIFICAÇÃO BASEADA EM FUNÇÃO BOOLEANA
-- Substitui subqueries complexas por uma verificação direta de permissão (True/False).
-- Isso elimina ambiguidades no "WITH CHECK" e resolve o erro 42501.
-- TAMBÉM CORRIGE ERRO 42710 (Policy already exists) usando DROP IF EXISTS.

-- 1. Função Mestra de Acesso (Centraliza a lógica)
create or replace function public.has_access(target_kitchen_code text)
returns boolean
security definer
language plpgsql
as $$
begin
  -- 1. É Super Admin Global?
  if exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin') then
    return true;
  end if;

  -- 2. É Dono (Owner) do Restaurante?
  if exists (select 1 from public.restaurants where kitchen_code = target_kitchen_code and owner_user_id = auth.uid()) then
    return true;
  end if;

  -- 3. É Membro da Cozinha?
  if exists (select 1 from public.kitchens_users where kitchen_code = target_kitchen_code and user_id = auth.uid()) then
    return true;
  end if;

  return false;
end;
$$;

-- Garante permissões na função
grant execute on function public.has_access to authenticated;
grant execute on function public.has_access to service_role;

-- ==============================================================================
-- RECRIAÇÃO DAS POLICIES USANDO A NOVA FUNÇÃO
-- ==============================================================================

-- 2. SHEETS
drop policy if exists "Select sheets" on public.sheets;
drop policy if exists "Insert sheets" on public.sheets;
drop policy if exists "Update sheets" on public.sheets;
drop policy if exists "Delete sheets" on public.sheets;
drop policy if exists "Tenant access sheets" on public.sheets; -- Remove legados

create policy "Select sheets" on public.sheets for select using (public.has_access(kitchen_code));
create policy "Insert sheets" on public.sheets for insert with check (public.has_access(kitchen_code));
create policy "Update sheets" on public.sheets for update using (public.has_access(kitchen_code));
create policy "Delete sheets" on public.sheets for delete using (public.has_access(kitchen_code));

-- 3. ITEMS
drop policy if exists "Select items" on public.items;
drop policy if exists "Insert items" on public.items;
drop policy if exists "Update items" on public.items;
drop policy if exists "Delete items" on public.items;
drop policy if exists "Tenant access items" on public.items;

create policy "Select items" on public.items for select using (public.has_access(kitchen_code));
create policy "Insert items" on public.items for insert with check (public.has_access(kitchen_code));
create policy "Update items" on public.items for update using (public.has_access(kitchen_code));
create policy "Delete items" on public.items for delete using (public.has_access(kitchen_code));

-- 4. UPDATE LOGS
drop policy if exists "Select logs" on public.update_logs;
drop policy if exists "Insert logs" on public.update_logs;
drop policy if exists "Update logs" on public.update_logs;
drop policy if exists "Tenant access logs" on public.update_logs;

create policy "Select logs" on public.update_logs for select using (public.has_access(kitchen_code));
create policy "Insert logs" on public.update_logs for insert with check (public.has_access(kitchen_code));
create policy "Update logs" on public.update_logs for update using (public.has_access(kitchen_code));

-- 5. RECIPES
drop policy if exists "Select recipes" on public.recipes;
drop policy if exists "Insert recipes" on public.recipes;
drop policy if exists "Update recipes" on public.recipes;
drop policy if exists "Delete recipes" on public.recipes;
drop policy if exists "Tenant access recipes" on public.recipes;

create policy "Select recipes" on public.recipes for select using (public.has_access(kitchen_code));
create policy "Insert recipes" on public.recipes for insert with check (public.has_access(kitchen_code));
create policy "Update recipes" on public.recipes for update using (public.has_access(kitchen_code));
create policy "Delete recipes" on public.recipes for delete using (public.has_access(kitchen_code));

-- 6. PURCHASES
drop policy if exists "Select purchases" on public.purchases;
drop policy if exists "Insert purchases" on public.purchases;
drop policy if exists "Update purchases" on public.purchases;
drop policy if exists "Delete purchases" on public.purchases;
drop policy if exists "Tenant access purchases" on public.purchases;

create policy "Select purchases" on public.purchases for select using (public.has_access(kitchen_code));
create policy "Insert purchases" on public.purchases for insert with check (public.has_access(kitchen_code));
create policy "Update purchases" on public.purchases for update using (public.has_access(kitchen_code));
create policy "Delete purchases" on public.purchases for delete using (public.has_access(kitchen_code));

-- 7. UTENSILS
drop policy if exists "Select utensils" on public.utensils;
drop policy if exists "Insert utensils" on public.utensils;
drop policy if exists "Update utensils" on public.utensils;
drop policy if exists "Delete utensils" on public.utensils;
drop policy if exists "Tenant access utensils" on public.utensils;

create policy "Select utensils" on public.utensils for select using (public.has_access(kitchen_code));
create policy "Insert utensils" on public.utensils for insert with check (public.has_access(kitchen_code));
create policy "Update utensils" on public.utensils for update using (public.has_access(kitchen_code));
create policy "Delete utensils" on public.utensils for delete using (public.has_access(kitchen_code));

-- 8. DAILY CHECKLISTS
drop policy if exists "Select checklists" on public.daily_checklists;
drop policy if exists "Insert checklists" on public.daily_checklists;
drop policy if exists "Update checklists" on public.daily_checklists;
drop policy if exists "Tenant access checklists" on public.daily_checklists;

create policy "Select checklists" on public.daily_checklists for select using (public.has_access(kitchen_code));
create policy "Insert checklists" on public.daily_checklists for insert with check (public.has_access(kitchen_code));
create policy "Update checklists" on public.daily_checklists for update using (public.has_access(kitchen_code));

-- 9. WEEKLY RULES
drop policy if exists "Select rules" on public.weekly_rules;
drop policy if exists "Insert rules" on public.weekly_rules;
drop policy if exists "Update rules" on public.weekly_rules;
drop policy if exists "Delete rules" on public.weekly_rules;
drop policy if exists "Tenant access rules" on public.weekly_rules;

create policy "Select rules" on public.weekly_rules for select using (public.has_access(kitchen_code));
create policy "Insert rules" on public.weekly_rules for insert with check (public.has_access(kitchen_code));
create policy "Update rules" on public.weekly_rules for update using (public.has_access(kitchen_code));
create policy "Delete rules" on public.weekly_rules for delete using (public.has_access(kitchen_code));

-- 10. DAILY INVENTORIES
drop policy if exists "Select inventories" on public.daily_inventories;
drop policy if exists "Insert inventories" on public.daily_inventories;
drop policy if exists "Update inventories" on public.daily_inventories;
drop policy if exists "Tenant access inventories" on public.daily_inventories;

create policy "Select inventories" on public.daily_inventories for select using (public.has_access(kitchen_code));
create policy "Insert inventories" on public.daily_inventories for insert with check (public.has_access(kitchen_code));
create policy "Update inventories" on public.daily_inventories for update using (public.has_access(kitchen_code));

-- ==============================================================================
-- 11. RESTAURANTS (CORREÇÃO DE ERRO 42710 E ADOÇÃO DE has_access)
-- ==============================================================================

drop policy if exists "Users can read restaurants they belong to" on public.restaurants;
create policy "Users can read restaurants they belong to"
  on public.restaurants for select
  using (public.has_access(kitchen_code));

drop policy if exists "Users can create restaurants" on public.restaurants;
drop policy if exists "Only global admins can create restaurants" on public.restaurants;
create policy "Only global admins can create restaurants"
  on public.restaurants for insert
  with check (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

drop policy if exists "Owners and admins can update restaurants" on public.restaurants;
create policy "Owners and admins can update restaurants"
  on public.restaurants for update
  using (
    owner_user_id = auth.uid() or
    public.is_admin_or_manager(kitchen_code) -- Mantendo compatibilidade de lógica
  );

-- ==============================================================================
-- 12. PROFILES
-- ==============================================================================

drop policy if exists "Users can read all profiles" on public.profiles;
create policy "Users can read all profiles"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (user_id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (user_id = auth.uid());
