-- ==============================================================================
-- CORREÇÃO DE POLICIES PARA SOLICITAÇÕES (RLS SEGURO)
-- Execute este script no Editor SQL do Supabase
-- ==============================================================================

-- 1. Habilitar RLS
alter table public.requests enable row level security;
alter table public.request_items enable row level security;

-- 2. Policies para REQUESTS

-- SELECT: Visível se a cozinha estiver na lista de cozinhas permitidas do usuário
drop policy if exists "View requests" on public.requests;
create policy "View requests" on public.requests
for select using (
  kitchen_code in (select public.get_my_kitchen_codes())
);

-- INSERT: Permitido se a cozinha estiver na lista permitida
drop policy if exists "Create requests" on public.requests;
create policy "Create requests" on public.requests
for insert with check (
  kitchen_code in (select public.get_my_kitchen_codes())
);

-- UPDATE: Admins podem tudo; Usuários comuns apenas suas próprias pendentes
drop policy if exists "Update requests" on public.requests;
create policy "Update requests" on public.requests
for update using (
  public.is_admin_or_manager(kitchen_code)
  or 
  (created_by = auth.uid()::text and status = 'pending')
);

-- DELETE: Admins podem tudo; Usuários comuns apenas suas próprias pendentes
drop policy if exists "Delete requests" on public.requests;
create policy "Delete requests" on public.requests
for delete using (
  public.is_admin_or_manager(kitchen_code)
  or 
  (created_by = auth.uid()::text and status = 'pending')
);

-- 3. Policies para REQUEST_ITEMS

-- SELECT
drop policy if exists "View request items" on public.request_items;
create policy "View request items" on public.request_items
for select using (
  kitchen_code in (select public.get_my_kitchen_codes())
);

-- INSERT
drop policy if exists "Create request items" on public.request_items;
create policy "Create request items" on public.request_items
for insert with check (
  kitchen_code in (select public.get_my_kitchen_codes())
);

-- UPDATE/DELETE (Combinado ou separado, aqui usando ALL para simplificar se o Supabase suportar, mas separando é mais seguro)
drop policy if exists "Modify request items" on public.request_items;

drop policy if exists "Update request items" on public.request_items;
create policy "Update request items" on public.request_items
for update using (
  public.is_admin_or_manager(kitchen_code)
  or
  exists (
    select 1 from public.requests r
    where r.id = request_items.request_id
      and r.created_by = auth.uid()::text
      and r.status = 'pending'
  )
);

drop policy if exists "Delete request items" on public.request_items;
create policy "Delete request items" on public.request_items
for delete using (
  public.is_admin_or_manager(kitchen_code)
  or
  exists (
    select 1 from public.requests r
    where r.id = request_items.request_id
      and r.created_by = auth.uid()::text
      and r.status = 'pending'
  )
);
