-- La fecha de ingreso al ELEAM puede ser anterior a la adopción de FichaEleam.
-- Ninguna tarea digital debe generarse antes del día en que el residente fue
-- creado en el sistema. Se usa la fecha civil de Chile para evitar desfases UTC.

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

  if not public.is_superadmin() then
    if v_eleam_id is null or not public.eleam_has_access(v_eleam_id) then
      raise exception 'ELEAM sin acceso activo' using errcode = '42501';
    end if;
    if public.my_rol() not in ('admin_eleam','funcionario') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  if p_turno is not null and p_turno not in ('mañana','tarde','noche') then
    raise exception 'Turno invalido' using errcode = 'P0001';
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
    and p_fecha >= (r.creado_en at time zone 'America/Santiago')::date
    and (public.is_superadmin() or h.eleam_id = v_eleam_id)
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

  if not public.is_superadmin() then
    if v_eleam_id is null or not public.eleam_has_access(v_eleam_id) then
      raise exception 'ELEAM sin acceso activo' using errcode = '42501';
    end if;
    if public.my_rol() not in ('admin_eleam','funcionario') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  if p_turno is not null and p_turno not in ('mañana','tarde','noche') then
    raise exception 'Turno invalido' using errcode = 'P0001';
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
    and p_fecha >= (r.creado_en at time zone 'America/Santiago')::date
    and p_fecha >= i.fecha_inicio
    and (i.fecha_fin is null or p_fecha <= i.fecha_fin)
    and (public.is_superadmin() or h.eleam_id = v_eleam_id)
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

-- Reparación conservadora: sólo se eliminan elementos todavía pendientes cuya
-- fecha es imposible porque antecede a la existencia del residente en el sistema.
delete from public.tareas_cuidado t
using public.residentes r
where r.id = t.residente_id
  and t.estado = 'pendiente'
  and t.fecha < (r.creado_en at time zone 'America/Santiago')::date;

delete from public.medicamentos_administraciones a
using public.residentes r
where r.id = a.residente_id
  and a.estado = 'pendiente'
  and a.fecha < (r.creado_en at time zone 'America/Santiago')::date;

revoke all on function public.generar_tareas_cuidado(date, text) from public;
grant execute on function public.generar_tareas_cuidado(date, text) to authenticated;
revoke all on function public.generar_administraciones_medicamentos(date, text) from public;
grant execute on function public.generar_administraciones_medicamentos(date, text) to authenticated;
