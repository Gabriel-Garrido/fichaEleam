-- Fix RLS recursion when creating/updating camas.
-- Run in Supabase SQL Editor for production.

create or replace function public.familiar_can_view_cama(p_cama_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.familiar_residentes fr
    join public.residentes r on r.id = fr.residente_id
    where fr.profile_id = (select auth.uid())
      and r.cama_actual_id = p_cama_id
      and public.eleam_has_access(r.eleam_id)
  );
$$;

create or replace function public.familiar_can_view_habitacion(p_habitacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.familiar_residentes fr
    join public.residentes r on r.id = fr.residente_id
    join public.camas c on c.id = r.cama_actual_id
    where fr.profile_id = (select auth.uid())
      and c.habitacion_id = p_habitacion_id
      and public.eleam_has_access(r.eleam_id)
  );
$$;

create or replace function public.habitacion_belongs_to_eleam(
  p_habitacion_id uuid,
  p_eleam_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.habitaciones h
    where h.id = p_habitacion_id
      and h.eleam_id = p_eleam_id
  );
$$;

create or replace function public.residente_belongs_to_eleam(
  p_residente_id uuid,
  p_eleam_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.residentes r
    where r.id = p_residente_id
      and r.eleam_id = p_eleam_id
  );
$$;

revoke all on function public.familiar_can_view_cama(uuid) from public;
grant execute on function public.familiar_can_view_cama(uuid) to authenticated;

revoke all on function public.familiar_can_view_habitacion(uuid) from public;
grant execute on function public.familiar_can_view_habitacion(uuid) to authenticated;

revoke all on function public.habitacion_belongs_to_eleam(uuid, uuid) from public;
grant execute on function public.habitacion_belongs_to_eleam(uuid, uuid) to authenticated;

revoke all on function public.residente_belongs_to_eleam(uuid, uuid) from public;
grant execute on function public.residente_belongs_to_eleam(uuid, uuid) to authenticated;

drop policy if exists "habitaciones_select" on public.habitaciones;
create policy "habitaciones_select" on public.habitaciones
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
    or (
      public.my_rol() = 'familiar'
      and public.familiar_can_view_habitacion(id)
    )
  );

drop policy if exists "camas_select" on public.camas;
drop policy if exists "camas_insert_admin" on public.camas;
drop policy if exists "camas_update_admin" on public.camas;

create policy "camas_select" on public.camas
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
    or (
      public.my_rol() = 'familiar'
      and public.familiar_can_view_cama(id)
    )
  );

create policy "camas_insert_admin" on public.camas
  for insert with check (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
      and public.habitacion_belongs_to_eleam(habitacion_id, eleam_id)
    )
  );

create policy "camas_update_admin" on public.camas
  for update using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
      and public.habitacion_belongs_to_eleam(habitacion_id, eleam_id)
    )
  );

drop policy if exists "sv_select" on public.signos_vitales;
drop policy if exists "sv_insert" on public.signos_vitales;
drop policy if exists "sv_update" on public.signos_vitales;
drop policy if exists "sv_delete" on public.signos_vitales;

create policy "sv_select" on public.signos_vitales
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
    or (
      public.my_rol() = 'familiar'
      and residente_id in (select public.my_familiar_residente_ids())
    )
  );

create policy "sv_insert" on public.signos_vitales
  for insert with check (
    public.funcionario_can('crear_signos_vitales')
    and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
  );

create policy "sv_update" on public.signos_vitales
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_signos_vitales')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_signos_vitales')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

create policy "sv_delete" on public.signos_vitales
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('eliminar_signos_vitales')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

drop policy if exists "obs_select" on public.observaciones_diarias;
drop policy if exists "obs_insert" on public.observaciones_diarias;
drop policy if exists "obs_update" on public.observaciones_diarias;
drop policy if exists "obs_delete" on public.observaciones_diarias;

create policy "obs_select" on public.observaciones_diarias
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
    or (
      public.my_rol() = 'familiar'
      and visible_familiar = true
      and residente_id in (select public.my_familiar_residente_ids())
    )
  );

create policy "obs_insert" on public.observaciones_diarias
  for insert with check (
    public.funcionario_can('crear_observaciones')
    and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
  );

create policy "obs_update" on public.observaciones_diarias
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_observaciones')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_observaciones')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

create policy "obs_delete" on public.observaciones_diarias
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('eliminar_observaciones')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

drop policy if exists "pc_insert" on public.planes_cuidado;
create policy "pc_insert" on public.planes_cuidado
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('crear_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

drop policy if exists "fr_select_self_or_admin" on public.familiar_residentes;
drop policy if exists "fr_insert_admin" on public.familiar_residentes;
drop policy if exists "fr_delete_admin" on public.familiar_residentes;

create policy "fr_select_self_or_admin" on public.familiar_residentes
  for select using (
    (
      profile_id = (select auth.uid())
      and residente_id in (select public.my_familiar_residente_ids())
    )
    or public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

create policy "fr_insert_admin" on public.familiar_residentes
  for insert with check (
    (
      public.my_rol() = 'admin_eleam'
      or public.funcionario_can('editar_residentes')
    )
    and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
  );

create policy "fr_delete_admin" on public.familiar_residentes
  for delete using (
    public.is_superadmin()
    or (
      (
        public.my_rol() = 'admin_eleam'
        or public.funcionario_can('editar_residentes')
      )
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

drop policy if exists "vf_select" on public.visitas_familiar;
drop policy if exists "vf_insert" on public.visitas_familiar;
drop policy if exists "vf_update" on public.visitas_familiar;
drop policy if exists "vf_delete" on public.visitas_familiar;

create policy "vf_select" on public.visitas_familiar
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() = 'familiar'
      and profile_id = (select auth.uid())
      and residente_id in (select public.my_familiar_residente_ids())
    )
    or (
      (
        public.my_rol() = 'admin_eleam'
        or public.funcionario_can('registrar_visitas')
      )
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

create policy "vf_insert" on public.visitas_familiar
  for insert with check (
    (
      public.my_rol() = 'familiar'
      and residente_id in (select public.my_familiar_residente_ids())
      and profile_id = (select auth.uid())
    )
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

create policy "vf_update" on public.visitas_familiar
  for update using (
    public.is_superadmin()
    or (
      (public.my_rol() = 'admin_eleam' or public.funcionario_can('registrar_visitas'))
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

create policy "vf_delete" on public.visitas_familiar
  for delete using (
    public.is_superadmin()
    or profile_id = (select auth.uid())
    or (
      public.my_rol() = 'admin_eleam'
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );
