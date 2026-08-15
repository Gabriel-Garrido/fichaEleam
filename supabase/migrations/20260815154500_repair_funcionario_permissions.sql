-- Repara instalaciones existentes donde CREATE TABLE IF NOT EXISTS dejó el
-- catálogo de permisos incompleto. Todos los cambios son aditivos e idempotentes.
alter table public.funcionario_permisos
  add column if not exists crear_residentes boolean not null default true,
  add column if not exists editar_residentes boolean not null default true,
  add column if not exists eliminar_residentes boolean not null default false,
  add column if not exists crear_signos_vitales boolean not null default true,
  add column if not exists editar_signos_vitales boolean not null default true,
  add column if not exists eliminar_signos_vitales boolean not null default false,
  add column if not exists crear_observaciones boolean not null default true,
  add column if not exists editar_observaciones boolean not null default true,
  add column if not exists eliminar_observaciones boolean not null default false,
  add column if not exists registrar_entregas_turno boolean not null default true,
  add column if not exists ver_entregas_turno boolean not null default true,
  add column if not exists crear_planes_cuidado boolean not null default true,
  add column if not exists editar_planes_cuidado boolean not null default true,
  add column if not exists completar_tareas_cuidado boolean not null default true,
  add column if not exists crear_indicaciones_medicamentos boolean not null default false,
  add column if not exists editar_indicaciones_medicamentos boolean not null default false,
  add column if not exists administrar_medicamentos boolean not null default false,
  add column if not exists validar_medicamentos_controlados boolean not null default false,
  add column if not exists ajustar_stock_medicamentos boolean not null default false,
  add column if not exists asignar_camas boolean not null default true,
  add column if not exists subir_acreditacion boolean not null default true,
  add column if not exists editar_acreditacion boolean not null default true,
  add column if not exists archivar_acreditacion boolean not null default false,
  add column if not exists editar_indicaciones_cuidado boolean not null default false,
  add column if not exists aplicar_evaluaciones_clinicas boolean not null default true,
  add column if not exists crear_eventos_adversos boolean not null default true,
  add column if not exists editar_eventos_adversos boolean not null default true,
  add column if not exists cerrar_eventos_adversos boolean not null default false,
  add column if not exists editar_inventario_bienes boolean not null default false,
  add column if not exists gestionar_reclamos boolean not null default true,
  add column if not exists gestionar_emergencias boolean not null default false,
  add column if not exists registrar_simulacros boolean not null default true,
  add column if not exists gestionar_cumplimiento boolean not null default false,
  add column if not exists ver_pagos_residentes boolean not null default false,
  add column if not exists registrar_pagos_residentes boolean not null default false,
  add column if not exists enviar_comprobantes_pagos boolean not null default false,
  add column if not exists anular_pagos_residentes boolean not null default false,
  add column if not exists actualizado_en timestamptz not null default now();

-- Conserva para usuarios existentes la capacidad de adjuntar recetas cuando
-- ya contaban con edición clínica de medicamentos.
do $$
declare
  v_added boolean := false;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'funcionario_permisos'
      and column_name = 'adjuntar_recetas_medicamentos'
  ) then
    alter table public.funcionario_permisos
      add column adjuntar_recetas_medicamentos boolean not null default false;
    v_added := true;
  end if;

  if v_added then
    update public.funcionario_permisos
    set adjuntar_recetas_medicamentos = true
    where crear_indicaciones_medicamentos = true
       or editar_indicaciones_medicamentos = true;
  end if;
end;
$$;

create or replace function public.funcionario_can(perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rol text := public.my_rol();
  v_feature_id text;
  v_permissions jsonb;
  v_result boolean;
begin
  if v_rol in ('admin_eleam', 'superadmin') then return true; end if;
  if v_rol <> 'funcionario' then return false; end if;
  if not public.eleam_has_access(public.my_eleam_id()) then return false; end if;

  v_feature_id := case
    when perm in ('asignar_camas', 'editar_inventario_bienes') then 'establishment'
    when perm in (
      'crear_residentes', 'editar_residentes', 'eliminar_residentes',
      'crear_signos_vitales', 'editar_signos_vitales', 'eliminar_signos_vitales',
      'crear_observaciones', 'editar_observaciones', 'eliminar_observaciones',
      'registrar_entregas_turno', 'ver_entregas_turno',
      'crear_planes_cuidado', 'editar_planes_cuidado', 'completar_tareas_cuidado',
      'editar_indicaciones_cuidado', 'aplicar_evaluaciones_clinicas',
      'crear_eventos_adversos', 'editar_eventos_adversos', 'cerrar_eventos_adversos',
      'crear_indicaciones_medicamentos', 'editar_indicaciones_medicamentos',
      'adjuntar_recetas_medicamentos', 'administrar_medicamentos',
      'validar_medicamentos_controlados', 'ajustar_stock_medicamentos'
    ) then 'residents'
    when perm in (
      'subir_acreditacion', 'editar_acreditacion', 'archivar_acreditacion',
      'gestionar_reclamos', 'gestionar_emergencias', 'registrar_simulacros',
      'gestionar_cumplimiento'
    ) then 'compliance'
    when perm in (
      'ver_pagos_residentes', 'registrar_pagos_residentes',
      'enviar_comprobantes_pagos', 'anular_pagos_residentes'
    ) then 'resident_payments'
    else null
  end;

  if v_feature_id is null or not public.can_access_feature(v_feature_id) then
    return false;
  end if;

  select to_jsonb(fp)
  into v_permissions
  from public.funcionario_permisos fp
  where fp.profile_id = (select auth.uid());

  if v_permissions is null then return false; end if;

  v_result := coalesce((v_permissions ->> perm)::boolean, false);
  if perm = 'registrar_entregas_turno' then
    v_result := v_result and coalesce((v_permissions ->> 'ver_entregas_turno')::boolean, false);
  elsif perm in ('registrar_pagos_residentes', 'enviar_comprobantes_pagos', 'anular_pagos_residentes') then
    v_result := v_result and coalesce((v_permissions ->> 'ver_pagos_residentes')::boolean, false);
  end if;

  return v_result;
end;
$$;

revoke all on function public.funcionario_can(text) from public;
grant execute on function public.funcionario_can(text) to authenticated;
