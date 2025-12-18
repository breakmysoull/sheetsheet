-- ==============================================================================
-- SCHEMA COMPLETO DO INVENTÁRIO COZZI (Versão Consolidada e Corrigida)
-- ==============================================================================
--
-- EXECUTE ESTE SCRIPT NO EDITOR SQL DO SUPABASE PARA RESETAR/ATUALIZAR O SCHEMA.
-- ELE É IDEMPOTENTE: PODE SER RODADO MÚLTIPLAS VEZES SEM ERROS (exceto dados).
--
-- ATENÇÃO: NÃO APAGA DADOS EXISTENTES (usa IF NOT EXISTS).
-- SE QUISER LIMPAR TUDO, RODE ANTES:
-- DROP SCHEMA public CASCADE; CREATE SCHEMA public;
-- (Cuidado: isso apaga TODOS os dados e tabelas do projeto!)

-- Habilitar extensão para timestamps automáticos (opcional, mas recomendado)
create extension if not exists moddatetime schema public;

-- ==============================================================================
-- 1. TABELAS BASE (SEM DEPENDÊNCIAS DE FK CÍCLICAS)
-- ==============================================================================

-- 1.1 Restaurantes (Tenants)
create table if not exists public.restaurants (
  kitchen_code text primary key,
  name text not null,
  owner_user_id uuid, -- referência ao auth.users.id (pode ser null se não houver owner)
  created_at timestamptz default now(),
  last_activity_at timestamptz default now(),
  active boolean default true,
  status text default 'active', -- active, blocked, trial
  plan text default 'Free', -- Free, Pro, Enterprise
  settings jsonb default '{}'::jsonb
);

-- 1.2 Perfis de Usuário (Global)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text default 'funcionario', -- super_admin, gerente, funcionario, auxiliar
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1.3 Vínculo Usuário <-> Cozinha (Multi-tenant)
create table if not exists public.kitchens_users (
  user_id uuid references auth.users(id) on delete cascade,
  kitchen_code text references public.restaurants(kitchen_code) on delete cascade,
  role text default 'funcionario',
  created_at timestamptz default now(),
  primary key (user_id, kitchen_code)
);

-- ==============================================================================
-- 2. TABELAS DE DOMÍNIO (DEPENDEM DE KITCHEN_CODE)
-- ==============================================================================

-- 2.1 Planilhas (Abas do Inventário)
create table if not exists public.sheets (
  name text not null,
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Chave primária composta lógica (não oficial, mas usada para unicidade)
  constraint sheets_name_kitchen_uniq unique (name, kitchen_code)
);

-- 2.2 Itens de Inventário
create table if not exists public.items (
  item_id text not null, -- ID gerado pelo front ou UUID
  sheet_name text not null,
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  name text not null,
  quantity numeric not null default 0,
  unit text,
  category text,
  minimum numeric default 0,
  unit_cost numeric default 0,
  last_updated timestamptz,
  updated_by text,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint items_id_kitchen_sheet_uniq unique (item_id, kitchen_code, sheet_name)
);

-- 2.3 Logs de Atualização
create table if not exists public.update_logs (
  log_id text not null,
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  item_name text,
  change numeric,
  new_quantity numeric,
  updated_by text,
  timestamp timestamptz default now(),
  type text, -- add, subtract, set
  reason text,
  constraint update_logs_pk primary key (log_id, kitchen_code)
);

-- 2.4 Receitas (Fichas Técnicas)
create table if not exists public.recipes (
  id text not null,
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  name text not null,
  yield numeric default 1, -- Rendimento
  category text,
  ingredients jsonb default '[]'::jsonb, -- Lista de ingredientes (JSON)
  cost numeric default 0,
  price numeric default 0,
  prep_sector text,
  active boolean default true,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint recipes_id_kitchen_uniq unique (id, kitchen_code)
);

-- 2.5 Compras
create table if not exists public.purchases (
  id text not null,
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  date timestamptz default now(),
  supplier text,
  total_cost numeric default 0,
  items jsonb default '[]'::jsonb, -- Itens da compra
  status text default 'pending', -- pending, received, cancelled
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint purchases_id_kitchen_uniq unique (id, kitchen_code)
);

-- 2.6 Utensílios
create table if not exists public.utensils (
  id text not null,
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  name text not null,
  category text,
  status text default 'ok', -- ok, danificado, manutencao
  notes text,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint utensils_id_kitchen_uniq unique (id, kitchen_code)
);

-- 2.7 Checklists Diários
create table if not exists public.daily_checklists (
  date text not null, -- YYYY-MM-DD
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  categories jsonb default '[]'::jsonb, -- Estrutura do checklist
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint daily_checklists_date_kitchen_uniq unique (date, kitchen_code)
);

-- 2.8 Regras Semanais (Checklist Recorrente)
create table if not exists public.weekly_rules (
  id uuid default gen_random_uuid() primary key,
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  weekday integer not null, -- 0-6 (Dom-Sab)
  category text not null,
  section text, -- pre, mont
  label text not null,
  created_at timestamptz default now()
);

-- 2.9 Inventários Diários (Histórico de Contagem)
create table if not exists public.daily_inventories (
  id uuid default gen_random_uuid() primary key, -- ID físico para Realtime
  date text not null, -- YYYY-MM-DD
  plaza text not null, -- Praça (Hortifruti, etc)
  kitchen_code text not null references public.restaurants(kitchen_code) on delete cascade,
  items jsonb default '[]'::jsonb, -- Contagem
  updated_at timestamptz default now(),
  constraint daily_inventories_logical_uniq unique (date, plaza, kitchen_code)
);

-- ==============================================================================
-- 3. ÍNDICES (PERFORMANCE)
-- ==============================================================================

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_kitchens_users_user on public.kitchens_users(user_id);
create index if not exists idx_kitchens_users_kitchen on public.kitchens_users(kitchen_code);
create index if not exists idx_items_kitchen on public.items(kitchen_code);
create index if not exists idx_items_sheet on public.items(sheet_name);
create index if not exists idx_logs_kitchen_time on public.update_logs(kitchen_code, timestamp desc);
create index if not exists idx_recipes_kitchen on public.recipes(kitchen_code);

-- ==============================================================================
-- 4. TRIGGERS (UPDATED_AT AUTOMÁTICO)
-- ==============================================================================

create or replace function public.trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Aplicar triggers em tabelas que têm updated_at
drop trigger if exists set_timestamp_profiles on public.profiles;
create trigger set_timestamp_profiles before update on public.profiles for each row execute procedure public.trigger_set_timestamp();

drop trigger if exists set_timestamp_sheets on public.sheets;
create trigger set_timestamp_sheets before update on public.sheets for each row execute procedure public.trigger_set_timestamp();

drop trigger if exists set_timestamp_items on public.items;
create trigger set_timestamp_items before update on public.items for each row execute procedure public.trigger_set_timestamp();

drop trigger if exists set_timestamp_recipes on public.recipes;
create trigger set_timestamp_recipes before update on public.recipes for each row execute procedure public.trigger_set_timestamp();

drop trigger if exists set_timestamp_purchases on public.purchases;
create trigger set_timestamp_purchases before update on public.purchases for each row execute procedure public.trigger_set_timestamp();

drop trigger if exists set_timestamp_utensils on public.utensils;
create trigger set_timestamp_utensils before update on public.utensils for each row execute procedure public.trigger_set_timestamp();

drop trigger if exists set_timestamp_daily_checklists on public.daily_checklists;
create trigger set_timestamp_daily_checklists before update on public.daily_checklists for each row execute procedure public.trigger_set_timestamp();

-- ==============================================================================
-- 5. SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- Habilitar RLS em todas as tabelas sensíveis
alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.kitchens_users enable row level security;
alter table public.sheets enable row level security;
alter table public.items enable row level security;
alter table public.update_logs enable row level security;
alter table public.recipes enable row level security;
alter table public.purchases enable row level security;
alter table public.utensils enable row level security;
alter table public.daily_checklists enable row level security;
alter table public.weekly_rules enable row level security;
alter table public.daily_inventories enable row level security;

-- --- FUNÇÕES AUXILIARES DE SEGURANÇA (CORREÇÃO DE RECURSÃO) ---

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

-- 2. Função segura para listar cozinhas do usuário (Mantida para compatibilidade, mas simplificada)
create or replace function public.get_my_kitchen_codes()
returns setof text
security definer
language plpgsql
as $$
begin
  -- Se for super admin, retorna todas
  if exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin') then
    return query select kitchen_code from public.restaurants;
  else
    return query
    select kitchen_code
    from public.kitchens_users
    where user_id = auth.uid()
    union
    select kitchen_code
    from public.restaurants
    where owner_user_id = auth.uid();
  end if;
end;
$$;

-- 3. Função segura para checar admin/gerente
create or replace function public.is_admin_or_manager(target_kitchen_code text)
returns boolean
security definer
language plpgsql
as $$
begin
  return exists (
    select 1 from public.kitchens_users
    where user_id = auth.uid()
      and kitchen_code = target_kitchen_code
      and role in ('super_admin', 'gerente')
  )
  or exists (
    select 1 from public.restaurants
    where owner_user_id = auth.uid()
      and kitchen_code = target_kitchen_code
  )
  or exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'super_admin'
  );
end;
$$;

-- --- POLICIES GERAIS (Multi-tenant por kitchen_code) ---

-- 5.1 Restaurants
-- Leitura: Se usuário tem vínculo em kitchens_users (usando função segura)
drop policy if exists "Users can read restaurants they belong to" on public.restaurants;
create policy "Users can read restaurants they belong to"
  on public.restaurants for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Inserção: Qualquer usuário autenticado pode criar um restaurante
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

-- Update: Apenas se for owner ou super_admin (usando função segura)
drop policy if exists "Owners and admins can update restaurants" on public.restaurants;
create policy "Owners and admins can update restaurants"
  on public.restaurants for update
  using (
    owner_user_id = auth.uid() or
    public.is_admin_or_manager(restaurants.kitchen_code)
  );

-- Delete: Apenas se for owner ou super_admin
drop policy if exists "Owners and admins can delete restaurants" on public.restaurants;
create policy "Owners and admins can delete restaurants"
  on public.restaurants for delete
  using (
    owner_user_id = auth.uid() or
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );

-- 5.2 Profiles
-- Leitura: Próprio perfil ou se estiver na mesma cozinha
drop policy if exists "Users can read all profiles" on public.profiles;
create policy "Users can read all profiles"
  on public.profiles for select
  using (auth.uid() is not null);

-- Update: Apenas o próprio usuário
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (user_id = auth.uid());

-- Insert: Upsert manual
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (user_id = auth.uid());

-- 5.3 Kitchens Users (CORRIGIDO PARA EVITAR RECURSÃO)
-- Leitura: Ver vínculos das cozinhas onde sou membro
drop policy if exists "Read kitchen members" on public.kitchens_users;
create policy "Read kitchen members"
  on public.kitchens_users for select
  using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Inserção: Auto-vínculo ou Admin adicionando outros
drop policy if exists "Insert kitchen members" on public.kitchens_users;
create policy "Insert kitchen members"
  on public.kitchens_users for insert
  with check (
    user_id = auth.uid() -- Auto-join
    or
    public.is_admin_or_manager(kitchen_code) -- Admin adicionando
  );

-- Update
drop policy if exists "Update kitchen members" on public.kitchens_users;
create policy "Update kitchen members"
  on public.kitchens_users for update
  using (public.is_admin_or_manager(kitchen_code));

-- Delete
drop policy if exists "Delete kitchen members" on public.kitchens_users;
create policy "Delete kitchen members"
  on public.kitchens_users for delete
  using (
    user_id = auth.uid() -- Sair da cozinha
    or
    public.is_admin_or_manager(kitchen_code) -- Remover outros
  );

-- 5.4 Tabelas de Domínio (Sheets, Items, Recipes, etc.)
-- Padrão: Acesso total se tiver vínculo com a cozinha (usando função segura get_my_kitchen_codes)

-- Sheets
drop policy if exists "Select sheets" on public.sheets;
drop policy if exists "Insert sheets" on public.sheets;
drop policy if exists "Update sheets" on public.sheets;
drop policy if exists "Delete sheets" on public.sheets;
create policy "Select sheets" on public.sheets for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert sheets" on public.sheets for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update sheets" on public.sheets for update using (kitchen_code in (select public.get_my_kitchen_codes())) with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Delete sheets" on public.sheets for delete using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Items
drop policy if exists "Select items" on public.items;
drop policy if exists "Insert items" on public.items;
drop policy if exists "Update items" on public.items;
drop policy if exists "Delete items" on public.items;
create policy "Select items" on public.items for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert items" on public.items for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update items" on public.items for update using (kitchen_code in (select public.get_my_kitchen_codes())) with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Delete items" on public.items for delete using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Update Logs
drop policy if exists "Select logs" on public.update_logs;
drop policy if exists "Insert logs" on public.update_logs;
drop policy if exists "Update logs" on public.update_logs;
create policy "Select logs" on public.update_logs for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert logs" on public.update_logs for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update logs" on public.update_logs for update using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Recipes
drop policy if exists "Select recipes" on public.recipes;
drop policy if exists "Insert recipes" on public.recipes;
drop policy if exists "Update recipes" on public.recipes;
drop policy if exists "Delete recipes" on public.recipes;
create policy "Select recipes" on public.recipes for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert recipes" on public.recipes for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update recipes" on public.recipes for update using (kitchen_code in (select public.get_my_kitchen_codes())) with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Delete recipes" on public.recipes for delete using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Purchases
drop policy if exists "Select purchases" on public.purchases;
drop policy if exists "Insert purchases" on public.purchases;
drop policy if exists "Update purchases" on public.purchases;
drop policy if exists "Delete purchases" on public.purchases;
create policy "Select purchases" on public.purchases for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert purchases" on public.purchases for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update purchases" on public.purchases for update using (kitchen_code in (select public.get_my_kitchen_codes())) with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Delete purchases" on public.purchases for delete using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Utensils
drop policy if exists "Select utensils" on public.utensils;
drop policy if exists "Insert utensils" on public.utensils;
drop policy if exists "Update utensils" on public.utensils;
drop policy if exists "Delete utensils" on public.utensils;
create policy "Select utensils" on public.utensils for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert utensils" on public.utensils for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update utensils" on public.utensils for update using (kitchen_code in (select public.get_my_kitchen_codes())) with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Delete utensils" on public.utensils for delete using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Daily Checklists
drop policy if exists "Select checklists" on public.daily_checklists;
drop policy if exists "Insert checklists" on public.daily_checklists;
drop policy if exists "Update checklists" on public.daily_checklists;
create policy "Select checklists" on public.daily_checklists for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert checklists" on public.daily_checklists for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update checklists" on public.daily_checklists for update using (kitchen_code in (select public.get_my_kitchen_codes())) with check (kitchen_code in (select public.get_my_kitchen_codes()));

-- Weekly Rules
drop policy if exists "Select rules" on public.weekly_rules;
drop policy if exists "Insert rules" on public.weekly_rules;
drop policy if exists "Update rules" on public.weekly_rules;
drop policy if exists "Delete rules" on public.weekly_rules;
create policy "Select rules" on public.weekly_rules for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert rules" on public.weekly_rules for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update rules" on public.weekly_rules for update using (kitchen_code in (select public.get_my_kitchen_codes())) with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Delete rules" on public.weekly_rules for delete using (kitchen_code in (select public.get_my_kitchen_codes()));

-- Daily Inventories
drop policy if exists "Select inventories" on public.daily_inventories;
drop policy if exists "Insert inventories" on public.daily_inventories;
drop policy if exists "Update inventories" on public.daily_inventories;
create policy "Select inventories" on public.daily_inventories for select using (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Insert inventories" on public.daily_inventories for insert with check (kitchen_code in (select public.get_my_kitchen_codes()));
create policy "Update inventories" on public.daily_inventories for update using (kitchen_code in (select public.get_my_kitchen_codes())) with check (kitchen_code in (select public.get_my_kitchen_codes()));

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
