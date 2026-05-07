-- ============================================================
-- SUPABASE SCHEMA - FichaEleam
-- Configuracion actual para la app React + Edge Functions.
--
-- Ejecutar en Supabase SQL Editor. Si la seccion Storage falla por
-- permisos, crea el bucket privado `documentos-acreditacion` desde
-- Dashboard > Storage y vuelve a ejecutar desde la seccion Storage.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Tablas base: perfiles, planes y ELEAMs
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  email      text not null,
  rol        text not null default 'admin_eleam'
             check (rol in ('admin_eleam','funcionario','familiar','superadmin')),
  creado_en  timestamptz not null default now()
);

create table if not exists public.planes (
  id                uuid primary key default gen_random_uuid(),
  codigo            text unique not null,
  nombre            text not null,
  descripcion       text,
  precio_clp        integer not null check (precio_clp > 0),
  max_residentes    integer check (max_residentes is null or max_residentes > 0),
  max_funcionarios  integer check (max_funcionarios is null or max_funcionarios > 0),
  frequency         integer not null default 1 check (frequency > 0),
  frequency_type    text not null default 'months' check (frequency_type in ('days','months')),
  activo            boolean not null default true,
  orden             integer not null default 0,
  destacado         boolean not null default false,
  creado_en         timestamptz not null default now()
);

create table if not exists public.eleams (
  id                              uuid primary key default gen_random_uuid(),
  nombre                          text not null,
  rut_empresa                     text unique,
  email_admin                     text not null,
  telefono                        text,
  pago_activo                     boolean not null default false,
  plan                            text default 'mensual'
                                  check (plan in ('demo','mensual','anual','inactivo') or plan is null),
  plan_id                         uuid references public.planes(id),
  fecha_pago                      timestamptz,
  fecha_vencimiento_suscripcion   timestamptz,
  proximo_cobro_en                timestamptz,
  cancelado_en                    timestamptz,
  mp_preapproval_id               text unique,
  mp_payer_email                  text,
  max_residentes                  integer check (max_residentes is null or max_residentes > 0),
  max_funcionarios                integer check (max_funcionarios is null or max_funcionarios > 0),
  notas_admin                     text,
  subscription_status             text not null default 'inactivo'
                                  check (subscription_status in ('inactivo','pendiente','activo','en_gracia','pausado','cancelado','vencido')),
  crm_estado                      text not null default 'lead'
                                  check (crm_estado in (
                                    'lead','contactado','demo_agendada','demo_realizada','prueba',
                                    'pendiente_pago','cliente_activo','cliente_riesgo','perdido'
                                  )),
  origen_lead                     text,
  ultimo_contacto                 timestamptz,
  proxima_accion_fecha            date,
  responsable_comercial           uuid references public.profiles(id) on delete set null,
  riesgo_churn                    text not null default 'desconocido'
                                  check (riesgo_churn in ('bajo','medio','alto','desconocido')),
  creado_en                       timestamptz not null default now()
);

alter table public.profiles
  add column if not exists eleam_id uuid references public.eleams(id) on delete set null;

alter table public.profiles
  add column if not exists must_reset_password boolean not null default false;

create index if not exists idx_profiles_eleam_id on public.profiles(eleam_id);
create index if not exists idx_profiles_email_lower on public.profiles(lower(email));
create index if not exists idx_eleams_subscription_status on public.eleams(subscription_status);
create index if not exists idx_eleams_mp_preapproval_id on public.eleams(mp_preapproval_id);
create index if not exists idx_eleams_crm_estado on public.eleams(crm_estado);
create index if not exists idx_eleams_riesgo_churn on public.eleams(riesgo_churn);

-- ============================================================
-- 2. Modelo clinico operacional
-- ============================================================

create table if not exists public.residentes (
  id                       uuid primary key default gen_random_uuid(),
  eleam_id                 uuid references public.eleams(id) on delete restrict,
  nombre                   text not null,
  apellido                 text not null,
  rut                      text,
  fecha_nacimiento         date,
  sexo                     text check (sexo in ('masculino','femenino','otro')),
  nacionalidad             text default 'Chilena',
  estado_civil             text check (estado_civil in ('soltero','casado','viudo','divorciado','otro')),
  direccion_anterior       text,
  nombre_contacto          text,
  telefono_contacto        text,
  parentesco_contacto      text,
  prevision                text,
  diagnostico_principal    text,
  diagnosticos_secundarios text[],
  alergias                 text[],
  grupo_sanguineo          text,
  fecha_ingreso            date not null default current_date,
  fecha_egreso             date,
  motivo_egreso            text,
  habitacion               text,
  cama                     text,
  estado                   text not null default 'activo'
                           check (estado in ('activo','hospitalizado','egresado','fallecido')),
  indice_barthel           integer check (indice_barthel between 0 and 100),
  escala_katz              text,
  nivel_dependencia        text check (nivel_dependencia in ('leve','moderado','severo','total')),
  creado_por               uuid references auth.users(id) on delete set null,
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now()
);

create unique index if not exists residentes_rut_eleam_unique
  on public.residentes(rut, eleam_id)
  where rut is not null;
create index if not exists idx_residentes_eleam_estado on public.residentes(eleam_id, estado);
create index if not exists idx_residentes_nombre on public.residentes(apellido, nombre);

create table if not exists public.signos_vitales (
  id                       uuid primary key default gen_random_uuid(),
  residente_id             uuid not null references public.residentes(id) on delete cascade,
  fecha_hora               timestamptz not null default now(),
  turno                    text check (turno in ('mañana','tarde','noche')),
  presion_sistolica        integer check (presion_sistolica between 50 and 300),
  presion_diastolica       integer check (presion_diastolica between 30 and 200),
  frecuencia_cardiaca      integer check (frecuencia_cardiaca between 20 and 300),
  frecuencia_respiratoria  integer check (frecuencia_respiratoria between 5 and 60),
  temperatura              numeric(4,1) check (temperatura between 30.0 and 45.0),
  saturacion_oxigeno       integer check (saturacion_oxigeno between 0 and 100),
  glucosa                  integer check (glucosa between 20 and 800),
  peso                     numeric(5,2) check (peso between 10.0 and 300.0),
  dolor_escala             integer check (dolor_escala between 0 and 10),
  estado_conciencia        text check (estado_conciencia in ('alerta','somnoliento','estuporoso','coma')),
  observaciones            text,
  registrado_por           uuid references auth.users(id) on delete set null,
  creado_en                timestamptz not null default now()
);

create index if not exists idx_signos_residente_fecha on public.signos_vitales(residente_id, fecha_hora desc);

create table if not exists public.observaciones_diarias (
  id                    uuid primary key default gen_random_uuid(),
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  fecha_hora            timestamptz not null default now(),
  turno                 text check (turno in ('mañana','tarde','noche')),
  tipo                  text not null check (tipo in (
                          'observacion_general','caida','incidente','curacion',
                          'visita_medica','administracion_medicamento','cambio_posicion',
                          'higiene','alimentacion','eliminacion','actividad','otro'
                        )),
  descripcion           text not null,
  acciones_tomadas      text,
  requiere_seguimiento  boolean not null default false,
  registrado_por        uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create index if not exists idx_observaciones_residente_fecha on public.observaciones_diarias(residente_id, fecha_hora desc);
create index if not exists idx_observaciones_tipo on public.observaciones_diarias(tipo);
create index if not exists idx_observaciones_seguimiento
  on public.observaciones_diarias(residente_id, fecha_hora desc)
  where requiere_seguimiento = true;

-- ============================================================
-- 3. Invitaciones y portal familiar
-- ============================================================

create table if not exists public.funcionario_invitaciones (
  id            uuid primary key default gen_random_uuid(),
  eleam_id      uuid not null references public.eleams(id) on delete cascade,
  email         text not null,
  token         text unique not null,
  expira_en     timestamptz not null default (now() + interval '7 days'),
  usado         boolean not null default false,
  usado_en      timestamptz,
  rol           text not null default 'funcionario' check (rol in ('funcionario','familiar')),
  residente_id  uuid references public.residentes(id) on delete cascade,
  creado_por    uuid references auth.users(id) on delete set null,
  creado_en     timestamptz not null default now()
);

create index if not exists idx_inv_eleam on public.funcionario_invitaciones(eleam_id);
create index if not exists idx_inv_email on public.funcionario_invitaciones(lower(email));

create table if not exists public.familiar_residentes (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  residente_id  uuid not null references public.residentes(id) on delete cascade,
  parentesco    text,
  creado_por    uuid references auth.users(id) on delete set null,
  creado_en     timestamptz not null default now(),
  primary key (profile_id, residente_id)
);

create index if not exists idx_familiar_residentes_profile on public.familiar_residentes(profile_id);
create index if not exists idx_familiar_residentes_residente on public.familiar_residentes(residente_id);

create table if not exists public.funcionario_permisos (
  profile_id              uuid primary key references public.profiles(id) on delete cascade,
  crear_residentes        boolean not null default true,
  editar_residentes       boolean not null default true,
  eliminar_residentes     boolean not null default false,
  crear_signos_vitales    boolean not null default true,
  editar_signos_vitales   boolean not null default true,
  eliminar_signos_vitales boolean not null default false,
  crear_observaciones     boolean not null default true,
  editar_observaciones    boolean not null default true,
  eliminar_observaciones  boolean not null default false,
  subir_acreditacion      boolean not null default true,
  editar_acreditacion     boolean not null default true,
  archivar_acreditacion   boolean not null default false,
  registrar_visitas       boolean not null default true,
  actualizado_en          timestamptz not null default now()
);

create index if not exists idx_func_permisos_profile on public.funcionario_permisos(profile_id);

create table if not exists public.visitas_familiar (
  id              uuid primary key default gen_random_uuid(),
  residente_id    uuid not null references public.residentes(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete set null,
  fecha_hora      timestamptz not null default now(),
  duracion_min    integer check (duracion_min is null or duracion_min between 1 and 1440),
  notas           text,
  registrado_por  uuid references auth.users(id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index if not exists idx_visitas_residente_fecha on public.visitas_familiar(residente_id, fecha_hora desc);

-- ============================================================
-- 4. Pagos, MercadoPago y webhooks
-- ============================================================

create table if not exists public.pagos (
  id                         uuid primary key default gen_random_uuid(),
  eleam_id                   uuid not null references public.eleams(id) on delete cascade,
  plan_id                    uuid references public.planes(id),
  monto                      integer not null check (monto > 0),
  moneda                     text not null default 'CLP',
  plan                       text not null default 'mensual' check (plan in ('mensual','anual')),
  fecha_pago                 timestamptz not null default now(),
  fecha_inicio               date not null,
  fecha_fin                  date,
  metodo_pago                text,
  referencia_externa         text,
  estado                     text not null default 'completado'
                             check (estado in ('pendiente','completado','fallido','reembolsado')),
  notas                      text,
  registrado_por             uuid references auth.users(id),
  mp_payment_id              text unique,
  mp_preapproval_id          text,
  mp_authorized_payment_id   text unique,
  raw                        jsonb,
  creado_en                  timestamptz not null default now()
);

create index if not exists idx_pagos_eleam_id on public.pagos(eleam_id);
create index if not exists idx_pagos_fecha_pago on public.pagos(fecha_pago desc);
create index if not exists idx_pagos_mp_preapproval on public.pagos(mp_preapproval_id);

create table if not exists public.mp_webhook_events (
  id             uuid primary key default gen_random_uuid(),
  mp_request_id  text unique,
  topic          text,
  data_id        text,
  action         text,
  payload        jsonb,
  signature_ok   boolean not null default false,
  processed_ok   boolean not null default false,
  error          text,
  recibido_en    timestamptz not null default now(),
  procesado_en   timestamptz
);

create index if not exists idx_mp_events_data_id on public.mp_webhook_events(data_id);
create index if not exists idx_mp_events_recibido on public.mp_webhook_events(recibido_en desc);

-- ============================================================
-- 5. Acreditacion / Carpeta SEREMI
-- ============================================================

create table if not exists public.acred_ambitos (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique not null,
  nombre       text not null,
  descripcion  text,
  icono        text,
  orden        integer not null default 0
);

create table if not exists public.acred_requisitos (
  id                       uuid primary key default gen_random_uuid(),
  ambito_id                uuid not null references public.acred_ambitos(id) on delete cascade,
  codigo                   text unique not null,
  nombre                   text not null,
  descripcion              text,
  medio_verificador        text,
  obligatorio              boolean not null default true,
  permite_no_aplica        boolean not null default true,
  requiere_vencimiento     boolean not null default false,
  vigencia_dias_sugerida   integer,
  orden                    integer not null default 0
);

create index if not exists idx_acred_requisitos_ambito on public.acred_requisitos(ambito_id, orden);

create table if not exists public.acred_requisitos_eleam (
  id                   uuid primary key default gen_random_uuid(),
  eleam_id             uuid not null references public.eleams(id) on delete cascade,
  requisito_id         uuid not null references public.acred_requisitos(id) on delete cascade,
  estado               text not null default 'pendiente'
                       check (estado in ('pendiente','cumple','no_cumple','no_aplica','vencido','observado')),
  fecha_vencimiento    date,
  no_aplica_motivo     text,
  responsable_id       uuid references public.profiles(id) on delete set null,
  notas                text,
  ultima_revision_en   timestamptz,
  ultima_revision_por  uuid references public.profiles(id) on delete set null,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  unique (eleam_id, requisito_id)
);

create index if not exists idx_acred_re_eleam on public.acred_requisitos_eleam(eleam_id);
create index if not exists idx_acred_re_estado on public.acred_requisitos_eleam(eleam_id, estado);
create index if not exists idx_acred_re_vencim on public.acred_requisitos_eleam(eleam_id, fecha_vencimiento)
  where fecha_vencimiento is not null;

create table if not exists public.acred_documentos (
  id                   uuid primary key default gen_random_uuid(),
  eleam_id             uuid not null references public.eleams(id) on delete cascade,
  requisito_eleam_id   uuid not null references public.acred_requisitos_eleam(id) on delete cascade,
  version              integer not null default 1,
  vigente              boolean not null default true,
  storage_path         text not null,
  archivo_nombre       text not null,
  archivo_tipo         text,
  archivo_tamanio      bigint check (archivo_tamanio is null or archivo_tamanio >= 0),
  fecha_emision        date,
  fecha_vencimiento    date,
  notas                text,
  reemplazado_por_id   uuid references public.acred_documentos(id) on delete set null,
  reemplazado_en       timestamptz,
  subido_por           uuid references public.profiles(id) on delete set null,
  creado_en            timestamptz not null default now()
);

create index if not exists idx_acred_docs_re on public.acred_documentos(requisito_eleam_id, vigente);
create index if not exists idx_acred_docs_eleam on public.acred_documentos(eleam_id);
create index if not exists idx_acred_docs_vencim on public.acred_documentos(eleam_id, fecha_vencimiento)
  where fecha_vencimiento is not null and vigente = true;

create table if not exists public.acred_observaciones (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  requisito_eleam_id    uuid references public.acred_requisitos_eleam(id) on delete set null,
  origen                text not null check (origen in ('interna','fiscalizacion')),
  descripcion           text not null,
  acciones_subsanacion  text,
  responsable_id        uuid references public.profiles(id) on delete set null,
  fecha                 date not null default current_date,
  fecha_compromiso      date,
  estado                text not null default 'abierta' check (estado in ('abierta','en_proceso','cerrada')),
  cerrada_en            timestamptz,
  cerrada_por           uuid references public.profiles(id) on delete set null,
  cerrada_nota          text,
  creado_por            uuid references public.profiles(id) on delete set null,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create index if not exists idx_acred_obs_eleam_estado on public.acred_observaciones(eleam_id, estado);
create index if not exists idx_acred_obs_re on public.acred_observaciones(requisito_eleam_id);

create table if not exists public.acred_audit (
  id             uuid primary key default gen_random_uuid(),
  eleam_id       uuid,
  entidad        text not null,
  entidad_id     uuid,
  accion         text not null,
  detalle        jsonb,
  realizado_por  uuid references public.profiles(id) on delete set null,
  realizado_en   timestamptz not null default now()
);

create index if not exists idx_acred_audit_eleam on public.acred_audit(eleam_id, realizado_en desc);

-- ============================================================
-- 6. CRM superadmin y blog publico
-- ============================================================

create table if not exists public.crm_tasks (
  id                 uuid primary key default gen_random_uuid(),
  eleam_id           uuid references public.eleams(id) on delete cascade,
  titulo             text not null,
  descripcion        text,
  tipo               text not null default 'general'
                     check (tipo in ('general','llamada','correo','reunion','demo','seguimiento','onboarding','renovacion','otro')),
  estado             text not null default 'pendiente'
                     check (estado in ('pendiente','en_curso','completada','cancelada')),
  prioridad          text not null default 'media'
                     check (prioridad in ('baja','media','alta','urgente')),
  fecha_vencimiento  date,
  creado_por         uuid references public.profiles(id) on delete set null,
  completado_por     uuid references public.profiles(id) on delete set null,
  creado_en          timestamptz not null default now(),
  completado_en      timestamptz,
  actualizado_en     timestamptz not null default now()
);

create index if not exists idx_crm_tasks_eleam on public.crm_tasks(eleam_id, estado);
create index if not exists idx_crm_tasks_venc on public.crm_tasks(fecha_vencimiento)
  where estado in ('pendiente','en_curso');
create index if not exists idx_crm_tasks_estado on public.crm_tasks(estado);

create table if not exists public.crm_interactions (
  id              uuid primary key default gen_random_uuid(),
  eleam_id        uuid not null references public.eleams(id) on delete cascade,
  tipo            text not null default 'nota'
                  check (tipo in ('nota','llamada','correo','reunion','demo','soporte','sistema','otro')),
  canal           text check (canal in ('telefono','email','whatsapp','presencial','videollamada','sistema','otro') or canal is null),
  resumen         text not null,
  resultado       text check (resultado in ('positivo','neutro','negativo','sin_respuesta','sistema') or resultado is null),
  proxima_accion  text,
  creado_por      uuid references public.profiles(id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index if not exists idx_crm_int_eleam_fecha on public.crm_interactions(eleam_id, creado_en desc);

create table if not exists public.blog_posts (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  titulo              text not null,
  resumen             text not null,
  contenido_md        text not null,
  cover_url           text,
  cover_alt           text,
  meta_title          text,
  meta_description    text,
  keywords            text[] default '{}',
  estado              text not null default 'borrador' check (estado in ('borrador','publicado','archivado')),
  publicado_en        timestamptz,
  autor_nombre        text default 'Equipo FichaEleam',
  autor_id            uuid references public.profiles(id) on delete set null,
  tiempo_lectura_min  integer,
  views               integer not null default 0,
  destacado           boolean not null default false,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now()
);

create index if not exists idx_blog_posts_estado_pub on public.blog_posts(estado, publicado_en desc);
create index if not exists idx_blog_posts_slug on public.blog_posts(slug);

-- ============================================================
-- 7. Funciones y triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and rol = 'superadmin'
  );
$$;

create or replace function public.my_eleam_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select eleam_id from public.profiles where id = (select auth.uid());
$$;

create or replace function public.my_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = (select auth.uid());
$$;

create or replace function public.eleam_has_access(p_eleam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.eleams e
    where e.id = p_eleam_id
      and (
        e.pago_activo = true
        or e.subscription_status in ('activo','en_gracia')
        or (
          e.subscription_status = 'cancelado'
          and e.fecha_vencimiento_suscripcion is not null
          and e.fecha_vencimiento_suscripcion > now()
        )
      )
  );
$$;

create or replace function public.familiar_can_view_residente(rid uuid)
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
      and fr.residente_id = rid
      and public.eleam_has_access(r.eleam_id)
  );
$$;

create or replace function public.my_familiar_residente_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select fr.residente_id
  from public.familiar_residentes fr
  join public.residentes r on r.id = fr.residente_id
  where fr.profile_id = (select auth.uid())
    and public.eleam_has_access(r.eleam_id);
$$;

create or replace function public.funcionario_can(perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rol    text := public.my_rol();
  v_result boolean;
begin
  if v_rol in ('admin_eleam', 'superadmin') then return true; end if;
  if v_rol <> 'funcionario' then return false; end if;

  if not public.eleam_has_access(public.my_eleam_id()) then
    return false;
  end if;

  select case perm
    when 'crear_residentes'        then crear_residentes
    when 'editar_residentes'       then editar_residentes
    when 'eliminar_residentes'     then eliminar_residentes
    when 'crear_signos_vitales'    then crear_signos_vitales
    when 'editar_signos_vitales'   then editar_signos_vitales
    when 'eliminar_signos_vitales' then eliminar_signos_vitales
    when 'crear_observaciones'     then crear_observaciones
    when 'editar_observaciones'    then editar_observaciones
    when 'eliminar_observaciones'  then eliminar_observaciones
    when 'subir_acreditacion'      then subir_acreditacion
    when 'editar_acreditacion'     then editar_acreditacion
    when 'archivar_acreditacion'   then archivar_acreditacion
    when 'registrar_visitas'       then registrar_visitas
    else false
  end
  into v_result
  from public.funcionario_permisos
  where profile_id = (select auth.uid());

  -- Sin fila: denegar — el trigger trg_seed_funcionario_permisos garantiza
  -- que siempre exista la fila al asignar rol = 'funcionario'.
  if v_result is null then
    return false;
  end if;

  return v_result;
end;
$$;

revoke all on function public.funcionario_can(text) from public;
grant execute on function public.funcionario_can(text) to authenticated;

create or replace function public.seed_funcionario_permisos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.rol = 'funcionario' then
    insert into public.funcionario_permisos (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.sync_pago_activo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subscription_status in ('activo','en_gracia') then
    new.pago_activo := true;
  elsif new.subscription_status = 'cancelado' then
    new.pago_activo := (
      new.fecha_vencimiento_suscripcion is not null
      and new.fecha_vencimiento_suscripcion > now()
    );
  elsif new.subscription_status in ('inactivo','vencido','pausado','pendiente') then
    new.pago_activo := false;
  end if;
  return new;
end;
$$;

create or replace function public.check_residentes_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
  v_status text;
begin
  if new.estado <> 'activo' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.estado = 'activo' and new.estado = 'activo' then
    return new;
  end if;

  select coalesce(p.max_residentes, e.max_residentes), e.subscription_status
  into v_max, v_status
  from public.eleams e
  left join public.planes p on p.id = e.plan_id
  where e.id = new.eleam_id;

  if v_status not in ('activo','en_gracia','pendiente') then
    raise exception 'La suscripcion del ELEAM no esta activa (%). Activa el plan antes de agregar residentes.', coalesce(v_status, 'sin_estado')
      using errcode = 'P0001';
  end if;

  if v_max is not null then
    select count(*) into v_count
    from public.residentes
    where eleam_id = new.eleam_id
      and estado = 'activo'
      and id <> new.id;

    if v_count >= v_max then
      raise exception 'El plan permite maximo % residentes activos', v_max
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.check_funcionarios_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  if new.eleam_id is null or new.rol <> 'funcionario' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.eleam_id is not distinct from new.eleam_id
     and old.rol is not distinct from new.rol then
    return new;
  end if;

  select coalesce(p.max_funcionarios, e.max_funcionarios)
  into v_max
  from public.eleams e
  left join public.planes p on p.id = e.plan_id
  where e.id = new.eleam_id;

  if v_max is not null then
    select count(*) into v_count
    from public.profiles
    where eleam_id = new.eleam_id
      and rol = 'funcionario'
      and id <> new.id;

    if v_count >= v_max then
      raise exception 'El plan permite maximo % funcionarios', v_max
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_role_eleam_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_rol text;
  v_caller_email text;
  v_is_repair boolean;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  select rol into v_caller_rol
  from public.profiles
  where id = (select auth.uid());

  if v_caller_rol = 'superadmin' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select lower(email) into v_caller_email
    from auth.users
    where id = (select auth.uid());

    v_is_repair :=
      current_setting('app.allow_platform_superadmin_repair', true) = 'on'
      and old.id = (select auth.uid())
      and new.id = old.id
      and v_caller_email = 'gabrielgarrido89@gmail.com'
      and lower(new.email) = 'gabrielgarrido89@gmail.com'
      and new.rol = 'superadmin'
      and new.eleam_id is null;

    if v_is_repair then
      return new;
    end if;

    if new.rol is distinct from old.rol then
      raise exception 'No autorizado a modificar el rol' using errcode = '42501';
    end if;

    if new.eleam_id is distinct from old.eleam_id then
      raise exception 'No autorizado a modificar el ELEAM' using errcode = '42501';
    end if;

    if lower(new.email) is distinct from v_caller_email then
      raise exception 'No autorizado a modificar el email del perfil' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(new.email);
  v_nombre text;
  v_rol text := null;
  v_eleam_id uuid := null;
  v_token text;
  v_invitacion record;
  v_residente_id uuid := null;
  v_invitado_por uuid := null;
  v_account_source text := coalesce(new.raw_app_meta_data->>'fichaeleam_account_source', '');
begin
  v_nombre := coalesce(
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  if v_email = 'gabrielgarrido89@gmail.com' then
    insert into public.profiles (id, nombre, email, rol, eleam_id)
    values (new.id, v_nombre, new.email, 'superadmin', null)
    on conflict (id) do update set
      nombre = excluded.nombre,
      email = excluded.email,
      rol = 'superadmin',
      eleam_id = null;
    return new;
  end if;

  if v_email = 'demo@fichaeleam.cl' then
    insert into public.profiles (id, nombre, email, rol, eleam_id)
    values (
      new.id,
      v_nombre,
      new.email,
      'superadmin',
      'a0000000-0000-0000-0000-000000000001'::uuid
    )
    on conflict (id) do update set
      nombre = excluded.nombre,
      email = excluded.email,
      rol = 'superadmin',
      eleam_id = excluded.eleam_id;
    return new;
  end if;

  -- Creacion directa autorizada por Edge Function.
  -- Importante: la autorizacion vive en raw_app_meta_data, no en
  -- raw_user_meta_data. El cliente puede escribir user_metadata al hacer
  -- signUp/OAuth; app_metadata solo debe escribirlo Admin API/service role.
  if new.raw_app_meta_data->>'eleam_id_direct' is not null then
    v_eleam_id := (new.raw_app_meta_data->>'eleam_id_direct')::uuid;
    v_rol      := coalesce(nullif(trim(new.raw_app_meta_data->>'rol_direct'), ''), 'funcionario');

    if not exists (select 1 from public.eleams where id = v_eleam_id) then
      raise exception 'eleam_id_direct invalido: ELEAM no encontrado (id=%)', v_eleam_id
        using errcode = '42501';
    end if;

    if v_rol not in ('admin_eleam', 'funcionario', 'familiar') then
      raise exception 'rol_direct invalido: rol no permitido (%)', coalesce(v_rol, 'null')
        using errcode = '42501';
    end if;

    if v_rol = 'admin_eleam' and v_account_source not in ('demo_approved', 'superadmin_created') then
      raise exception 'Cuenta admin_eleam no autorizada para este flujo'
        using errcode = '42501';
    end if;

    v_residente_id := case
      when new.raw_app_meta_data->>'residente_id_direct' is not null
      then (new.raw_app_meta_data->>'residente_id_direct')::uuid
      else null
    end;

    if v_rol = 'familiar' then
      if v_residente_id is null then
        raise exception 'residente_id_direct requerido para familiar'
          using errcode = '42501';
      end if;

      if not exists (
        select 1
        from public.residentes r
        where r.id = v_residente_id
          and r.eleam_id = v_eleam_id
          and r.estado = 'activo'
      ) then
        raise exception 'residente_id_direct invalido para este ELEAM'
          using errcode = '42501';
      end if;
    end if;

    insert into public.profiles (id, nombre, email, rol, eleam_id, must_reset_password)
    values (
      new.id, v_nombre, new.email, v_rol, v_eleam_id,
      coalesce((new.raw_user_meta_data->>'must_reset_password')::boolean, true)
    )
    on conflict (id) do update set
      nombre              = excluded.nombre,
      email               = excluded.email,
      rol                 = excluded.rol,
      eleam_id            = excluded.eleam_id,
      must_reset_password = excluded.must_reset_password;

    if v_rol = 'familiar' and v_residente_id is not null then
      insert into public.familiar_residentes (profile_id, residente_id, creado_por)
      values (new.id, v_residente_id, null)
      on conflict do nothing;
    end if;

    return new;
  end if;

  v_token := new.raw_user_meta_data->>'invite_token';
  if v_token is not null and v_token <> '' then
    select i.* into v_invitacion
    from public.funcionario_invitaciones i
    where i.token = v_token
      and lower(i.email) = v_email
      and i.usado = false
      and i.expira_en > now()
    limit 1;

    if found then
      v_eleam_id := v_invitacion.eleam_id;
      v_rol := coalesce(v_invitacion.rol, 'funcionario');
      v_residente_id := v_invitacion.residente_id;
      v_invitado_por := v_invitacion.creado_por;

      update public.funcionario_invitaciones
      set usado = true, usado_en = now()
      where id = v_invitacion.id;
    else
      raise exception 'Invitacion invalida, vencida o usada'
        using errcode = '42501';
    end if;
  end if;

  if v_token is null or v_token = '' then
    raise exception 'Cuenta no autorizada. Debe ser aprobada por superadmin o creada por un ELEAM activo.'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, nombre, email, rol, eleam_id, must_reset_password)
  values (new.id, v_nombre, new.email, v_rol, v_eleam_id, false)
  on conflict (id) do update set
    nombre   = excluded.nombre,
    email    = excluded.email,
    rol      = excluded.rol,
    eleam_id = excluded.eleam_id;
    -- must_reset_password no se toca aquí para preservar el estado si ya existía

  if v_rol = 'familiar' and v_residente_id is not null then
    insert into public.familiar_residentes (profile_id, residente_id, creado_por)
    values (new.id, v_residente_id, v_invitado_por)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.ensure_platform_superadmin()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_nombre text;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  select
    lower(u.email),
    coalesce(
      u.raw_user_meta_data->>'nombre',
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1)
    )
  into v_email, v_nombre
  from auth.users u
  where u.id = v_user_id;

  if v_email is distinct from 'gabrielgarrido89@gmail.com' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform set_config('app.allow_platform_superadmin_repair', 'on', true);

  insert into public.profiles (id, nombre, email, rol, eleam_id)
  values (v_user_id, v_nombre, v_email, 'superadmin', null)
  on conflict (id) do update set
    nombre = excluded.nombre,
    email = excluded.email,
    rol = 'superadmin',
    eleam_id = null
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.acred_provision_requisitos(p_eleam_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  insert into public.acred_requisitos_eleam (eleam_id, requisito_id, estado)
  select p_eleam_id, r.id, 'pendiente'
  from public.acred_requisitos r
  on conflict (eleam_id, requisito_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.acred_on_eleam_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.acred_provision_requisitos(new.id);
  return new;
end;
$$;

create or replace function public.acred_marcar_vencidos(p_eleam_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.acred_requisitos_eleam
  set estado = 'vencido'
  where eleam_id = p_eleam_id
    and estado = 'cumple'
    and fecha_vencimiento is not null
    and fecha_vencimiento < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.registrar_pago_y_activar_eleam(
  p_eleam_id uuid,
  p_monto integer,
  p_plan text,
  p_fecha_inicio date,
  p_fecha_fin date,
  p_metodo_pago text default null,
  p_notas text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_pago_id uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Solo superadmin puede registrar pagos' using errcode = '42501';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto invalido' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.eleams where id = p_eleam_id) then
    raise exception 'ELEAM no encontrado' using errcode = 'P0001';
  end if;

  insert into public.pagos (
    eleam_id, monto, plan, fecha_inicio, fecha_fin,
    metodo_pago, notas, estado, registrado_por
  )
  values (
    p_eleam_id, p_monto, coalesce(p_plan, 'mensual'), p_fecha_inicio, p_fecha_fin,
    p_metodo_pago, p_notas, 'completado', v_user
  )
  returning id into v_pago_id;

  update public.eleams
  set pago_activo = true,
      plan = coalesce(p_plan, 'mensual'),
      subscription_status = 'activo',
      fecha_pago = now(),
      fecha_vencimiento_suscripcion = p_fecha_fin::timestamptz,
      proximo_cobro_en = p_fecha_fin::timestamptz,
      crm_estado = 'cliente_activo',
      riesgo_churn = case when riesgo_churn = 'alto' then 'medio' else riesgo_churn end,
      ultimo_contacto = now()
  where id = p_eleam_id;

  insert into public.crm_interactions (
    eleam_id, tipo, canal, resumen, resultado, creado_por
  )
  values (
    p_eleam_id, 'sistema', 'sistema',
    'Pago registrado por ' || coalesce(p_metodo_pago, 'metodo no especificado') ||
      ' - ' || p_monto::text || ' CLP - plan ' || coalesce(p_plan, 'mensual'),
    'positivo', v_user
  );

  return jsonb_build_object('pago_id', v_pago_id, 'eleam_id', p_eleam_id, 'fecha_fin', p_fecha_fin);
end;
$$;

create or replace function public.blog_increment_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.blog_posts
  set views = views + 1
  where slug = p_slug and estado = 'publicado';
$$;

-- Triggers
drop trigger if exists trg_sync_pago_activo on public.eleams;
create trigger trg_sync_pago_activo
  before insert or update of subscription_status, fecha_vencimiento_suscripcion on public.eleams
  for each row execute function public.sync_pago_activo();

drop trigger if exists trg_residentes_limit on public.residentes;
create trigger trg_residentes_limit
  before insert or update of estado, eleam_id on public.residentes
  for each row execute function public.check_residentes_limit();

drop trigger if exists trg_funcionarios_limit on public.profiles;
create trigger trg_funcionarios_limit
  before insert or update of eleam_id, rol on public.profiles
  for each row execute function public.check_funcionarios_limit();

drop trigger if exists trg_prevent_role_eleam_escalation on public.profiles;
create trigger trg_prevent_role_eleam_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_eleam_escalation();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_seed_funcionario_permisos on public.profiles;
create trigger trg_seed_funcionario_permisos
  after insert or update of rol on public.profiles
  for each row execute function public.seed_funcionario_permisos();

insert into public.funcionario_permisos (profile_id)
select id
from public.profiles
where rol = 'funcionario'
on conflict (profile_id) do nothing;

drop trigger if exists trg_residentes_updated_at on public.residentes;
create trigger trg_residentes_updated_at
  before update on public.residentes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_observaciones_updated_at on public.observaciones_diarias;
create trigger trg_observaciones_updated_at
  before update on public.observaciones_diarias
  for each row execute function public.set_updated_at();

drop trigger if exists trg_acred_re_updated_at on public.acred_requisitos_eleam;
create trigger trg_acred_re_updated_at
  before update on public.acred_requisitos_eleam
  for each row execute function public.set_updated_at();

drop trigger if exists trg_acred_obs_updated_at on public.acred_observaciones;
create trigger trg_acred_obs_updated_at
  before update on public.acred_observaciones
  for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_tasks_updated_at on public.crm_tasks;
create trigger trg_crm_tasks_updated_at
  before update on public.crm_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_acred_provision_on_eleam on public.eleams;
create trigger trg_acred_provision_on_eleam
  after insert on public.eleams
  for each row execute function public.acred_on_eleam_created();

-- RPC permissions
revoke all on function public.ensure_platform_superadmin() from public;
grant execute on function public.ensure_platform_superadmin() to authenticated;

revoke all on function public.acred_provision_requisitos(uuid) from public;
grant execute on function public.acred_provision_requisitos(uuid) to authenticated;

revoke all on function public.acred_marcar_vencidos(uuid) from public;
grant execute on function public.acred_marcar_vencidos(uuid) to authenticated;

revoke all on function public.registrar_pago_y_activar_eleam(uuid, integer, text, date, date, text, text) from public;
grant execute on function public.registrar_pago_y_activar_eleam(uuid, integer, text, date, date, text, text) to authenticated;

revoke all on function public.blog_increment_views(text) from public;
grant execute on function public.blog_increment_views(text) to anon, authenticated;

-- ============================================================
-- 8. Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.planes enable row level security;
alter table public.eleams enable row level security;
alter table public.residentes enable row level security;
alter table public.signos_vitales enable row level security;
alter table public.observaciones_diarias enable row level security;
alter table public.funcionario_invitaciones enable row level security;
alter table public.familiar_residentes enable row level security;
alter table public.visitas_familiar enable row level security;
alter table public.pagos enable row level security;
alter table public.mp_webhook_events enable row level security;
alter table public.acred_ambitos enable row level security;
alter table public.acred_requisitos enable row level security;
alter table public.acred_requisitos_eleam enable row level security;
alter table public.acred_documentos enable row level security;
alter table public.acred_observaciones enable row level security;
alter table public.acred_audit enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_interactions enable row level security;
alter table public.blog_posts enable row level security;

-- Profiles
drop policy if exists "profiles_own_select" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
drop policy if exists "profiles_admin_eleam_select" on public.profiles;
drop policy if exists "superadmin_select_profiles" on public.profiles;

create policy "profiles_own_select" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "profiles_own_update" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_admin_eleam_select" on public.profiles
  for select using (
    public.my_rol() = 'admin_eleam'
    and eleam_id is not null
    and eleam_id = public.my_eleam_id()
    and public.eleam_has_access(eleam_id)
  );

create policy "superadmin_select_profiles" on public.profiles
  for select using (public.is_superadmin());

-- Planes
drop policy if exists "planes_select_public" on public.planes;
drop policy if exists "planes_superadmin_write" on public.planes;

create policy "planes_select_public" on public.planes
  for select using (activo = true or public.is_superadmin());

create policy "planes_superadmin_write" on public.planes
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

-- ELEAMs
drop policy if exists "eleams_select" on public.eleams;
drop policy if exists "eleams_insert_superadmin" on public.eleams;
drop policy if exists "eleams_update" on public.eleams;

create policy "eleams_select" on public.eleams
  for select using (
    public.is_superadmin()
    or id = public.my_eleam_id()
  );

create policy "eleams_insert_superadmin" on public.eleams
  for insert with check (public.is_superadmin());

create policy "eleams_update" on public.eleams
  for update using (
    public.is_superadmin()
    or (public.my_rol() = 'admin_eleam' and id = public.my_eleam_id())
  )
  with check (
    public.is_superadmin()
    or (public.my_rol() = 'admin_eleam' and id = public.my_eleam_id())
  );

-- Residentes
drop policy if exists "residentes_select" on public.residentes;
drop policy if exists "residentes_insert" on public.residentes;
drop policy if exists "residentes_update" on public.residentes;
drop policy if exists "residentes_delete" on public.residentes;

create policy "residentes_select" on public.residentes
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
    or (
      public.my_rol() = 'familiar'
      and public.eleam_has_access(eleam_id)
      and id in (select public.my_familiar_residente_ids())
    )
  );

create policy "residentes_insert" on public.residentes
  for insert with check (
    public.funcionario_can('crear_residentes')
    and eleam_id = public.my_eleam_id()
    and public.eleam_has_access(eleam_id)
  );

create policy "residentes_update" on public.residentes
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_residentes')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_residentes')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "residentes_delete" on public.residentes
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('eliminar_residentes')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

-- Signos vitales
drop policy if exists "sv_select" on public.signos_vitales;
drop policy if exists "sv_insert" on public.signos_vitales;
drop policy if exists "sv_update" on public.signos_vitales;
drop policy if exists "sv_delete" on public.signos_vitales;

create policy "sv_select" on public.signos_vitales
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
    or (
      public.my_rol() = 'familiar'
      and residente_id in (select public.my_familiar_residente_ids())
    )
  );

create policy "sv_insert" on public.signos_vitales
  for insert with check (
    public.funcionario_can('crear_signos_vitales')
    and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
  );

create policy "sv_update" on public.signos_vitales
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_signos_vitales')
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_signos_vitales')
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  );

create policy "sv_delete" on public.signos_vitales
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('eliminar_signos_vitales')
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  );

-- Observaciones diarias
drop policy if exists "obs_select" on public.observaciones_diarias;
drop policy if exists "obs_insert" on public.observaciones_diarias;
drop policy if exists "obs_update" on public.observaciones_diarias;
drop policy if exists "obs_delete" on public.observaciones_diarias;

create policy "obs_select" on public.observaciones_diarias
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
    or (
      public.my_rol() = 'familiar'
      and residente_id in (select public.my_familiar_residente_ids())
    )
  );

create policy "obs_insert" on public.observaciones_diarias
  for insert with check (
    public.funcionario_can('crear_observaciones')
    and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
  );

create policy "obs_update" on public.observaciones_diarias
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_observaciones')
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_observaciones')
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  );

create policy "obs_delete" on public.observaciones_diarias
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('eliminar_observaciones')
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  );

-- Invitaciones y familiares
drop policy if exists "inv_admin_select" on public.funcionario_invitaciones;
drop policy if exists "inv_admin_insert" on public.funcionario_invitaciones;
drop policy if exists "inv_admin_delete" on public.funcionario_invitaciones;

create policy "inv_admin_select" on public.funcionario_invitaciones
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "inv_admin_insert" on public.funcionario_invitaciones
  for insert with check (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
    and public.eleam_has_access(eleam_id)
  );

create policy "inv_admin_delete" on public.funcionario_invitaciones
  for delete using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
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
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  );

create policy "fr_insert_admin" on public.familiar_residentes
  for insert with check (
    (
      public.my_rol() = 'admin_eleam'
      or public.funcionario_can('editar_residentes')
    )
    and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
  );

create policy "fr_delete_admin" on public.familiar_residentes
  for delete using (
    public.is_superadmin()
    or (
      (
        public.my_rol() = 'admin_eleam'
        or public.funcionario_can('editar_residentes')
      )
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  );

-- Permisos granulares de funcionarios
alter table public.funcionario_permisos enable row level security;

drop policy if exists "fp_admin_all" on public.funcionario_permisos;
drop policy if exists "fp_self_select" on public.funcionario_permisos;

create policy "fp_admin_all" on public.funcionario_permisos
  for all using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and profile_id in (
        select id from public.profiles
        where eleam_id = public.my_eleam_id() and rol = 'funcionario'
      )
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and profile_id in (
        select id from public.profiles
        where eleam_id = public.my_eleam_id() and rol = 'funcionario'
      )
    )
  );

create policy "fp_self_select" on public.funcionario_permisos
  for select using (profile_id = (select auth.uid()));

drop policy if exists "vf_select" on public.visitas_familiar;
drop policy if exists "vf_insert" on public.visitas_familiar;
drop policy if exists "vf_delete" on public.visitas_familiar;

create policy "vf_select" on public.visitas_familiar
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() = 'familiar'
      and residente_id in (select public.my_familiar_residente_ids())
    )
    or (
      (
        public.my_rol() = 'admin_eleam'
        or public.funcionario_can('registrar_visitas')
      )
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
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
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  );

create policy "vf_delete" on public.visitas_familiar
  for delete using (
    public.is_superadmin()
    or profile_id = (select auth.uid())
    or (
      public.my_rol() = 'admin_eleam'
      and residente_id in (select id from public.residentes where eleam_id = public.my_eleam_id())
    )
  );

-- Pagos / Webhooks
drop policy if exists "superadmin_all_pagos" on public.pagos;
drop policy if exists "eleam_select_pagos" on public.pagos;

create policy "superadmin_all_pagos" on public.pagos
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "eleam_select_pagos" on public.pagos
  for select using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "mp_events_superadmin_select" on public.mp_webhook_events;
create policy "mp_events_superadmin_select" on public.mp_webhook_events
  for select using (public.is_superadmin());

-- Acreditacion
drop policy if exists "acred_ambitos_select" on public.acred_ambitos;
drop policy if exists "acred_requisitos_select" on public.acred_requisitos;

create policy "acred_ambitos_select" on public.acred_ambitos
  for select using ((select auth.uid()) is not null);

create policy "acred_requisitos_select" on public.acred_requisitos
  for select using ((select auth.uid()) is not null);

drop policy if exists "acred_re_select" on public.acred_requisitos_eleam;
drop policy if exists "acred_re_insert" on public.acred_requisitos_eleam;
drop policy if exists "acred_re_update" on public.acred_requisitos_eleam;

create policy "acred_re_select" on public.acred_requisitos_eleam
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "acred_re_insert" on public.acred_requisitos_eleam
  for insert with check (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "acred_re_update" on public.acred_requisitos_eleam
  for update using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "acred_docs_select" on public.acred_documentos;
drop policy if exists "acred_docs_insert" on public.acred_documentos;
drop policy if exists "acred_docs_update" on public.acred_documentos;
drop policy if exists "acred_docs_delete" on public.acred_documentos;

create policy "acred_docs_select" on public.acred_documentos
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "acred_docs_insert" on public.acred_documentos
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('subir_acreditacion')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "acred_docs_update" on public.acred_documentos
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_acreditacion')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_acreditacion')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "acred_docs_delete" on public.acred_documentos
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('archivar_acreditacion')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "acred_obs_select" on public.acred_observaciones;
drop policy if exists "acred_obs_insert_admin" on public.acred_observaciones;
drop policy if exists "acred_obs_insert_func_interna" on public.acred_observaciones;
drop policy if exists "acred_obs_update_admin" on public.acred_observaciones;
drop policy if exists "acred_obs_update_func" on public.acred_observaciones;
drop policy if exists "acred_obs_delete" on public.acred_observaciones;

create policy "acred_obs_select" on public.acred_observaciones
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "acred_obs_insert_admin" on public.acred_observaciones
  for insert with check (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "acred_obs_insert_func_interna" on public.acred_observaciones
  for insert with check (
    public.my_rol() = 'funcionario'
    and eleam_id = public.my_eleam_id()
    and public.eleam_has_access(eleam_id)
    and origen = 'interna'
  );

create policy "acred_obs_update_admin" on public.acred_observaciones
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
    )
  );

create policy "acred_obs_update_func" on public.acred_observaciones
  for update using (
    public.my_rol() = 'funcionario'
    and eleam_id = public.my_eleam_id()
    and public.eleam_has_access(eleam_id)
    and origen = 'interna'
    and creado_por = (select auth.uid())
  )
  with check (
    public.my_rol() = 'funcionario'
    and eleam_id = public.my_eleam_id()
    and public.eleam_has_access(eleam_id)
    and origen = 'interna'
    and creado_por = (select auth.uid())
  );

create policy "acred_obs_delete" on public.acred_observaciones
  for delete using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "acred_audit_select" on public.acred_audit;
drop policy if exists "acred_audit_insert" on public.acred_audit;

create policy "acred_audit_select" on public.acred_audit
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "acred_audit_insert" on public.acred_audit
  for insert with check (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

-- CRM y blog
drop policy if exists "crm_tasks_superadmin_all" on public.crm_tasks;
create policy "crm_tasks_superadmin_all" on public.crm_tasks
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "crm_interactions_superadmin_all" on public.crm_interactions;
create policy "crm_interactions_superadmin_all" on public.crm_interactions
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "blog_select_public" on public.blog_posts;
drop policy if exists "blog_superadmin_all" on public.blog_posts;

create policy "blog_select_public" on public.blog_posts
  for select using (estado = 'publicado' or public.is_superadmin());

create policy "blog_superadmin_all" on public.blog_posts
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

-- ============================================================
-- 9. Storage
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-acreditacion',
  'documentos-acreditacion',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_acreditacion_select" on storage.objects;
drop policy if exists "storage_acreditacion_insert" on storage.objects;
drop policy if exists "storage_acreditacion_delete" on storage.objects;

create policy "storage_acreditacion_select" on storage.objects
  for select using (
    bucket_id = 'documentos-acreditacion'
    and (
      public.is_superadmin()
      or (
        public.my_rol() in ('admin_eleam','funcionario')
        and public.eleam_has_access(public.my_eleam_id())
        and split_part(name, '/', 2) = public.my_eleam_id()::text
      )
    )
  );

create policy "storage_acreditacion_insert" on storage.objects
  for insert with check (
    bucket_id = 'documentos-acreditacion'
    and (
      public.is_superadmin()
      or (
        public.my_rol() in ('admin_eleam','funcionario')
        and public.eleam_has_access(public.my_eleam_id())
        and split_part(name, '/', 2) = public.my_eleam_id()::text
      )
    )
  );

create policy "storage_acreditacion_delete" on storage.objects
  for delete using (
    bucket_id = 'documentos-acreditacion'
    and (
      public.is_superadmin()
      or (
        public.my_rol() = 'admin_eleam'
        and public.eleam_has_access(public.my_eleam_id())
        and split_part(name, '/', 2) = public.my_eleam_id()::text
      )
    )
  );

-- ============================================================
-- 10. Seeds
-- ============================================================

insert into public.planes
  (codigo, nombre, descripcion, precio_clp, max_residentes, max_funcionarios, orden, destacado)
values
  ('plan-14', 'Hasta 14 residentes', 'Ideal para residencias pequeñas', 50000, 14, 10, 1, false),
  ('plan-24', 'Hasta 24 residentes', 'El plan mas elegido', 80000, 24, 20, 2, true),
  ('plan-34', 'Hasta 34 residentes', 'Para residencias grandes', 120000, 34, 30, 3, false)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  precio_clp = excluded.precio_clp,
  max_residentes = excluded.max_residentes,
  max_funcionarios = excluded.max_funcionarios,
  orden = excluded.orden,
  destacado = excluded.destacado,
  activo = true;

insert into public.eleams (
  id, nombre, email_admin, pago_activo, plan, subscription_status, crm_estado
)
values (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'ELEAM Demo - FichaEleam',
  'demo@fichaeleam.cl',
  true,
  'demo',
  'activo',
  'cliente_activo'
)
on conflict (id) do update set
  nombre = excluded.nombre,
  email_admin = excluded.email_admin,
  pago_activo = true,
  plan = 'demo',
  subscription_status = 'activo',
  crm_estado = 'cliente_activo';

-- Superadmin real: funciona tanto para usuarios nuevos (trigger) como
-- para una cuenta ya creada con Google antes de ejecutar este schema.
insert into public.profiles (id, nombre, email, rol, eleam_id)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'nombre',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  u.email,
  'superadmin',
  null
from auth.users u
where lower(u.email) = 'gabrielgarrido89@gmail.com'
on conflict (id) do update set
  nombre = excluded.nombre,
  email = excluded.email,
  rol = 'superadmin',
  eleam_id = null;

insert into public.acred_ambitos (codigo, nombre, descripcion, icono, orden) values
  ('A01','Antecedentes legales del ELEAM','Documentos que acreditan la existencia legal y vigencia de la entidad sostenedora.','📄',1),
  ('A02','Autorizacion sanitaria','Resolucion sanitaria, autorizacion de funcionamiento y permisos municipales.','✅',2),
  ('A03','Infraestructura y condiciones sanitarias','Estado del inmueble, instalaciones electricas, gas, agua, ascensores, calderas.','🏗️',3),
  ('A04','Seguridad, incendios y evacuacion','Plan de emergencia, extintores, simulacros, señaletica y luces de emergencia.','🚨',4),
  ('A05','Direccion tecnica','Profesional responsable, contrato y carta de aceptacion SEREMI.','👨‍⚕️',5),
  ('A06','Personal, dotacion y turnos','Nomina, contratos, titulos, salud y capacitaciones del personal.','👥',6),
  ('A07','Protocolos obligatorios','Protocolos clinicos y operativos (PCI, lavado de manos, medicamentos, etc.).','📋',7),
  ('A08','Residentes y carpetas personales','Fichas clinicas, evaluaciones funcionales y planes de cuidado individual.','📁',8),
  ('A09','Contratos, consentimientos y derechos','Contrato de residencia, consentimientos y carta de derechos de los residentes.','✍️',9),
  ('A10','Medicamentos y registros','Botiquin, kardex, prescripciones, control de psicotropicos y QF asesor.','💊',10),
  ('A11','Alimentacion y manipulacion','Minutas, manipuladores, control HACCP y dietas especiales.','🍽️',11),
  ('A12','Aseo, lavanderia, residuos y plagas','Programas y registros de aseo, lavanderia, residuos y control de plagas.','🧼',12),
  ('A13','Reclamos, sugerencias y comunicacion','Libro de reclamos, sugerencias y comunicacion con familias.','📣',13),
  ('A14','Fiscalizaciones y subsanaciones','Actas, observaciones de fiscalizacion y planes de subsanacion.','🔍',14)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  icono = excluded.icono,
  orden = excluded.orden;

with vals(codigo, nombre, descripcion, medio_verificador, req_venc, vigencia, orden) as (values
  ('A01-R01','Escritura de constitucion de la sociedad/entidad','Documento legal que constituye la persona juridica que opera el ELEAM.','Copia escritura inscrita en el Registro de Comercio',false,null,1),
  ('A01-R02','Certificado de vigencia de la persona juridica','Acredita que la sociedad sigue vigente.','Certificado emitido por el Registro de Comercio',true,180,2),
  ('A01-R03','RUT y rol unico tributario de la entidad','Identificacion tributaria de la entidad sostenedora.','Cedula RUT o e-RUT del SII',false,null,3),
  ('A01-R04','Iniciacion de actividades en el SII','Declaracion de inicio de actividades ante el SII.','Formulario 4415 o e-RUT con giro',false,null,4),
  ('A01-R05','Identificacion del representante legal','Documento que acredita quien representa legalmente al ELEAM.','Cedula identidad y poder vigente',false,null,5),
  ('A02-R01','Resolucion sanitaria de funcionamiento vigente','Resolucion de la SEREMI que autoriza operar como ELEAM.','Resolucion firmada por SEREMI',true,365,1),
  ('A02-R02','Solicitud y antecedentes de autorizacion','Carpeta presentada a SEREMI con planos, dotacion y documentos.','Copia del expediente presentado',false,null,2),
  ('A02-R03','Certificado de Informaciones Previas municipal','Certificado municipal que confirma uso de suelo permitido.','CIP emitido por la Direccion de Obras',true,365,3),
  ('A02-R04','Permiso de edificacion municipal','Permiso que acredita construccion autorizada.','Permiso DOM',false,null,4),
  ('A02-R05','Recepcion final de obra municipal','Acredita que la obra fue recibida conforme.','Certificado DOM',false,null,5),
  ('A03-R01','Planos del establecimiento actualizados','Planos arquitectonicos vigentes con la distribucion actual.','Planos firmados por arquitecto/a',false,null,1),
  ('A03-R02','Certificado de instalacion electrica (SEC)','Documento TE-1 emitido por instalador autorizado.','Formulario TE-1 SEC vigente',true,1095,2),
  ('A03-R03','Certificado de instalacion de gas (SEC)','Documento TC-6/TC-7 si el establecimiento usa gas.','Certificado SEC vigente',true,730,3),
  ('A03-R04','Informe de potabilidad del agua','Analisis fisico-quimico del agua de consumo.','Informe laboratorio acreditado',true,365,4),
  ('A03-R05','Certificado de fumigacion y desratizacion','Tratamiento de control de plagas vigente.','Certificado de empresa autorizada',true,180,5),
  ('A03-R06','Certificado de ascensor (si aplica)','Mantencion y certificacion periodica del ascensor.','Certificado empresa de mantencion',true,365,6),
  ('A03-R07','Certificado de calderas (si aplica)','Documento de mantencion de calderas/calefones.','Certificado SEC vigente',true,365,7),
  ('A04-R01','Plan de emergencia y evacuacion aprobado','Documento que define como evacuar ante un siniestro.','Plan firmado por responsable',false,null,1),
  ('A04-R02','Certificado de extintores vigente','Mantencion y recarga anual de extintores.','Certificado empresa autorizada',true,365,2),
  ('A04-R03','Señaletica de emergencia instalada','Vias de evacuacion, salidas y zonas seguras señalizadas.','Foto inventario y check de inspeccion',false,null,3),
  ('A04-R04','Registro de simulacros (minimo 2/año)','Bitacora de simulacros de evacuacion realizados.','Acta de simulacro firmada',true,180,4),
  ('A04-R05','Luces de emergencia operativas','Luces que funcionan ante corte electrico.','Bitacora de inspeccion mensual',true,90,5),
  ('A04-R06','Protocolo de busqueda y rescate','Procedimiento para ubicar residentes en emergencia.','Protocolo escrito',false,null,6),
  ('A05-R01','Credencial vigente del director tecnico','Identifica al profesional responsable del ELEAM.','Credencial emitida por SEREMI',true,365,1),
  ('A05-R02','Titulo profesional del director tecnico','Acredita su formacion profesional.','Copia legalizada del titulo',false,null,2),
  ('A05-R03','Contrato de prestacion del director tecnico','Contrato laboral o de servicios.','Contrato firmado',false,null,3),
  ('A05-R04','Carta de aceptacion SEREMI','SEREMI acepta a la direccion tecnica del ELEAM.','Resolucion o aceptacion SEREMI',false,null,4),
  ('A06-R01','Nomina actualizada del personal','Listado del personal vigente con cargos y horarios.','Excel/PDF con nomina vigente',true,180,1),
  ('A06-R02','Contratos de trabajo del personal','Contratos firmados de cada trabajador.','Copias de contratos',false,null,2),
  ('A06-R03','Titulos y certificados profesionales','Acredita formacion de TENS, enfermeras, medicos, etc.','Copias de titulos por funcionario',false,null,3),
  ('A06-R04','Certificados de salud del personal','Aptitud medica para trabajar con adultos mayores.','Certificado de salud vigente',true,365,4),
  ('A06-R05','Registro de capacitaciones del personal','Bitacora con cursos y capacitaciones realizadas.','Bitacora y certificados',false,null,5),
  ('A06-R06','Convenios con prestadores de salud','Acuerdos con clinicas, ambulancias o servicios externos.','Convenios firmados vigentes',false,null,6),
  ('A06-R07','Protocolo de turnos y guardia nocturna','Define dotacion minima por turno y guardia nocturna.','Protocolo escrito',false,null,7),
  ('A07-R01','Programa PCI','Documento maestro de prevencion y control de infecciones.','Programa PCI escrito',false,null,1),
  ('A07-R02','Protocolo de lavado de manos','Procedimiento estandarizado de higiene de manos.','Protocolo escrito y difusion',false,null,2),
  ('A07-R03','Protocolo de aislamiento de contacto y gotitas','Acciones ante residente con sospecha infecciosa.','Protocolo escrito',false,null,3),
  ('A07-R04','Protocolo de manejo de residuos hospitalarios','Manejo seguro de residuos generados (REAS).','Protocolo y bitacora retiro',false,null,4),
  ('A07-R05','Protocolo de manejo de medicamentos','Almacenamiento, administracion y registro de medicamentos.','Protocolo escrito',false,null,5),
  ('A07-R06','Protocolo de alimentacion y deglucion','Manejo de pacientes con disfagia y dietas especiales.','Protocolo escrito',false,null,6),
  ('A07-R07','Protocolo de emergencias clinicas','Accion ante caida, paro, ahogo, hipoglicemia, etc.','Protocolo escrito',false,null,7),
  ('A08-R01','Ficha clinica completa por residente','Informacion personal, clinica, social y de contacto al dia.','Sistema FichaEleam',false,null,1),
  ('A08-R02','Evaluacion funcional (Indice de Barthel)','Evaluacion periodica de independencia para AVD.','Registro en ficha del residente',true,180,2),
  ('A08-R03','Evaluacion cognitiva (MMSE / Test del reloj)','Estado cognitivo registrado periodicamente.','Registro en ficha del residente',true,180,3),
  ('A08-R04','Evaluacion nutricional individual','Evaluacion inicial y seguimiento por nutricionista.','Registro firmado por nutricionista',true,180,4),
  ('A08-R05','Plan de cuidados individualizado (PAI)','Plan con objetivos, intervenciones y responsable.','PAI firmado',true,180,5),
  ('A08-R06','Consentimiento informado firmado','Autorizacion del residente o representante para cuidados.','Consentimiento escrito',false,null,6),
  ('A08-R07','Evaluacion de riesgo de caidas (Morse)','Identifica residentes con alto riesgo de caer.','Registro en ficha',true,180,7),
  ('A09-R01','Contrato de residencia firmado','Acuerdo formal entre residente/familia y ELEAM.','Contrato firmado por las partes',false,null,1),
  ('A09-R02','Carta de derechos del residente entregada','Documento entregado al ingreso con derechos del residente.','Acta de entrega firmada',false,null,2),
  ('A09-R03','Reglamento interno del ELEAM','Reglas de convivencia y operacion del establecimiento.','Reglamento publicado',false,null,3),
  ('A09-R04','Carta de tarifas vigente','Tarifa actual de cuidados y servicios adicionales.','Carta firmada',true,365,4),
  ('A10-R01','Inventario de botiquin','Listado actualizado de medicamentos disponibles.','Inventario escrito y ubicacion',true,90,1),
  ('A10-R02','Kardex de administracion por residente','Registro de cada administracion de medicamento.','Sistema FichaEleam',false,null,2),
  ('A10-R03','Prescripciones medicas vigentes','Indicaciones medicas firmadas por residente.','Receta medica vigente',true,180,3),
  ('A10-R04','Control de psicotropicos y estupefacientes','Libro foliado con ingreso, salida y stock.','Libro foliado SEREMI',false,null,4),
  ('A10-R05','Convenio con quimico farmaceutico asesor','Profesional asesor para manejo de medicamentos.','Convenio firmado',false,null,5),
  ('A11-R01','Minuta alimentaria mensual','Plan de alimentacion visado por nutricionista.','Minuta firmada',true,30,1),
  ('A11-R02','Certificados de manipulacion de alimentos','Formacion del personal de cocina.','Certificados vigentes',true,1095,2),
  ('A11-R03','Control de temperaturas (HACCP)','Bitacora diaria de temperaturas.','Bitacora HACCP',true,30,3),
  ('A11-R04','Protocolo de dietas especiales y deglucion','Procedimiento para disfagia, diabetes u otras dietas.','Protocolo escrito',false,null,4),
  ('A11-R05','Encuesta de satisfaccion alimentaria','Opinion de residentes sobre alimentacion.','Encuesta aplicada',true,180,5),
  ('A12-R01','Programa de aseo y desinfeccion','Cronograma y procedimientos de aseo por area.','Programa escrito',false,null,1),
  ('A12-R02','Bitacora de aseo','Registro diario de aseo realizado.','Bitacora firmada',true,30,2),
  ('A12-R03','Manejo de lavanderia y ropa de cama','Procedimiento para evitar contaminacion cruzada.','Protocolo escrito',false,null,3),
  ('A12-R04','Manejo de residuos peligrosos (REAS)','Convenio con empresa autorizada de retiro.','Convenio y bitacora de retiros',true,365,4),
  ('A12-R05','Certificado de control de plagas','Control periodico de plagas.','Certificado vigente',true,180,5),
  ('A13-R01','Libro de reclamos disponible','Libro fisico foliado o sistema digital equivalente.','Libro foliado',false,null,1),
  ('A13-R02','Procedimiento de respuesta a reclamos','Define plazos y responsables para responder.','Procedimiento escrito',false,null,2),
  ('A13-R03','Buzon de sugerencias','Mecanismo de retroalimentacion para residentes y familias.','Foto y bitacora de revision',false,null,3),
  ('A13-R04','Registro de comunicaciones con familias','Avisos enviados y recibidos.','Bitacora de comunicaciones',false,null,4),
  ('A13-R05','Reuniones periodicas con familias','Actas de reuniones con familias.','Actas firmadas',true,180,5),
  ('A14-R01','Acta de la ultima fiscalizacion','Documento entregado por SEREMI/Municipalidad.','Acta firmada',false,null,1),
  ('A14-R02','Plan de subsanacion de observaciones','Compromisos de mejora con plazo y responsable.','Plan escrito',false,null,2),
  ('A14-R03','Bitacora de seguimiento de subsanaciones','Avance en compromisos adquiridos.','Bitacora interna',true,90,3),
  ('A14-R04','Comunicaciones con SEREMI','Cartas, oficios e informes enviados a autoridad.','Archivo de oficios',false,null,4)
)
insert into public.acred_requisitos (
  ambito_id, codigo, nombre, descripcion, medio_verificador,
  obligatorio, permite_no_aplica, requiere_vencimiento, vigencia_dias_sugerida, orden
)
select a.id, v.codigo, v.nombre, v.descripcion, v.medio_verificador,
       true, true, v.req_venc, v.vigencia, v.orden
from vals v
join public.acred_ambitos a on a.codigo = split_part(v.codigo, '-', 1)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  medio_verificador = excluded.medio_verificador,
  requiere_vencimiento = excluded.requiere_vencimiento,
  vigencia_dias_sugerida = excluded.vigencia_dias_sugerida,
  orden = excluded.orden;

do $$
declare
  e record;
begin
  for e in select id from public.eleams loop
    perform public.acred_provision_requisitos(e.id);
  end loop;
end $$;

update public.eleams
set crm_estado = 'cliente_activo'
where crm_estado = 'lead'
  and (pago_activo = true or subscription_status in ('activo','en_gracia'));

-- El seed del blog publico vive en supabase_blog_seed.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- Leads de landing page y acceso al demo guiado
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.demo_leads (
  id                        uuid default gen_random_uuid() primary key,
  nombre                    text not null,
  cargo                     text not null,
  eleam_nombre              text not null,
  email                     text not null,
  telefono                  text not null,
  num_residentes            text,
  utm_source                text,
  utm_medium                text,
  utm_campaign              text,
  pagina_origen             text,
  referrer                  text,
  estado                    text not null default 'nuevo'
    check (estado in ('nuevo','contactado','demo_activo','demo_completado','descartado','convertido')),
  notas_admin               text,
  demo_token                uuid unique,
  demo_access_granted_at    timestamptz,
  demo_expires_at           timestamptz,
  demo_ultimo_ping          timestamptz,
  demo_progreso             jsonb default '{}'::jsonb,
  solicita_contacto         boolean default false,
  solicita_contacto_en      timestamptz,
  solicita_contacto_mensaje text,
  demo_user_id              uuid references auth.users(id) on delete set null,
  creado_en                 timestamptz default now() not null
);

-- Añadir columnas si la tabla ya existía antes de esta versión del schema.
alter table public.demo_leads
  add column if not exists cargo text,
  add column if not exists eleam_nombre text,
  add column if not exists telefono text,
  add column if not exists num_residentes text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists pagina_origen text,
  add column if not exists referrer text,
  add column if not exists estado text not null default 'nuevo',
  add column if not exists notas_admin text,
  add column if not exists demo_token uuid,
  add column if not exists demo_access_granted_at timestamptz,
  add column if not exists demo_expires_at timestamptz,
  add column if not exists demo_ultimo_ping timestamptz,
  add column if not exists demo_progreso jsonb default '{}'::jsonb,
  add column if not exists solicita_contacto boolean default false,
  add column if not exists solicita_contacto_en timestamptz,
  add column if not exists solicita_contacto_mensaje text,
  add column if not exists demo_user_id uuid references auth.users(id) on delete set null;

alter table public.demo_leads enable row level security;

drop policy if exists "anon_insert_leads" on public.demo_leads;
drop policy if exists "superadmin_manage_leads" on public.demo_leads;
drop policy if exists "token_read_demo" on public.demo_leads;
drop policy if exists "token_update_demo" on public.demo_leads;

create policy "anon_insert_leads" on public.demo_leads
  for insert to anon, authenticated with check (true);

create policy "superadmin_manage_leads" on public.demo_leads
  for all to authenticated using (public.is_superadmin());

create policy "token_read_demo" on public.demo_leads
  for select to anon
  using (demo_token is not null and demo_expires_at > now());

create policy "token_update_demo" on public.demo_leads
  for update to anon
  using (demo_token is not null and demo_expires_at > now())
  with check (true);

create index if not exists idx_demo_leads_token  on public.demo_leads(demo_token) where demo_token is not null;
create index if not exists idx_demo_leads_estado on public.demo_leads(estado);
create index if not exists idx_demo_leads_ping   on public.demo_leads(demo_ultimo_ping) where estado = 'demo_activo';

-- ─────────────────────────────────────────────────────────────────────────────
-- Eventos de analytics de landing (anónimos)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.landing_events (
  id          uuid default gen_random_uuid() primary key,
  tipo        text not null,
  pagina      text,
  elemento    text,
  valor       text,
  session_id  text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  referrer    text,
  creado_en   timestamptz default now() not null
);

alter table public.landing_events enable row level security;

drop policy if exists "anon_insert_events" on public.landing_events;
drop policy if exists "superadmin_read_events" on public.landing_events;

create policy "anon_insert_events" on public.landing_events
  for insert to anon, authenticated with check (true);

create policy "superadmin_read_events" on public.landing_events
  for select to authenticated using (public.is_superadmin());

create index if not exists idx_landing_events_tipo    on public.landing_events(tipo, creado_en desc);
create index if not exists idx_landing_events_session on public.landing_events(session_id);
