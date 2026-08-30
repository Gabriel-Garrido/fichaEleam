-- Cierra brechas históricas y obliga a usar los flujos atómicos auditados.

create index if not exists idx_residentes_audit_entity
  on public.residentes_audit(entidad, entidad_id);
create index if not exists idx_plan_cuidado_audit_entity
  on public.plan_cuidado_audit(entidad, entidad_id);
create index if not exists idx_medicamentos_audit_entity
  on public.medicamentos_audit(entidad, entidad_id);

-- Asegura auditoría DB para cada bloque editable de Información general.
drop trigger if exists trg_evaluaciones_clinicas_resident_audit on public.evaluaciones_clinicas;
create trigger trg_evaluaciones_clinicas_resident_audit
  after insert or update or delete on public.evaluaciones_clinicas
  for each row execute function public.audit_resident_related_changes('Valoración geriátrica');

drop trigger if exists trg_resident_consents_resident_audit on public.resident_consents;
create trigger trg_resident_consents_resident_audit
  after insert or update or delete on public.resident_consents
  for each row execute function public.audit_resident_related_changes('Consentimiento informado');

drop trigger if exists trg_resident_health_network_resident_audit on public.resident_health_network;
create trigger trg_resident_health_network_resident_audit
  after insert or update or delete on public.resident_health_network
  for each row execute function public.audit_resident_related_changes('Red de salud');

drop trigger if exists trg_health_controls_resident_audit on public.health_controls;
create trigger trg_health_controls_resident_audit
  after insert or update or delete on public.health_controls
  for each row execute function public.audit_resident_related_changes('Control de salud');

drop trigger if exists trg_persona_sig_resident_audit on public.persona_significativa;
create trigger trg_persona_sig_resident_audit
  after insert or update or delete on public.persona_significativa
  for each row execute function public.audit_resident_related_changes('Persona significativa');

drop trigger if exists trg_actividades_sociales_resident_audit on public.actividades_sociales;
create trigger trg_actividades_sociales_resident_audit
  after insert or update or delete on public.actividades_sociales
  for each row execute function public.audit_resident_related_changes('Interés o actividad del residente');

-- Incorpora registros preexistentes sólo cuando no tienen ya una entrada de
-- auditoría. No inventa modificaciones: conserva la fecha y autor originales.
insert into public.residentes_audit
  (eleam_id, residente_id, entidad, entidad_id, titulo, accion, cambios, realizado_por, realizado_en)
select e.eleam_id, e.residente_id, 'evaluaciones_clinicas', e.id,
  'Valoración geriátrica', 'creado',
  jsonb_build_object('datos_iniciales', jsonb_strip_nulls(to_jsonb(e) - array[
    'id','eleam_id','residente_id','evaluado_por','creado_en','actualizado_en'
  ])), e.evaluado_por, e.creado_en
from public.evaluaciones_clinicas e
where not exists (
  select 1 from public.residentes_audit a
  where a.entidad = 'evaluaciones_clinicas' and a.entidad_id = e.id
);

insert into public.residentes_audit
  (eleam_id, residente_id, entidad, entidad_id, titulo, accion, cambios, realizado_por, realizado_en)
select c.eleam_id, c.residente_id, 'resident_consents', c.id,
  'Consentimiento informado', 'creado',
  jsonb_build_object('datos_iniciales', jsonb_strip_nulls(to_jsonb(c) - array[
    'id','eleam_id','residente_id','registrado_por','firma_data_url','creado_en','actualizado_en'
  ])), c.registrado_por, c.creado_en
from public.resident_consents c
where not exists (
  select 1 from public.residentes_audit a
  where a.entidad = 'resident_consents' and a.entidad_id = c.id
);

insert into public.residentes_audit
  (eleam_id, residente_id, entidad, entidad_id, titulo, accion, cambios, realizado_por, realizado_en)
select n.eleam_id, n.residente_id, 'resident_health_network', n.id,
  'Red de salud', 'creado',
  jsonb_build_object('datos_iniciales', jsonb_strip_nulls(to_jsonb(n) - array[
    'id','eleam_id','residente_id','actualizado_por','creado_en','actualizado_en'
  ])), n.actualizado_por, n.creado_en
from public.resident_health_network n
where not exists (
  select 1 from public.residentes_audit a
  where a.entidad = 'resident_health_network' and a.entidad_id = n.id
);

insert into public.residentes_audit
  (eleam_id, residente_id, entidad, entidad_id, titulo, accion, cambios, realizado_por, realizado_en)
select h.eleam_id, h.residente_id, 'health_controls', h.id,
  case h.tipo when 'derivacion' then 'Derivación de salud'
    when 'urgencia' then 'Atención de urgencia' when 'teleconsulta' then 'Teleconsulta'
    else 'Control de salud' end,
  'creado', jsonb_build_object('datos_iniciales', jsonb_strip_nulls(to_jsonb(h) - array[
    'id','eleam_id','residente_id','registrado_por','creado_en','actualizado_en'
  ])), h.registrado_por, h.creado_en
from public.health_controls h
where not exists (
  select 1 from public.residentes_audit a
  where a.entidad = 'health_controls' and a.entidad_id = h.id
);

insert into public.residentes_audit
  (eleam_id, residente_id, entidad, entidad_id, titulo, accion, cambios, realizado_por, realizado_en)
select p.eleam_id, p.residente_id, 'persona_significativa', p.id,
  'Persona significativa', 'creado',
  jsonb_build_object('datos_iniciales', jsonb_strip_nulls(to_jsonb(p) - array[
    'id','eleam_id','residente_id','creado_por','actualizado_por','creado_en','actualizado_en'
  ])), coalesce(p.actualizado_por, p.creado_por), p.creado_en
from public.persona_significativa p
where not exists (
  select 1 from public.residentes_audit a
  where a.entidad = 'persona_significativa' and a.entidad_id = p.id
);

insert into public.residentes_audit
  (eleam_id, residente_id, entidad, entidad_id, titulo, accion, cambios, realizado_por, realizado_en)
select s.eleam_id, s.residente_id, 'actividades_sociales', s.id,
  'Interés o actividad del residente', 'creado',
  jsonb_build_object('datos_iniciales', jsonb_strip_nulls(to_jsonb(s) - array[
    'id','eleam_id','residente_id','registrado_por','creado_en'
  ])), s.registrado_por, s.creado_en
from public.actividades_sociales s
where not exists (
  select 1 from public.residentes_audit a
  where a.entidad = 'actividades_sociales' and a.entidad_id = s.id
);

insert into public.camas_audit
  (eleam_id, cama_id, residente_id, accion, detalle, realizado_por, realizado_en)
select a.eleam_id, a.cama_id, a.residente_id, 'asignacion',
  jsonb_build_object('registro_recuperado', true, 'motivo_fin', a.motivo_fin, 'notas', a.notas),
  coalesce(a.cerrado_por, a.creado_por), a.fecha_inicio
from public.cama_asignaciones a
where not exists (
  select 1 from public.camas_audit ca
  where ca.residente_id = a.residente_id and ca.cama_id = a.cama_id
);

insert into public.plan_cuidado_audit
  (eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por, realizado_en)
select p.eleam_id, p.residente_id, 'planes_cuidado', p.id, 'creado',
  jsonb_build_object('registro_inicial', jsonb_strip_nulls(to_jsonb(p) - array[
    'id','eleam_id','residente_id','creado_por','actualizado_por','validado_por_dt','creado_en','actualizado_en'
  ])), coalesce(p.actualizado_por, p.creado_por), p.creado_en
from public.planes_cuidado p
where not exists (
  select 1 from public.plan_cuidado_audit a
  where a.entidad = 'planes_cuidado' and a.entidad_id = p.id
);

insert into public.plan_cuidado_audit
  (eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por, realizado_en)
select t.eleam_id, t.residente_id, 'tareas_cuidado', t.id, t.estado,
  jsonb_strip_nulls(jsonb_build_object(
    'actividad', a.titulo, 'fecha', t.fecha, 'turno', t.turno, 'hora', t.hora,
    'motivo_omision', t.motivo_omision, 'notas', t.notas,
    'reprogramada_para', t.reprogramada_para
  )), t.cumplida_por, coalesce(t.cumplida_en, t.actualizado_en, t.creado_en)
from public.tareas_cuidado t
join public.plan_cuidado_actividades a on a.id = t.actividad_id
where t.estado in ('cumplida','omitida','reprogramada','cancelada')
  and not exists (
    select 1 from public.plan_cuidado_audit pa
    where pa.entidad = 'tareas_cuidado' and pa.entidad_id = t.id
  );

insert into public.medicamentos_audit
  (eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por, realizado_en)
select i.eleam_id, i.residente_id, 'medicamentos_indicaciones', i.id, 'creado',
  jsonb_strip_nulls(jsonb_build_object(
    'medicamento', i.medicamento_nombre, 'dosis', i.dosis, 'via', i.via,
    'prescriptor', i.prescriptor_nombre, 'fecha_inicio', i.fecha_inicio,
    'horarios', (select count(*) from public.medicamentos_horarios h where h.indicacion_id = i.id and h.activo)
  )), coalesce(i.actualizado_por, i.creado_por), i.creado_en
from public.medicamentos_indicaciones i
where not exists (
  select 1 from public.medicamentos_audit a
  where a.entidad = 'medicamentos_indicaciones' and a.entidad_id = i.id
);

insert into public.medicamentos_audit
  (eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por, realizado_en)
select a.eleam_id, a.residente_id, 'medicamentos_administraciones', a.id, a.estado,
  jsonb_strip_nulls(jsonb_build_object(
    'medicamento', i.medicamento_nombre, 'fecha', a.fecha, 'turno', a.turno,
    'hora', a.hora, 'dosis', a.dosis_administrada, 'motivo_omision', a.motivo_omision,
    'notas', a.notas
  )), coalesce(a.validado_por, a.administrado_por),
  coalesce(a.validado_en, a.administrado_en, a.actualizado_en, a.creado_en)
from public.medicamentos_administraciones a
join public.medicamentos_indicaciones i on i.id = a.indicacion_id
where a.estado in ('administrado','omitido','validado','revertido','cancelado')
  and not exists (
    select 1 from public.medicamentos_audit ma
    where ma.entidad = 'medicamentos_administraciones' and ma.entidad_id = a.id
  );

insert into public.medicamentos_audit
  (eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por, realizado_en)
select l.eleam_id, l.residente_id, 'medicamentos_stock_lotes', l.id, 'lote_registrado',
  jsonb_strip_nulls(jsonb_build_object(
    'medicamento', l.medicamento_nombre, 'lote', l.lote,
    'cantidad_actual', l.cantidad_actual, 'unidad', l.unidad,
    'fecha_vencimiento', l.fecha_vencimiento, 'ubicacion', l.ubicacion
  )), coalesce(l.actualizado_por, l.creado_por), l.creado_en
from public.medicamentos_stock_lotes l
where l.residente_id is not null
  and not exists (
    select 1 from public.medicamentos_audit ma
    where ma.entidad = 'medicamentos_stock_lotes' and ma.entidad_id = l.id
  );

-- Las tablas siguientes sólo se modifican mediante RPC security definer. Esto
-- impide saltarse validaciones, actualizaciones relacionadas o la auditoría.
revoke insert, update, delete on public.cama_asignaciones from authenticated;
revoke insert, update, delete on public.tareas_cuidado from authenticated;
revoke insert, update, delete on public.medicamentos_indicaciones from authenticated;
revoke insert, update, delete on public.medicamentos_horarios from authenticated;
revoke insert, update, delete on public.medicamentos_administraciones from authenticated;
revoke insert, update, delete on public.medicamentos_stock_movimientos from authenticated;
revoke insert, update, delete on public.medicamentos_conciliaciones from authenticated;

-- Mantiene el contrato anterior y enriquece sólo el detalle de cama. La
-- validación de acceso y pertenencia se ejecuta primero en la RPC v2.
create or replace function public.obtener_detalle_historial_residente_v3(
  p_residente_id uuid,
  p_entidad text,
  p_evento_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base jsonb;
  v_detail jsonb;
begin
  v_base := public.obtener_detalle_historial_residente_v2(p_residente_id, p_entidad, p_evento_id);
  if p_entidad <> 'camas_audit' then return v_base; end if;

  select jsonb_strip_nulls(jsonb_build_object(
    'accion', ca.accion,
    'ubicacion_anterior', case
      when ca.accion = 'traslado' then concat_ws(' · ', nullif(h_old.nombre, ''), nullif(c_old.nombre, ''), 'Cama ' || c_old.codigo)
      when ca.accion in ('liberacion','liberacion_hospitalizacion','liberacion_automatica')
        then concat_ws(' · ', nullif(h_current.nombre, ''), nullif(c_current.nombre, ''), 'Cama ' || c_current.codigo)
      else null end,
    'ubicacion_nueva', case
      when ca.accion in ('liberacion','liberacion_hospitalizacion','liberacion_automatica') then 'Sin cama asignada'
      when ca.accion in ('asignacion','asignacion_confirmada','traslado')
        then concat_ws(' · ', nullif(h_current.nombre, ''), nullif(c_current.nombre, ''), 'Cama ' || c_current.codigo)
      else null end,
    'ubicacion_actual', case
      when ca.accion in ('reserva_hospitalizacion')
        then concat_ws(' · ', nullif(h_current.nombre, ''), nullif(c_current.nombre, ''), 'Cama ' || c_current.codigo)
      else null end,
    'motivo', ca.detalle->>'motivo',
    'notas', ca.detalle->>'notas'
  )) into v_detail
  from public.camas_audit ca
  left join public.camas c_current on c_current.id = ca.cama_id
  left join public.habitaciones h_current on h_current.id = c_current.habitacion_id
  left join public.camas c_old on c_old.id = nullif(ca.detalle->>'cama_anterior_id', '')::uuid
  left join public.habitaciones h_old on h_old.id = c_old.habitacion_id
  where ca.id = p_evento_id::uuid and ca.residente_id = p_residente_id;

  return coalesce(v_detail, v_base);
end;
$$;

revoke all on function public.obtener_detalle_historial_residente_v3(uuid, text, text) from public;
grant execute on function public.obtener_detalle_historial_residente_v3(uuid, text, text) to authenticated;
