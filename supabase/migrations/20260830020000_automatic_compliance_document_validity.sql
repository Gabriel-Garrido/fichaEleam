-- Vigencia documental automática con anulación manual explícita.

-- Algunas instalaciones históricas conservan un catálogo reducido de estados.
-- Se normaliza antes del primer cálculo para aceptar la matriz vigente completa.
alter table public.acred_requisitos_eleam
  drop constraint if exists acred_requisitos_eleam_estado_check;
alter table public.acred_requisitos_eleam
  add constraint acred_requisitos_eleam_estado_check
  check (estado in (
    'pendiente','en_revision','vigente','observado',
    'vencido','no_cumple','no_aplica','requiere_actualizacion'
  ));

alter table public.acred_requisitos_eleam
  add column if not exists estado_modo text not null default 'automatico',
  add column if not exists estado_manual_motivo text,
  add column if not exists estado_manual_en timestamptz,
  add column if not exists estado_manual_por uuid references public.profiles(id) on delete set null;

alter table public.acred_requisitos_eleam
  drop constraint if exists acred_requisitos_eleam_estado_modo_check;
alter table public.acred_requisitos_eleam
  add constraint acred_requisitos_eleam_estado_modo_check
  check (estado_modo in ('automatico','manual'));

-- Conserva decisiones humanas que no se pueden inferir desde un archivo.
update public.acred_requisitos_eleam
set estado_modo = case
  when estado in ('no_aplica','observado','no_cumple','en_revision','requiere_actualizacion') then 'manual'
  else 'automatico'
end
where estado_manual_en is null;

create index if not exists idx_acred_re_auto_eleam
  on public.acred_requisitos_eleam(eleam_id, estado_modo, estado)
  where estado_modo = 'automatico';

create or replace function public.acred_sincronizar_vigencias(p_eleam_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_today date := (now() at time zone 'America/Santiago')::date;
begin
  if p_eleam_id is null or not exists (select 1 from public.eleams where id = p_eleam_id) then
    raise exception 'ELEAM no encontrado para sincronizar cumplimiento' using errcode = 'P0001';
  end if;
  if (select auth.uid()) is null then
    raise exception 'Debe iniciar sesión' using errcode = '42501';
  end if;
  if not public.is_superadmin() and (
    p_eleam_id is distinct from public.my_eleam_id()
    or not public.eleam_has_access(p_eleam_id)
    or not public.can_access_compliance()
  ) then
    raise exception 'No autorizado a sincronizar cumplimiento' using errcode = '42501';
  end if;

  with calculated as (
    select
      re.id,
      re.estado as estado_anterior,
      doc.fecha_vencimiento,
      case
        when exists (
          select 1 from public.acred_observaciones o
          where o.requisito_eleam_id = re.id and o.estado in ('abierta','en_proceso')
        ) then 'observado'
        when doc.id is null and exists (
          select 1 from public.acred_documentos previous_doc
          where previous_doc.requisito_eleam_id = re.id
        ) then 'requiere_actualizacion'
        when doc.id is null then 'pendiente'
        when doc.fecha_vencimiento is not null and doc.fecha_vencimiento <= v_today then 'vencido'
        else 'vigente'
      end as estado_calculado
    from public.acred_requisitos_eleam re
    join public.acred_requisitos r on r.id = re.requisito_id
    left join lateral (
      select d.id, d.fecha_vencimiento
      from public.acred_documentos d
      where d.requisito_eleam_id = re.id and d.vigente = true
      order by d.version desc, d.creado_en desc
      limit 1
    ) doc on true
    where re.eleam_id = p_eleam_id
      and re.estado_modo = 'automatico'
      and r.tipo_evidencia in ('documento','mixta')
  ), changed as (
    update public.acred_requisitos_eleam re
    set estado = c.estado_calculado,
        fecha_vencimiento = c.fecha_vencimiento,
        actualizado_en = now()
    from calculated c
    where re.id = c.id
      and (re.estado is distinct from c.estado_calculado
        or re.fecha_vencimiento is distinct from c.fecha_vencimiento)
    returning re.id, c.estado_anterior, re.estado, re.fecha_vencimiento
  ), audited as (
    insert into public.acred_audit (
      eleam_id, entidad, entidad_id, accion, detalle, realizado_por
    )
    select p_eleam_id, 'requisito_eleam', id, 'sync_vigencia',
      jsonb_build_object(
        'estado_anterior', estado_anterior,
        'estado_nuevo', estado,
        'fecha_vencimiento', fecha_vencimiento,
        'origen', 'vigencia_documental'
      ), null
    from changed
    returning 1
  )
  select count(*)::integer into v_count from audited;

  return v_count;
end;
$$;

create or replace function public.acred_registrar_documento(
  p_requisito_eleam_id uuid,
  p_storage_path text,
  p_archivo_nombre text,
  p_archivo_tipo text,
  p_archivo_tamanio bigint,
  p_fecha_emision date default null,
  p_fecha_vencimiento date default null,
  p_notas text default null
)
returns public.acred_documentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_eleam_id uuid := public.my_eleam_id();
  v_re public.acred_requisitos_eleam;
  v_catalog public.acred_requisitos;
  v_doc public.acred_documentos;
  v_version integer;
  v_replaced_ids uuid[] := '{}'::uuid[];
  v_today date := (now() at time zone 'America/Santiago')::date;
  v_estado text;
begin
  if v_user is null or v_eleam_id is null then
    raise exception 'Debe iniciar sesión' using errcode = '42501';
  end if;

  select * into v_re from public.acred_requisitos_eleam
  where id = p_requisito_eleam_id and eleam_id = v_eleam_id
  for update;
  if not found then raise exception 'Requisito no encontrado' using errcode = 'P0001'; end if;

  select * into v_catalog from public.acred_requisitos where id = v_re.requisito_id;
  if v_catalog.tipo_evidencia not in ('documento','mixta') then
    raise exception 'Este punto se acredita con registros y no admite carga documental' using errcode = 'P0001';
  end if;
  if not public.is_superadmin() and (
    not public.eleam_has_access(v_eleam_id)
    or not public.can_access_feature('compliance')
    or not public.funcionario_can('subir_acreditacion')
  ) then
    raise exception 'No autorizado a subir documentos' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_storage_path, '')), '') is null
     or p_storage_path not like ('acreditacion/' || v_eleam_id::text || '/req/' || p_requisito_eleam_id::text || '/%') then
    raise exception 'Ruta de archivo inválida' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_archivo_nombre, ''))) not between 1 and 255 then
    raise exception 'Nombre de archivo inválido' using errcode = 'P0001';
  end if;
  if p_archivo_tamanio is null or p_archivo_tamanio not between 1 and 10485760 then
    raise exception 'El archivo excede el máximo permitido de 10 MB' using errcode = 'P0001';
  end if;
  if v_catalog.requiere_vencimiento and p_fecha_vencimiento is null then
    raise exception 'La fecha de vencimiento es obligatoria para este documento' using errcode = 'P0001';
  end if;
  if p_fecha_emision is not null and p_fecha_emision > v_today then
    raise exception 'La fecha de emisión no puede estar en el futuro' using errcode = 'P0001';
  end if;
  if p_fecha_emision is not null and p_fecha_vencimiento is not null
     and p_fecha_vencimiento < p_fecha_emision then
    raise exception 'La fecha de vencimiento no puede ser anterior a la emisión' using errcode = 'P0001';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.acred_documentos where requisito_eleam_id = p_requisito_eleam_id;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_replaced_ids
  from public.acred_documentos
  where requisito_eleam_id = p_requisito_eleam_id and vigente = true;

  update public.acred_documentos
  set vigente = false, reemplazado_en = now()
  where id = any(v_replaced_ids);

  insert into public.acred_documentos (
    eleam_id, requisito_eleam_id, version, vigente, storage_path,
    archivo_nombre, archivo_tipo, archivo_tamanio, fecha_emision,
    fecha_vencimiento, notas, subido_por
  ) values (
    v_eleam_id, p_requisito_eleam_id, v_version, true, trim(p_storage_path),
    left(trim(p_archivo_nombre), 255), nullif(trim(coalesce(p_archivo_tipo, '')), ''),
    p_archivo_tamanio, p_fecha_emision, p_fecha_vencimiento,
    nullif(trim(coalesce(p_notas, '')), ''), v_user
  ) returning * into v_doc;

  update public.acred_documentos
  set reemplazado_por_id = v_doc.id
  where id = any(v_replaced_ids);

  if v_catalog.tipo_evidencia in ('documento','mixta') then
    v_estado := case
      when exists (
        select 1 from public.acred_observaciones o
        where o.requisito_eleam_id = v_re.id and o.estado in ('abierta','en_proceso')
      ) then 'observado'
      when p_fecha_vencimiento is not null and p_fecha_vencimiento <= v_today then 'vencido'
      else 'vigente'
    end;

    update public.acred_requisitos_eleam
    set estado = v_estado,
        fecha_vencimiento = p_fecha_vencimiento,
        estado_modo = 'automatico',
        estado_manual_motivo = null,
        estado_manual_en = null,
        estado_manual_por = null,
        no_aplica_motivo = null,
        ultima_revision_en = now(),
        ultima_revision_por = v_user,
        actualizado_en = now()
    where id = v_re.id;
  end if;

  insert into public.acred_audit (
    eleam_id, entidad, entidad_id, accion, detalle, realizado_por
  ) values (
    v_eleam_id, 'documento', v_doc.id,
    case when v_version > 1 then 'replace' else 'create' end,
    jsonb_build_object(
      'requisito_eleam_id', v_re.id,
      'version', v_version,
      'archivo', v_doc.archivo_nombre,
      'fecha_vencimiento', p_fecha_vencimiento,
      'estado_automatico', v_estado
    ), v_user
  );

  return v_doc;
end;
$$;

create or replace function public.acred_archivar_documento(p_documento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_eleam_id uuid := public.my_eleam_id();
  v_doc public.acred_documentos;
  v_re public.acred_requisitos_eleam;
begin
  if v_user is null or v_eleam_id is null then
    raise exception 'Debe iniciar sesión' using errcode = '42501';
  end if;
  select * into v_doc from public.acred_documentos
  where id = p_documento_id and eleam_id = v_eleam_id for update;
  if not found then raise exception 'Documento no encontrado' using errcode = 'P0001'; end if;
  if not public.is_superadmin() and (
    not public.eleam_has_access(v_eleam_id)
    or not public.can_access_feature('compliance')
    or not public.funcionario_can('archivar_acreditacion')
  ) then
    raise exception 'No autorizado a archivar documentos' using errcode = '42501';
  end if;

  select * into v_re from public.acred_requisitos_eleam
  where id = v_doc.requisito_eleam_id for update;

  update public.acred_documentos
  set vigente = false, reemplazado_en = coalesce(reemplazado_en, now())
  where id = v_doc.id;

  if v_doc.vigente and v_re.estado_modo = 'automatico' then
    update public.acred_requisitos_eleam
    set estado = 'requiere_actualizacion', fecha_vencimiento = null,
        actualizado_en = now(), ultima_revision_en = now(), ultima_revision_por = v_user
    where id = v_re.id;
  end if;

  insert into public.acred_audit (
    eleam_id, entidad, entidad_id, accion, detalle, realizado_por
  ) values (
    v_eleam_id, 'documento', v_doc.id, 'archive',
    jsonb_build_object('requisito_eleam_id', v_doc.requisito_eleam_id, 'version', v_doc.version), v_user
  );
  return jsonb_build_object('id', v_doc.id, 'requisito_eleam_id', v_doc.requisito_eleam_id);
end;
$$;

create or replace function public.acred_establecer_estado_manual(
  p_requisito_eleam_id uuid,
  p_estado text,
  p_fecha_vencimiento date default null,
  p_no_aplica_motivo text default null,
  p_motivo text default null
)
returns public.acred_requisitos_eleam
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_eleam_id uuid := public.my_eleam_id();
  v_re public.acred_requisitos_eleam;
begin
  if v_user is null or v_eleam_id is null then
    raise exception 'Debe iniciar sesión' using errcode = '42501';
  end if;
  if p_estado not in ('pendiente','en_revision','vigente','observado','vencido','no_cumple','no_aplica','requiere_actualizacion') then
    raise exception 'Estado de cumplimiento inválido' using errcode = 'P0001';
  end if;
  if p_estado = 'no_aplica' and nullif(trim(coalesce(p_no_aplica_motivo, '')), '') is null then
    raise exception 'Debes indicar por qué este punto no aplica' using errcode = 'P0001';
  end if;
  if p_estado <> 'no_aplica' and nullif(trim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Debes indicar el motivo del ajuste manual' using errcode = 'P0001';
  end if;
  if not public.is_superadmin() and (
    not public.eleam_has_access(v_eleam_id)
    or not public.can_access_feature('compliance')
    or not public.funcionario_can('editar_acreditacion')
  ) then
    raise exception 'No autorizado a cambiar el estado' using errcode = '42501';
  end if;

  update public.acred_requisitos_eleam
  set estado = p_estado,
      fecha_vencimiento = case when p_estado = 'pendiente' then null else p_fecha_vencimiento end,
      no_aplica_motivo = case when p_estado = 'no_aplica' then trim(p_no_aplica_motivo) else null end,
      estado_modo = 'manual',
      estado_manual_motivo = case
        when p_estado = 'no_aplica' then trim(p_no_aplica_motivo)
        else trim(p_motivo)
      end,
      estado_manual_en = now(),
      estado_manual_por = v_user,
      ultima_revision_en = now(),
      ultima_revision_por = v_user,
      actualizado_en = now()
  where id = p_requisito_eleam_id and eleam_id = v_eleam_id
  returning * into v_re;
  if not found then raise exception 'Requisito no encontrado' using errcode = 'P0001'; end if;

  insert into public.acred_audit (
    eleam_id, entidad, entidad_id, accion, detalle, realizado_por
  ) values (
    v_eleam_id, 'requisito_eleam', v_re.id, 'manual_override',
    jsonb_build_object('estado', p_estado, 'fecha_vencimiento', p_fecha_vencimiento, 'motivo', v_re.estado_manual_motivo), v_user
  );
  return v_re;
end;
$$;

create or replace function public.acred_reactivar_estado_automatico(p_requisito_eleam_id uuid)
returns public.acred_requisitos_eleam
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_eleam_id uuid := public.my_eleam_id();
  v_re public.acred_requisitos_eleam;
  v_tipo_evidencia text;
begin
  if v_user is null or v_eleam_id is null then
    raise exception 'Debe iniciar sesión' using errcode = '42501';
  end if;
  if not public.is_superadmin() and (
    not public.eleam_has_access(v_eleam_id)
    or not public.can_access_feature('compliance')
    or not public.funcionario_can('editar_acreditacion')
  ) then
    raise exception 'No autorizado a cambiar el estado' using errcode = '42501';
  end if;

  update public.acred_requisitos_eleam
  set estado_modo = 'automatico', estado_manual_motivo = null,
      estado_manual_en = null, estado_manual_por = null,
      no_aplica_motivo = null, actualizado_en = now()
  where id = p_requisito_eleam_id and eleam_id = v_eleam_id
  returning * into v_re;
  if not found then raise exception 'Requisito no encontrado' using errcode = 'P0001'; end if;

  select r.tipo_evidencia into v_tipo_evidencia
  from public.acred_requisitos r where r.id = v_re.requisito_id;

  if v_tipo_evidencia in ('documento','mixta') then
    perform public.acred_sincronizar_vigencias(v_eleam_id);
  else
    update public.acred_requisitos_eleam
    set estado = 'pendiente', fecha_vencimiento = null, actualizado_en = now()
    where id = v_re.id;
  end if;
  select * into v_re from public.acred_requisitos_eleam where id = p_requisito_eleam_id;

  insert into public.acred_audit (
    eleam_id, entidad, entidad_id, accion, detalle, realizado_por
  ) values (
    v_eleam_id, 'requisito_eleam', v_re.id, 'automatic_mode',
    jsonb_build_object('estado', v_re.estado, 'fecha_vencimiento', v_re.fecha_vencimiento), v_user
  );
  return v_re;
end;
$$;

-- Compatibilidad con clientes anteriores: ahora sincroniza toda la regla.
create or replace function public.acred_marcar_vencidos(p_eleam_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select public.acred_sincronizar_vigencias(p_eleam_id);
$$;

revoke all on function public.acred_sincronizar_vigencias(uuid) from public;
grant execute on function public.acred_sincronizar_vigencias(uuid) to authenticated;
revoke all on function public.acred_registrar_documento(uuid, text, text, text, bigint, date, date, text) from public;
grant execute on function public.acred_registrar_documento(uuid, text, text, text, bigint, date, date, text) to authenticated;
revoke all on function public.acred_archivar_documento(uuid) from public;
grant execute on function public.acred_archivar_documento(uuid) to authenticated;
revoke all on function public.acred_establecer_estado_manual(uuid, text, date, text, text) from public;
grant execute on function public.acred_establecer_estado_manual(uuid, text, date, text, text) to authenticated;
revoke all on function public.acred_reactivar_estado_automatico(uuid) from public;
grant execute on function public.acred_reactivar_estado_automatico(uuid) to authenticated;

-- Toda mutación documental pasa por las RPC anteriores para que documento,
-- estado y auditoría se confirmen o reviertan juntos.
revoke insert, update, delete on public.acred_documentos from authenticated;

-- Aplica la regla inicial a documentos existentes al instalar la migración.
do $$
declare v_eleam uuid;
begin
  for v_eleam in select distinct eleam_id from public.acred_requisitos_eleam loop
    -- Ejecución interna sin auth: se replica el cálculo acotado al ELEAM.
    with calculated as (
      select re.id, doc.fecha_vencimiento,
        case
          when exists (select 1 from public.acred_observaciones o where o.requisito_eleam_id = re.id and o.estado in ('abierta','en_proceso')) then 'observado'
          when doc.id is null and exists (
            select 1 from public.acred_documentos previous_doc
            where previous_doc.requisito_eleam_id = re.id
          ) then 'requiere_actualizacion'
          when doc.id is null then 'pendiente'
          when doc.fecha_vencimiento is not null and doc.fecha_vencimiento <= (now() at time zone 'America/Santiago')::date then 'vencido'
          else 'vigente'
        end as estado_calculado
      from public.acred_requisitos_eleam re
      join public.acred_requisitos r on r.id = re.requisito_id
      left join lateral (
        select d.id, d.fecha_vencimiento from public.acred_documentos d
        where d.requisito_eleam_id = re.id and d.vigente = true
        order by d.version desc, d.creado_en desc limit 1
      ) doc on true
      where re.eleam_id = v_eleam and re.estado_modo = 'automatico'
        and r.tipo_evidencia in ('documento','mixta')
    )
    update public.acred_requisitos_eleam re
    set estado = c.estado_calculado, fecha_vencimiento = c.fecha_vencimiento, actualizado_en = now()
    from calculated c where re.id = c.id;
  end loop;
end;
$$;
