-- Tareas operativas: generación sólo para hoy (Chile), inicio preciso desde la
-- existencia de la pauta y una única llamada para preparar cuidados + eMAR.

create or replace function public.generar_tareas_cuidado(
  p_fecha date default current_date,
  p_turno text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eleam_id uuid := public.my_eleam_id();
  v_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;
  if v_eleam_id is null then
    raise exception 'Debes tener un ELEAM asociado para generar tareas' using errcode = '42501';
  end if;
  if not public.is_superadmin() then
    if not public.eleam_has_access(v_eleam_id) then
      raise exception 'ELEAM sin acceso activo' using errcode = '42501';
    end if;
    if public.my_rol() not in ('admin_eleam','funcionario') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;
  if p_turno is not null and p_turno not in ('mañana','tarde','noche') then
    raise exception 'Turno invalido' using errcode = 'P0001';
  end if;
  if p_fecha is distinct from (now() at time zone 'America/Santiago')::date then
    return 0;
  end if;

  insert into public.tareas_cuidado (
    eleam_id, residente_id, plan_id, actividad_id, horario_id,
    fecha, turno, hora, estado, fecha_original, fechas_programadas
  )
  select
    h.eleam_id, h.residente_id, a.plan_id, a.id, h.id,
    p_fecha, h.turno, h.hora, 'pendiente', p_fecha, array[p_fecha]::date[]
  from public.plan_cuidado_horarios h
  join public.plan_cuidado_actividades a on a.id = h.actividad_id
  join public.planes_cuidado p on p.id = a.plan_id
  join public.residentes r on r.id = h.residente_id
  where h.activo = true
    and a.activo = true
    and p.estado = 'activo'
    and r.estado = 'activo'
    and ((p_fecha + h.hora) at time zone 'America/Santiago') >= greatest(
      r.creado_en, h.creado_en, a.creado_en, p.creado_en
    )
    and h.eleam_id = v_eleam_id
    and (p_turno is null or h.turno = p_turno)
    and (
      h.frecuencia = 'diaria'
      or (h.frecuencia = 'semanal' and extract(isodow from p_fecha)::smallint = any(h.dias_semana))
      or (h.frecuencia = 'mensual' and extract(day from p_fecha)::smallint = any(h.dias_mes))
      or (h.frecuencia = 'una_vez' and h.fecha_unica = p_fecha)
    )
    and not exists (
      select 1 from public.tareas_cuidado t
      where t.horario_id = h.id
        and (
          p_fecha = t.fecha
          or p_fecha = coalesce(t.fecha_original, t.fecha)
          or p_fecha = any(case
            when cardinality(coalesce(t.fechas_programadas, '{}'::date[])) = 0
              then array[coalesce(t.fecha_original, t.fecha)]::date[]
            else t.fechas_programadas
          end)
        )
    )
  on conflict (horario_id, fecha) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.generar_administraciones_medicamentos(
  p_fecha date default current_date,
  p_turno text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eleam_id uuid := public.my_eleam_id();
  v_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;
  if v_eleam_id is null then
    raise exception 'Debes tener un ELEAM asociado para generar tareas' using errcode = '42501';
  end if;
  if not public.is_superadmin() then
    if not public.eleam_has_access(v_eleam_id) then
      raise exception 'ELEAM sin acceso activo' using errcode = '42501';
    end if;
    if public.my_rol() not in ('admin_eleam','funcionario') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;
  if p_turno is not null and p_turno not in ('mañana','tarde','noche') then
    raise exception 'Turno invalido' using errcode = 'P0001';
  end if;
  if p_fecha is distinct from (now() at time zone 'America/Santiago')::date then
    return 0;
  end if;

  insert into public.medicamentos_administraciones (
    eleam_id, residente_id, indicacion_id, horario_id,
    fecha, turno, hora, estado, unidad_dosis
  )
  select
    h.eleam_id, h.residente_id, i.id, h.id,
    p_fecha, h.turno, h.hora, 'pendiente', i.unidad_dosis
  from public.medicamentos_horarios h
  join public.medicamentos_indicaciones i on i.id = h.indicacion_id
  join public.residentes r on r.id = h.residente_id
  where h.activo = true
    and i.estado = 'activo'
    and r.estado = 'activo'
    and ((p_fecha + h.hora) at time zone 'America/Santiago') >= greatest(
      r.creado_en, h.creado_en, i.creado_en
    )
    and p_fecha >= i.fecha_inicio
    and (i.fecha_fin is null or p_fecha <= i.fecha_fin)
    and h.eleam_id = v_eleam_id
    and (p_turno is null or h.turno = p_turno)
    and (
      h.frecuencia = 'diaria'
      or (h.frecuencia = 'semanal' and extract(isodow from p_fecha)::smallint = any(h.dias_semana))
      or (h.frecuencia = 'mensual' and extract(day from p_fecha)::smallint = any(h.dias_mes))
      or (h.frecuencia = 'una_vez' and h.fecha_unica = p_fecha)
    )
  on conflict (horario_id, fecha) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.preparar_trabajo_turno(
  p_fecha date default ((now() at time zone 'America/Santiago')::date),
  p_turno text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuidados integer;
  v_medicamentos integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;
  if p_turno is not null and p_turno not in ('mañana','tarde','noche') then
    raise exception 'Turno invalido' using errcode = 'P0001';
  end if;
  v_cuidados := public.generar_tareas_cuidado(p_fecha, p_turno);
  v_medicamentos := public.generar_administraciones_medicamentos(p_fecha, p_turno);
  return jsonb_build_object('cuidados', v_cuidados, 'medicamentos', v_medicamentos);
end;
$$;

-- Elimina sólo filas automáticas aún pendientes que nunca debieron existir.
delete from public.tareas_cuidado t
using public.residentes r,
      public.plan_cuidado_horarios h,
      public.plan_cuidado_actividades a,
      public.planes_cuidado p
where r.id = t.residente_id
  and h.id = t.horario_id
  and a.id = t.actividad_id
  and p.id = t.plan_id
  and t.estado = 'pendiente'
  and ((t.fecha + t.hora) at time zone 'America/Santiago') < greatest(
    r.creado_en, h.creado_en, a.creado_en, p.creado_en
  );

delete from public.medicamentos_administraciones a
using public.residentes r,
      public.medicamentos_horarios h,
      public.medicamentos_indicaciones i
where r.id = a.residente_id
  and h.id = a.horario_id
  and i.id = a.indicacion_id
  and a.estado = 'pendiente'
  and ((a.fecha + a.hora) at time zone 'America/Santiago') < greatest(
    r.creado_en, h.creado_en, i.creado_en
  );

-- Normaliza siempre el instante, incluso si una ruta antigua envía un timestamp
-- interpretado con la zona UTC de la sesión de PostgreSQL.
create or replace function public.sync_care_task_reprogrammed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado = 'reprogramada' then
    new.reprogramada_para := (new.fecha + new.hora) at time zone 'America/Santiago';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tareas_cuidado_reprogrammed_at on public.tareas_cuidado;
create trigger trg_tareas_cuidado_reprogrammed_at
  before insert or update of estado, fecha, hora, reprogramada_para
  on public.tareas_cuidado
  for each row execute function public.sync_care_task_reprogrammed_at();

update public.tareas_cuidado
set reprogramada_para = (fecha + hora) at time zone 'America/Santiago'
where estado = 'reprogramada'
  and reprogramada_para is distinct from ((fecha + hora) at time zone 'America/Santiago');

create index if not exists idx_observaciones_pending_slot
  on public.observaciones_diarias(seguimiento_fecha, seguimiento_turno, residente_id)
  where requiere_seguimiento = true and seguimiento_estado = 'pendiente';

create or replace function public.validate_pending_followup_slot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.requiere_seguimiento = true
     and new.seguimiento_estado = 'pendiente'
     and new.seguimiento_fecha < (now() at time zone 'America/Santiago')::date then
    raise exception 'El seguimiento pendiente no puede programarse en una fecha pasada' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_observaciones_validate_pending_slot on public.observaciones_diarias;
create trigger trg_observaciones_validate_pending_slot
  before insert or update of requiere_seguimiento, seguimiento_estado, seguimiento_fecha, seguimiento_turno
  on public.observaciones_diarias
  for each row execute function public.validate_pending_followup_slot();

-- Resolver y, opcionalmente, continuar un seguimiento debe ser una sola
-- transacción. El bloqueo de fila evita dobles cierres/continuaciones.
create or replace function public.gestionar_seguimiento_observacion(
  p_observacion_id uuid,
  p_notas text,
  p_nueva_fecha date default null,
  p_nuevo_turno text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.observaciones_diarias%rowtype;
  v_resuelta public.observaciones_diarias%rowtype;
  v_nueva public.observaciones_diarias%rowtype;
  v_eleam_id uuid;
  v_notas text := nullif(trim(coalesce(p_notas, '')), '');
  v_continuar boolean := p_nueva_fecha is not null and p_nuevo_turno is not null;
begin
  if (select auth.uid()) is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;
  if v_notas is null then
    raise exception 'Debes registrar la evolucion del seguimiento' using errcode = 'P0001';
  end if;
  if char_length(v_notas) > 4000 then
    raise exception 'La evolucion no puede superar 4000 caracteres' using errcode = 'P0001';
  end if;
  if (p_nueva_fecha is null) <> (p_nuevo_turno is null) then
    raise exception 'Debes indicar fecha y turno para continuar el seguimiento' using errcode = 'P0001';
  end if;
  if v_continuar and p_nuevo_turno not in ('mañana','tarde','noche') then
    raise exception 'Turno invalido' using errcode = 'P0001';
  end if;
  if v_continuar and p_nueva_fecha < (now() at time zone 'America/Santiago')::date then
    raise exception 'El seguimiento pendiente no puede programarse en una fecha pasada' using errcode = 'P0001';
  end if;

  select *
  into v_original
  from public.observaciones_diarias
  where id = p_observacion_id
  for update;

  if not found then
    raise exception 'Seguimiento no encontrado' using errcode = 'P0001';
  end if;

  select r.eleam_id into v_eleam_id
  from public.residentes r
  where r.id = v_original.residente_id;

  if not public.is_superadmin() and (
    v_eleam_id is null
    or v_eleam_id is distinct from public.my_eleam_id()
    or not public.eleam_has_access(v_eleam_id)
    or not (
      public.funcionario_can('crear_observaciones')
      or public.funcionario_can('editar_observaciones')
    )
  ) then
    raise exception 'No autorizado para gestionar este seguimiento' using errcode = '42501';
  end if;

  if not v_original.requiere_seguimiento or v_original.seguimiento_estado <> 'pendiente' then
    raise exception 'Este seguimiento ya fue gestionado. Actualiza la lista para ver su estado.' using errcode = 'P0001';
  end if;

  update public.observaciones_diarias
  set seguimiento_estado = 'resuelto',
      acciones_tomadas = v_notas,
      actualizado_en = now()
  where id = v_original.id
    and seguimiento_estado = 'pendiente'
  returning * into v_resuelta;

  if v_continuar then
    insert into public.observaciones_diarias (
      residente_id, fecha_hora, turno, tipo, descripcion, acciones_tomadas,
      requiere_seguimiento, seguimiento_fecha, seguimiento_turno,
      seguimiento_estado, visible_familiar, resumen_familiar, registrado_por
    ) values (
      v_original.residente_id,
      now(),
      p_nuevo_turno,
      v_original.tipo,
      left(
        'Continuacion de seguimiento: ' || left(v_original.descripcion, 1800)
        || E'\n\nEvolucion previa: ' || v_notas,
        6000
      ),
      null,
      true,
      p_nueva_fecha,
      p_nuevo_turno,
      'pendiente',
      false,
      null,
      (select auth.uid())
    )
    returning * into v_nueva;

    return jsonb_build_object('resuelta', to_jsonb(v_resuelta), 'nueva', to_jsonb(v_nueva));
  end if;

  return jsonb_build_object('resuelta', to_jsonb(v_resuelta), 'nueva', null);
end;
$$;

revoke all on function public.generar_tareas_cuidado(date, text) from public;
grant execute on function public.generar_tareas_cuidado(date, text) to authenticated;
revoke all on function public.generar_administraciones_medicamentos(date, text) from public;
grant execute on function public.generar_administraciones_medicamentos(date, text) to authenticated;
revoke all on function public.preparar_trabajo_turno(date, text) from public;
grant execute on function public.preparar_trabajo_turno(date, text) to authenticated;
revoke all on function public.gestionar_seguimiento_observacion(uuid, text, date, text) from public;
grant execute on function public.gestionar_seguimiento_observacion(uuid, text, date, text) to authenticated;
