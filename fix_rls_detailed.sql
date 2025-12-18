-- CORREÇÃO DEFINITIVA DE RLS (ERRO 42501)
-- Substitui as policies genéricas "FOR ALL" por policies explícitas para cada operação.
-- Isso garante que o Postgres aplique corretamente as regras de WITH CHECK para INSERT/UPDATE.

-- Função auxiliar para garantir permissões de execução (caso estejam faltando)
grant execute on function public.get_my_kitchen_codes to authenticated;
grant execute on function public.get_my_kitchen_codes to service_role;
grant execute on function public.is_admin_or_manager to authenticated;
grant execute on function public.is_admin_or_manager to service_role;

-- ==============================================================================
-- 1. SHEETS
-- ==============================================================================
drop policy if exists "Tenant access sheets" on public.sheets;

create policy "Select sheets" on public.sheets for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert sheets" on public.sheets for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update sheets" on public.sheets for update
  using (kitchen_code in (select public.get_my_kitchen_codes()))
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Delete sheets" on public.sheets for delete
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- 2. ITEMS
-- ==============================================================================
drop policy if exists "Tenant access items" on public.items;

create policy "Select items" on public.items for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert items" on public.items for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update items" on public.items for update
  using (kitchen_code in (select public.get_my_kitchen_codes()))
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Delete items" on public.items for delete
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- 3. UPDATE LOGS
-- ==============================================================================
drop policy if exists "Tenant access logs" on public.update_logs;

create policy "Select logs" on public.update_logs for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert logs" on public.update_logs for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update logs" on public.update_logs for update
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- 4. RECIPES
-- ==============================================================================
drop policy if exists "Tenant access recipes" on public.recipes;

create policy "Select recipes" on public.recipes for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert recipes" on public.recipes for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update recipes" on public.recipes for update
  using (kitchen_code in (select public.get_my_kitchen_codes()))
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Delete recipes" on public.recipes for delete
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- 5. PURCHASES
-- ==============================================================================
drop policy if exists "Tenant access purchases" on public.purchases;

create policy "Select purchases" on public.purchases for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert purchases" on public.purchases for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update purchases" on public.purchases for update
  using (kitchen_code in (select public.get_my_kitchen_codes()))
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Delete purchases" on public.purchases for delete
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- 6. UTENSILS
-- ==============================================================================
drop policy if exists "Tenant access utensils" on public.utensils;

create policy "Select utensils" on public.utensils for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert utensils" on public.utensils for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update utensils" on public.utensils for update
  using (kitchen_code in (select public.get_my_kitchen_codes()))
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Delete utensils" on public.utensils for delete
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- 7. DAILY CHECKLISTS
-- ==============================================================================
drop policy if exists "Tenant access checklists" on public.daily_checklists;

create policy "Select checklists" on public.daily_checklists for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert checklists" on public.daily_checklists for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update checklists" on public.daily_checklists for update
  using (kitchen_code in (select public.get_my_kitchen_codes()))
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- 8. WEEKLY RULES
-- ==============================================================================
drop policy if exists "Tenant access rules" on public.weekly_rules;

create policy "Select rules" on public.weekly_rules for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert rules" on public.weekly_rules for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update rules" on public.weekly_rules for update
  using (kitchen_code in (select public.get_my_kitchen_codes()))
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Delete rules" on public.weekly_rules for delete
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- 9. DAILY INVENTORIES
-- ==============================================================================
drop policy if exists "Tenant access inventories" on public.daily_inventories;

create policy "Select inventories" on public.daily_inventories for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Insert inventories" on public.daily_inventories for insert
  with check (kitchen_code in (select public.get_my_kitchen_codes()));

create policy "Update inventories" on public.daily_inventories for update
  using (kitchen_code in (select public.get_my_kitchen_codes()))
  with check (kitchen_code in (select public.get_my_kitchen_codes()));
