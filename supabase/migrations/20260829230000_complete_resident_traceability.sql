-- Historial integral del residente: auditoria transaccional, cobertura completa
-- y paginacion por cursor para evitar OFFSET sobre una union creciente.

create index if not exists idx_resident_payment_audit_entity
  on public.resident_payment_audit(entidad, entidad_id, realizado_en desc);
create index if not exists idx_reclamos_residente_fecha
  on public.reclamos_sugerencias(residente_id, actualizado_en desc)
  where residente_id is not null;

-- Recetas y cambios de identificación/ubicación del stock también forman
-- parte de la trazabilidad farmacológica. Las variaciones de cantidad ya se
-- auditan en el RPC de movimientos y se excluyen para no duplicarlas.
create or replace function public.audit_medication_document_or_lot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := to_jsonb(new);
  v_detail jsonb;
  v_action text;
  v_actor uuid;
begin
  if tg_table_name = 'medicamentos_recetas' then
    v_action := 'receta_adjuntada';
    v_actor := new.subido_por;
    v_detail := jsonb_strip_nulls(jsonb_build_object(
      'archivo_nombre', new.archivo_nombre,
      'fecha_emision', new.fecha_emision,
      'fecha_vencimiento', new.fecha_vencimiento,
      'prescriptor_nombre', new.prescriptor_nombre,
      'observaciones', new.observaciones
    ));
  elsif tg_op = 'INSERT' then
    v_action := 'lote_creado';
    v_actor := new.creado_por;
    v_detail := jsonb_strip_nulls(v_new - array[
      'id','eleam_id','residente_id','indicacion_id','cantidad_actual',
      'creado_por','actualizado_por','creado_en','actualizado_en'
    ]);
  else
    select coalesce(jsonb_object_agg(keys.key, jsonb_build_object(
      'anterior', v_old -> keys.key,
      'nuevo', v_new -> keys.key
    )), '{}'::jsonb)
    into v_detail
    from (
      select field_name as key
      from jsonb_object_keys(v_old || v_new) as changed(field_name)
      where field_name not in (
        'id','eleam_id','residente_id','indicacion_id','cantidad_actual',
        'creado_por','actualizado_por','creado_en','actualizado_en'
      ) and (v_old -> field_name) is distinct from (v_new -> field_name)
    ) keys;
    if v_detail = '{}'::jsonb then return new; end if;
    v_action := 'lote_actualizado';
    v_actor := coalesce(new.actualizado_por, (select auth.uid()));
  end if;

  insert into public.medicamentos_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  ) values (
    new.eleam_id, new.residente_id, tg_table_name, new.id,
    v_action, v_detail, coalesce(v_actor, (select auth.uid()))
  );
  return new;
end;
$$;

drop trigger if exists trg_medicamentos_recetas_audit on public.medicamentos_recetas;
create trigger trg_medicamentos_recetas_audit
  after insert on public.medicamentos_recetas
  for each row execute function public.audit_medication_document_or_lot();

drop trigger if exists trg_medicamentos_stock_lotes_audit on public.medicamentos_stock_lotes;
create trigger trg_medicamentos_stock_lotes_audit
  after insert or update on public.medicamentos_stock_lotes
  for each row execute function public.audit_medication_document_or_lot();

insert into public.medicamentos_audit (
  eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por, realizado_en
)
select mr.eleam_id, mr.residente_id, 'medicamentos_recetas', mr.id,
  'receta_adjuntada', jsonb_strip_nulls(jsonb_build_object(
    'archivo_nombre', mr.archivo_nombre, 'fecha_emision', mr.fecha_emision,
    'fecha_vencimiento', mr.fecha_vencimiento, 'prescriptor_nombre', mr.prescriptor_nombre
  )), mr.subido_por, mr.creado_en
from public.medicamentos_recetas mr
where not exists (
  select 1 from public.medicamentos_audit ma
  where ma.entidad = 'medicamentos_recetas' and ma.entidad_id = mr.id
);

insert into public.residentes_audit (
  eleam_id, residente_id, entidad, entidad_id, titulo, accion, cambios, realizado_por, realizado_en
)
select rs.eleam_id, rs.residente_id, 'reclamos_sugerencias', rs.id,
  'Reclamo o sugerencia', 'creado',
  jsonb_build_object('registro_inicial', 'Registro existente al completar la trazabilidad'),
  rs.registrado_por, rs.creado_en
from public.reclamos_sugerencias rs
where rs.residente_id is not null and not exists (
  select 1 from public.residentes_audit ra
  where ra.entidad = 'reclamos_sugerencias' and ra.entidad_id = rs.id
);

-- Signos y evoluciones ya aparecen como registro clinico en el historial. Este
-- trigger agrega solamente revisiones y eliminaciones, conservando el antes y
-- despues sin duplicar la creacion.
create or replace function public.audit_resident_clinical_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old jsonb := to_jsonb(old) - array['creado_en','actualizado_en'];
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) - array['creado_en','actualizado_en'] end;
  v_changes jsonb := '{}'::jsonb;
  v_residente_id uuid := nullif(v_source->>'residente_id', '')::uuid;
  v_eleam_id uuid;
  v_actor uuid := coalesce((select auth.uid()), nullif(v_source->>'registrado_por', '')::uuid);
  v_title text;
begin
  select eleam_id into v_eleam_id from public.residentes where id = v_residente_id;
  if v_eleam_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(keys.key, jsonb_build_object(
      'anterior', v_old -> keys.key,
      'nuevo', v_new -> keys.key
    )), '{}'::jsonb)
    into v_changes
    from (
      select field_name as key
      from jsonb_object_keys(v_old || v_new) as changed(field_name)
      where field_name not in ('id','residente_id','registrado_por')
        and (v_old -> field_name) is distinct from (v_new -> field_name)
    ) keys;
    if v_changes = '{}'::jsonb then return new; end if;
  else
    v_changes := jsonb_build_object(
      'datos_anteriores', v_old - array['id','residente_id','registrado_por']
    );
  end if;

  v_title := case tg_table_name
    when 'signos_vitales' then case when tg_op = 'DELETE' then 'Registro de signos vitales eliminado' else 'Registro de signos vitales corregido' end
    else case when tg_op = 'DELETE' then 'Registro de evolución eliminado' else 'Registro de evolución corregido' end
  end;

  insert into public.residentes_audit (
    eleam_id, residente_id, entidad, entidad_id, titulo, accion, cambios, realizado_por
  ) values (
    v_eleam_id, v_residente_id, tg_table_name, nullif(v_source->>'id', '')::uuid,
    v_title, case when tg_op = 'DELETE' then 'eliminado' else 'actualizado' end,
    v_changes, v_actor
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_signos_vitales_resident_revision on public.signos_vitales;
create trigger trg_signos_vitales_resident_revision
  after update or delete on public.signos_vitales
  for each row execute function public.audit_resident_clinical_revision();

drop trigger if exists trg_observaciones_resident_revision on public.observaciones_diarias;
create trigger trg_observaciones_resident_revision
  after update or delete on public.observaciones_diarias
  for each row execute function public.audit_resident_clinical_revision();

-- Los reclamos asociados a una persona quedan trazados, pero la consulta del
-- historial los entrega solamente a usuarios con permiso de cumplimiento.
drop trigger if exists trg_reclamos_resident_audit on public.reclamos_sugerencias;
create trigger trg_reclamos_resident_audit
  after insert or update or delete on public.reclamos_sugerencias
  for each row execute function public.audit_resident_related_changes('Reclamo o sugerencia');

-- La auditoria de eventos adversos deja de depender de una segunda llamada del
-- navegador: se registra dentro de la misma transaccion que modifica el evento.
create or replace function public.audit_adverse_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) - array['actualizado_en'] end;
  v_new jsonb := to_jsonb(new) - array['actualizado_en'];
  v_changes jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(keys.key, jsonb_build_object(
      'anterior', v_old -> keys.key,
      'nuevo', v_new -> keys.key
    )), '{}'::jsonb)
    into v_changes
    from (
      select field_name as key
      from jsonb_object_keys(v_old || v_new) as changed(field_name)
      where field_name not in ('id','eleam_id','residente_id','registrado_por','creado_en')
        and (v_old -> field_name) is distinct from (v_new -> field_name)
    ) keys;
    if v_changes = '{}'::jsonb then return new; end if;
  else
    v_changes := jsonb_build_object(
      'categoria', new.categoria,
      'severidad', new.severidad,
      'estado', new.estado
    );
  end if;

  insert into public.eventos_adversos_audit (
    eleam_id, evento_id, accion, detalle, realizado_por
  ) values (
    new.eleam_id, new.id,
    case when tg_op = 'INSERT' then 'creado' else 'actualizado' end,
    v_changes,
    coalesce((select auth.uid()), new.cerrado_por, new.registrado_por)
  );
  return new;
end;
$$;

create or replace function public.audit_adverse_event_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eleam_id uuid;
begin
  select eleam_id into v_eleam_id from public.eventos_adversos where id = new.evento_id;
  insert into public.eventos_adversos_audit (
    eleam_id, evento_id, accion, detalle, realizado_por
  ) values (
    v_eleam_id, new.evento_id, 'accion_' || new.tipo,
    jsonb_build_object('accion_id', new.id, 'tipo', new.tipo),
    coalesce(new.realizado_por, (select auth.uid()))
  );
  return new;
end;
$$;

drop trigger if exists trg_eventos_adversos_audit_db on public.eventos_adversos;
create trigger trg_eventos_adversos_audit_db
  after insert or update on public.eventos_adversos
  for each row execute function public.audit_adverse_event_change();

drop trigger if exists trg_eventos_adversos_acciones_audit_db on public.eventos_adversos_acciones;
create trigger trg_eventos_adversos_acciones_audit_db
  after insert on public.eventos_adversos_acciones
  for each row execute function public.audit_adverse_event_action();

drop policy if exists "eventos_adv_audit_insert" on public.eventos_adversos_audit;
revoke insert, update, delete on public.eventos_adversos_audit from authenticated;

-- Feed liviano y estable. Las acciones de cuidados y medicamentos provienen de
-- sus auditorias inmutables, no de la fila mutable, evitando duplicados y
-- conservando reprogramaciones, omisiones y validaciones sucesivas.
create or replace function public.listar_historial_residente_cursor(
  p_residente_id uuid,
  p_desde date default null,
  p_hasta date default null,
  p_tipos text[] default null,
  p_estado text default null,
  p_busqueda text default null,
  p_limit integer default 26,
  p_cursor_fecha timestamptz default null,
  p_cursor_clave text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_eleam_id uuid;
  v_limit integer := greatest(1, least(coalesce(p_limit, 26), 51));
  v_tipos text[] := coalesce(p_tipos, '{}'::text[]);
  v_search text := lower(nullif(trim(coalesce(p_busqueda, '')), ''));
  v_can_payments boolean := public.can_access_feature('resident_payments') and public.funcionario_can('ver_pagos_residentes');
  v_can_claims boolean := public.can_access_feature('compliance') and public.funcionario_can('gestionar_reclamos');
  v_result jsonb;
begin
  select eleam_id into v_eleam_id from public.residentes where id = p_residente_id;
  if v_eleam_id is null then raise exception 'Residente no encontrado' using errcode = 'P0001'; end if;
  if public.my_rol() not in ('admin_eleam','funcionario','superadmin')
     or not public.eleam_has_access(v_eleam_id)
     or (public.my_rol() <> 'superadmin' and public.my_eleam_id() is distinct from v_eleam_id)
     or not public.can_access_feature('residents') then
    raise exception 'No autorizado a ver el historial de este residente' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'clave_cursor', e.clave, 'tipo', e.tipo,
    'fecha_hora', e.fecha_hora, 'estado', e.estado, 'titulo', e.titulo,
    'entidad', e.entidad, 'entidad_id', e.entidad_id,
    'responsable_id', e.responsable_id,
    'responsable_nombre', coalesce(e.responsable_nombre, 'Sistema FichaEleam'),
    'tiene_detalle', true
  ) order by e.fecha_hora desc, e.clave desc), '[]'::jsonb)
  into v_result
  from (
    select * from (
      select sv.id::text id, 'signos:' || sv.id::text clave, 'signos'::text tipo,
        sv.fecha_hora, 'realizado'::text estado, 'Signos vitales registrados'::text titulo,
        'signos_vitales'::text entidad, sv.id::text entidad_id,
        sv.registrado_por responsable_id, p.nombre responsable_nombre
      from public.signos_vitales sv
      left join public.profiles p on p.id = sv.registrado_por
      where sv.residente_id = p_residente_id

      union all

      select o.id::text, 'evolucion:' || o.id::text,
        case when o.requiere_seguimiento then 'seguimientos' else 'observaciones' end,
        o.fecha_hora,
        case when o.requiere_seguimiento then o.seguimiento_estado else 'realizado' end,
        (case when o.requiere_seguimiento then 'Seguimiento · ' else 'Evolución · ' end) ||
        case o.tipo when 'observacion_general' then 'Estado general'
          when 'cambio_clinico' then 'Cambio clínico o síntoma' when 'dolor' then 'Dolor'
          when 'piel_heridas' then 'Piel o heridas' when 'conducta_animo' then 'Conducta o estado de ánimo'
          when 'caida' then 'Caída' when 'incidente' then 'Incidente' when 'curacion' then 'Curación'
          when 'visita_medica' then 'Visita médica' else 'Otro' end,
        'observaciones_diarias', o.id::text, o.registrado_por, p.nombre
      from public.observaciones_diarias o
      left join public.profiles p on p.id = o.registrado_por
      where o.residente_id = p_residente_id

      union all

      select cau.id::text, 'cama:' || cau.id::text, 'cama', cau.realizado_en, 'realizado',
        case cau.accion when 'traslado' then 'Residente trasladado de cama'
          when 'asignacion' then 'Cama asignada' when 'asignacion_confirmada' then 'Asignación de cama confirmada'
          when 'reserva_hospitalizacion' then 'Cama reservada por hospitalización'
          when 'liberacion_hospitalizacion' then 'Cama liberada por hospitalización'
          when 'liberacion_automatica' then 'Cama liberada automáticamente' else 'Cama liberada' end,
        'camas_audit', cau.id::text, cau.realizado_por, p.nombre
      from public.camas_audit cau
      left join public.profiles p on p.id = cau.realizado_por
      where cau.residente_id = p_residente_id

      union all

      select pa.id::text, 'cuidado:' || pa.id::text, 'cuidado', pa.realizado_en,
        case pa.accion when 'cumplida' then 'cumplida' when 'omitida' then 'omitida'
          when 'reprogramada' then 'reprogramada' when 'traspasada_turno' then 'reprogramada'
          else 'realizado' end,
        case when pa.entidad = 'tareas_cuidado' then
          coalesce(a.titulo, 'Tarea de cuidado') || case pa.accion
            when 'cumplida' then ' · Realizada' when 'omitida' then ' · No realizada'
            when 'reprogramada' then ' · Reprogramada' when 'traspasada_turno' then ' · Traspasada al siguiente turno'
            else ' · Actualizada' end
          when pa.entidad = 'planes_cuidado' then 'Plan de cuidado modificado'
          else 'Rutina de cuidado modificada' end,
        'plan_cuidado_audit', pa.id::text, pa.realizado_por, p.nombre
      from public.plan_cuidado_audit pa
      left join public.tareas_cuidado tc on pa.entidad = 'tareas_cuidado' and tc.id = pa.entidad_id
      left join public.plan_cuidado_actividades a on a.id = tc.actividad_id
      left join public.profiles p on p.id = pa.realizado_por
      where pa.residente_id = p_residente_id

      union all

      select ma.id::text, 'medicamento:' || ma.id::text, 'medicamentos', ma.realizado_en,
        case ma.accion when 'administrado' then 'administrado' when 'omitido' then 'omitido'
          when 'validado' then 'validado' else 'realizado' end,
        case when ma.entidad = 'medicamentos_administraciones' then
          coalesce(mi.medicamento_nombre, 'Medicamento') || case ma.accion
            when 'administrado' then ' · Administrado' when 'omitido' then ' · No administrado'
            when 'validado' then ' · Validado' else ' · Actualizado' end
          when ma.entidad = 'medicamentos_indicaciones' then 'Indicación médica modificada'
          when ma.entidad = 'medicamentos_recetas' then 'Receta médica adjuntada'
          when ma.entidad = 'medicamentos_stock_lotes' then 'Stock de medicamento actualizado'
          when ma.entidad = 'medicamentos_conciliaciones' then 'Conciliación de stock registrada'
          else 'Registro de medicamentos modificado' end,
        'medicamentos_audit', ma.id::text, ma.realizado_por, p.nombre
      from public.medicamentos_audit ma
      left join public.medicamentos_administraciones mad
        on ma.entidad = 'medicamentos_administraciones' and mad.id = ma.entidad_id
      left join public.medicamentos_indicaciones mi
        on mi.id = case when ma.entidad = 'medicamentos_indicaciones' then ma.entidad_id else mad.indicacion_id end
      left join public.profiles p on p.id = ma.realizado_por
      where ma.residente_id = p_residente_id

      union all

      select ra.id::text, 'ficha:' || lpad(ra.id::text, 20, '0'),
        case when ra.entidad = 'residentes' then 'datos'
          when ra.entidad = 'signos_vitales' then 'signos'
          when ra.entidad = 'observaciones_diarias' then 'observaciones'
          when ra.entidad = 'reclamos_sugerencias' then 'reclamos'
          else 'salud' end,
        ra.realizado_en,
        case when ra.accion = 'eliminado' then 'cancelado' else 'realizado' end,
        ra.titulo, 'residentes_audit', ra.id::text, ra.realizado_por, p.nombre
      from public.residentes_audit ra
      left join public.profiles p on p.id = ra.realizado_por
      where ra.residente_id = p_residente_id
        and (ra.entidad <> 'reclamos_sugerencias' or v_can_claims)

      union all

      select ea.id::text, 'incidente:' || ea.id::text, 'incidentes',
        coalesce((ea.fecha_evento + coalesce(ea.hora_evento, time '00:00')) at time zone 'America/Santiago', ea.creado_en),
        case when ea.estado in ('registrado','en_revision','en_seguimiento') then 'pendiente'
          when ea.estado = 'cerrado' then 'resuelto' else 'cancelado' end,
        case ea.categoria when 'caida_con_lesion' then 'Caída con lesión'
          when 'caida_sin_lesion' then 'Caída sin lesión' when 'error_medicacion' then 'Error de medicación'
          when 'lesion_por_presion' then 'Lesión por presión' when 'reaccion_alergica' then 'Reacción alérgica'
          else 'Evento adverso' end,
        'eventos_adversos', ea.id::text, ea.registrado_por, p.nombre
      from public.eventos_adversos ea
      left join public.profiles p on p.id = ea.registrado_por
      where ea.residente_id = p_residente_id

      union all

      select ac.id::text, 'incidente_accion:' || ac.id::text, 'incidentes', ac.creado_en,
        case when ac.tipo = 'reabertura' then 'pendiente' else 'realizado' end,
        case ac.tipo when 'accion' then 'Acción aplicada al evento adverso'
          when 'reevaluacion' then 'Evento adverso reevaluado' when 'contacto_familia' then 'Familia contactada'
          when 'contacto_medico' then 'Equipo médico contactado' when 'derivacion' then 'Derivación registrada'
          when 'cierre' then 'Evento adverso cerrado' when 'reabertura' then 'Evento adverso reabierto'
          else 'Nota de seguimiento del evento adverso' end,
        'eventos_adversos_acciones', ac.id::text, ac.realizado_por, p.nombre
      from public.eventos_adversos_acciones ac
      join public.eventos_adversos ea on ea.id = ac.evento_id
      left join public.profiles p on p.id = ac.realizado_por
      where ea.residente_id = p_residente_id

      union all

      select aa.id::text, 'incidente_audit:' || aa.id::text, 'incidentes', aa.realizado_en, 'realizado',
        'Evento adverso modificado', 'eventos_adversos_audit', aa.id::text,
        aa.realizado_por, p.nombre
      from public.eventos_adversos_audit aa
      join public.eventos_adversos ea on ea.id = aa.evento_id
      left join public.profiles p on p.id = aa.realizado_por
      where ea.residente_id = p_residente_id
        and aa.accion not in ('create','creado','add_action')
        and aa.accion not like 'accion_%'
        and not exists (
          select 1
          from public.eventos_adversos_acciones duplicate_action
          where duplicate_action.evento_id = aa.evento_id
            and (
              (aa.detalle->'estado'->>'nuevo' = 'cerrado' and duplicate_action.tipo = 'cierre')
              or (aa.detalle->'estado'->>'nuevo' = 'en_seguimiento' and duplicate_action.tipo = 'reabertura')
            )
            and abs(extract(epoch from (duplicate_action.creado_en - aa.realizado_en))) <= 10
        )

      union all

      select rpa.id::text, 'pago:' || rpa.id::text, 'pagos', rpa.realizado_en,
        case when rpa.accion = 'anular' then 'cancelado' else 'realizado' end,
        case rpa.entidad when 'contacto' then 'Contacto de pagos modificado'
          when 'configuracion' then 'Mensualidad modificada' when 'cobro' then 'Cobro registrado'
          when 'pago' then 'Pago registrado' when 'envio' then 'Comprobante enviado'
          else 'Recordatorio de pago enviado' end,
        'resident_payment_audit', rpa.id::text, rpa.realizado_por, p.nombre
      from public.resident_payment_audit rpa
      left join public.resident_charges rc on rpa.entidad = 'cobro' and rc.id = rpa.entidad_id
      left join public.resident_payments rp on rpa.entidad = 'pago' and rp.id = rpa.entidad_id
      left join public.resident_payment_deliveries rd on rpa.entidad = 'envio' and rd.id = rpa.entidad_id
      left join public.resident_payments rdp on rdp.id = rd.payment_id
      left join public.resident_payment_reminders rr on rpa.entidad = 'recordatorio' and rr.id = rpa.entidad_id
      left join public.profiles p on p.id = rpa.realizado_por
      where v_can_payments and rpa.eleam_id = v_eleam_id and (
        (rpa.entidad in ('contacto','configuracion') and rpa.entidad_id = p_residente_id)
        or rc.residente_id = p_residente_id or rp.residente_id = p_residente_id
        or rdp.residente_id = p_residente_id or rr.residente_id = p_residente_id
        or rpa.detalle->>'residente_id' = p_residente_id::text
        or exists (
          select 1 from public.resident_payments ep
          where ep.id::text = rpa.detalle->>'payment_id' and ep.residente_id = p_residente_id
        )
      )
    ) source
    where (cardinality(v_tipos) = 0 or source.tipo = any(v_tipos))
      and (p_estado is null
        or source.estado = p_estado
        or (p_estado = 'pendiente' and source.estado in ('pendiente','pendiente_validacion','validacion'))
        or (p_estado = 'realizado' and source.estado in ('realizado','cumplida','administrado','validado','resuelto','completada'))
        or (p_estado = 'omitida' and source.estado in ('omitida','omitido'))
        or (p_estado = 'cancelada' and source.estado in ('cancelada','cancelado')))
      and (p_desde is null or (source.fecha_hora at time zone 'America/Santiago')::date >= p_desde)
      and (p_hasta is null or (source.fecha_hora at time zone 'America/Santiago')::date <= p_hasta)
      and (v_search is null or lower(concat_ws(' ', source.titulo, source.responsable_nombre, source.tipo, source.estado)) like '%' || v_search || '%')
      and (p_cursor_fecha is null or source.fecha_hora < p_cursor_fecha
        or (source.fecha_hora = p_cursor_fecha and source.clave < coalesce(p_cursor_clave, '')))
    order by source.fecha_hora desc, source.clave desc
    limit v_limit
  ) e;
  return v_result;
end;
$$;

create or replace function public.obtener_detalle_historial_residente_v2(
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
  v_eleam_id uuid;
  v_detail jsonb;
  v_related boolean := false;
  v_audit_entity text;
begin
  select eleam_id into v_eleam_id from public.residentes where id = p_residente_id;
  if v_eleam_id is null then raise exception 'Residente no encontrado' using errcode = 'P0001'; end if;
  if public.my_rol() not in ('admin_eleam','funcionario','superadmin')
     or not public.eleam_has_access(v_eleam_id)
     or (public.my_rol() <> 'superadmin' and public.my_eleam_id() is distinct from v_eleam_id)
     or not public.can_access_feature('residents') then
    raise exception 'No autorizado a ver el detalle' using errcode = '42501';
  end if;

  if p_entidad in ('tareas_cuidado','medicamentos_administraciones','signos_vitales',
      'observaciones_diarias','camas_audit','plan_cuidado_audit','medicamentos_audit') then
    return public.obtener_detalle_historial_residente(p_residente_id, p_entidad, p_evento_id);
  elsif p_entidad = 'residentes_audit' then
    select entidad into v_audit_entity from public.residentes_audit
    where id = p_evento_id::bigint and residente_id = p_residente_id;
    if v_audit_entity = 'reclamos_sugerencias'
       and not (public.can_access_feature('compliance') and public.funcionario_can('gestionar_reclamos')) then
      raise exception 'No autorizado a ver este registro' using errcode = '42501';
    end if;
    return public.obtener_detalle_historial_residente(p_residente_id, p_entidad, p_evento_id);
  elsif p_entidad = 'eventos_adversos' then
    select jsonb_strip_nulls(jsonb_build_object(
      'categoria', categoria, 'severidad', severidad, 'estado', estado,
      'fecha_evento', fecha_evento, 'hora_evento', hora_evento, 'turno', turno,
      'lugar', lugar, 'descripcion', descripcion, 'causas_probables', causas_probables,
      'acciones_inmediatas', acciones_inmediatas, 'testigos', testigos,
      'requiere_seguimiento', requiere_seguimiento, 'fecha_compromiso_cierre', fecha_compromiso_cierre,
      'familia_notificada', notificado_familia, 'medio_notificacion', medio_notificacion_familia,
      'conclusiones', conclusiones, 'fecha_cierre', fecha_cierre
    )) into v_detail from public.eventos_adversos
    where id = p_evento_id::uuid and residente_id = p_residente_id;
  elsif p_entidad = 'eventos_adversos_acciones' then
    select jsonb_strip_nulls(jsonb_build_object(
      'tipo', ac.tipo, 'fecha', ac.fecha, 'descripcion', ac.descripcion
    )) into v_detail
    from public.eventos_adversos_acciones ac
    join public.eventos_adversos ea on ea.id = ac.evento_id
    where ac.id = p_evento_id::uuid and ea.residente_id = p_residente_id;
  elsif p_entidad = 'eventos_adversos_audit' then
    select jsonb_strip_nulls(jsonb_build_object('accion', aa.accion, 'cambios', aa.detalle))
    into v_detail from public.eventos_adversos_audit aa
    join public.eventos_adversos ea on ea.id = aa.evento_id
    where aa.id = p_evento_id::uuid and ea.residente_id = p_residente_id;
  elsif p_entidad = 'resident_payment_audit' then
    if not (public.can_access_feature('resident_payments') and public.funcionario_can('ver_pagos_residentes')) then
      raise exception 'No autorizado a ver cobranza' using errcode = '42501';
    end if;
    select exists (
      select 1 from public.resident_payment_audit rpa
      left join public.resident_charges rc on rpa.entidad = 'cobro' and rc.id = rpa.entidad_id
      left join public.resident_payments rp on rpa.entidad = 'pago' and rp.id = rpa.entidad_id
      left join public.resident_payment_deliveries rd on rpa.entidad = 'envio' and rd.id = rpa.entidad_id
      left join public.resident_payments rdp on rdp.id = rd.payment_id
      left join public.resident_payment_reminders rr on rpa.entidad = 'recordatorio' and rr.id = rpa.entidad_id
      where rpa.id = p_evento_id::uuid and rpa.eleam_id = v_eleam_id and (
        (rpa.entidad in ('contacto','configuracion') and rpa.entidad_id = p_residente_id)
        or rc.residente_id = p_residente_id or rp.residente_id = p_residente_id
        or rdp.residente_id = p_residente_id or rr.residente_id = p_residente_id
        or rpa.detalle->>'residente_id' = p_residente_id::text
        or exists (select 1 from public.resident_payments ep where ep.id::text = rpa.detalle->>'payment_id' and ep.residente_id = p_residente_id)
      )
    ) into v_related;
    if not v_related then raise exception 'Detalle no encontrado' using errcode = 'P0001'; end if;
    select jsonb_strip_nulls(jsonb_build_object('accion', accion, 'registro', entidad, 'detalle', detalle))
    into v_detail from public.resident_payment_audit where id = p_evento_id::uuid;
  else
    raise exception 'Tipo de evento no permitido' using errcode = 'P0001';
  end if;

  if v_detail is null then raise exception 'Detalle no encontrado' using errcode = 'P0001'; end if;
  return v_detail;
end;
$$;

revoke all on function public.listar_historial_residente_cursor(uuid, date, date, text[], text, text, integer, timestamptz, text) from public;
grant execute on function public.listar_historial_residente_cursor(uuid, date, date, text[], text, text, integer, timestamptz, text) to authenticated;
revoke all on function public.obtener_detalle_historial_residente_v2(uuid, text, text) from public;
grant execute on function public.obtener_detalle_historial_residente_v2(uuid, text, text) to authenticated;
revoke execute on function public.listar_historial_residente_paginado(uuid, date, date, text[], text, text, integer, integer) from authenticated;
revoke execute on function public.obtener_detalle_historial_residente(uuid, text, text) from authenticated;
