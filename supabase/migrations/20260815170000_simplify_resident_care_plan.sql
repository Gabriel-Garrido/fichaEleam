-- Plan individual simple, participativo, revisable y trazable (DS 20).
alter table public.planes_cuidado
  add column if not exists participacion_residente text,
  add column if not exists participacion_detalle text;

alter table public.planes_cuidado drop constraint if exists planes_cuidado_participacion_check;
alter table public.planes_cuidado add constraint planes_cuidado_participacion_check
  check (participacion_residente in ('residente','representante','ambos','no_posible') or participacion_residente is null) not valid;
alter table public.planes_cuidado drop constraint if exists planes_cuidado_participacion_detalle_len;
alter table public.planes_cuidado add constraint planes_cuidado_participacion_detalle_len
  check (participacion_detalle is null or char_length(participacion_detalle) <= 500) not valid;

alter table public.funcionario_permisos
  add column if not exists validar_planes_cuidado boolean not null default false;

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
      'crear_planes_cuidado', 'editar_planes_cuidado', 'validar_planes_cuidado',
      'completar_tareas_cuidado', 'editar_indicaciones_cuidado',
      'aplicar_evaluaciones_clinicas', 'crear_eventos_adversos',
      'editar_eventos_adversos', 'cerrar_eventos_adversos',
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

  select to_jsonb(fp) into v_permissions
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

create or replace function public.revisar_plan_cuidado(p_plan_id uuid)
returns public.planes_cuidado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.planes_cuidado%rowtype;
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Sesión no válida.' using errcode = 'P0001';
  end if;

  select * into v_plan
  from public.planes_cuidado
  where id = p_plan_id
    and estado = 'activo'
    and public.eleam_has_access(eleam_id);
  if not found then
    raise exception 'No se encontró un plan activo para revisar.' using errcode = 'P0001';
  end if;

  if public.my_rol() not in ('admin_eleam', 'superadmin')
     and not public.funcionario_can('validar_planes_cuidado') then
    raise exception 'No tienes autorización de dirección técnica para revisar este plan.' using errcode = 'P0001';
  end if;

  if nullif(trim(coalesce(v_plan.objetivos, '')), '') is null
     or nullif(trim(coalesce(v_plan.pauta_alimentacion, '')), '') is null
     or nullif(trim(coalesce(v_plan.pauta_hidratacion, '')), '') is null
     or nullif(trim(coalesce(v_plan.meta_rehabilitacion, '')), '') is null
     or nullif(trim(coalesce(v_plan.objetivo_biopsicosocial, '')), '') is null
     or v_plan.participacion_residente is null then
    raise exception 'Completa el resumen obligatorio antes de confirmar la revisión.' using errcode = 'P0001';
  end if;

  if v_plan.participacion_residente in ('representante', 'ambos', 'no_posible')
     and nullif(trim(coalesce(v_plan.participacion_detalle, '')), '') is null then
    raise exception 'Completa el detalle de participación antes de confirmar la revisión.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.plan_cuidado_actividades a
    join public.plan_cuidado_horarios h on h.actividad_id = a.id and h.activo
    where a.plan_id = p_plan_id and a.activo
  ) then
    raise exception 'Agrega al menos un cuidado con frecuencia antes de confirmar la revisión.' using errcode = 'P0001';
  end if;

  update public.planes_cuidado
  set validado_por_dt = v_user,
      validado_en = now(),
      actualizado_por = v_user,
      actualizado_en = now()
  where id = p_plan_id
  returning * into v_plan;

  insert into public.plan_cuidado_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  ) values (
    v_plan.eleam_id, v_plan.residente_id, 'planes_cuidado', v_plan.id,
    'revisado_direccion_tecnica', jsonb_build_object('validado_en', v_plan.validado_en), v_user
  );
  return v_plan;
end;
$$;

revoke all on function public.revisar_plan_cuidado(uuid) from public;
grant execute on function public.revisar_plan_cuidado(uuid) to authenticated;

create or replace function public.invalidate_care_plan_review_on_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(
    new.titulo, new.objetivos, new.pauta_alimentacion, new.pauta_hidratacion,
    new.restricciones, new.objetivo_biopsicosocial, new.valoracion_social,
    new.intereses_actividades, new.necesidades_espirituales,
    new.meta_rehabilitacion, new.restricciones_actividad,
    new.riesgo_caidas, new.riesgo_up, new.participacion_residente, new.participacion_detalle
  ) is distinct from row(
    old.titulo, old.objetivos, old.pauta_alimentacion, old.pauta_hidratacion,
    old.restricciones, old.objetivo_biopsicosocial, old.valoracion_social,
    old.intereses_actividades, old.necesidades_espirituales,
    old.meta_rehabilitacion, old.restricciones_actividad,
    old.riesgo_caidas, old.riesgo_up, old.participacion_residente, old.participacion_detalle
  ) then
    new.validado_por_dt := null;
    new.validado_en := null;
  end if;
  return new;
end;
$$;

create or replace function public.invalidate_care_plan_review_from_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_id uuid;
  v_plan_id uuid;
begin
  if tg_table_name = 'plan_cuidado_actividades' then
    v_plan_id := case when tg_op = 'DELETE' then old.plan_id else new.plan_id end;
  else
    v_activity_id := case when tg_op = 'DELETE' then old.actividad_id else new.actividad_id end;
    select plan_id into v_plan_id from public.plan_cuidado_actividades where id = v_activity_id;
  end if;
  if v_plan_id is not null then
    update public.planes_cuidado
    set validado_por_dt = null, validado_en = null, actualizado_en = now()
    where id = v_plan_id and (validado_por_dt is not null or validado_en is not null);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.audit_care_plan_definition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_plan_id uuid;
  v_eleam_id uuid;
  v_residente_id uuid;
  v_entity_id uuid;
begin
  if tg_table_name = 'planes_cuidado' then
    if tg_op = 'UPDATE'
       and (v_old - array['validado_por_dt','validado_en','actualizado_por','actualizado_en'])
           = (v_new - array['validado_por_dt','validado_en','actualizado_por','actualizado_en']) then
      return new;
    end if;
    v_plan_id := case when tg_op = 'DELETE' then old.id else new.id end;
    v_eleam_id := case when tg_op = 'DELETE' then old.eleam_id else new.eleam_id end;
    v_residente_id := case when tg_op = 'DELETE' then old.residente_id else new.residente_id end;
    v_entity_id := v_plan_id;
  elsif tg_table_name = 'plan_cuidado_actividades' then
    v_plan_id := case when tg_op = 'DELETE' then old.plan_id else new.plan_id end;
    v_eleam_id := case when tg_op = 'DELETE' then old.eleam_id else new.eleam_id end;
    v_residente_id := case when tg_op = 'DELETE' then old.residente_id else new.residente_id end;
    v_entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    v_entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
    select a.plan_id, a.eleam_id, a.residente_id into v_plan_id, v_eleam_id, v_residente_id
    from public.plan_cuidado_actividades a
    where a.id = case when tg_op = 'DELETE' then old.actividad_id else new.actividad_id end;
  end if;

  if v_eleam_id is not null and v_residente_id is not null then
    insert into public.plan_cuidado_audit (
      eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
    ) values (
      v_eleam_id, v_residente_id, tg_table_name, v_entity_id, lower(tg_op),
      jsonb_strip_nulls(jsonb_build_object('anterior', v_old, 'nuevo', v_new, 'plan_id', v_plan_id)),
      (select auth.uid())
    );
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_planes_cuidado_invalidate_review on public.planes_cuidado;
create trigger trg_planes_cuidado_invalidate_review
  before update on public.planes_cuidado
  for each row execute function public.invalidate_care_plan_review_on_update();

drop trigger if exists trg_planes_cuidado_audit on public.planes_cuidado;
create trigger trg_planes_cuidado_audit
  after insert or update or delete on public.planes_cuidado
  for each row execute function public.audit_care_plan_definition();

drop trigger if exists trg_plan_actividades_invalidate_review on public.plan_cuidado_actividades;
create trigger trg_plan_actividades_invalidate_review
  after insert or update or delete on public.plan_cuidado_actividades
  for each row execute function public.invalidate_care_plan_review_from_child();

drop trigger if exists trg_plan_actividades_audit on public.plan_cuidado_actividades;
create trigger trg_plan_actividades_audit
  after insert or update or delete on public.plan_cuidado_actividades
  for each row execute function public.audit_care_plan_definition();

drop trigger if exists trg_plan_horarios_invalidate_review on public.plan_cuidado_horarios;
create trigger trg_plan_horarios_invalidate_review
  after insert or update or delete on public.plan_cuidado_horarios
  for each row execute function public.invalidate_care_plan_review_from_child();

drop trigger if exists trg_plan_horarios_audit on public.plan_cuidado_horarios;
create trigger trg_plan_horarios_audit
  after insert or update or delete on public.plan_cuidado_horarios
  for each row execute function public.audit_care_plan_definition();
