-- Adiciona política de DELETE para restaurantes
-- Permite que super admins e donos (owners) excluam restaurantes
drop policy if exists "Owners and admins can delete restaurants" on public.restaurants;

create policy "Owners and admins can delete restaurants"
  on public.restaurants for delete
  using (
    -- É dono do restaurante
    owner_user_id = auth.uid() 
    or
    -- É super admin global
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
      and role = 'super_admin'
    )
  );
