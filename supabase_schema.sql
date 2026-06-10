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
  telefono   text,
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

-- Ensure frequency columns exist (safe to run if already present).
alter table public.planes add column if not exists frequency      integer not null default 1 check (frequency > 0);
alter table public.planes add column if not exists frequency_type text    not null default 'months' check (frequency_type in ('days','months'));

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

alter table public.profiles
  add column if not exists telefono text;

create index if not exists idx_profiles_eleam_id on public.profiles(eleam_id);
create index if not exists idx_profiles_eleam_rol on public.profiles(eleam_id, rol);
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
  prevision                text,
  diagnostico_principal    text,
  diagnosticos_secundarios text[],
  alergias                 text[],
  grupo_sanguineo          text,
  fecha_ingreso            date not null default current_date,
  fecha_egreso             date,
  motivo_egreso            text,
  estado                   text not null default 'activo'
                           check (estado in ('activo','hospitalizado','egresado','fallecido')),
  indice_barthel           integer check (indice_barthel between 0 and 100),
  escala_katz              text,
  nivel_dependencia        text check (nivel_dependencia in ('leve','moderado','severo','total')),
  creado_por               uuid references auth.users(id) on delete set null,
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now()
);

alter table public.residentes
  drop column if exists nombre_contacto,
  drop column if exists telefono_contacto,
  drop column if exists parentesco_contacto;

create unique index if not exists residentes_rut_eleam_unique
  on public.residentes(rut, eleam_id)
  where rut is not null;
create index if not exists idx_residentes_eleam_estado on public.residentes(eleam_id, estado);
create index if not exists idx_residentes_nombre on public.residentes(apellido, nombre);

create table if not exists public.habitaciones (
  id              uuid primary key default gen_random_uuid(),
  eleam_id        uuid not null references public.eleams(id) on delete cascade,
  codigo          text not null,
  nombre          text,
  piso            text,
  sector          text,
  estado          text not null default 'operativa'
                  check (estado in ('operativa','mantenimiento','inactiva')),
  notas           text,
  orden           integer not null default 0,
  creado_por      uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  unique (eleam_id, codigo)
);

create index if not exists idx_habitaciones_eleam_estado
  on public.habitaciones(eleam_id, estado);
create index if not exists idx_habitaciones_eleam_orden
  on public.habitaciones(eleam_id, orden, codigo);

create table if not exists public.camas (
  id              uuid primary key default gen_random_uuid(),
  eleam_id        uuid not null references public.eleams(id) on delete cascade,
  habitacion_id   uuid not null references public.habitaciones(id) on delete restrict,
  codigo          text not null,
  nombre          text,
  tipo            text not null default 'estandar'
                  check (tipo in ('estandar','clinica','bariatrica','otra')),
  estado          text not null default 'operativa'
                  check (estado in ('operativa','mantenimiento','inactiva')),
  notas           text,
  orden           integer not null default 0,
  creado_por      uuid references auth.users(id) on delete set null,
  actualizado_por uuid references auth.users(id) on delete set null,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  unique (habitacion_id, codigo)
);

create index if not exists idx_camas_eleam_estado
  on public.camas(eleam_id, estado);
create index if not exists idx_camas_habitacion_orden
  on public.camas(habitacion_id, orden, codigo);

create table if not exists public.cama_asignaciones (
  id             uuid primary key default gen_random_uuid(),
  eleam_id       uuid not null references public.eleams(id) on delete cascade,
  cama_id        uuid not null references public.camas(id) on delete restrict,
  residente_id   uuid not null references public.residentes(id) on delete cascade,
  estado         text not null default 'ocupada'
                 check (estado in ('ocupada','reservada_hospitalizacion')),
  fecha_inicio   timestamptz not null default now(),
  fecha_fin      timestamptz,
  motivo_fin     text,
  notas          text,
  creado_por     uuid references auth.users(id) on delete set null,
  cerrado_por    uuid references auth.users(id) on delete set null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create unique index if not exists cama_asignaciones_cama_activa_unique
  on public.cama_asignaciones(cama_id)
  where fecha_fin is null;
create unique index if not exists cama_asignaciones_residente_activa_unique
  on public.cama_asignaciones(residente_id)
  where fecha_fin is null;
create index if not exists idx_cama_asignaciones_eleam_estado
  on public.cama_asignaciones(eleam_id, estado, fecha_inicio desc);
create index if not exists idx_cama_asignaciones_residente_hist
  on public.cama_asignaciones(residente_id, fecha_inicio desc);

create table if not exists public.camas_audit (
  id             uuid primary key default gen_random_uuid(),
  eleam_id       uuid references public.eleams(id) on delete cascade,
  cama_id        uuid references public.camas(id) on delete set null,
  residente_id   uuid references public.residentes(id) on delete set null,
  accion         text not null,
  detalle        jsonb,
  realizado_por  uuid references public.profiles(id) on delete set null,
  realizado_en   timestamptz not null default now()
);

create index if not exists idx_camas_audit_eleam
  on public.camas_audit(eleam_id, realizado_en desc);
create index if not exists idx_camas_audit_residente_fecha
  on public.camas_audit(residente_id, realizado_en desc)
  where residente_id is not null;

alter table public.residentes
  add column if not exists cama_actual_id uuid references public.camas(id) on delete set null;

create unique index if not exists residentes_cama_actual_unique
  on public.residentes(cama_actual_id)
  where cama_actual_id is not null and estado in ('activo','hospitalizado');
create index if not exists idx_residentes_cama_actual_id
  on public.residentes(cama_actual_id);

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
  seguimiento_fecha     date,
  seguimiento_turno     text check (seguimiento_turno in ('mañana','tarde','noche') or seguimiento_turno is null),
  seguimiento_estado    text not null default 'pendiente'
                         check (seguimiento_estado in ('pendiente','resuelto','cancelado')),
  visible_familiar      boolean not null default false,
  resumen_familiar      text,
  registrado_por        uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  check (visible_familiar = false or nullif(trim(coalesce(resumen_familiar, '')), '') is not null),
  check (requiere_seguimiento = false or (seguimiento_fecha is not null and seguimiento_turno is not null))
);

create index if not exists idx_observaciones_residente_fecha on public.observaciones_diarias(residente_id, fecha_hora desc);
create index if not exists idx_observaciones_tipo on public.observaciones_diarias(tipo);
create index if not exists idx_observaciones_seguimiento
  on public.observaciones_diarias(residente_id, fecha_hora desc)
  where requiere_seguimiento = true;
create index if not exists idx_observaciones_seguimiento_turno
  on public.observaciones_diarias(seguimiento_fecha, seguimiento_turno, seguimiento_estado)
  where requiere_seguimiento = true;
create index if not exists idx_observaciones_residente_seguimiento_turno
  on public.observaciones_diarias(residente_id, seguimiento_estado, seguimiento_fecha, seguimiento_turno)
  where requiere_seguimiento = true;
create index if not exists idx_observaciones_familiar
  on public.observaciones_diarias(residente_id, fecha_hora desc)
  where visible_familiar = true;

-- Escalas funcionales clínicas (Barthel, Katz) con reevaluación MINSAL.
-- residentes.indice_barthel / residentes.escala_katz quedan como cache rápido
-- del último puntaje y se sincronizan vía trigger después de cada INSERT.
create table if not exists public.evaluaciones_clinicas (
  id                  uuid primary key default gen_random_uuid(),
  eleam_id            uuid not null references public.eleams(id) on delete cascade,
  residente_id        uuid not null references public.residentes(id) on delete cascade,
  tipo                text not null check (tipo in ('barthel','katz')),
  fecha_evaluacion    date not null default current_date,
  motivo              text not null default 'rutina'
                       check (motivo in ('ingreso','rutina','post_hospitalizacion','caida','cambio_clinico','solicitud_medica')),
  puntaje             integer not null,
  resultado           text not null,
  detalle             jsonb not null,
  observaciones       text,
  proxima_evaluacion  date not null,
  evaluado_por        uuid references public.profiles(id) on delete set null,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now()
);

create index if not exists idx_eval_residente_tipo_fecha
  on public.evaluaciones_clinicas(residente_id, tipo, fecha_evaluacion desc);
create index if not exists idx_eval_eleam_proxima
  on public.evaluaciones_clinicas(eleam_id, proxima_evaluacion);
create index if not exists idx_eval_residente_proxima
  on public.evaluaciones_clinicas(residente_id, proxima_evaluacion);

create table if not exists public.turno_entregas (
  id              uuid primary key default gen_random_uuid(),
  eleam_id        uuid not null references public.eleams(id) on delete cascade,
  turno           text not null check (turno in ('mañana','tarde','noche')),
  fecha           date not null default current_date,
  resumen_json    jsonb not null default '{}'::jsonb,
  notas           text,
  pendientes      text,
  creado_por      uuid references auth.users(id) on delete set null,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  unique (eleam_id, fecha, turno)
);

create index if not exists idx_turno_entregas_eleam_fecha
  on public.turno_entregas(eleam_id, fecha desc, turno);
create index if not exists idx_turno_entregas_creado_por
  on public.turno_entregas(creado_por);

create table if not exists public.eventos_adversos (
  id                            uuid primary key default gen_random_uuid(),
  eleam_id                      uuid not null references public.eleams(id) on delete cascade,
  residente_id                  uuid references public.residentes(id) on delete set null,
  observacion_id                uuid references public.observaciones_diarias(id) on delete set null,
  fecha_evento                  date not null default current_date,
  hora_evento                   time,
  turno                         text check (turno in ('mañana','tarde','noche') or turno is null),
  lugar                         text check (lugar is null or char_length(lugar) <= 200),
  categoria                     text not null
                                check (categoria in (
                                  'caida_con_lesion','caida_sin_lesion','error_medicacion',
                                  'broncoaspiracion','lesion_por_presion','fuga','agresion',
                                  'agitacion_severa','infeccion','accidente_via_publica',
                                  'reaccion_alergica','autolesion','otro'
                                )),
  severidad                     text not null default 'leve'
                                check (severidad in ('leve','moderado','grave','critico')),
  descripcion                   text not null check (char_length(trim(descripcion)) between 10 and 4000),
  causas_probables              text check (causas_probables is null or char_length(causas_probables) <= 2000),
  acciones_inmediatas           text check (acciones_inmediatas is null or char_length(acciones_inmediatas) <= 2000),
  testigos                      text check (testigos is null or char_length(testigos) <= 500),
  estado                        text not null default 'registrado'
                                check (estado in ('registrado','en_revision','en_seguimiento','cerrado','cancelado')),
  requiere_seguimiento          boolean not null default true,
  fecha_compromiso_cierre       date,
  notificado_familia            boolean not null default false,
  fecha_notificacion_familia    timestamptz,
  notificado_por                uuid references public.profiles(id) on delete set null,
  medio_notificacion_familia    text check (
                                  medio_notificacion_familia is null
                                  or medio_notificacion_familia in ('presencial','telefono','whatsapp','email','otro')
                                ),
  visible_familiar              boolean not null default false,
  resumen_familiar              text check (resumen_familiar is null or char_length(resumen_familiar) <= 500),
  registrado_por                uuid references public.profiles(id) on delete set null,
  cerrado_por                   uuid references public.profiles(id) on delete set null,
  fecha_cierre                  timestamptz,
  conclusiones                  text check (conclusiones is null or char_length(conclusiones) <= 2000),
  creado_en                     timestamptz not null default now(),
  actualizado_en                timestamptz not null default now(),
  constraint eventos_adversos_familiar_visible_check
    check (visible_familiar = false or nullif(trim(coalesce(resumen_familiar, '')), '') is not null),
  constraint eventos_adversos_notificacion_check
    check (notificado_familia = false or medio_notificacion_familia is not null),
  constraint eventos_adversos_cierre_check
    check (
      (estado <> 'cerrado' and fecha_cierre is null)
      or (estado = 'cerrado' and fecha_cierre is not null)
    )
);

create index if not exists idx_eventos_adv_eleam_estado
  on public.eventos_adversos(eleam_id, estado, fecha_evento desc);
create index if not exists idx_eventos_adv_residente_fecha
  on public.eventos_adversos(residente_id, fecha_evento desc)
  where residente_id is not null;
create index if not exists idx_eventos_adv_observacion
  on public.eventos_adversos(observacion_id)
  where observacion_id is not null;
create index if not exists idx_eventos_adv_familiar
  on public.eventos_adversos(residente_id, fecha_evento desc)
  where visible_familiar = true;

create table if not exists public.eventos_adversos_acciones (
  id              uuid primary key default gen_random_uuid(),
  evento_id       uuid not null references public.eventos_adversos(id) on delete cascade,
  fecha           date not null default current_date,
  tipo            text not null default 'nota'
                  check (tipo in ('nota','accion','reevaluacion','contacto_familia','contacto_medico','derivacion','cierre','reabertura')),
  descripcion     text not null check (char_length(trim(descripcion)) between 1 and 2000),
  realizado_por   uuid references public.profiles(id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index if not exists idx_eventos_adv_acciones_evento
  on public.eventos_adversos_acciones(evento_id, creado_en desc);

create table if not exists public.eventos_adversos_audit (
  id              uuid primary key default gen_random_uuid(),
  eleam_id        uuid references public.eleams(id) on delete cascade,
  evento_id       uuid references public.eventos_adversos(id) on delete cascade,
  accion          text not null check (char_length(accion) <= 80),
  detalle         jsonb,
  realizado_por   uuid references public.profiles(id) on delete set null,
  realizado_en    timestamptz not null default now()
);

create index if not exists idx_eventos_adv_audit_evento
  on public.eventos_adversos_audit(evento_id, realizado_en desc);
create index if not exists idx_eventos_adv_audit_eleam
  on public.eventos_adversos_audit(eleam_id, realizado_en desc);

-- ============================================================
-- 2.b Plan de cuidado y medicamentos
-- ============================================================

create table if not exists public.planes_cuidado (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  titulo                text not null default 'Plan de cuidado'
                        constraint planes_cuidado_titulo_len check (char_length(trim(titulo)) between 3 and 120),
  objetivos             text constraint planes_cuidado_objetivos_len check (objetivos is null or char_length(objetivos) <= 2000),
  pauta_alimentacion    text constraint planes_cuidado_pauta_alimentacion_len check (pauta_alimentacion is null or char_length(pauta_alimentacion) <= 2000),
  pauta_hidratacion     text constraint planes_cuidado_pauta_hidratacion_len check (pauta_hidratacion is null or char_length(pauta_hidratacion) <= 2000),
  restricciones         text constraint planes_cuidado_restricciones_len check (restricciones is null or char_length(restricciones) <= 2000),
  riesgo_caidas         text constraint planes_cuidado_riesgo_caidas_check check (riesgo_caidas in ('bajo','medio','alto') or riesgo_caidas is null),
  riesgo_up             text constraint planes_cuidado_riesgo_up_check check (riesgo_up in ('bajo','medio','alto') or riesgo_up is null),
  estado                text not null default 'activo'
                        constraint planes_cuidado_estado_check check (estado in ('activo','pausado','cerrado')),
  version               integer not null default 1
                        constraint planes_cuidado_version_positive check (version > 0),
  creado_por            uuid references auth.users(id) on delete set null,
  actualizado_por       uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create unique index if not exists planes_cuidado_residente_activo_unique
  on public.planes_cuidado(residente_id)
  where estado = 'activo';
create index if not exists idx_planes_cuidado_eleam_residente
  on public.planes_cuidado(eleam_id, residente_id, estado);

create table if not exists public.plan_cuidado_actividades (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  plan_id               uuid not null references public.planes_cuidado(id) on delete cascade,
  categoria             text not null constraint plan_cuidado_actividades_categoria_check check (categoria in (
                          'alimentacion','hidratacion','higiene','bano','movilidad',
                          'cambios_posicion','eliminacion','prevencion_caidas',
                          'prevencion_up','actividad','controles','otro'
                        )),
  titulo                text not null constraint plan_cuidado_actividades_titulo_len check (char_length(trim(titulo)) between 3 and 140),
  descripcion           text constraint plan_cuidado_actividades_descripcion_len check (descripcion is null or char_length(descripcion) <= 1000),
  instrucciones         text constraint plan_cuidado_actividades_instrucciones_len check (instrucciones is null or char_length(instrucciones) <= 2000),
  prioridad             text not null default 'media'
                        constraint plan_cuidado_actividades_prioridad_check check (prioridad in ('baja','media','alta','urgente')),
  requiere_observacion  boolean not null default false,
  visible_familiar      boolean not null default false,
  resumen_familiar      text constraint plan_cuidado_actividades_resumen_familiar_len check (resumen_familiar is null or char_length(resumen_familiar) <= 200),
  activo                boolean not null default true,
  creado_por            uuid references auth.users(id) on delete set null,
  actualizado_por       uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  constraint plan_cuidado_actividades_visible_familiar_summary_check
    check (visible_familiar = false or nullif(trim(coalesce(resumen_familiar, '')), '') is not null)
);

create index if not exists idx_plan_actividades_plan
  on public.plan_cuidado_actividades(plan_id, activo);
create index if not exists idx_plan_actividades_eleam_residente
  on public.plan_cuidado_actividades(eleam_id, residente_id, categoria);
create index if not exists idx_plan_actividades_familiar
  on public.plan_cuidado_actividades(residente_id, activo)
  where visible_familiar = true;

create table if not exists public.plan_cuidado_horarios (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  actividad_id          uuid not null references public.plan_cuidado_actividades(id) on delete cascade,
  frecuencia            text not null default 'diaria'
                        constraint plan_cuidado_horarios_frecuencia_check check (frecuencia in ('diaria','semanal','mensual','una_vez')),
  dias_semana           smallint[] constraint plan_cuidado_horarios_dias_semana_check check (
                          dias_semana is null
                          or dias_semana <@ array[1,2,3,4,5,6,7]::smallint[]
                        ),
  dias_mes              smallint[] constraint plan_cuidado_horarios_dias_mes_check check (
                          dias_mes is null
                          or dias_mes <@ array[
                            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
                            17,18,19,20,21,22,23,24,25,26,27,28,29,30,31
                          ]::smallint[]
                        ),
  fecha_unica           date,
  hora                  time not null,
  turno                 text not null constraint plan_cuidado_horarios_turno_check check (turno in ('mañana','tarde','noche')),
  tolerancia_min        integer not null default 60
                        constraint plan_cuidado_horarios_tolerancia_range check (tolerancia_min between 0 and 720),
  activo                boolean not null default true,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  constraint plan_cuidado_horarios_frecuencia_shape_check check (
    (frecuencia = 'diaria' and dias_semana is null and dias_mes is null and fecha_unica is null)
    or (frecuencia = 'semanal' and dias_semana is not null and cardinality(dias_semana) > 0 and dias_mes is null and fecha_unica is null)
    or (frecuencia = 'mensual' and dias_mes is not null and cardinality(dias_mes) > 0 and dias_semana is null and fecha_unica is null)
    or (frecuencia = 'una_vez' and fecha_unica is not null and dias_semana is null and dias_mes is null)
  )
);

create index if not exists idx_plan_horarios_actividad
  on public.plan_cuidado_horarios(actividad_id, activo);
create index if not exists idx_plan_horarios_eleam_turno
  on public.plan_cuidado_horarios(eleam_id, turno, activo);

create table if not exists public.tareas_cuidado (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  plan_id               uuid not null references public.planes_cuidado(id) on delete cascade,
  actividad_id          uuid not null references public.plan_cuidado_actividades(id) on delete cascade,
  horario_id            uuid not null references public.plan_cuidado_horarios(id) on delete cascade,
  fecha                 date not null,
  turno                 text not null constraint tareas_cuidado_turno_check check (turno in ('mañana','tarde','noche')),
  hora                  time not null,
  estado                text not null default 'pendiente'
                        constraint tareas_cuidado_estado_check check (estado in ('pendiente','cumplida','omitida','reprogramada','cancelada')),
  motivo_omision        text constraint tareas_cuidado_motivo_omision_check check (
                          motivo_omision is null
                          or motivo_omision in ('rechazo','no_disponible','contraindicado','residente_ausente','otro')
                        ),
  notas                 text constraint tareas_cuidado_notas_len check (notas is null or char_length(notas) <= 2000),
  requiere_seguimiento  boolean not null default false,
  observacion_id        uuid references public.observaciones_diarias(id) on delete set null,
  fecha_original        date,
  fechas_programadas    date[] not null default '{}'::date[],
  reprogramada_para     timestamptz,
  cumplida_por          uuid references auth.users(id) on delete set null,
  cumplida_en           timestamptz,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  constraint tareas_cuidado_omitida_motivo_check check (estado <> 'omitida' or motivo_omision is not null),
  constraint tareas_cuidado_reprogramada_fecha_check check (estado <> 'reprogramada' or reprogramada_para is not null),
  unique (horario_id, fecha)
);

create index if not exists idx_tareas_cuidado_eleam_fecha_turno
  on public.tareas_cuidado(eleam_id, fecha desc, turno, estado);
create index if not exists idx_tareas_cuidado_residente_fecha
  on public.tareas_cuidado(residente_id, fecha desc, turno);
create index if not exists idx_tareas_cuidado_open
  on public.tareas_cuidado(eleam_id, fecha desc, turno)
  where estado in ('pendiente','reprogramada');
create index if not exists idx_tareas_cuidado_horario_fecha_original
  on public.tareas_cuidado(horario_id, (coalesce(fecha_original, fecha)));
create index if not exists idx_tareas_cuidado_fechas_programadas
  on public.tareas_cuidado using gin(fechas_programadas);

create table if not exists public.plan_cuidado_audit (
  id             uuid primary key default gen_random_uuid(),
  eleam_id       uuid references public.eleams(id) on delete cascade,
  residente_id   uuid references public.residentes(id) on delete cascade,
  entidad        text not null,
  entidad_id     uuid,
  accion         text not null,
  detalle        jsonb,
  realizado_por  uuid references public.profiles(id) on delete set null,
  realizado_en   timestamptz not null default now()
);

create index if not exists idx_plan_cuidado_audit_eleam
  on public.plan_cuidado_audit(eleam_id, realizado_en desc);
create index if not exists idx_plan_cuidado_audit_residente_fecha
  on public.plan_cuidado_audit(residente_id, realizado_en desc)
  where residente_id is not null;

create table if not exists public.medicamentos_indicaciones (
  id                         uuid primary key default gen_random_uuid(),
  eleam_id                   uuid not null references public.eleams(id) on delete cascade,
  residente_id               uuid not null references public.residentes(id) on delete cascade,
  medicamento_nombre         text not null,
  principio_activo           text,
  concentracion              text,
  forma_farmaceutica         text,
  dosis                      text not null,
  unidad_dosis               text,
  via                        text not null check (via in ('oral','topica','subcutanea','enteral','inhalatoria','oftalmica','otica','nasal','otra')),
  indicacion                 text,
  prescriptor_nombre         text,
  fecha_indicacion           date,
  fecha_inicio               date not null default current_date,
  fecha_fin                  date,
  estado                     text not null default 'activo' check (estado in ('activo','pausada','suspendida','finalizada')),
  es_controlado              boolean not null default false,
  tipo_controlado            text check (tipo_controlado in ('psicotropico','estupefaciente') or tipo_controlado is null),
  requiere_doble_validacion  boolean not null default false,
  requiere_stock             boolean not null default true,
  visible_familiar           boolean not null default false,
  resumen_familiar           text,
  instrucciones              text,
  creado_por                 uuid references auth.users(id) on delete set null,
  actualizado_por            uuid references auth.users(id) on delete set null,
  creado_en                  timestamptz not null default now(),
  actualizado_en             timestamptz not null default now(),
  check (visible_familiar = false or nullif(trim(coalesce(resumen_familiar, '')), '') is not null),
  check (es_controlado = false or tipo_controlado is not null)
);

create index if not exists idx_med_indicaciones_residente
  on public.medicamentos_indicaciones(residente_id, estado);
create index if not exists idx_med_indicaciones_eleam_controlado
  on public.medicamentos_indicaciones(eleam_id, es_controlado, estado);
create index if not exists idx_med_indicaciones_familiar
  on public.medicamentos_indicaciones(residente_id, estado)
  where visible_familiar = true;

create table if not exists public.medicamentos_horarios (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  indicacion_id         uuid not null references public.medicamentos_indicaciones(id) on delete cascade,
  frecuencia            text not null default 'diaria' check (frecuencia in ('diaria','semanal','mensual','una_vez')),
  dias_semana           smallint[] check (
                          dias_semana is null
                          or dias_semana <@ array[1,2,3,4,5,6,7]::smallint[]
                        ),
  dias_mes              smallint[] check (
                          dias_mes is null
                          or dias_mes <@ array[
                            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
                            17,18,19,20,21,22,23,24,25,26,27,28,29,30,31
                          ]::smallint[]
                        ),
  fecha_unica           date,
  hora                  time not null,
  turno                 text not null check (turno in ('mañana','tarde','noche')),
  tolerancia_min        integer not null default 60 check (tolerancia_min between 0 and 720),
  activo                boolean not null default true,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create index if not exists idx_med_horarios_indicacion
  on public.medicamentos_horarios(indicacion_id, activo);
create index if not exists idx_med_horarios_eleam_turno
  on public.medicamentos_horarios(eleam_id, turno, activo);

create table if not exists public.medicamentos_stock_lotes (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  residente_id          uuid references public.residentes(id) on delete cascade,
  indicacion_id         uuid references public.medicamentos_indicaciones(id) on delete set null,
  medicamento_nombre    text not null,
  lote                  text,
  fecha_vencimiento     date,
  cantidad_actual       numeric(12,2) not null default 0 check (cantidad_actual >= 0),
  unidad                text not null default 'unidad',
  ubicacion             text,
  es_controlado         boolean not null default false,
  tipo_controlado       text check (tipo_controlado in ('psicotropico','estupefaciente') or tipo_controlado is null),
  estado                text not null default 'activo' check (estado in ('activo','agotado','vencido','retirado')),
  creado_por            uuid references auth.users(id) on delete set null,
  actualizado_por       uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  check (es_controlado = false or tipo_controlado is not null)
);

create index if not exists idx_med_stock_lotes_eleam_controlado
  on public.medicamentos_stock_lotes(eleam_id, es_controlado, estado);
create index if not exists idx_med_stock_lotes_residente
  on public.medicamentos_stock_lotes(residente_id, estado);
create index if not exists idx_med_stock_lotes_residente_vencimiento
  on public.medicamentos_stock_lotes(residente_id, estado, fecha_vencimiento)
  where estado = 'activo';

create table if not exists public.medicamentos_administraciones (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  indicacion_id         uuid not null references public.medicamentos_indicaciones(id) on delete cascade,
  horario_id            uuid not null references public.medicamentos_horarios(id) on delete cascade,
  lote_id               uuid references public.medicamentos_stock_lotes(id) on delete set null,
  fecha                 date not null,
  turno                 text not null check (turno in ('mañana','tarde','noche')),
  hora                  time not null,
  estado                text not null default 'pendiente'
                        check (estado in ('pendiente','administrado','omitido','pendiente_validacion','validado','revertido','cancelado')),
  dosis_administrada    numeric(12,2),
  unidad_dosis          text,
  motivo_omision        text check (
                          motivo_omision is null
                          or motivo_omision in ('rechazo','no_disponible','contraindicado','residente_ausente','otro')
                        ),
  notas                 text,
  requiere_seguimiento  boolean not null default false,
  observacion_id        uuid references public.observaciones_diarias(id) on delete set null,
  administrado_por      uuid references auth.users(id) on delete set null,
  administrado_en       timestamptz,
  validado_por          uuid references auth.users(id) on delete set null,
  validado_en           timestamptz,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  unique (horario_id, fecha)
);

create index if not exists idx_med_admin_eleam_fecha_turno
  on public.medicamentos_administraciones(eleam_id, fecha desc, turno, estado);
create index if not exists idx_med_admin_residente_fecha
  on public.medicamentos_administraciones(residente_id, fecha desc, turno);
create index if not exists idx_med_admin_open
  on public.medicamentos_administraciones(eleam_id, fecha desc, turno)
  where estado in ('pendiente','pendiente_validacion');
create index if not exists idx_med_admin_control_validacion
  on public.medicamentos_administraciones(eleam_id, estado)
  where estado = 'pendiente_validacion';

create table if not exists public.medicamentos_stock_movimientos (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  lote_id               uuid not null references public.medicamentos_stock_lotes(id) on delete cascade,
  indicacion_id         uuid references public.medicamentos_indicaciones(id) on delete set null,
  administracion_id     uuid references public.medicamentos_administraciones(id) on delete set null,
  tipo                  text not null check (tipo in ('recepcion','administracion','ajuste','reversa','merma','retiro','conciliacion')),
  cantidad              numeric(12,2) not null check (cantidad <> 0),
  stock_resultante      numeric(12,2) not null check (stock_resultante >= 0),
  motivo                text,
  requiere_validacion   boolean not null default false,
  validado_por          uuid references auth.users(id) on delete set null,
  validado_en           timestamptz,
  creado_por            uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now()
);

create index if not exists idx_med_stock_mov_lote
  on public.medicamentos_stock_movimientos(lote_id, creado_en desc);
create index if not exists idx_med_stock_mov_eleam_control
  on public.medicamentos_stock_movimientos(eleam_id, requiere_validacion, creado_en desc);

create table if not exists public.medicamentos_conciliaciones (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  lote_id               uuid not null references public.medicamentos_stock_lotes(id) on delete cascade,
  cantidad_sistema      numeric(12,2) not null,
  cantidad_fisica       numeric(12,2) not null check (cantidad_fisica >= 0),
  diferencia            numeric(12,2) not null,
  motivo                text not null,
  estado                text not null default 'pendiente_validacion'
                        check (estado in ('pendiente_validacion','validada','rechazada')),
  creado_por            uuid references auth.users(id) on delete set null,
  validado_por          uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now(),
  validado_en           timestamptz
);

create index if not exists idx_med_conciliaciones_lote
  on public.medicamentos_conciliaciones(lote_id, estado, creado_en desc);

create table if not exists public.medicamentos_audit (
  id             uuid primary key default gen_random_uuid(),
  eleam_id       uuid references public.eleams(id) on delete cascade,
  residente_id   uuid references public.residentes(id) on delete cascade,
  entidad        text not null,
  entidad_id     uuid,
  accion         text not null,
  detalle        jsonb,
  realizado_por  uuid references public.profiles(id) on delete set null,
  realizado_en   timestamptz not null default now()
);

create index if not exists idx_medicamentos_audit_eleam
  on public.medicamentos_audit(eleam_id, realizado_en desc);
create index if not exists idx_medicamentos_audit_residente_fecha
  on public.medicamentos_audit(residente_id, realizado_en desc)
  where residente_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'med_indicaciones_nombre_len_contract') then
    alter table public.medicamentos_indicaciones add constraint med_indicaciones_nombre_len_contract
      check (char_length(trim(medicamento_nombre)) between 1 and 160);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_indicaciones_dosis_len_contract') then
    alter table public.medicamentos_indicaciones add constraint med_indicaciones_dosis_len_contract
      check (char_length(trim(dosis)) between 1 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_indicaciones_textos_len_contract') then
    alter table public.medicamentos_indicaciones add constraint med_indicaciones_textos_len_contract
      check (
        char_length(coalesce(principio_activo, '')) <= 160
        and char_length(coalesce(concentracion, '')) <= 80
        and char_length(coalesce(forma_farmaceutica, '')) <= 80
        and char_length(coalesce(unidad_dosis, '')) <= 40
        and char_length(coalesce(indicacion, '')) <= 500
        and char_length(coalesce(prescriptor_nombre, '')) <= 160
        and char_length(coalesce(resumen_familiar, '')) <= 240
        and char_length(coalesce(instrucciones, '')) <= 1200
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_indicaciones_fechas_contract') then
    alter table public.medicamentos_indicaciones add constraint med_indicaciones_fechas_contract
      check (fecha_fin is null or fecha_fin >= fecha_inicio);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_indicaciones_familia_contract') then
    alter table public.medicamentos_indicaciones add constraint med_indicaciones_familia_contract
      check (visible_familiar = false or char_length(trim(coalesce(resumen_familiar, ''))) between 1 and 240);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_indicaciones_controlados_contract') then
    alter table public.medicamentos_indicaciones add constraint med_indicaciones_controlados_contract
      check (
        es_controlado = false
        or (
          tipo_controlado is not null
          and requiere_stock = true
          and requiere_doble_validacion = true
        )
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_horarios_frecuencia_contract') then
    alter table public.medicamentos_horarios add constraint med_horarios_frecuencia_contract
      check (
        (frecuencia = 'diaria')
        or (frecuencia = 'semanal' and cardinality(coalesce(dias_semana, '{}'::smallint[])) > 0)
        or (frecuencia = 'mensual' and cardinality(coalesce(dias_mes, '{}'::smallint[])) > 0)
        or (frecuencia = 'una_vez' and fecha_unica is not null)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_stock_lotes_textos_contract') then
    alter table public.medicamentos_stock_lotes add constraint med_stock_lotes_textos_contract
      check (
        char_length(trim(medicamento_nombre)) between 1 and 160
        and char_length(coalesce(lote, '')) <= 80
        and char_length(coalesce(unidad, '')) between 1 and 40
        and char_length(coalesce(ubicacion, '')) <= 160
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_stock_lotes_controlados_contract') then
    alter table public.medicamentos_stock_lotes add constraint med_stock_lotes_controlados_contract
      check (es_controlado = false or tipo_controlado is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_stock_lotes_vencimiento_contract') then
    alter table public.medicamentos_stock_lotes add constraint med_stock_lotes_vencimiento_contract
      check (fecha_vencimiento is null or fecha_vencimiento >= date '2000-01-01');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_admin_cierre_contract') then
    alter table public.medicamentos_administraciones add constraint med_admin_cierre_contract
      check (
        (estado <> 'omitido' or motivo_omision is not null)
        and (dosis_administrada is null or dosis_administrada > 0)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_movimientos_motivo_contract') then
    alter table public.medicamentos_stock_movimientos add constraint med_movimientos_motivo_contract
      check (char_length(coalesce(motivo, '')) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'med_conciliaciones_motivo_contract') then
    alter table public.medicamentos_conciliaciones add constraint med_conciliaciones_motivo_contract
      check (char_length(trim(motivo)) between 1 and 500);
  end if;
end $$;

-- ============================================================
-- 3. Invitaciones y portal familiar
-- ============================================================

create table if not exists public.funcionario_invitaciones (
  id            uuid primary key default gen_random_uuid(),
  eleam_id      uuid not null references public.eleams(id) on delete cascade,
  email         text not null check (
    char_length(email) <= 254
    and email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ),
  nombre        text check (nombre is null or char_length(nombre) <= 120),
  telefono      text check (telefono is null or char_length(telefono) <= 40),
  parentesco    text check (parentesco is null or char_length(parentesco) <= 80),
  token         text unique not null,
  expira_en     timestamptz not null default (now() + interval '7 days'),
  usado         boolean not null default false,
  usado_en      timestamptz,
  rol           text not null default 'funcionario' check (rol in ('funcionario','familiar')),
  residente_id  uuid references public.residentes(id) on delete cascade,
  creado_por    uuid references auth.users(id) on delete set null,
  creado_en     timestamptz not null default now(),
  check (
    (rol = 'familiar' and residente_id is not null)
    or (rol <> 'familiar' and residente_id is null)
  )
);

alter table public.funcionario_invitaciones
  add column if not exists nombre text,
  add column if not exists telefono text,
  add column if not exists parentesco text;

create index if not exists idx_inv_eleam on public.funcionario_invitaciones(eleam_id);
create index if not exists idx_inv_email on public.funcionario_invitaciones(lower(email));
create index if not exists idx_inv_eleam_email_active
  on public.funcionario_invitaciones(eleam_id, lower(email), usado, expira_en desc);

create table if not exists public.auth_provision_requests (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (
    char_length(email) <= 254
    and email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ),
  account_source text not null check (
    account_source in ('demo_approved','superadmin_created','admin_created','funcionario_created')
  ),
  eleam_id      uuid not null references public.eleams(id) on delete cascade,
  rol           text not null check (rol in ('admin_eleam','funcionario','familiar')),
  residente_id  uuid references public.residentes(id) on delete cascade,
  usado         boolean not null default false,
  usado_en      timestamptz,
  usado_por_auth_user_id uuid,
  expira_en     timestamptz not null default (now() + interval '10 minutes'),
  creado_en     timestamptz not null default now(),
  check (
    (rol = 'familiar' and residente_id is not null)
    or (rol <> 'familiar' and residente_id is null)
  ),
  check (
    (usado = false and usado_en is null and usado_por_auth_user_id is null)
    or (usado = true and usado_en is not null and usado_por_auth_user_id is not null)
  )
);

create index if not exists idx_auth_provision_active
  on public.auth_provision_requests(id, lower(email), usado, expira_en);
create index if not exists idx_auth_provision_email
  on public.auth_provision_requests(lower(email), creado_en desc);

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
  crear_planes_cuidado    boolean not null default true,
  editar_planes_cuidado   boolean not null default true,
  completar_tareas_cuidado boolean not null default true,
  crear_indicaciones_medicamentos boolean not null default false,
  editar_indicaciones_medicamentos boolean not null default false,
  administrar_medicamentos boolean not null default true,
  validar_medicamentos_controlados boolean not null default false,
  ajustar_stock_medicamentos boolean not null default false,
  asignar_camas            boolean not null default true,
  subir_acreditacion      boolean not null default true,
  editar_acreditacion     boolean not null default true,
  archivar_acreditacion   boolean not null default false,
  registrar_visitas            boolean not null default true,
  editar_indicaciones_cuidado  boolean not null default false,
  aplicar_evaluaciones_clinicas boolean not null default true,
  crear_eventos_adversos        boolean not null default true,
  editar_eventos_adversos       boolean not null default true,
  cerrar_eventos_adversos       boolean not null default false,
  actualizado_en               timestamptz not null default now()
);

create index if not exists idx_func_permisos_profile on public.funcionario_permisos(profile_id);

-- Migraciones: columnas añadidas después de la creación inicial de la tabla.
-- ADD COLUMN IF NOT EXISTS es idempotente: seguro de re-ejecutar en cualquier BD.
alter table public.funcionario_permisos
  add column if not exists crear_planes_cuidado            boolean not null default true,
  add column if not exists editar_planes_cuidado           boolean not null default true,
  add column if not exists completar_tareas_cuidado        boolean not null default true,
  add column if not exists crear_indicaciones_medicamentos boolean not null default false,
  add column if not exists editar_indicaciones_medicamentos boolean not null default false,
  add column if not exists administrar_medicamentos        boolean not null default true,
  add column if not exists validar_medicamentos_controlados boolean not null default false,
  add column if not exists ajustar_stock_medicamentos      boolean not null default false,
  add column if not exists asignar_camas                   boolean not null default true,
  add column if not exists editar_indicaciones_cuidado     boolean not null default false,
  add column if not exists aplicar_evaluaciones_clinicas   boolean not null default true,
  add column if not exists crear_eventos_adversos          boolean not null default true,
  add column if not exists editar_eventos_adversos         boolean not null default true,
  add column if not exists cerrar_eventos_adversos         boolean not null default false;

create table if not exists public.eleam_feature_permissions (
  id              uuid primary key default gen_random_uuid(),
  eleam_id        uuid not null references public.eleams(id) on delete cascade,
  rol             text not null check (rol in ('admin_eleam','funcionario','familiar')),
  feature_id      text not null,
  enabled         boolean not null default true,
  actualizado_por uuid references public.profiles(id) on delete set null,
  actualizado_en  timestamptz not null default now(),
  unique (eleam_id, rol, feature_id)
);

create index if not exists idx_eleam_feature_permissions_eleam
  on public.eleam_feature_permissions(eleam_id, rol);

create table if not exists public.profile_feature_permissions (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  feature_id      text not null,
  enabled         boolean not null default true,
  actualizado_por uuid references public.profiles(id) on delete set null,
  actualizado_en  timestamptz not null default now(),
  unique (profile_id, feature_id)
);

create index if not exists idx_profile_feature_permissions_profile
  on public.profile_feature_permissions(profile_id);

create table if not exists public.visitas_familiar (
  id              uuid primary key default gen_random_uuid(),
  residente_id    uuid not null references public.residentes(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete set null,
  fecha_hora      timestamptz not null default now(),
  duracion_min    integer check (duracion_min is null or duracion_min between 1 and 1440),
  notas           text,
  registrado_por  uuid references auth.users(id) on delete set null,
  estado          text not null default 'completada'
                  check (estado in ('pendiente','activa','salida_pendiente','completada','cancelada')),
  validado_por    uuid references public.profiles(id) on delete set null,
  validado_en     timestamptz,
  salida_anunciada_en timestamptz,
  salida_hora     timestamptz,
  salida_validada_por uuid references public.profiles(id) on delete set null,
  salida_validada_en timestamptz,
  creado_en       timestamptz not null default now()
);

create index if not exists idx_visitas_residente_fecha
  on public.visitas_familiar(residente_id, fecha_hora desc);
create index if not exists idx_visitas_estado
  on public.visitas_familiar(residente_id, estado)
  where estado in ('pendiente','activa','salida_pendiente');

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
create index if not exists idx_pagos_eleam_fecha on public.pagos(eleam_id, fecha_pago desc);
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
  norma_codigo text not null default 'DS20',
  articulo_ref text,
  fuente_url   text,
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
  norma_codigo             text not null default 'DS20',
  articulo_ref             text,
  fuente_url               text,
  criticidad               text not null default 'media'
                           check (criticidad in ('baja','media','alta','critica')),
  tipo_evidencia           text not null default 'documento'
                           check (tipo_evidencia in ('documento','registro','mixta')),
  origen_evidencia         text not null default 'documental'
                           check (origen_evidencia in ('documental','operacional','mixta')),
  requisito_operacional    boolean not null default false,
  orden                    integer not null default 0
);

alter table public.acred_ambitos
  add column if not exists norma_codigo text not null default 'DS20',
  add column if not exists articulo_ref text,
  add column if not exists fuente_url text;

alter table public.acred_requisitos
  add column if not exists norma_codigo text not null default 'DS20',
  add column if not exists articulo_ref text,
  add column if not exists fuente_url text,
  add column if not exists criticidad text not null default 'media',
  add column if not exists tipo_evidencia text not null default 'documento',
  add column if not exists origen_evidencia text not null default 'documental',
  add column if not exists requisito_operacional boolean not null default false;

create index if not exists idx_acred_requisitos_ambito on public.acred_requisitos(ambito_id, orden);

create table if not exists public.acred_requisitos_eleam (
  id                   uuid primary key default gen_random_uuid(),
  eleam_id             uuid not null references public.eleams(id) on delete cascade,
  requisito_id         uuid not null references public.acred_requisitos(id) on delete cascade,
  estado               text not null default 'pendiente'
                       check (estado in (
                         'pendiente','en_revision','vigente','observado',
                         'vencido','no_cumple','no_aplica','requiere_actualizacion'
                       )),
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
-- 6. CRM superadmin, funnel comercial y blog publico
-- ============================================================

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

create table if not exists public.demo_leads (
  id                        uuid default gen_random_uuid() primary key,
  nombre                    text not null check (char_length(nombre) <= 120),
  cargo                     text not null check (char_length(cargo) <= 80),
  eleam_nombre              text not null check (char_length(eleam_nombre) <= 160),
  email                     text not null check (char_length(email) <= 254),
  telefono                  text not null check (char_length(telefono) <= 40),
  num_residentes            text check (num_residentes is null or char_length(num_residentes) <= 40),
  utm_source                text check (utm_source is null or char_length(utm_source) <= 128),
  utm_medium                text check (utm_medium is null or char_length(utm_medium) <= 128),
  utm_campaign              text check (utm_campaign is null or char_length(utm_campaign) <= 128),
  pagina_origen             text check (pagina_origen is null or char_length(pagina_origen) <= 256),
  referrer                  text check (referrer is null or char_length(referrer) <= 512),
  estado                    text not null default 'nuevo'
    check (estado in ('nuevo','contactado','demo_activo','descartado','convertido')),
  notas_admin               text,
  demo_access_granted_at    timestamptz,
  demo_expires_at           timestamptz,
  demo_user_id              uuid references auth.users(id) on delete set null,
  creado_en                 timestamptz default now() not null
);

create index if not exists idx_demo_leads_estado on public.demo_leads(estado);
create index if not exists idx_demo_leads_email_estado on public.demo_leads(lower(email), estado);
create unique index if not exists demo_leads_active_email_unique
  on public.demo_leads(lower(email))
  where estado in ('nuevo','contactado','demo_activo')
    and demo_user_id is null;

-- CRM se define sin compatibilidad ni migraciones: si estas tablas existen,
-- se reconstruyen para evitar contratos vacios con tipos anteriores.
drop table if exists public.crm_email_sends cascade;
drop table if exists public.crm_campaign_members cascade;
drop table if exists public.crm_stage_history cascade;
drop table if exists public.crm_tasks cascade;
drop table if exists public.crm_interactions cascade;
drop table if exists public.crm_email_campaigns cascade;
drop table if exists public.crm_prospects cascade;
drop table if exists public.crm_prospect_lists cascade;

create table if not exists public.crm_prospect_lists (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (char_length(nombre) <= 120),
  descripcion     text check (descripcion is null or char_length(descripcion) <= 500),
  origen          text not null default 'manual'
                  check (origen in ('manual','import_excel','landing','whatsapp','outbound','campana','referido','otro')),
  creado_por      uuid references public.profiles(id) on delete set null,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index if not exists idx_crm_prospect_lists_origen
  on public.crm_prospect_lists(origen, creado_en desc);

create table if not exists public.crm_prospects (
  id                         uuid primary key default gen_random_uuid(),
  list_id                    uuid references public.crm_prospect_lists(id) on delete set null,
  demo_lead_id               uuid references public.demo_leads(id) on delete set null,
  eleam_id                   uuid references public.eleams(id) on delete set null,
  eleam_nombre               text not null check (char_length(eleam_nombre) <= 200),
  comuna                     text check (comuna is null or char_length(comuna) <= 100),
  telefono                   text check (telefono is null or char_length(telefono) <= 40),
  email                      text check (
                               email is null
                               or (
                                 char_length(email) <= 254
                                 and email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
                               )
                             ),
  facebook_url               text check (facebook_url is null or char_length(facebook_url) <= 500),
  instagram_url              text check (instagram_url is null or char_length(instagram_url) <= 500),
  tiktok_url                 text check (tiktok_url is null or char_length(tiktok_url) <= 500),
  origen                     text not null default 'outbound'
                             check (origen in ('outbound','landing','whatsapp','referido','manual','campana','import_excel','otro')),
  canal_preferido            text not null default 'desconocido'
                             check (canal_preferido in ('desconocido','telefono','email','whatsapp','redes','presencial')),
  cargo_contacto             text check (cargo_contacto is null or char_length(cargo_contacto) <= 120),
  decision_maker_nombre      text check (decision_maker_nombre is null or char_length(decision_maker_nombre) <= 160),
  decision_maker_cargo       text check (decision_maker_cargo is null or char_length(decision_maker_cargo) <= 120),
  num_residentes             integer check (num_residentes is null or (num_residentes between 1 and 10000)),
  digitalizacion_estado      text not null default 'desconocido'
                             check (digitalizacion_estado in ('desconocido','papel_excel_whatsapp','software_generico','software_eleam','mixto')),
  software_actual            text check (software_actual is null or char_length(software_actual) <= 160),
  dolor_principal            text check (dolor_principal is null or char_length(dolor_principal) <= 500),
  urgencia                   text not null default 'desconocida'
                             check (urgencia in ('desconocida','baja','media','alta')),
  fit_score                  integer not null default 50 check (fit_score between 0 and 100),
  valor_estimado_clp         integer check (valor_estimado_clp is null or valor_estimado_clp >= 0),
  probabilidad_cierre        integer not null default 10 check (probabilidad_cierre between 0 and 100),
  proxima_accion_fecha       date,
  motivo_perdida             text check (motivo_perdida is null or char_length(motivo_perdida) <= 500),
  competidor                 text check (competidor is null or char_length(competidor) <= 160),
  estado                     text not null default 'nuevo'
                             check (estado in (
                               'nuevo','investigacion','contactar','contactado','calificado',
                               'demo_agendada','demo_realizada','prueba_activa',
                               'propuesta_enviada','negociacion','ganado','perdido','no_contactar'
                             )),
  no_contactar               boolean not null default false,
  unsubscribe_token          uuid not null default gen_random_uuid(),
  notas                      text check (notas is null or char_length(notas) <= 3000),
  ultimo_email_enviado_en    timestamptz,
  ultimo_contacto_en         timestamptz,
  creado_por                 uuid references public.profiles(id) on delete set null,
  creado_en                  timestamptz not null default now(),
  actualizado_en             timestamptz not null default now(),
  constraint crm_prospects_lost_reason_required
    check (estado <> 'perdido' or motivo_perdida is not null),
  constraint crm_prospects_no_contactar_consistent
    check ((estado = 'no_contactar' and no_contactar = true) or (estado <> 'no_contactar' and no_contactar = false))
);

create unique index if not exists crm_prospects_email_unique
  on public.crm_prospects(lower(email))
  where email is not null;
create unique index if not exists crm_prospects_demo_lead_unique
  on public.crm_prospects(demo_lead_id)
  where demo_lead_id is not null;
create unique index if not exists crm_prospects_unsubscribe_token_unique
  on public.crm_prospects(unsubscribe_token);
create index if not exists idx_crm_prospects_list_estado
  on public.crm_prospects(list_id, estado, creado_en desc);
create index if not exists idx_crm_prospects_estado
  on public.crm_prospects(estado, creado_en desc);
create index if not exists idx_crm_prospects_origen
  on public.crm_prospects(origen, creado_en desc);
create index if not exists idx_crm_prospects_next_action
  on public.crm_prospects(proxima_accion_fecha)
  where proxima_accion_fecha is not null and estado not in ('ganado','perdido','no_contactar');
create index if not exists idx_crm_prospects_no_contactar
  on public.crm_prospects(no_contactar, creado_en desc);
create index if not exists idx_crm_prospects_eleam
  on public.crm_prospects(eleam_id)
  where eleam_id is not null;

create table if not exists public.crm_email_campaigns (
  id                         uuid primary key default gen_random_uuid(),
  nombre                     text not null check (char_length(nombre) <= 160),
  objetivo                   text check (objetivo is null or char_length(objetivo) <= 1000),
  audiencia_notas            text check (audiencia_notas is null or char_length(audiencia_notas) <= 1000),
  asunto_default             text not null check (char_length(asunto_default) <= 200),
  cuerpo_default             text check (cuerpo_default is null or char_length(cuerpo_default) <= 8000),
  mensaje_rrss_template      text check (mensaje_rrss_template is null or char_length(mensaje_rrss_template) <= 4000),
  script_llamada_template    text check (script_llamada_template is null or char_length(script_llamada_template) <= 8000),
  variables_usadas           text[] not null default '{}',
  from_email                 text check (
                               from_email is null
                               or (
                                 char_length(from_email) <= 254
                                 and from_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
                               )
                             ),
  from_name                  text check (from_name is null or char_length(from_name) <= 120),
  reply_to_email             text check (
                               reply_to_email is null
                               or (
                                 char_length(reply_to_email) <= 254
                                 and reply_to_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
                               )
                             ),
  estado                     text not null default 'borrador'
                             check (estado in ('borrador','enviando','enviada','fallida')),
  total_destinatarios        integer not null default 0 check (total_destinatarios >= 0),
  total_enviados             integer not null default 0 check (total_enviados >= 0),
  total_fallidos             integer not null default 0 check (total_fallidos >= 0),
  total_omitidos             integer not null default 0 check (total_omitidos >= 0),
  iniciada_en                timestamptz,
  finalizada_en              timestamptz,
  creado_por                 uuid references public.profiles(id) on delete set null,
  creado_en                  timestamptz not null default now(),
  actualizado_en             timestamptz not null default now(),
  constraint crm_email_campaigns_totals_consistent
    check (total_enviados + total_fallidos + total_omitidos <= greatest(total_destinatarios, total_enviados + total_fallidos + total_omitidos))
);

create index if not exists idx_crm_email_campaigns_estado
  on public.crm_email_campaigns(estado, creado_en desc);

create table if not exists public.crm_campaign_members (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null references public.crm_email_campaigns(id) on delete cascade,
  prospect_id           uuid not null references public.crm_prospects(id) on delete cascade,
  estado                text not null default 'seleccionado'
                        check (estado in (
                          'seleccionado','contactado','respondio','interesado','no_interesado',
                          'demo_agendada','no_contactar','rebotado','omitido'
                        )),
  canal                 text check (canal is null or canal in ('desconocido','telefono','email','whatsapp','redes','presencial')),
  ultimo_toque_en       timestamptz,
  proxima_accion_fecha  date,
  notas                 text check (notas is null or char_length(notas) <= 1000),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  unique (campaign_id, prospect_id)
);

create index if not exists idx_crm_campaign_members_prospect
  on public.crm_campaign_members(prospect_id, creado_en desc);
create index if not exists idx_crm_campaign_members_campaign_estado
  on public.crm_campaign_members(campaign_id, estado);

create table if not exists public.crm_email_sends (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.crm_email_campaigns(id) on delete cascade,
  prospect_id     uuid not null references public.crm_prospects(id) on delete cascade,
  email           text not null check (char_length(email) <= 254),
  asunto_final    text not null check (char_length(asunto_final) <= 200),
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente','enviado','fallido','omitido','baja')),
  resend_id       text check (resend_id is null or char_length(resend_id) <= 200),
  error_mensaje   text check (error_mensaje is null or char_length(error_mensaje) <= 1000),
  enviado_en      timestamptz,
  creado_en       timestamptz not null default now(),
  unique (campaign_id, prospect_id)
);

create index if not exists idx_crm_email_sends_campaign_estado
  on public.crm_email_sends(campaign_id, estado);
create index if not exists idx_crm_email_sends_prospect
  on public.crm_email_sends(prospect_id, creado_en desc);

create table if not exists public.crm_stage_history (
  id              uuid primary key default gen_random_uuid(),
  prospect_id     uuid not null references public.crm_prospects(id) on delete cascade,
  etapa_anterior  text check (
                    etapa_anterior is null
                    or etapa_anterior in (
                      'nuevo','investigacion','contactar','contactado','calificado',
                      'demo_agendada','demo_realizada','prueba_activa',
                      'propuesta_enviada','negociacion','ganado','perdido','no_contactar'
                    )
                  ),
  etapa_nueva     text not null check (etapa_nueva in (
                    'nuevo','investigacion','contactar','contactado','calificado',
                    'demo_agendada','demo_realizada','prueba_activa',
                    'propuesta_enviada','negociacion','ganado','perdido','no_contactar'
                  )),
  detalle         text check (detalle is null or char_length(detalle) <= 1000),
  cambiado_por    uuid references public.profiles(id) on delete set null,
  cambiado_en     timestamptz not null default now()
);

create index if not exists idx_crm_stage_history_prospect
  on public.crm_stage_history(prospect_id, cambiado_en desc);

create table if not exists public.crm_tasks (
  id                 uuid primary key default gen_random_uuid(),
  eleam_id           uuid references public.eleams(id) on delete cascade,
  prospect_id        uuid references public.crm_prospects(id) on delete cascade,
  campaign_id        uuid references public.crm_email_campaigns(id) on delete set null,
  titulo             text not null check (char_length(titulo) <= 200),
  descripcion        text check (descripcion is null or char_length(descripcion) <= 2000),
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
create index if not exists idx_crm_tasks_prospect on public.crm_tasks(prospect_id, estado);
create index if not exists idx_crm_tasks_campaign on public.crm_tasks(campaign_id);
create index if not exists idx_crm_tasks_venc on public.crm_tasks(fecha_vencimiento)
  where estado in ('pendiente','en_curso');
create index if not exists idx_crm_tasks_estado on public.crm_tasks(estado);

create table if not exists public.crm_interactions (
  id              uuid primary key default gen_random_uuid(),
  eleam_id        uuid references public.eleams(id) on delete cascade,
  prospect_id     uuid references public.crm_prospects(id) on delete cascade,
  campaign_id     uuid references public.crm_email_campaigns(id) on delete set null,
  tipo            text not null default 'nota'
                  check (tipo in ('nota','llamada','correo','reunion','demo','soporte','sistema','otro')),
  canal           text check (canal in ('telefono','email','whatsapp','redes','presencial','videollamada','sistema','otro') or canal is null),
  resumen         text not null check (char_length(resumen) <= 3000),
  resultado       text check (resultado in ('positivo','neutro','negativo','sin_respuesta','sistema') or resultado is null),
  proxima_accion  text check (proxima_accion is null or char_length(proxima_accion) <= 1000),
  creado_por      uuid references public.profiles(id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index if not exists idx_crm_int_eleam_fecha
  on public.crm_interactions(eleam_id, creado_en desc)
  where eleam_id is not null;
create index if not exists idx_crm_int_prospect_fecha
  on public.crm_interactions(prospect_id, creado_en desc)
  where prospect_id is not null;
create index if not exists idx_crm_int_campaign
  on public.crm_interactions(campaign_id, creado_en desc)
  where campaign_id is not null;

create table if not exists public.landing_events (
  id           uuid default gen_random_uuid() primary key,
  tipo         text not null
    constraint landing_events_tipo_contract
    check (
      char_length(tipo) <= 64
      and tipo in ('page_view','cta_click','nav_click','scroll_depth','section_view','form_view','form_submit','tool_use')
    ),
  pagina       text constraint landing_events_pagina_contract check (pagina is null or char_length(pagina) <= 256),
  elemento     text constraint landing_events_elemento_contract check (elemento is null or char_length(elemento) <= 128),
  valor        text constraint landing_events_valor_contract check (valor is null or char_length(valor) <= 256),
  session_id   text constraint landing_events_session_contract check (session_id is null or char_length(session_id) <= 64),
  utm_source   text constraint landing_events_utm_source_contract check (utm_source is null or char_length(utm_source) <= 128),
  utm_medium   text constraint landing_events_utm_medium_contract check (utm_medium is null or char_length(utm_medium) <= 128),
  utm_campaign text constraint landing_events_utm_campaign_contract check (utm_campaign is null or char_length(utm_campaign) <= 128),
  referrer     text constraint landing_events_referrer_contract check (referrer is null or char_length(referrer) <= 512),
  creado_en    timestamptz default now() not null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'landing_events_tipo_contract') then
    alter table public.landing_events add constraint landing_events_tipo_contract
      check (
        char_length(tipo) <= 64
        and tipo in ('page_view','cta_click','nav_click','scroll_depth','section_view','form_view','form_submit','tool_use')
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'landing_events_pagina_contract') then
    alter table public.landing_events add constraint landing_events_pagina_contract
      check (pagina is null or char_length(pagina) <= 256);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'landing_events_elemento_contract') then
    alter table public.landing_events add constraint landing_events_elemento_contract
      check (elemento is null or char_length(elemento) <= 128);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'landing_events_valor_contract') then
    alter table public.landing_events add constraint landing_events_valor_contract
      check (valor is null or char_length(valor) <= 256);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'landing_events_session_contract') then
    alter table public.landing_events add constraint landing_events_session_contract
      check (session_id is null or char_length(session_id) <= 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'landing_events_utm_source_contract') then
    alter table public.landing_events add constraint landing_events_utm_source_contract
      check (utm_source is null or char_length(utm_source) <= 128);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'landing_events_utm_medium_contract') then
    alter table public.landing_events add constraint landing_events_utm_medium_contract
      check (utm_medium is null or char_length(utm_medium) <= 128);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'landing_events_utm_campaign_contract') then
    alter table public.landing_events add constraint landing_events_utm_campaign_contract
      check (utm_campaign is null or char_length(utm_campaign) <= 128);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'landing_events_referrer_contract') then
    alter table public.landing_events add constraint landing_events_referrer_contract
      check (referrer is null or char_length(referrer) <= 512);
  end if;
end;
$$;

create index if not exists idx_landing_events_tipo
  on public.landing_events(tipo, creado_en desc);
create index if not exists idx_landing_events_session
  on public.landing_events(session_id);

-- ============================================================
-- 7. Funciones y triggers
-- ============================================================

create or replace function public.request_demo_lead(
  p_nombre text,
  p_cargo text,
  p_eleam_nombre text,
  p_email text,
  p_telefono text,
  p_num_residentes text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_pagina_origen text default null,
  p_referrer text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := nullif(trim(coalesce(p_nombre, '')), '');
  v_cargo text := nullif(trim(coalesce(p_cargo, '')), '');
  v_eleam_nombre text := nullif(trim(coalesce(p_eleam_nombre, '')), '');
  v_email text := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_telefono text := nullif(regexp_replace(trim(coalesce(p_telefono, '')), '\s+', ' ', 'g'), '');
  v_num_residentes text := nullif(trim(coalesce(p_num_residentes, '')), '');
  v_existing public.demo_leads;
  v_lead public.demo_leads;
begin
  if v_nombre is null then
    raise exception 'El nombre es obligatorio' using errcode = 'P0001';
  end if;
  if v_cargo is null then
    raise exception 'El cargo es obligatorio' using errcode = 'P0001';
  end if;
  if v_eleam_nombre is null then
    raise exception 'El nombre del ELEAM es obligatorio' using errcode = 'P0001';
  end if;
  if v_email is null or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'El email no es valido' using errcode = 'P0001';
  end if;
  if v_telefono is null or length(regexp_replace(v_telefono, '[^0-9+]', '', 'g')) < 8 then
    raise exception 'El telefono es obligatorio' using errcode = 'P0001';
  end if;
  if length(v_nombre) > 120 then
    raise exception 'El nombre no puede superar 120 caracteres' using errcode = 'P0001';
  end if;
  if length(v_cargo) > 80 then
    raise exception 'El cargo no puede superar 80 caracteres' using errcode = 'P0001';
  end if;
  if length(v_eleam_nombre) > 160 then
    raise exception 'El nombre del ELEAM no puede superar 160 caracteres' using errcode = 'P0001';
  end if;
  if length(v_email) > 254 then
    raise exception 'El email no puede superar 254 caracteres' using errcode = 'P0001';
  end if;
  if length(v_telefono) > 40 then
    raise exception 'El telefono no puede superar 40 caracteres' using errcode = 'P0001';
  end if;
  if v_num_residentes is not null and length(v_num_residentes) > 40 then
    raise exception 'El numero de residentes no puede superar 40 caracteres' using errcode = 'P0001';
  end if;

  select *
  into v_existing
  from public.demo_leads
  where lower(email) = v_email
    and estado in ('nuevo','contactado','demo_activo')
  order by creado_en desc
  limit 1;

  if found then
    if v_existing.demo_user_id is not null then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'account_approved', true,
        'estado', v_existing.estado,
        'lead_id', v_existing.id
      );
    end if;

    update public.demo_leads
    set nombre = v_nombre,
        cargo = v_cargo,
        eleam_nombre = v_eleam_nombre,
        telefono = v_telefono,
        num_residentes = v_num_residentes,
        utm_source = coalesce(left(nullif(trim(coalesce(p_utm_source, '')), ''), 128), utm_source),
        utm_medium = coalesce(left(nullif(trim(coalesce(p_utm_medium, '')), ''), 128), utm_medium),
        utm_campaign = coalesce(left(nullif(trim(coalesce(p_utm_campaign, '')), ''), 128), utm_campaign),
        pagina_origen = coalesce(left(nullif(trim(coalesce(p_pagina_origen, '')), ''), 256), pagina_origen),
        referrer = coalesce(left(nullif(trim(coalesce(p_referrer, '')), ''), 512), referrer)
    where id = v_existing.id
    returning * into v_lead;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'account_approved', false,
      'estado', v_lead.estado,
      'lead_id', v_lead.id
    );
  end if;

  insert into public.demo_leads (
    nombre, cargo, eleam_nombre, email, telefono, num_residentes,
    utm_source, utm_medium, utm_campaign, pagina_origen, referrer
  )
  values (
    v_nombre, v_cargo, v_eleam_nombre, v_email, v_telefono, v_num_residentes,
    left(nullif(trim(coalesce(p_utm_source, '')), ''), 128),
    left(nullif(trim(coalesce(p_utm_medium, '')), ''), 128),
    left(nullif(trim(coalesce(p_utm_campaign, '')), ''), 128),
    left(nullif(trim(coalesce(p_pagina_origen, '')), ''), 256),
    left(nullif(trim(coalesce(p_referrer, '')), ''), 512)
  )
  returning * into v_lead;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'account_approved', false,
    'estado', v_lead.estado,
    'lead_id', v_lead.id
  );
exception
  when unique_violation then
    raise exception 'Ya existe una solicitud activa para este email' using errcode = '23505';
end;
$$;

-- Estado de la solicitud de demo asociada a un correo. Lo usa el login
-- para mostrar un aviso claro cuando el usuario solicito un demo pero el
-- equipo aun no habilita su cuenta. No expone datos del lead, solo el estado.
create or replace function public.demo_lead_status(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.demo_leads
      where lower(email) = lower(nullif(trim(coalesce(p_email, '')), ''))
        and demo_user_id is not null
    ) then 'aprobado'
    when exists (
      select 1 from public.demo_leads
      where lower(email) = lower(nullif(trim(coalesce(p_email, '')), ''))
        and demo_user_id is null
        and estado in ('nuevo','contactado','demo_activo')
    ) then 'pendiente'
    else 'none'
  end;
$$;

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

create or replace function public.crm_normalize_prospect()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.eleam_nombre := nullif(trim(coalesce(new.eleam_nombre, '')), '');
  new.comuna := nullif(trim(coalesce(new.comuna, '')), '');
  new.telefono := nullif(regexp_replace(trim(coalesce(new.telefono, '')), '\s+', ' ', 'g'), '');
  new.email := lower(nullif(trim(coalesce(new.email, '')), ''));
  new.facebook_url := nullif(trim(coalesce(new.facebook_url, '')), '');
  new.instagram_url := nullif(trim(coalesce(new.instagram_url, '')), '');
  new.tiktok_url := nullif(trim(coalesce(new.tiktok_url, '')), '');
  new.cargo_contacto := nullif(trim(coalesce(new.cargo_contacto, '')), '');
  new.decision_maker_nombre := nullif(trim(coalesce(new.decision_maker_nombre, '')), '');
  new.decision_maker_cargo := nullif(trim(coalesce(new.decision_maker_cargo, '')), '');
  new.software_actual := nullif(trim(coalesce(new.software_actual, '')), '');
  new.dolor_principal := nullif(trim(coalesce(new.dolor_principal, '')), '');
  new.motivo_perdida := nullif(trim(coalesce(new.motivo_perdida, '')), '');
  new.competidor := nullif(trim(coalesce(new.competidor, '')), '');
  new.notas := nullif(trim(coalesce(new.notas, '')), '');

  if new.eleam_nombre is null then
    raise exception 'eleam_nombre es obligatorio' using errcode = 'P0001';
  end if;

  if new.no_contactar = true then
    new.estado := 'no_contactar';
  end if;

  if new.estado = 'no_contactar' then
    new.no_contactar := true;
  else
    new.no_contactar := false;
  end if;

  if new.estado = 'perdido' and new.motivo_perdida is null then
    raise exception 'motivo_perdida es obligatorio para prospectos perdidos' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function public.crm_log_prospect_stage_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.crm_stage_history (
      prospect_id, etapa_anterior, etapa_nueva, detalle, cambiado_por
    )
    values (
      new.id, null, new.estado, 'Prospecto creado', (select auth.uid())
    );
    return new;
  end if;

  if new.estado is distinct from old.estado then
    insert into public.crm_stage_history (
      prospect_id, etapa_anterior, etapa_nueva, detalle, cambiado_por
    )
    values (
      new.id, old.estado, new.estado, null, (select auth.uid())
    );
  end if;

  return new;
end;
$$;

create or replace function public.crm_sync_demo_lead_to_prospect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origen text;
  v_canal text;
  v_estado text;
  v_first_residents text;
  v_num_residentes integer;
  v_motivo_perdida text;
  v_touched_id uuid;
begin
  v_origen := case
    when lower(coalesce(new.utm_source, '')) = 'whatsapp'
      or lower(coalesce(new.cargo, '')) = 'contacto whatsapp'
      then 'whatsapp'
    else 'landing'
  end;

  v_canal := case when v_origen = 'whatsapp' then 'whatsapp' else 'email' end;

  v_estado := case new.estado
    when 'contactado' then 'contactado'
    when 'demo_activo' then 'prueba_activa'
    when 'convertido' then 'ganado'
    when 'descartado' then 'perdido'
    else 'nuevo'
  end;

  if new.estado = 'descartado' then
    v_motivo_perdida := 'Descartado desde solicitud de demo';
  end if;

  v_first_residents := substring(coalesce(new.num_residentes, '') from '[0-9]+');
  if v_first_residents is not null then
    v_num_residentes := v_first_residents::integer;
    if lower(coalesce(new.num_residentes, '')) like 'menos%' then
      v_num_residentes := greatest(v_num_residentes - 1, 1);
    end if;
  end if;

  update public.crm_prospects p
  set demo_lead_id = new.id,
      eleam_nombre = new.eleam_nombre,
      telefono = new.telefono,
      email = lower(new.email),
      origen = v_origen,
      canal_preferido = case
        when p.canal_preferido = 'desconocido' then v_canal
        else p.canal_preferido
      end,
      cargo_contacto = new.cargo,
      decision_maker_nombre = new.nombre,
      decision_maker_cargo = new.cargo,
      num_residentes = coalesce(v_num_residentes, p.num_residentes),
      estado = case
        when p.estado = 'no_contactar' then 'no_contactar'
        when v_estado in ('prueba_activa','ganado','perdido') then v_estado
        when p.estado in (
          'calificado','demo_agendada','demo_realizada','prueba_activa',
          'propuesta_enviada','negociacion','ganado','perdido'
        ) then p.estado
        else v_estado
      end,
      no_contactar = case when p.estado = 'no_contactar' then true else false end,
      motivo_perdida = case
        when v_estado = 'perdido' then coalesce(p.motivo_perdida, v_motivo_perdida)
        else p.motivo_perdida
      end,
      ultimo_contacto_en = coalesce(p.ultimo_contacto_en, new.creado_en),
      actualizado_en = now()
  where p.demo_lead_id = new.id
     or (
       p.demo_lead_id is null
       and p.email is not null
       and lower(p.email) = lower(new.email)
     )
  returning p.id into v_touched_id;

  if found then
    return new;
  end if;

  insert into public.crm_prospects (
    demo_lead_id, eleam_nombre, telefono, email, origen, canal_preferido,
    cargo_contacto, decision_maker_nombre, decision_maker_cargo, num_residentes,
    estado, motivo_perdida, ultimo_contacto_en, notas
  )
  values (
    new.id, new.eleam_nombre, new.telefono, lower(new.email), v_origen, v_canal,
    new.cargo, new.nombre, new.cargo, v_num_residentes,
    v_estado, v_motivo_perdida, new.creado_en,
    case
      when nullif(trim(coalesce(new.utm_campaign, '')), '') is null then null
      else 'Campana UTM: ' || new.utm_campaign
    end
  );

  return new;
end;
$$;

create or replace function public.crm_unsubscribe_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prospect record;
begin
  if p_token is null then
    return jsonb_build_object('ok', false, 'reason', 'token_invalido');
  end if;

  select id, email, no_contactar
  into v_prospect
  from public.crm_prospects
  where unsubscribe_token = p_token
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'token_invalido');
  end if;

  if v_prospect.no_contactar then
    return jsonb_build_object(
      'ok', true,
      'reason', 'ya_dado_de_baja',
      'email', v_prospect.email
    );
  end if;

  update public.crm_prospects
  set estado = 'no_contactar',
      no_contactar = true,
      actualizado_en = now()
  where id = v_prospect.id;

  update public.crm_campaign_members
  set estado = 'no_contactar',
      actualizado_en = now()
  where prospect_id = v_prospect.id;

  update public.crm_email_sends
  set estado = 'baja'
  where prospect_id = v_prospect.id
    and estado = 'enviado';

  insert into public.crm_interactions (
    prospect_id, tipo, canal, resumen, resultado
  )
  values (
    v_prospect.id,
    'sistema',
    'email',
    'Prospecto dado de baja mediante enlace de unsubscribe',
    'sistema'
  );

  return jsonb_build_object(
    'ok', true,
    'reason', 'baja_efectiva',
    'email', v_prospect.email
  );
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

create or replace function public.can_access_feature(p_feature_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_eleam_id uuid;
  v_rol text;
  v_eleam_enabled boolean;
  v_profile_enabled boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select eleam_id, rol
  into v_eleam_id, v_rol
  from public.profiles
  where id = v_uid;

  if v_rol = 'superadmin' then
    return true;
  end if;

  if v_eleam_id is null then
    return false;
  end if;

  select enabled
  into v_eleam_enabled
  from public.eleam_feature_permissions
  where eleam_id = v_eleam_id
    and rol = v_rol
    and feature_id = p_feature_id
  limit 1;

  if coalesce(v_eleam_enabled, true) = false then
    return false;
  end if;

  if v_rol in ('funcionario','familiar') then
    select enabled
    into v_profile_enabled
    from public.profile_feature_permissions
    where profile_id = v_uid
      and feature_id = p_feature_id
    limit 1;

    return coalesce(v_profile_enabled, true);
  end if;

  return true;
end;
$$;

create or replace function public.eleam_has_access(p_eleam_id uuid)
returns boolean
language sql
volatile
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
          e.plan = 'demo'
          and e.subscription_status = 'pendiente'
          and e.fecha_vencimiento_suscripcion is not null
          and e.fecha_vencimiento_suscripcion > now()
        )
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

create or replace function public.get_familiar_resident_snapshot(
  p_residente_id uuid,
  p_fecha date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fecha date := coalesce(p_fecha, current_date);
  v_residente jsonb;
  v_vitales jsonb;
  v_observaciones jsonb;
  v_visitas jsonb;
  v_cuidados jsonb;
  v_medicacion jsonb;
  v_plan_cuidado jsonb;
  v_evaluaciones jsonb;
begin
  if p_residente_id is null or not public.familiar_can_view_residente(p_residente_id) then
    raise exception 'No autorizado a ver este residente' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', r.id,
    'nombre', r.nombre,
    'apellido', r.apellido,
    'fecha_nacimiento', r.fecha_nacimiento,
    'estado', r.estado,
    'habitacion', h.codigo,
    'cama', c.codigo,
    'ubicacion_label', case
      when h.codigo is not null and c.codigo is not null then 'Hab. ' || h.codigo || ' · Cama ' || c.codigo
      when h.codigo is not null then 'Hab. ' || h.codigo
      when c.codigo is not null then 'Cama ' || c.codigo
      else null
    end,
    'cama_actual_id', r.cama_actual_id,
    'ubicacion', case
      when c.id is null then null
      else jsonb_build_object(
        'cama_id', c.id,
        'cama_codigo', c.codigo,
        'cama_nombre', c.nombre,
        'cama_estado', c.estado,
        'habitacion_id', h.id,
        'habitacion_codigo', h.codigo,
        'habitacion_nombre', h.nombre,
        'piso', h.piso,
        'sector', h.sector
      )
    end,
    'nivel_dependencia', r.nivel_dependencia,
    'fecha_ingreso', r.fecha_ingreso,
    'prevision', r.prevision,
    'diagnostico_principal', r.diagnostico_principal,
    'diagnosticos_secundarios', coalesce(to_jsonb(r.diagnosticos_secundarios), '[]'::jsonb),
    'alergias', coalesce(to_jsonb(r.alergias), '[]'::jsonb),
    'grupo_sanguineo', r.grupo_sanguineo,
    'indice_barthel', r.indice_barthel,
    'escala_katz', r.escala_katz,
    'parentesco', fr.parentesco
  )
  into v_residente
  from public.residentes r
  left join public.camas c on c.id = r.cama_actual_id
  left join public.habitaciones h on h.id = c.habitacion_id
  left join public.familiar_residentes fr
    on fr.residente_id = r.id
   and fr.profile_id = (select auth.uid())
  where r.id = p_residente_id;

  select coalesce(jsonb_agg(to_jsonb(v) order by v.fecha_hora desc), '[]'::jsonb)
  into v_vitales
  from (
    select
      id, fecha_hora, turno, presion_sistolica, presion_diastolica,
      frecuencia_cardiaca, frecuencia_respiratoria, temperatura,
      saturacion_oxigeno, glucosa, peso, dolor_escala, estado_conciencia,
      observaciones
    from public.signos_vitales
    where residente_id = p_residente_id
      and (fecha_hora at time zone 'America/Santiago')::date = v_fecha
    order by fecha_hora desc
    limit 12
  ) v;

  select coalesce(jsonb_agg(to_jsonb(o) order by o.fecha_hora desc), '[]'::jsonb)
  into v_observaciones
  from (
    select
      id,
      fecha_hora,
      turno,
      tipo,
      nullif(trim(resumen_familiar), '') as resumen,
      requiere_seguimiento,
      seguimiento_fecha,
      seguimiento_turno,
      seguimiento_estado
    from public.observaciones_diarias
    where residente_id = p_residente_id
      and visible_familiar = true
      and (fecha_hora at time zone 'America/Santiago')::date = v_fecha
    order by fecha_hora desc
    limit 30
  ) o;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.hora asc), '[]'::jsonb)
  into v_cuidados
  from (
    select
      t.id,
      t.fecha,
      t.turno,
      t.hora,
      t.estado,
      t.motivo_omision,
      t.requiere_seguimiento,
      t.reprogramada_para,
      a.categoria,
      nullif(trim(a.resumen_familiar), '') as titulo,
      nullif(trim(a.resumen_familiar), '') as resumen
    from public.tareas_cuidado t
    join public.plan_cuidado_actividades a on a.id = t.actividad_id
    where t.residente_id = p_residente_id
      and a.visible_familiar = true
      and t.fecha = v_fecha
    order by t.hora asc
    limit 40
  ) c;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.hora asc), '[]'::jsonb)
  into v_medicacion
  from (
    select
      ma.id,
      ma.fecha,
      ma.turno,
      ma.hora,
      ma.estado,
      ma.motivo_omision,
      ma.requiere_seguimiento,
      i.via,
      nullif(trim(i.resumen_familiar), '') as resumen
    from public.medicamentos_administraciones ma
    join public.medicamentos_indicaciones i on i.id = ma.indicacion_id
    where ma.residente_id = p_residente_id
      and i.visible_familiar = true
      and ma.fecha = v_fecha
    order by ma.hora asc
    limit 40
  ) m;

  select coalesce(jsonb_agg(to_jsonb(vis) order by vis.fecha_hora desc), '[]'::jsonb)
  into v_visitas
  from (
    select
      id,
      fecha_hora,
      duracion_min,
      notas,
      estado,
      validado_en,
      salida_anunciada_en,
      salida_hora,
      salida_validada_en
    from public.visitas_familiar
    where residente_id = p_residente_id
      and profile_id = (select auth.uid())
      and (fecha_hora at time zone 'America/Santiago')::date = v_fecha
    order by fecha_hora desc
    limit 20
  ) vis;

  select jsonb_build_object(
    'titulo',             titulo,
    'objetivos',          objetivos,
    'pauta_alimentacion', pauta_alimentacion,
    'pauta_hidratacion',  pauta_hidratacion,
    'restricciones',      restricciones,
    'riesgo_caidas',      riesgo_caidas,
    'riesgo_up',          riesgo_up,
    'version',            version,
    'actualizado_en',     actualizado_en
  )
  into v_plan_cuidado
  from public.planes_cuidado
  where residente_id = p_residente_id
    and estado = 'activo'
  limit 1;

  select coalesce(
    jsonb_object_agg(tipo, jsonb_build_object(
      'fecha_evaluacion', fecha_evaluacion,
      'proxima_evaluacion', proxima_evaluacion,
      'puntaje', puntaje,
      'resultado', resultado
    )),
    '{}'::jsonb
  )
  into v_evaluaciones
  from (
    select distinct on (tipo) tipo, fecha_evaluacion, proxima_evaluacion, puntaje, resultado
    from public.evaluaciones_clinicas
    where residente_id = p_residente_id
    order by tipo, fecha_evaluacion desc
  ) ultimas;

  return jsonb_build_object(
    'date', v_fecha,
    'resident', v_residente,
    'vitals', v_vitales,
    'observations', v_observaciones,
    'care', v_cuidados,
    'medications', v_medicacion,
    'visits', v_visitas,
    'care_plan', v_plan_cuidado,
    'evaluaciones', coalesce(v_evaluaciones, '{}'::jsonb),
    'generated_at', now()
  );
end;
$$;

revoke all on function public.get_familiar_resident_snapshot(uuid, date) from public;
grant execute on function public.get_familiar_resident_snapshot(uuid, date) to authenticated;

create or replace function public.listar_trazabilidad_residente(
  p_residente_id uuid,
  p_desde date default null,
  p_hasta date default null,
  p_tipos text[] default null,
  p_estado text default null,
  p_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_eleam_id uuid;
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 500));
  v_tipos text[] := coalesce(p_tipos, '{}'::text[]);
  v_result jsonb;
begin
  if p_residente_id is null then
    raise exception 'Residente requerido' using errcode = 'P0001';
  end if;

  select eleam_id into v_eleam_id
  from public.residentes
  where id = p_residente_id;

  if v_eleam_id is null then
    raise exception 'Residente no encontrado' using errcode = 'P0001';
  end if;

  if public.my_rol() not in ('admin_eleam','funcionario','superadmin')
     or not public.eleam_has_access(v_eleam_id)
     or (public.my_rol() <> 'superadmin' and public.my_eleam_id() is distinct from v_eleam_id) then
    raise exception 'No autorizado a ver trazabilidad de este residente' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'tipo', e.tipo,
    'fecha_hora', e.fecha_hora,
    'estado', e.estado,
    'titulo', e.titulo,
    'detalle_texto', e.detalle_texto,
    'entidad', e.entidad,
    'entidad_id', e.entidad_id,
    'responsable_id', e.responsable_id,
    'responsable_nombre', e.responsable_nombre,
    'prioridad_visual', case when e.estado in ('pendiente','pendiente_validacion','validacion') then 0 else 1 end
  ) order by case when e.estado in ('pendiente','pendiente_validacion','validacion') then 0 else 1 end asc, e.fecha_hora desc), '[]'::jsonb)
  into v_result
  from (
    select *
    from (
      select
        t.id,
        'cuidado'::text as tipo,
        coalesce(t.cumplida_en, t.reprogramada_para, ((t.fecha::timestamp + t.hora) at time zone 'America/Santiago')) as fecha_hora,
        t.estado,
        coalesce(a.titulo, 'Tarea de cuidado') as titulo,
        concat_ws(' · ', a.categoria, nullif(t.notas, ''), case when t.motivo_omision is not null then 'Motivo: ' || t.motivo_omision end) as detalle_texto,
        'tareas_cuidado'::text as entidad,
        t.id as entidad_id,
        t.cumplida_por as responsable_id,
        p.nombre as responsable_nombre
      from public.tareas_cuidado t
      join public.plan_cuidado_actividades a on a.id = t.actividad_id
      left join public.profiles p on p.id = t.cumplida_por
      where t.residente_id = p_residente_id

      union all

      select
        ma.id,
        'medicamentos'::text,
        coalesce(ma.validado_en, ma.administrado_en, ((ma.fecha::timestamp + ma.hora) at time zone 'America/Santiago')),
        ma.estado,
        coalesce(i.medicamento_nombre, 'Medicamento') as titulo,
        concat_ws(' · ', i.dosis, case when i.via is not null then 'vía ' || i.via end, nullif(ma.notas, ''), case when ma.motivo_omision is not null then 'Motivo: ' || ma.motivo_omision end),
        'medicamentos_administraciones'::text,
        ma.id,
        coalesce(ma.validado_por, ma.administrado_por),
        p.nombre
      from public.medicamentos_administraciones ma
      join public.medicamentos_indicaciones i on i.id = ma.indicacion_id
      left join public.profiles p on p.id = coalesce(ma.validado_por, ma.administrado_por)
      where ma.residente_id = p_residente_id

      union all

      select
        sv.id,
        'signos'::text,
        sv.fecha_hora,
        'realizado'::text,
        'Signos vitales'::text,
        concat_ws(' · ',
          case when sv.presion_sistolica is not null and sv.presion_diastolica is not null then 'P/A ' || sv.presion_sistolica || '/' || sv.presion_diastolica end,
          case when sv.frecuencia_cardiaca is not null then 'FC ' || sv.frecuencia_cardiaca end,
          case when sv.temperatura is not null then 'Temp ' || sv.temperatura end,
          nullif(sv.observaciones, '')
        ),
        'signos_vitales'::text,
        sv.id,
        sv.registrado_por,
        p.nombre
      from public.signos_vitales sv
      left join public.profiles p on p.id = sv.registrado_por
      where sv.residente_id = p_residente_id

      union all

      select
        o.id,
        case when o.requiere_seguimiento then 'seguimientos' else 'observaciones' end,
        o.fecha_hora,
        case when o.requiere_seguimiento then o.seguimiento_estado else 'realizado' end,
        case when o.requiere_seguimiento then 'Seguimiento pendiente' else 'Observación' end,
        concat_ws(' · ', o.tipo, nullif(o.descripcion, ''), nullif(o.acciones_tomadas, '')),
        'observaciones_diarias'::text,
        o.id,
        o.registrado_por,
        p.nombre
      from public.observaciones_diarias o
      left join public.profiles p on p.id = o.registrado_por
      where o.residente_id = p_residente_id

      union all

      select
        vf.id,
        'visitas'::text,
        vf.fecha_hora,
        vf.estado,
        'Visita'::text,
        concat_ws(' · ', case when vf.duracion_min is not null then vf.duracion_min || ' min' end, nullif(vf.notas, '')),
        'visitas_familiar'::text,
        vf.id,
        coalesce(vf.salida_validada_por, vf.validado_por, vf.registrado_por, vf.profile_id),
        p.nombre
      from public.visitas_familiar vf
      left join public.profiles p on p.id = coalesce(vf.salida_validada_por, vf.validado_por, vf.registrado_por, vf.profile_id)
      where vf.residente_id = p_residente_id

      union all

      select
        ca.id,
        'cama'::text,
        coalesce(ca.fecha_fin, ca.fecha_inicio),
        ca.estado,
        'Cambio de cama'::text,
        concat_ws(' · ', c.codigo, h.codigo, ca.motivo_fin, nullif(ca.notas, '')),
        'cama_asignaciones'::text,
        ca.id,
        coalesce(ca.cerrado_por, ca.creado_por),
        p.nombre
      from public.cama_asignaciones ca
      left join public.camas c on c.id = ca.cama_id
      left join public.habitaciones h on h.id = c.habitacion_id
      left join public.profiles p on p.id = coalesce(ca.cerrado_por, ca.creado_por)
      where ca.residente_id = p_residente_id

      union all

      select
        pa.id,
        'auditoria'::text,
        pa.realizado_en,
        'realizado'::text,
        'Auditoría de plan de cuidado'::text,
        concat_ws(' · ', pa.entidad, pa.accion, left(coalesce(pa.detalle::text, ''), 500)),
        pa.entidad,
        pa.entidad_id,
        pa.realizado_por,
        p.nombre
      from public.plan_cuidado_audit pa
      left join public.profiles p on p.id = pa.realizado_por
      where pa.residente_id = p_residente_id

      union all

      select
        maud.id,
        'auditoria'::text,
        maud.realizado_en,
        'realizado'::text,
        'Auditoría de medicamentos'::text,
        concat_ws(' · ', maud.entidad, maud.accion, left(coalesce(maud.detalle::text, ''), 500)),
        maud.entidad,
        maud.entidad_id,
        maud.realizado_por,
        p.nombre
      from public.medicamentos_audit maud
      left join public.profiles p on p.id = maud.realizado_por
      where maud.residente_id = p_residente_id

      union all

      select
        cau.id,
        'auditoria'::text,
        cau.realizado_en,
        'realizado'::text,
        'Auditoría de cama'::text,
        concat_ws(' · ', cau.accion, left(coalesce(cau.detalle::text, ''), 500)),
        'camas_audit'::text,
        cau.id,
        cau.realizado_por,
        p.nombre
      from public.camas_audit cau
      left join public.profiles p on p.id = cau.realizado_por
      where cau.residente_id = p_residente_id
    ) e
    where (cardinality(v_tipos) = 0 or e.tipo = any(v_tipos))
      and (p_estado is null or e.estado = p_estado)
      and (p_desde is null or (e.fecha_hora at time zone 'America/Santiago')::date >= p_desde)
      and (p_hasta is null or (e.fecha_hora at time zone 'America/Santiago')::date <= p_hasta)
    order by case when e.estado in ('pendiente','pendiente_validacion','validacion') then 0 else 1 end asc, e.fecha_hora desc
    limit v_limit
  ) e;

  return v_result;
end;
$$;

revoke all on function public.listar_trazabilidad_residente(uuid, date, date, text[], text, integer) from public;
grant execute on function public.listar_trazabilidad_residente(uuid, date, date, text[], text, integer) to authenticated;

revoke all on function public.familiar_can_view_cama(uuid) from public;
grant execute on function public.familiar_can_view_cama(uuid) to authenticated;

revoke all on function public.familiar_can_view_habitacion(uuid) from public;
grant execute on function public.familiar_can_view_habitacion(uuid) to authenticated;

revoke all on function public.habitacion_belongs_to_eleam(uuid, uuid) from public;
grant execute on function public.habitacion_belongs_to_eleam(uuid, uuid) to authenticated;

revoke all on function public.residente_belongs_to_eleam(uuid, uuid) from public;
grant execute on function public.residente_belongs_to_eleam(uuid, uuid) to authenticated;

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
    when 'crear_planes_cuidado'    then crear_planes_cuidado
    when 'editar_planes_cuidado'   then editar_planes_cuidado
    when 'completar_tareas_cuidado' then completar_tareas_cuidado
    when 'crear_indicaciones_medicamentos' then crear_indicaciones_medicamentos
    when 'editar_indicaciones_medicamentos' then editar_indicaciones_medicamentos
    when 'administrar_medicamentos' then administrar_medicamentos
    when 'validar_medicamentos_controlados' then validar_medicamentos_controlados
    when 'ajustar_stock_medicamentos'    then ajustar_stock_medicamentos
    when 'asignar_camas'                 then asignar_camas
    when 'editar_indicaciones_cuidado'  then editar_indicaciones_cuidado
    when 'aplicar_evaluaciones_clinicas' then aplicar_evaluaciones_clinicas
    when 'crear_eventos_adversos'        then crear_eventos_adversos
    when 'editar_eventos_adversos'       then editar_eventos_adversos
    when 'cerrar_eventos_adversos'       then cerrar_eventos_adversos
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

revoke all on function public.can_access_feature(text) from public;
grant execute on function public.can_access_feature(text) to authenticated;

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
  elsif new.subscription_status = 'pendiente' then
    new.pago_activo := (
      new.plan = 'demo'
      and new.fecha_vencimiento_suscripcion is not null
      and new.fecha_vencimiento_suscripcion > now()
    );
  elsif new.subscription_status = 'cancelado' then
    new.pago_activo := (
      new.fecha_vencimiento_suscripcion is not null
      and new.fecha_vencimiento_suscripcion > now()
    );
  elsif new.subscription_status in ('inactivo','vencido','pausado') then
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
  if new.estado not in ('activo','hospitalizado') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.eleam_id is not distinct from new.eleam_id
     and old.estado in ('activo','hospitalizado')
     and new.estado in ('activo','hospitalizado') then
    return new;
  end if;

  select coalesce(p.max_residentes, e.max_residentes), e.subscription_status
  into v_max, v_status
  from public.eleams e
  left join public.planes p on p.id = e.plan_id
  where e.id = new.eleam_id;

  if v_status is null or v_status not in ('activo','en_gracia','pendiente') then
    raise exception 'La suscripcion del ELEAM no esta activa (%). Activa el plan antes de agregar residentes.', coalesce(v_status, 'sin_estado')
      using errcode = 'P0001';
  end if;

  if v_max is not null then
    select count(*) into v_count
    from public.residentes
    where eleam_id = new.eleam_id
      and estado in ('activo','hospitalizado')
      and id is distinct from new.id;

    if v_count >= v_max then
      raise exception 'El plan permite máximo % residentes activos u hospitalizados', v_max
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
  v_pending integer;
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
      and id is distinct from new.id;

    select count(*) into v_pending
    from public.funcionario_invitaciones
    where eleam_id = new.eleam_id
      and coalesce(rol, 'funcionario') = 'funcionario'
      and usado = false
      and expira_en > now();

    if (v_count + v_pending) >= v_max then
      raise exception 'El plan permite máximo % funcionarios, incluyendo invitaciones pendientes', v_max
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.check_eleam_plan_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_residentes integer;
  v_max_funcionarios integer;
  v_residentes integer;
  v_funcionarios integer;
  v_invitaciones integer;
begin
  if new.id is null then
    return new;
  end if;

  select coalesce(p.max_residentes, new.max_residentes),
         coalesce(p.max_funcionarios, new.max_funcionarios)
  into v_max_residentes, v_max_funcionarios
  from (select 1) s
  left join public.planes p on p.id = new.plan_id;

  if v_max_residentes is not null then
    select count(*) into v_residentes
    from public.residentes
    where eleam_id = new.id
      and estado in ('activo','hospitalizado');

    if v_residentes > v_max_residentes then
      raise exception 'El plan elegido permite máximo % residentes activos u hospitalizados; el ELEAM ya usa %', v_max_residentes, v_residentes
        using errcode = 'P0001';
    end if;
  end if;

  if v_max_funcionarios is not null then
    select count(*) into v_funcionarios
    from public.profiles
    where eleam_id = new.id
      and rol = 'funcionario';

    select count(*) into v_invitaciones
    from public.funcionario_invitaciones
    where eleam_id = new.id
      and coalesce(rol, 'funcionario') = 'funcionario'
      and usado = false
      and expira_en > now();

    if (v_funcionarios + v_invitaciones) > v_max_funcionarios then
      raise exception 'El plan elegido permite máximo % funcionarios; el ELEAM ya usa % incluyendo invitaciones pendientes', v_max_funcionarios, (v_funcionarios + v_invitaciones)
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
  v_invitacion record;
  v_provision record;
  v_provision_id uuid := null;
  v_residente_id uuid := null;
  v_invitado_por uuid := null;
  v_telefono text := null;
  v_parentesco text := null;
  v_account_source text := coalesce(new.raw_app_meta_data->>'fichaeleam_account_source', '');
  v_is_qa_seed boolean := current_setting('app.allow_qa_seed_users', true) = 'on'
                          and v_account_source = 'qa_seed';
begin
  v_nombre := coalesce(
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Bootstrap del superadmin de plataforma. raw_app_meta_data solo lo
  -- escribe la Admin API / service role: este origen no es falsificable
  -- desde signUp ni OAuth, y es el unico camino para crear un superadmin.
  if v_account_source = 'platform_superadmin' then
    insert into public.profiles (id, nombre, email, rol, eleam_id)
    values (new.id, v_nombre, new.email, 'superadmin', null)
    on conflict (id) do update set
      nombre = excluded.nombre,
      email = excluded.email,
      rol = 'superadmin',
      eleam_id = null;
    return new;
  end if;

  -- Modo exclusivo para seed QA privado. No desactiva triggers ni requiere
  -- ser owner de auth.users. Solo se habilita dentro de la transaccion del
  -- seed mediante set_config('app.allow_qa_seed_users','on', true).
  if v_is_qa_seed then
    v_eleam_id := case
      when new.raw_app_meta_data->>'eleam_id_direct' is not null
      then (new.raw_app_meta_data->>'eleam_id_direct')::uuid
      else null
    end;
    v_rol := coalesce(nullif(trim(new.raw_app_meta_data->>'rol_direct'), ''), 'funcionario');
    v_residente_id := case
      when new.raw_app_meta_data->>'residente_id_direct' is not null
      then (new.raw_app_meta_data->>'residente_id_direct')::uuid
      else null
    end;
    v_telefono := nullif(trim(coalesce(new.raw_user_meta_data->>'telefono', '')), '');
    v_parentesco := nullif(trim(coalesce(new.raw_user_meta_data->>'parentesco', '')), '');

    if v_rol not in ('admin_eleam', 'funcionario', 'familiar', 'superadmin') then
      raise exception 'rol_direct invalido para seed QA: %', coalesce(v_rol, 'null')
        using errcode = '42501';
    end if;

    -- Si el seed crea primero auth.users y despues las entidades publicas,
    -- no abortamos: el mismo seed hace upsert de profiles mas abajo.
    if v_rol <> 'superadmin'
       and (v_eleam_id is null or not exists (select 1 from public.eleams where id = v_eleam_id)) then
      return new;
    end if;

    insert into public.profiles (id, nombre, email, telefono, rol, eleam_id, must_reset_password)
    values (
      new.id,
      v_nombre,
      new.email,
      v_telefono,
      v_rol,
      case when v_rol = 'superadmin' then null else v_eleam_id end,
      coalesce((new.raw_user_meta_data->>'must_reset_password')::boolean, false)
    )
    on conflict (id) do update set
      nombre              = excluded.nombre,
      email               = excluded.email,
      telefono            = excluded.telefono,
      rol                 = excluded.rol,
      eleam_id            = excluded.eleam_id,
      must_reset_password = excluded.must_reset_password;

    if v_rol = 'familiar'
       and v_residente_id is not null
       and exists (
         select 1 from public.residentes r
         where r.id = v_residente_id
           and r.eleam_id = v_eleam_id
           and r.estado in ('activo','hospitalizado')
       ) then
      insert into public.familiar_residentes (profile_id, residente_id, parentesco, creado_por)
      values (new.id, v_residente_id, v_parentesco, null)
      on conflict do nothing;
    end if;

    return new;
  end if;

  -- Provision one-time iniciado por Edge Functions antes de llamar a
  -- auth.admin.createUser. Supabase Auth puede no exponer app_metadata en el
  -- INSERT inicial de auth.users; este token server-side evita depender de ese
  -- timing y mantiene bloqueada la creacion client-side no autorizada.
  if nullif(trim(new.raw_user_meta_data->>'fichaeleam_provision_id'), '') is not null then
    begin
      v_provision_id := (new.raw_user_meta_data->>'fichaeleam_provision_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Provision de cuenta invalida' using errcode = '42501';
    end;

    select *
    into v_provision
    from public.auth_provision_requests apr
    where apr.id = v_provision_id
      and lower(apr.email) = v_email
      and apr.usado = false
      and apr.expira_en > now()
    for update;

    if not found then
      raise exception 'Provision de cuenta no encontrada o expirada'
        using errcode = '42501';
    end if;

    v_eleam_id := v_provision.eleam_id;
    v_rol := v_provision.rol;
    v_residente_id := v_provision.residente_id;
    v_account_source := v_provision.account_source;

    if not exists (select 1 from public.eleams where id = v_eleam_id) then
      raise exception 'Provision de cuenta invalida: ELEAM no encontrado'
        using errcode = '42501';
    end if;

    if v_rol = 'admin_eleam' and v_account_source not in ('demo_approved', 'superadmin_created') then
      raise exception 'Provision admin_eleam no autorizada para este flujo'
        using errcode = '42501';
    end if;

    if v_rol in ('funcionario', 'familiar') and not public.eleam_has_access(v_eleam_id) then
      raise exception 'El ELEAM no tiene acceso activo para crear esta cuenta'
        using errcode = '42501';
    end if;

    if v_rol = 'familiar' then
      if v_residente_id is null then
        raise exception 'Provision familiar sin residente asociado'
          using errcode = '42501';
      end if;

      if not exists (
        select 1
        from public.residentes r
        where r.id = v_residente_id
          and r.eleam_id = v_eleam_id
          and r.estado in ('activo','hospitalizado')
      ) then
        raise exception 'Provision familiar invalida para este residente'
          using errcode = '42501';
      end if;
    end if;

    update public.auth_provision_requests
    set usado = true,
        usado_en = now(),
        usado_por_auth_user_id = new.id
    where id = v_provision_id;

    return new;
  end if;

  -- Creacion directa autorizada por Edge Function.
  -- Importante: la autorizacion vive en raw_app_meta_data, no en
  -- raw_user_meta_data. El cliente puede escribir user_metadata al hacer
  -- signUp/OAuth; app_metadata solo debe escribirlo Admin API/service role.
  --
  -- Para usuarios creados con Admin API, el profile public.profiles lo
  -- provisiona la Edge Function que hizo createUser. Mantener este trigger
  -- como validador evita que Auth oculte errores de negocio/schema dentro de
  -- "Database error creating new user" y permite rollback explicito.
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

    if v_rol in ('funcionario', 'familiar') and not public.eleam_has_access(v_eleam_id) then
      raise exception 'El ELEAM no tiene acceso activo para crear esta cuenta'
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
          and r.estado in ('activo','hospitalizado')
      ) then
        raise exception 'residente_id_direct invalido para este ELEAM'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  -- Flujo Google OAuth: aceptar si el email coincide con un acceso
  -- pendiente generado por create-staff-user para usuarios Gmail.
  if new.raw_app_meta_data->>'provider' = 'google'
     or (new.raw_app_meta_data->'providers') @> '["google"]'::jsonb then

    select i.id, i.nombre, i.telefono, i.parentesco, lower(i.email) as email, i.rol, i.expira_en, i.usado, i.eleam_id, i.residente_id, i.creado_por
    into v_invitacion
    from public.funcionario_invitaciones i
    where lower(i.email) = v_email
      and i.usado = false
      and i.expira_en > now()
    order by i.creado_en desc
    limit 1;

    if found then
      v_eleam_id     := v_invitacion.eleam_id;
      v_rol          := coalesce(v_invitacion.rol, 'funcionario');
      v_residente_id := v_invitacion.residente_id;
      v_invitado_por := v_invitacion.creado_por;
      v_nombre       := coalesce(nullif(trim(v_invitacion.nombre), ''), v_nombre);
      v_telefono     := nullif(trim(coalesce(v_invitacion.telefono, '')), '');
      v_parentesco   := nullif(trim(coalesce(v_invitacion.parentesco, '')), '');

      if not public.eleam_has_access(v_eleam_id) then
        raise exception 'El acceso pendiente pertenece a un ELEAM sin acceso activo'
          using errcode = '42501';
      end if;

      if v_rol = 'familiar' then
        if v_residente_id is null then
          raise exception 'Acceso familiar sin residente asociado'
            using errcode = '42501';
        end if;
        if not exists (
          select 1 from public.residentes r
          where r.id = v_residente_id
            and r.eleam_id = v_eleam_id
            and r.estado in ('activo','hospitalizado')
        ) then
          raise exception 'El residente asociado al acceso ya no esta activo'
            using errcode = '42501';
        end if;
      end if;

      update public.funcionario_invitaciones
      set usado = true, usado_en = now()
      where id = v_invitacion.id;

      insert into public.profiles (id, nombre, email, telefono, rol, eleam_id, must_reset_password)
      values (new.id, v_nombre, new.email, v_telefono, v_rol, v_eleam_id, false)
      on conflict (id) do update set
        nombre              = excluded.nombre,
        email               = excluded.email,
        telefono            = excluded.telefono,
        rol                 = excluded.rol,
        eleam_id            = excluded.eleam_id,
        must_reset_password = false;

      if v_rol = 'familiar' and v_residente_id is not null then
        insert into public.familiar_residentes (profile_id, residente_id, parentesco, creado_por)
        values (new.id, v_residente_id, v_parentesco, v_invitado_por)
        on conflict do nothing;
      end if;

      return new;
    end if;

    if exists (
      select 1
      from public.demo_leads dl
      where lower(dl.email) = v_email
        and dl.demo_user_id is null
        and dl.estado in ('nuevo','contactado','demo_activo')
      order by dl.creado_en desc
      limit 1
    ) then
      raise exception 'DEMO_PENDING: Tu demo esta registrado, pero el login se habilita cuando el equipo apruebe tu cuenta. Te avisaremos cuando el acceso este listo.'
        using errcode = '42501';
    end if;
  end if;

  raise exception 'Cuenta no autorizada. Debe ser aprobada por superadmin o creada por un ELEAM activo.'
    using errcode = '42501';
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
  if p_eleam_id is null or not exists (select 1 from public.eleams where id = p_eleam_id) then
    raise exception 'ELEAM no encontrado para provisionar requisitos SEREMI'
      using errcode = 'P0001';
  end if;

  if (select auth.uid()) is not null
     and not public.is_superadmin()
     and p_eleam_id is distinct from public.my_eleam_id() then
    raise exception 'No autorizado a provisionar requisitos para este ELEAM'
      using errcode = '42501';
  end if;

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

create or replace function public.acred_on_requisito_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.acred_requisitos_eleam (eleam_id, requisito_id, estado)
  select e.id, new.id, 'pendiente'
  from public.eleams e
  on conflict (eleam_id, requisito_id) do nothing;

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
  if p_eleam_id is null or not exists (select 1 from public.eleams where id = p_eleam_id) then
    raise exception 'ELEAM no encontrado para marcar vencidos'
      using errcode = 'P0001';
  end if;

  if (select auth.uid()) is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if not public.is_superadmin()
     and p_eleam_id is distinct from public.my_eleam_id() then
    raise exception 'No autorizado a marcar vencidos para este ELEAM'
      using errcode = '42501';
  end if;

  update public.acred_requisitos_eleam
  set estado = 'vencido'
  where eleam_id = p_eleam_id
    and estado = 'vigente'
    and fecha_vencimiento is not null
    and fecha_vencimiento < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

drop function if exists public.registrar_pago_y_activar_eleam(uuid, integer, text, date, date, text, text);

create or replace function public.registrar_pago_y_activar_eleam(
  p_eleam_id uuid,
  p_monto integer,
  p_plan text,
  p_plan_codigo text,
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
  v_plan_id uuid;
  v_plan_codigo text;
  v_plan_max_residentes integer;
  v_plan_max_funcionarios integer;
  v_eleam_max_residentes integer;
  v_eleam_max_funcionarios integer;
  v_residentes integer;
  v_funcionarios integer;
  v_invitaciones integer;
begin
  if not public.is_superadmin() then
    raise exception 'Solo superadmin puede registrar pagos' using errcode = '42501';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto invalido' using errcode = 'P0001';
  end if;

  if p_plan is null or p_plan not in ('mensual','anual') then
    raise exception 'Plan de pago invalido' using errcode = 'P0001';
  end if;

  if p_plan_codigo is null or btrim(p_plan_codigo) = '' then
    raise exception 'Plan comercial obligatorio' using errcode = 'P0001';
  end if;
  p_plan_codigo := lower(btrim(p_plan_codigo));

  if p_fecha_inicio is null then
    raise exception 'Fecha de inicio obligatoria' using errcode = 'P0001';
  end if;

  if p_fecha_fin is not null and p_fecha_fin < p_fecha_inicio then
    raise exception 'Fecha de fin no puede ser anterior a fecha de inicio' using errcode = 'P0001';
  end if;

  select max_residentes, max_funcionarios
  into v_eleam_max_residentes, v_eleam_max_funcionarios
  from public.eleams
  where id = p_eleam_id;

  if not found then
    raise exception 'ELEAM no encontrado' using errcode = 'P0001';
  end if;

  if p_plan_codigo = 'institucional' then
    v_plan_id := null;
    v_plan_codigo := 'institucional';
    v_plan_max_residentes := v_eleam_max_residentes;
    v_plan_max_funcionarios := v_eleam_max_funcionarios;
  else
    select id, codigo, max_residentes, max_funcionarios
    into v_plan_id, v_plan_codigo, v_plan_max_residentes, v_plan_max_funcionarios
    from public.planes
    where codigo = p_plan_codigo
      and activo = true
    limit 1;

    if not found then
      raise exception 'Plan comercial no encontrado o inactivo: %', p_plan_codigo
        using errcode = 'P0001';
    end if;
  end if;

  select count(*) into v_residentes
  from public.residentes
  where eleam_id = p_eleam_id
    and estado in ('activo','hospitalizado');

  if v_plan_max_residentes is not null and v_residentes > v_plan_max_residentes then
    raise exception 'El plan % permite máximo % residentes activos u hospitalizados; el ELEAM ya usa %', v_plan_codigo, v_plan_max_residentes, v_residentes
      using errcode = 'P0001';
  end if;

  select count(*) into v_funcionarios
  from public.profiles
  where eleam_id = p_eleam_id
    and rol = 'funcionario';

  select count(*) into v_invitaciones
  from public.funcionario_invitaciones
  where eleam_id = p_eleam_id
    and coalesce(rol, 'funcionario') = 'funcionario'
    and usado = false
    and expira_en > now();

  if v_plan_max_funcionarios is not null and (v_funcionarios + v_invitaciones) > v_plan_max_funcionarios then
    raise exception 'El plan % permite máximo % funcionarios; el ELEAM ya usa % incluyendo invitaciones pendientes', v_plan_codigo, v_plan_max_funcionarios, (v_funcionarios + v_invitaciones)
      using errcode = 'P0001';
  end if;

  insert into public.pagos (
    eleam_id, plan_id, monto, plan, fecha_inicio, fecha_fin,
    metodo_pago, notas, estado, registrado_por
  )
  values (
    p_eleam_id, v_plan_id, p_monto, p_plan, p_fecha_inicio, p_fecha_fin,
    p_metodo_pago, p_notas, 'completado', v_user
  )
  returning id into v_pago_id;

  update public.eleams
  set pago_activo = true,
      plan = p_plan,
      plan_id = v_plan_id,
      subscription_status = 'activo',
      fecha_pago = now(),
      fecha_vencimiento_suscripcion = p_fecha_fin::timestamptz,
      proximo_cobro_en = p_fecha_fin::timestamptz,
      crm_estado = 'cliente_activo',
      riesgo_churn = case when riesgo_churn = 'alto' then 'medio' else riesgo_churn end,
      ultimo_contacto = now()
  where id = p_eleam_id;

  update public.demo_leads dl
  set estado = 'convertido'
  where dl.demo_user_id in (
    select p.id
    from public.profiles p
    where p.eleam_id = p_eleam_id
      and p.rol = 'admin_eleam'
  )
    and dl.estado <> 'convertido';

  insert into public.crm_interactions (
    eleam_id, tipo, canal, resumen, resultado, creado_por
  )
  values (
    p_eleam_id, 'sistema', 'sistema',
    'Pago registrado por ' || coalesce(p_metodo_pago, 'metodo no especificado') ||
      ' - ' || p_monto::text || ' CLP - plan ' || v_plan_codigo || ' (' || p_plan || ')',
    'positivo', v_user
  );

  return jsonb_build_object(
    'pago_id', v_pago_id,
    'eleam_id', p_eleam_id,
    'plan_id', v_plan_id,
    'plan_codigo', v_plan_codigo,
    'fecha_fin', p_fecha_fin
  );
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

create or replace function public.cuidado_tipo_observacion(p_categoria text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_categoria
    when 'alimentacion' then 'alimentacion'
    when 'hidratacion' then 'alimentacion'
    when 'higiene' then 'higiene'
    when 'bano' then 'higiene'
    when 'movilidad' then 'actividad'
    when 'cambios_posicion' then 'cambio_posicion'
    when 'eliminacion' then 'eliminacion'
    when 'actividad' then 'actividad'
    else 'observacion_general'
  end;
$$;

create or replace function public.crear_rutinas_cuidado_desde_presets(
  p_plan_id uuid,
  p_presets jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_plan public.planes_cuidado%rowtype;
  v_preset jsonb;
  v_activity jsonb;
  v_schedule jsonb;
  v_activity_id uuid;
  v_created integer := 0;
  v_skipped integer := 0;
  v_key text;
  v_dias_semana smallint[];
  v_dias_mes smallint[];
  v_visible_familiar boolean;
  v_resumen_familiar text;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if not found or v_profile.eleam_id is null then
    raise exception 'Tu cuenta no tiene ELEAM asociado.';
  end if;

  select * into v_plan
  from public.planes_cuidado
  where id = p_plan_id
    and estado = 'activo';

  if not found then
    raise exception 'Plan de cuidado no encontrado.';
  end if;

  if v_plan.eleam_id <> v_profile.eleam_id and not public.is_superadmin() then
    raise exception 'No puedes modificar este plan de cuidado.';
  end if;

  if not public.is_superadmin()
     and not (public.funcionario_can('crear_planes_cuidado') or public.funcionario_can('editar_planes_cuidado')) then
    raise exception 'No tienes permiso para crear rutinas de cuidado.';
  end if;

  if jsonb_typeof(coalesce(p_presets, '[]'::jsonb)) <> 'array' then
    raise exception 'Las rutinas deben enviarse como arreglo JSON.';
  end if;

  for v_preset in select value from jsonb_array_elements(coalesce(p_presets, '[]'::jsonb))
  loop
    v_activity := coalesce(v_preset -> 'activity', '{}'::jsonb);
    v_schedule := coalesce(v_preset -> 'schedule', '{}'::jsonb);
    v_key := lower(coalesce(v_activity ->> 'categoria', '') || ':' || coalesce(v_activity ->> 'titulo', ''));

    if exists (
      select 1
      from public.plan_cuidado_actividades a
      where a.plan_id = v_plan.id
        and a.activo = true
        and lower(a.categoria || ':' || a.titulo) = v_key
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_visible_familiar := coalesce((v_activity ->> 'visible_familiar')::boolean, false);
    v_resumen_familiar := nullif(trim(coalesce(v_activity ->> 'resumen_familiar', '')), '');
    if v_visible_familiar and v_resumen_familiar is null then
      v_visible_familiar := false;
    end if;

    insert into public.plan_cuidado_actividades (
      eleam_id, residente_id, plan_id, categoria, titulo,
      descripcion, instrucciones, prioridad, requiere_observacion,
      visible_familiar, resumen_familiar, activo,
      creado_por, actualizado_por
    )
    values (
      v_plan.eleam_id,
      v_plan.residente_id,
      v_plan.id,
      v_activity ->> 'categoria',
      v_activity ->> 'titulo',
      nullif(trim(coalesce(v_activity ->> 'descripcion', '')), ''),
      nullif(trim(coalesce(v_activity ->> 'instrucciones', '')), ''),
      coalesce(v_activity ->> 'prioridad', 'media'),
      coalesce((v_activity ->> 'requiere_observacion')::boolean, false),
      v_visible_familiar,
      case when v_visible_familiar then v_resumen_familiar else null end,
      true,
      v_user_id,
      v_user_id
    )
    returning id into v_activity_id;

    select array_agg(value::smallint order by value::smallint)
      into v_dias_semana
    from jsonb_array_elements_text(
      case when jsonb_typeof(v_schedule -> 'dias_semana') = 'array' then v_schedule -> 'dias_semana' else '[]'::jsonb end
    );

    select array_agg(value::smallint order by value::smallint)
      into v_dias_mes
    from jsonb_array_elements_text(
      case when jsonb_typeof(v_schedule -> 'dias_mes') = 'array' then v_schedule -> 'dias_mes' else '[]'::jsonb end
    );

    insert into public.plan_cuidado_horarios (
      eleam_id, residente_id, actividad_id, frecuencia,
      dias_semana, dias_mes, fecha_unica, hora, turno,
      tolerancia_min, activo
    )
    values (
      v_plan.eleam_id,
      v_plan.residente_id,
      v_activity_id,
      coalesce(v_schedule ->> 'frecuencia', 'diaria'),
      case when coalesce(v_schedule ->> 'frecuencia', 'diaria') = 'semanal' then v_dias_semana else null end,
      case when coalesce(v_schedule ->> 'frecuencia', 'diaria') = 'mensual' then v_dias_mes else null end,
      case when coalesce(v_schedule ->> 'frecuencia', 'diaria') = 'una_vez' then (v_schedule ->> 'fecha_unica')::date else null end,
      coalesce(v_schedule ->> 'hora', '09:00')::time,
      coalesce(v_schedule ->> 'turno', 'mañana'),
      greatest(0, least(720, coalesce((v_schedule ->> 'tolerancia_min')::integer, 60))),
      coalesce((v_schedule ->> 'activo')::boolean, true)
    );

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('created', v_created, 'skipped', v_skipped);
end;
$$;

create or replace function public.registrar_signos_vitales(
  p_residente_id uuid,
  p_fecha_hora timestamptz default now(),
  p_turno text default null,
  p_presion_sistolica integer default null,
  p_presion_diastolica integer default null,
  p_frecuencia_cardiaca integer default null,
  p_frecuencia_respiratoria integer default null,
  p_temperatura numeric default null,
  p_saturacion_oxigeno integer default null,
  p_glucosa integer default null,
  p_peso numeric default null,
  p_dolor_escala integer default null,
  p_estado_conciencia text default null,
  p_observaciones text default null,
  p_requiere_seguimiento boolean default false,
  p_seguimiento_fecha date default null,
  p_seguimiento_turno text default null
)
returns public.signos_vitales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_residente public.residentes;
  v_signos public.signos_vitales;
  v_resumen text;
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_residente_id is null then
    raise exception 'Residente obligatorio' using errcode = 'P0001';
  end if;

  if p_turno is not null and p_turno not in ('mañana','tarde','noche') then
    raise exception 'Turno invalido' using errcode = 'P0001';
  end if;

  if p_requiere_seguimiento
     and (
       p_seguimiento_fecha is null
       or p_seguimiento_turno is null
       or p_seguimiento_turno not in ('mañana','tarde','noche')
     ) then
    raise exception 'Fecha y turno de seguimiento son obligatorios' using errcode = 'P0001';
  end if;

  select *
  into v_residente
  from public.residentes
  where id = p_residente_id;

  if not found then
    raise exception 'Residente no encontrado' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_residente.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_residente.eleam_id)
       or not public.funcionario_can('crear_signos_vitales') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  insert into public.signos_vitales (
    residente_id, fecha_hora, turno, presion_sistolica, presion_diastolica,
    frecuencia_cardiaca, frecuencia_respiratoria, temperatura, saturacion_oxigeno,
    glucosa, peso, dolor_escala, estado_conciencia, observaciones, registrado_por
  )
  values (
    p_residente_id,
    coalesce(p_fecha_hora, now()),
    p_turno,
    p_presion_sistolica,
    p_presion_diastolica,
    p_frecuencia_cardiaca,
    p_frecuencia_respiratoria,
    p_temperatura,
    p_saturacion_oxigeno,
    p_glucosa,
    p_peso,
    p_dolor_escala,
    p_estado_conciencia,
    nullif(trim(coalesce(p_observaciones, '')), ''),
    v_user
  )
  returning * into v_signos;

  if p_requiere_seguimiento then
    v_resumen := concat_ws(
      ' · ',
      case
        when p_presion_sistolica is not null or p_presion_diastolica is not null
        then 'PA ' || coalesce(p_presion_sistolica::text, '-') || '/' || coalesce(p_presion_diastolica::text, '-')
        else null
      end,
      case when p_frecuencia_cardiaca is not null then 'FC ' || p_frecuencia_cardiaca::text else null end,
      case when p_frecuencia_respiratoria is not null then 'FR ' || p_frecuencia_respiratoria::text else null end,
      case when p_temperatura is not null then 'Temp ' || p_temperatura::text || ' C' else null end,
      case when p_saturacion_oxigeno is not null then 'SatO2 ' || p_saturacion_oxigeno::text || '%' else null end,
      case when p_glucosa is not null then 'Glucosa ' || p_glucosa::text else null end,
      case when p_dolor_escala is not null then 'Dolor ' || p_dolor_escala::text || '/10' else null end
    );

    insert into public.observaciones_diarias (
      residente_id, fecha_hora, turno, tipo, descripcion,
      acciones_tomadas, requiere_seguimiento, seguimiento_fecha,
      seguimiento_turno, seguimiento_estado, visible_familiar, registrado_por
    )
    values (
      p_residente_id,
      coalesce(p_fecha_hora, now()),
      p_turno,
      'observacion_general',
      'Seguimiento de signos vitales' ||
        case when nullif(trim(coalesce(v_resumen, '')), '') is not null then ': ' || v_resumen else '' end,
      nullif(trim(coalesce(p_observaciones, '')), ''),
      true,
      p_seguimiento_fecha,
      p_seguimiento_turno,
      'pendiente',
      false,
      v_user
    );
  end if;

  return v_signos;
end;
$$;

-- Sincroniza el snapshot de la última escala funcional en residentes.indice_barthel
-- y residentes.escala_katz al insertar/actualizar una evaluación más reciente.
create or replace function public.sync_resumen_evaluacion_residente()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_max_fecha date;
begin
  select max(fecha_evaluacion)
  into v_max_fecha
  from public.evaluaciones_clinicas
  where residente_id = new.residente_id
    and tipo = new.tipo;

  if v_max_fecha is null or new.fecha_evaluacion < v_max_fecha then
    return new;
  end if;

  if new.tipo = 'barthel' then
    update public.residentes
       set indice_barthel = new.puntaje,
           actualizado_en = now()
     where id = new.residente_id;
  elsif new.tipo = 'katz' then
    update public.residentes
       set escala_katz = new.resultado,
           actualizado_en = now()
     where id = new.residente_id;
  end if;

  return new;
end;
$$;

-- Intervalos MINSAL en días por motivo de reevaluación.
create or replace function public.evaluacion_intervalo_dias(p_motivo text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case coalesce(p_motivo, 'rutina')
    when 'ingreso'              then 30
    when 'rutina'               then 180
    when 'post_hospitalizacion' then 7
    when 'caida'                then 14
    when 'cambio_clinico'       then 30
    when 'solicitud_medica'     then 30
    else 180
  end;
$$;

-- Registra una evaluación Barthel o Katz con puntaje, resultado y próxima fecha.
-- Reutiliza eleam_has_access + funcionario_can('aplicar_evaluaciones_clinicas').
create or replace function public.registrar_evaluacion_clinica(
  p_residente_id uuid,
  p_tipo text,
  p_puntaje integer,
  p_resultado text,
  p_detalle jsonb,
  p_motivo text default 'rutina',
  p_observaciones text default null,
  p_fecha_evaluacion date default current_date
)
returns public.evaluaciones_clinicas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_residente public.residentes;
  v_row public.evaluaciones_clinicas;
  v_proxima date;
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_residente_id is null then
    raise exception 'Residente obligatorio' using errcode = 'P0001';
  end if;

  if p_tipo is null or p_tipo not in ('barthel','katz') then
    raise exception 'Tipo de evaluacion invalido' using errcode = 'P0001';
  end if;

  if coalesce(p_motivo, 'rutina') not in ('ingreso','rutina','post_hospitalizacion','caida','cambio_clinico','solicitud_medica') then
    raise exception 'Motivo invalido' using errcode = 'P0001';
  end if;

  if p_detalle is null or jsonb_typeof(p_detalle) <> 'object' then
    raise exception 'Detalle de la evaluacion invalido' using errcode = 'P0001';
  end if;

  if p_resultado is null or length(trim(p_resultado)) = 0 then
    raise exception 'Resultado obligatorio' using errcode = 'P0001';
  end if;

  if p_tipo = 'barthel' and (p_puntaje is null or p_puntaje < 0 or p_puntaje > 100) then
    raise exception 'Puntaje Barthel fuera de rango' using errcode = 'P0001';
  end if;

  if p_tipo = 'katz' and (p_puntaje is null or p_puntaje < 0 or p_puntaje > 6) then
    raise exception 'Puntaje Katz fuera de rango' using errcode = 'P0001';
  end if;

  select *
  into v_residente
  from public.residentes
  where id = p_residente_id;

  if not found then
    raise exception 'Residente no encontrado' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_residente.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_residente.eleam_id)
       or not public.funcionario_can('aplicar_evaluaciones_clinicas') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  v_proxima := coalesce(p_fecha_evaluacion, current_date)
               + (public.evaluacion_intervalo_dias(coalesce(p_motivo, 'rutina')) || ' days')::interval;

  insert into public.evaluaciones_clinicas (
    eleam_id, residente_id, tipo, fecha_evaluacion, motivo, puntaje, resultado,
    detalle, observaciones, proxima_evaluacion, evaluado_por
  )
  values (
    v_residente.eleam_id,
    p_residente_id,
    p_tipo,
    coalesce(p_fecha_evaluacion, current_date),
    coalesce(p_motivo, 'rutina'),
    p_puntaje,
    p_resultado,
    p_detalle,
    nullif(trim(coalesce(p_observaciones, '')), ''),
    v_proxima,
    v_user
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.registrar_evaluacion_clinica(uuid, text, integer, text, jsonb, text, text, date) from public;
grant execute on function public.registrar_evaluacion_clinica(uuid, text, integer, text, jsonb, text, text, date) to authenticated;

-- Listado de evaluaciones vencidas/próximas del ELEAM (usado por dashboard).
create or replace function public.evaluaciones_pendientes_eleam(p_horizonte_dias integer default 30)
returns table (
  residente_id uuid,
  residente_nombre text,
  tipo text,
  ultima_fecha date,
  proxima_evaluacion date,
  dias_restantes integer,
  puntaje integer,
  resultado text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_eleam_id uuid;
begin
  if (select auth.uid()) is null then
    return;
  end if;

  v_eleam_id := public.my_eleam_id();

  if v_eleam_id is null then
    return;
  end if;

  if not public.is_superadmin() and not public.eleam_has_access(v_eleam_id) then
    return;
  end if;

  return query
  with ultimas as (
    select distinct on (e.residente_id, e.tipo)
      e.residente_id,
      e.tipo,
      e.fecha_evaluacion,
      e.proxima_evaluacion,
      e.puntaje,
      e.resultado
    from public.evaluaciones_clinicas e
    join public.residentes r on r.id = e.residente_id
    where r.eleam_id = v_eleam_id
      and r.estado in ('activo','hospitalizado')
    order by e.residente_id, e.tipo, e.fecha_evaluacion desc
  )
  select
    u.residente_id,
    trim(coalesce(r.nombre, '') || ' ' || coalesce(r.apellido, '')) as residente_nombre,
    u.tipo,
    u.fecha_evaluacion,
    u.proxima_evaluacion,
    (u.proxima_evaluacion - current_date)::integer,
    u.puntaje,
    u.resultado
  from ultimas u
  join public.residentes r on r.id = u.residente_id
  where u.proxima_evaluacion <= current_date + (greatest(p_horizonte_dias, 0) || ' days')::interval
  order by u.proxima_evaluacion asc, r.apellido asc;
end;
$$;

revoke all on function public.evaluaciones_pendientes_eleam(integer) from public;
grant execute on function public.evaluaciones_pendientes_eleam(integer) to authenticated;

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
    and (public.is_superadmin() or h.eleam_id = v_eleam_id)
    and (p_turno is null or h.turno = p_turno)
    and (
      h.frecuencia = 'diaria'
      or (h.frecuencia = 'semanal' and extract(isodow from p_fecha)::smallint = any(h.dias_semana))
      or (h.frecuencia = 'mensual' and extract(day from p_fecha)::smallint = any(h.dias_mes))
      or (h.frecuencia = 'una_vez' and h.fecha_unica = p_fecha)
    )
    and not exists (
      select 1
      from public.tareas_cuidado t
      where t.horario_id = h.id
        and (
          p_fecha = t.fecha
          or p_fecha = coalesce(t.fecha_original, t.fecha)
          or p_fecha = any(
            case
              when cardinality(coalesce(t.fechas_programadas, '{}'::date[])) = 0
              then array[coalesce(t.fecha_original, t.fecha)]::date[]
              else t.fechas_programadas
            end
          )
        )
    )
  on conflict (horario_id, fecha) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.completar_tarea_cuidado(
  p_tarea_id uuid,
  p_estado text,
  p_notas text default null,
  p_motivo_omision text default null,
  p_requiere_seguimiento boolean default false,
  p_seguimiento_fecha date default null,
  p_seguimiento_turno text default null
)
returns public.tareas_cuidado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_row record;
  v_obs_id uuid;
  v_updated public.tareas_cuidado;
  v_requires_followup boolean;
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_estado is null or p_estado not in ('cumplida','omitida') then
    raise exception 'Estado invalido' using errcode = 'P0001';
  end if;

  select
    t.*,
    a.titulo as actividad_titulo,
    a.categoria as actividad_categoria,
    a.requiere_observacion as actividad_requiere_observacion
  into v_row
  from public.tareas_cuidado t
  join public.plan_cuidado_actividades a on a.id = t.actividad_id
  where t.id = p_tarea_id
  for update;

  if not found then
    raise exception 'Tarea no encontrada' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_row.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_row.eleam_id)
       or not public.funcionario_can('completar_tareas_cuidado') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  if v_row.estado not in ('pendiente','reprogramada') then
    raise exception 'La tarea ya fue cerrada' using errcode = 'P0001';
  end if;

  if p_estado = 'omitida'
     and (
       p_motivo_omision is null
       or p_motivo_omision not in ('rechazo','no_disponible','contraindicado','residente_ausente','otro')
     ) then
    raise exception 'Motivo de omision obligatorio' using errcode = 'P0001';
  end if;

  v_requires_followup := coalesce(p_requiere_seguimiento, false) or coalesce(v_row.actividad_requiere_observacion, false);

  if v_requires_followup
     and (
       p_seguimiento_fecha is null
       or p_seguimiento_turno is null
       or p_seguimiento_turno not in ('mañana','tarde','noche')
     ) then
    raise exception 'Fecha y turno de seguimiento son obligatorios' using errcode = 'P0001';
  end if;

  update public.tareas_cuidado
  set estado = p_estado,
      motivo_omision = case when p_estado = 'omitida' then p_motivo_omision else null end,
      notas = nullif(trim(coalesce(p_notas, '')), ''),
      requiere_seguimiento = v_requires_followup,
      cumplida_por = v_user,
      cumplida_en = now(),
      actualizado_en = now()
  where id = p_tarea_id
  returning * into v_updated;

  if v_updated.requiere_seguimiento then
    insert into public.observaciones_diarias (
      residente_id, fecha_hora, turno, tipo, descripcion,
      acciones_tomadas, requiere_seguimiento, seguimiento_fecha,
      seguimiento_turno, seguimiento_estado, visible_familiar, registrado_por
    )
    values (
      v_row.residente_id,
      now(),
      v_row.turno,
      public.cuidado_tipo_observacion(v_row.actividad_categoria),
      'Tarea de cuidado ' || case when p_estado = 'omitida' then 'omitida' else 'cumplida' end ||
        ': ' || v_row.actividad_titulo,
      nullif(trim(coalesce(p_notas, '')), ''),
      true,
      p_seguimiento_fecha,
      p_seguimiento_turno,
      'pendiente',
      false,
      v_user
    )
    returning id into v_obs_id;

    update public.tareas_cuidado
    set observacion_id = v_obs_id
    where id = p_tarea_id
    returning * into v_updated;
  end if;

  insert into public.plan_cuidado_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  )
  values (
    v_row.eleam_id, v_row.residente_id, 'tareas_cuidado', p_tarea_id, p_estado,
    jsonb_build_object(
      'notas', p_notas,
      'motivo_omision', p_motivo_omision,
      'seguimiento_fecha', p_seguimiento_fecha,
      'seguimiento_turno', p_seguimiento_turno
    ),
    v_user
  );

  return v_updated;
end;
$$;

create or replace function public.reprogramar_tarea_cuidado(
  p_tarea_id uuid,
  p_fecha date,
  p_turno text,
  p_hora time,
  p_notas text default null,
  p_requiere_seguimiento boolean default false,
  p_seguimiento_fecha date default null,
  p_seguimiento_turno text default null
)
returns public.tareas_cuidado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_row record;
  v_updated public.tareas_cuidado;
  v_obs_id uuid;
  v_requires_followup boolean;
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_fecha is null or p_hora is null or p_turno is null or p_turno not in ('mañana','tarde','noche') then
    raise exception 'Fecha, turno y hora son obligatorios para reprogramar' using errcode = 'P0001';
  end if;

  select
    t.*,
    a.titulo as actividad_titulo,
    a.categoria as actividad_categoria
  into v_row
  from public.tareas_cuidado t
  join public.plan_cuidado_actividades a on a.id = t.actividad_id
  where t.id = p_tarea_id
  for update;

  if not found then
    raise exception 'Tarea no encontrada' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_row.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_row.eleam_id)
       or not public.funcionario_can('completar_tareas_cuidado') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  if v_row.estado not in ('pendiente','reprogramada') then
    raise exception 'Solo se pueden reprogramar tareas pendientes o reprogramadas' using errcode = 'P0001';
  end if;

  v_requires_followup := coalesce(p_requiere_seguimiento, false) or coalesce(v_row.requiere_seguimiento, false);

  if v_requires_followup
     and (
       p_seguimiento_fecha is null
       or p_seguimiento_turno is null
       or p_seguimiento_turno not in ('mañana','tarde','noche')
     ) then
    raise exception 'Fecha y turno de seguimiento son obligatorios' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.tareas_cuidado t
    where t.horario_id = v_row.horario_id
      and t.id <> p_tarea_id
      and (
        t.fecha = p_fecha
        or p_fecha = any(
          case
            when cardinality(coalesce(t.fechas_programadas, '{}'::date[])) = 0
            then array[coalesce(t.fecha_original, t.fecha)]::date[]
            else t.fechas_programadas
          end
        )
      )
  ) then
    raise exception 'Ya existe otra tarea de este horario para la fecha destino' using errcode = 'P0001';
  end if;

  update public.tareas_cuidado
  set estado = 'reprogramada',
      fecha = p_fecha,
      turno = p_turno,
      hora = p_hora,
      fecha_original = coalesce(v_row.fecha_original, v_row.fecha),
      fechas_programadas = (
        select array_agg(distinct d order by d)
        from unnest(
          coalesce(v_row.fechas_programadas, '{}'::date[])
          || array[coalesce(v_row.fecha_original, v_row.fecha), v_row.fecha, p_fecha]::date[]
        ) as d
        where d is not null
      ),
      reprogramada_para = (p_fecha + p_hora)::timestamptz,
      notas = nullif(trim(coalesce(p_notas, '')), ''),
      requiere_seguimiento = v_requires_followup,
      cumplida_por = null,
      cumplida_en = null,
      actualizado_en = now()
  where id = p_tarea_id
  returning * into v_updated;

  if v_updated.requiere_seguimiento then
    insert into public.observaciones_diarias (
      residente_id, fecha_hora, turno, tipo, descripcion,
      acciones_tomadas, requiere_seguimiento, seguimiento_fecha,
      seguimiento_turno, seguimiento_estado, visible_familiar, registrado_por
    )
    values (
      v_row.residente_id,
      now(),
      v_row.turno,
      public.cuidado_tipo_observacion(v_row.actividad_categoria),
      'Tarea de cuidado reprogramada: ' || v_row.actividad_titulo,
      nullif(trim(coalesce(p_notas, '')), ''),
      true,
      p_seguimiento_fecha,
      p_seguimiento_turno,
      'pendiente',
      false,
      v_user
    )
    returning id into v_obs_id;

    update public.tareas_cuidado
    set observacion_id = v_obs_id
    where id = p_tarea_id
    returning * into v_updated;
  end if;

  insert into public.plan_cuidado_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  )
  values (
    v_row.eleam_id, v_row.residente_id, 'tareas_cuidado', p_tarea_id, 'reprogramada',
    jsonb_build_object(
      'actividad', v_row.actividad_titulo,
      'fecha_anterior', v_row.fecha,
      'turno_anterior', v_row.turno,
      'hora_anterior', v_row.hora,
      'fecha_nueva', p_fecha,
      'turno_nuevo', p_turno,
      'hora_nueva', p_hora,
      'notas', p_notas,
      'requiere_seguimiento', p_requiere_seguimiento,
      'seguimiento_fecha', p_seguimiento_fecha,
      'seguimiento_turno', p_seguimiento_turno
    ),
    v_user
  );

  return v_updated;
end;
$$;

create or replace function public.guardar_indicacion_medicamento_con_horarios(
  p_residente_id uuid,
  p_indicacion jsonb,
  p_horarios jsonb
)
returns public.medicamentos_indicaciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_eleam_id uuid := coalesce(public.my_eleam_id(), nullif(p_indicacion->>'eleam_id', '')::uuid);
  v_indicacion_id uuid := nullif(p_indicacion->>'id', '')::uuid;
  v_saved public.medicamentos_indicaciones;
  v_horario record;
  v_active_ids uuid[] := '{}';
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_residente_id is null or v_eleam_id is null then
    raise exception 'Residente y ELEAM son obligatorios' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_horarios) <> 'array' or jsonb_array_length(p_horarios) = 0 then
    raise exception 'Debe registrar al menos un horario' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_eleam_id)
       or not public.funcionario_can(
         case when v_indicacion_id is null
              then 'crear_indicaciones_medicamentos'
              else 'editar_indicaciones_medicamentos'
         end
       ) then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  if v_indicacion_id is null then
    insert into public.medicamentos_indicaciones (
      eleam_id, residente_id, medicamento_nombre, principio_activo, concentracion,
      forma_farmaceutica, dosis, unidad_dosis, via, indicacion, prescriptor_nombre,
      fecha_indicacion, fecha_inicio, fecha_fin, estado, es_controlado,
      tipo_controlado, requiere_doble_validacion, requiere_stock, visible_familiar,
      resumen_familiar, instrucciones, creado_por, actualizado_por
    )
    values (
      v_eleam_id,
      p_residente_id,
      nullif(trim(p_indicacion->>'medicamento_nombre'), ''),
      nullif(trim(coalesce(p_indicacion->>'principio_activo', '')), ''),
      nullif(trim(coalesce(p_indicacion->>'concentracion', '')), ''),
      nullif(trim(coalesce(p_indicacion->>'forma_farmaceutica', '')), ''),
      nullif(trim(p_indicacion->>'dosis'), ''),
      nullif(trim(coalesce(p_indicacion->>'unidad_dosis', '')), ''),
      coalesce(nullif(p_indicacion->>'via', ''), 'oral'),
      nullif(trim(coalesce(p_indicacion->>'indicacion', '')), ''),
      nullif(trim(coalesce(p_indicacion->>'prescriptor_nombre', '')), ''),
      nullif(p_indicacion->>'fecha_indicacion', '')::date,
      coalesce(nullif(p_indicacion->>'fecha_inicio', '')::date, current_date),
      nullif(p_indicacion->>'fecha_fin', '')::date,
      coalesce(nullif(p_indicacion->>'estado', ''), 'activo'),
      coalesce((p_indicacion->>'es_controlado')::boolean, false),
      nullif(p_indicacion->>'tipo_controlado', ''),
      coalesce((p_indicacion->>'requiere_doble_validacion')::boolean, false),
      coalesce((p_indicacion->>'requiere_stock')::boolean, true),
      coalesce((p_indicacion->>'visible_familiar')::boolean, false),
      nullif(trim(coalesce(p_indicacion->>'resumen_familiar', '')), ''),
      nullif(trim(coalesce(p_indicacion->>'instrucciones', '')), ''),
      v_user,
      v_user
    )
    returning * into v_saved;
  else
    update public.medicamentos_indicaciones
    set medicamento_nombre = nullif(trim(p_indicacion->>'medicamento_nombre'), ''),
        principio_activo = nullif(trim(coalesce(p_indicacion->>'principio_activo', '')), ''),
        concentracion = nullif(trim(coalesce(p_indicacion->>'concentracion', '')), ''),
        forma_farmaceutica = nullif(trim(coalesce(p_indicacion->>'forma_farmaceutica', '')), ''),
        dosis = nullif(trim(p_indicacion->>'dosis'), ''),
        unidad_dosis = nullif(trim(coalesce(p_indicacion->>'unidad_dosis', '')), ''),
        via = coalesce(nullif(p_indicacion->>'via', ''), 'oral'),
        indicacion = nullif(trim(coalesce(p_indicacion->>'indicacion', '')), ''),
        prescriptor_nombre = nullif(trim(coalesce(p_indicacion->>'prescriptor_nombre', '')), ''),
        fecha_indicacion = nullif(p_indicacion->>'fecha_indicacion', '')::date,
        fecha_inicio = coalesce(nullif(p_indicacion->>'fecha_inicio', '')::date, fecha_inicio),
        fecha_fin = nullif(p_indicacion->>'fecha_fin', '')::date,
        estado = coalesce(nullif(p_indicacion->>'estado', ''), estado),
        es_controlado = coalesce((p_indicacion->>'es_controlado')::boolean, false),
        tipo_controlado = nullif(p_indicacion->>'tipo_controlado', ''),
        requiere_doble_validacion = coalesce((p_indicacion->>'requiere_doble_validacion')::boolean, false),
        requiere_stock = coalesce((p_indicacion->>'requiere_stock')::boolean, true),
        visible_familiar = coalesce((p_indicacion->>'visible_familiar')::boolean, false),
        resumen_familiar = nullif(trim(coalesce(p_indicacion->>'resumen_familiar', '')), ''),
        instrucciones = nullif(trim(coalesce(p_indicacion->>'instrucciones', '')), ''),
        actualizado_por = v_user,
        actualizado_en = now()
    where id = v_indicacion_id
      and residente_id = p_residente_id
      and eleam_id = v_eleam_id
    returning * into v_saved;

    if not found then
      raise exception 'Indicacion no encontrada' using errcode = 'P0001';
    end if;
  end if;

  for v_horario in
    select *
    from jsonb_to_recordset(p_horarios) as h(
      id uuid,
      frecuencia text,
      dias_semana smallint[],
      dias_mes smallint[],
      fecha_unica date,
      hora time,
      turno text,
      tolerancia_min integer,
      activo boolean
    )
  loop
    if v_horario.id is null then
      insert into public.medicamentos_horarios (
        eleam_id, residente_id, indicacion_id, frecuencia, dias_semana,
        dias_mes, fecha_unica, hora, turno, tolerancia_min, activo
      )
      values (
        v_eleam_id, p_residente_id, v_saved.id,
        coalesce(v_horario.frecuencia, 'diaria'),
        v_horario.dias_semana,
        v_horario.dias_mes,
        v_horario.fecha_unica,
        v_horario.hora,
        v_horario.turno,
        coalesce(v_horario.tolerancia_min, 60),
        coalesce(v_horario.activo, true)
      )
      returning id into v_horario.id;
    else
      update public.medicamentos_horarios
      set frecuencia = coalesce(v_horario.frecuencia, 'diaria'),
          dias_semana = v_horario.dias_semana,
          dias_mes = v_horario.dias_mes,
          fecha_unica = v_horario.fecha_unica,
          hora = v_horario.hora,
          turno = v_horario.turno,
          tolerancia_min = coalesce(v_horario.tolerancia_min, 60),
          activo = coalesce(v_horario.activo, true),
          actualizado_en = now()
      where id = v_horario.id
        and indicacion_id = v_saved.id
        and eleam_id = v_eleam_id;
    end if;
    v_active_ids := array_append(v_active_ids, v_horario.id);
  end loop;

  update public.medicamentos_horarios
  set activo = false,
      actualizado_en = now()
  where indicacion_id = v_saved.id
    and not (id = any(v_active_ids));

  insert into public.medicamentos_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  )
  values (
    v_eleam_id, p_residente_id, 'medicamentos_indicaciones', v_saved.id,
    case when v_indicacion_id is null then 'creado' else 'actualizado' end,
    jsonb_build_object('horarios', jsonb_array_length(p_horarios)),
    v_user
  );

  return v_saved;
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

create or replace function public.registrar_administracion_medicamento(
  p_administracion_id uuid,
  p_estado text,
  p_lote_id uuid default null,
  p_dosis_administrada numeric default null,
  p_notas text default null,
  p_motivo_omision text default null,
  p_requiere_seguimiento boolean default false,
  p_seguimiento_fecha date default null,
  p_seguimiento_turno text default null
)
returns public.medicamentos_administraciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_admin record;
  v_lote public.medicamentos_stock_lotes;
  v_dosis numeric(12,2);
  v_stock numeric(12,2);
  v_estado_final text;
  v_obs_id uuid;
  v_updated public.medicamentos_administraciones;
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_estado is null or p_estado not in ('administrado','omitido') then
    raise exception 'Estado invalido' using errcode = 'P0001';
  end if;

  select
    a.*,
    i.medicamento_nombre,
    i.es_controlado,
    i.tipo_controlado,
    i.requiere_doble_validacion,
    i.requiere_stock
  into v_admin
  from public.medicamentos_administraciones a
  join public.medicamentos_indicaciones i on i.id = a.indicacion_id
  where a.id = p_administracion_id
  for update;

  if not found then
    raise exception 'Administracion no encontrada' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_admin.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_admin.eleam_id)
       or not public.funcionario_can('administrar_medicamentos') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  if v_admin.estado <> 'pendiente' then
    raise exception 'La administracion ya fue cerrada' using errcode = 'P0001';
  end if;

  if p_estado = 'omitido'
     and (
       p_motivo_omision is null
       or p_motivo_omision not in ('rechazo','no_disponible','contraindicado','residente_ausente','otro')
     ) then
    raise exception 'Motivo de omision obligatorio' using errcode = 'P0001';
  end if;

  if coalesce(p_requiere_seguimiento, false)
     and (
       p_seguimiento_fecha is null
       or p_seguimiento_turno is null
       or p_seguimiento_turno not in ('mañana','tarde','noche')
     ) then
    raise exception 'Fecha y turno de seguimiento son obligatorios' using errcode = 'P0001';
  end if;

  if p_estado = 'omitido' then
    update public.medicamentos_administraciones
    set estado = 'omitido',
        motivo_omision = p_motivo_omision,
        notas = nullif(trim(coalesce(p_notas, '')), ''),
        requiere_seguimiento = coalesce(p_requiere_seguimiento, false),
        administrado_por = v_user,
        administrado_en = now(),
        actualizado_en = now()
    where id = p_administracion_id
    returning * into v_updated;
  else
    v_dosis := coalesce(p_dosis_administrada, 1);
    if v_dosis <= 0 then
      raise exception 'Dosis administrada invalida' using errcode = 'P0001';
    end if;

    if v_admin.es_controlado or v_admin.requiere_stock or p_lote_id is not null then
      if p_lote_id is null then
        raise exception 'Debe seleccionar lote/stock' using errcode = 'P0001';
      end if;

      select * into v_lote
      from public.medicamentos_stock_lotes
      where id = p_lote_id
      for update;

      if not found then
        raise exception 'Lote no encontrado' using errcode = 'P0001';
      end if;

      if v_lote.eleam_id <> v_admin.eleam_id
         or (v_lote.residente_id is not null and v_lote.residente_id <> v_admin.residente_id)
         or v_lote.estado <> 'activo' then
        raise exception 'Lote no valido para esta administracion' using errcode = 'P0001';
      end if;

      if v_lote.fecha_vencimiento is not null and v_lote.fecha_vencimiento < current_date then
        raise exception 'No se puede administrar con un lote vencido' using errcode = 'P0001';
      end if;

      if v_admin.es_controlado and v_lote.es_controlado = false then
        raise exception 'La indicacion controlada requiere lote controlado' using errcode = 'P0001';
      end if;

      if v_lote.cantidad_actual < v_dosis then
        raise exception 'Stock insuficiente' using errcode = 'P0001';
      end if;

      v_stock := v_lote.cantidad_actual - v_dosis;

      update public.medicamentos_stock_lotes
      set cantidad_actual = v_stock,
          estado = case when v_stock = 0 then 'agotado' else estado end,
          actualizado_por = v_user,
          actualizado_en = now()
      where id = v_lote.id;

      insert into public.medicamentos_stock_movimientos (
        eleam_id, lote_id, indicacion_id, administracion_id, tipo,
        cantidad, stock_resultante, motivo, requiere_validacion,
        validado_por, validado_en, creado_por
      )
      values (
        v_admin.eleam_id, v_lote.id, v_admin.indicacion_id, p_administracion_id,
        'administracion', -v_dosis, v_stock,
        'Administracion de medicamentos',
        v_admin.es_controlado,
        case when v_admin.es_controlado then null else v_user end,
        case when v_admin.es_controlado then null else now() end,
        v_user
      );
    end if;

    v_estado_final := case when v_admin.es_controlado or v_admin.requiere_doble_validacion then 'pendiente_validacion' else 'administrado' end;

    update public.medicamentos_administraciones
    set estado = v_estado_final,
        lote_id = p_lote_id,
        dosis_administrada = v_dosis,
        notas = nullif(trim(coalesce(p_notas, '')), ''),
        requiere_seguimiento = coalesce(p_requiere_seguimiento, false),
        administrado_por = v_user,
        administrado_en = now(),
        actualizado_en = now()
    where id = p_administracion_id
    returning * into v_updated;
  end if;

  if v_updated.requiere_seguimiento then
    insert into public.observaciones_diarias (
      residente_id, fecha_hora, turno, tipo, descripcion,
      acciones_tomadas, requiere_seguimiento, seguimiento_fecha,
      seguimiento_turno, seguimiento_estado, visible_familiar, registrado_por
    )
    values (
      v_admin.residente_id,
      now(),
      v_admin.turno,
      'administracion_medicamento',
      'Medicamento ' || case when p_estado = 'omitido' then 'omitido' else 'registrado' end ||
        ': ' || v_admin.medicamento_nombre,
      nullif(trim(coalesce(p_notas, '')), ''),
      true,
      p_seguimiento_fecha,
      p_seguimiento_turno,
      'pendiente',
      false,
      v_user
    )
    returning id into v_obs_id;

    update public.medicamentos_administraciones
    set observacion_id = v_obs_id
    where id = p_administracion_id
    returning * into v_updated;
  end if;

  insert into public.medicamentos_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  )
  values (
    v_admin.eleam_id, v_admin.residente_id, 'medicamentos_administraciones',
    p_administracion_id, p_estado,
    jsonb_build_object(
      'lote_id', p_lote_id,
      'dosis', p_dosis_administrada,
      'motivo_omision', p_motivo_omision,
      'seguimiento_fecha', p_seguimiento_fecha,
      'seguimiento_turno', p_seguimiento_turno
    ),
    v_user
  );

  return v_updated;
end;
$$;

create or replace function public.validar_administracion_controlada(
  p_administracion_id uuid,
  p_notas text default null
)
returns public.medicamentos_administraciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_admin record;
  v_updated public.medicamentos_administraciones;
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  select a.*, i.es_controlado, i.requiere_doble_validacion
  into v_admin
  from public.medicamentos_administraciones a
  join public.medicamentos_indicaciones i on i.id = a.indicacion_id
  where a.id = p_administracion_id
  for update;

  if not found then
    raise exception 'Administracion no encontrada' using errcode = 'P0001';
  end if;

  if not (v_admin.es_controlado or v_admin.requiere_doble_validacion) then
    raise exception 'La administracion no requiere validacion' using errcode = 'P0001';
  end if;

  if v_admin.estado <> 'pendiente_validacion' then
    raise exception 'La administracion no esta pendiente de validacion' using errcode = 'P0001';
  end if;

  if v_admin.administrado_por = v_user then
    raise exception 'La validacion debe realizarla otro usuario' using errcode = '42501';
  end if;

  if not public.is_superadmin() then
    if v_admin.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_admin.eleam_id)
       or not public.funcionario_can('validar_medicamentos_controlados') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  update public.medicamentos_administraciones
  set estado = 'validado',
      validado_por = v_user,
      validado_en = now(),
      notas = trim(both from concat_ws(E'\n', notas, nullif(trim(coalesce(p_notas, '')), ''))),
      actualizado_en = now()
  where id = p_administracion_id
  returning * into v_updated;

  update public.medicamentos_stock_movimientos
  set validado_por = v_user,
      validado_en = now()
  where administracion_id = p_administracion_id
    and requiere_validacion = true
    and validado_por is null;

  insert into public.medicamentos_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  )
  values (
    v_admin.eleam_id, v_admin.residente_id, 'medicamentos_administraciones',
    p_administracion_id, 'validado',
    jsonb_build_object('notas', p_notas),
    v_user
  );

  return v_updated;
end;
$$;

create or replace function public.registrar_movimiento_stock_medicamento(
  p_lote_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text default null
)
returns public.medicamentos_stock_lotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_lote public.medicamentos_stock_lotes;
  v_stock numeric(12,2);
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_lote_id is null then
    raise exception 'Lote obligatorio' using errcode = 'P0001';
  end if;

  if p_tipo is null or p_tipo not in ('recepcion','ajuste','reversa','merma','retiro') then
    raise exception 'Tipo de movimiento invalido' using errcode = 'P0001';
  end if;

  if p_cantidad is null or p_cantidad = 0 then
    raise exception 'Cantidad invalida' using errcode = 'P0001';
  end if;

  select * into v_lote
  from public.medicamentos_stock_lotes
  where id = p_lote_id
  for update;

  if not found then
    raise exception 'Lote no encontrado' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_lote.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_lote.eleam_id)
       or not public.funcionario_can('ajustar_stock_medicamentos') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  if v_lote.es_controlado and nullif(trim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Los movimientos de medicamentos controlados requieren motivo' using errcode = 'P0001';
  end if;

  if v_lote.es_controlado and p_tipo <> 'recepcion' then
    raise exception 'Los ajustes de medicamentos controlados deben realizarse mediante conciliacion con doble validacion'
      using errcode = 'P0001';
  end if;

  v_stock := v_lote.cantidad_actual + p_cantidad;
  if v_stock < 0 then
    raise exception 'Stock insuficiente' using errcode = 'P0001';
  end if;

  update public.medicamentos_stock_lotes
  set cantidad_actual = v_stock,
      estado = case when v_stock = 0 then 'agotado' when estado = 'agotado' and v_stock > 0 then 'activo' else estado end,
      actualizado_por = v_user,
      actualizado_en = now()
  where id = p_lote_id
  returning * into v_lote;

  insert into public.medicamentos_stock_movimientos (
    eleam_id, lote_id, indicacion_id, tipo, cantidad, stock_resultante,
    motivo, requiere_validacion, validado_por, validado_en, creado_por
  )
  values (
    v_lote.eleam_id, v_lote.id, v_lote.indicacion_id, p_tipo, p_cantidad, v_stock,
    nullif(trim(coalesce(p_motivo, '')), ''),
    v_lote.es_controlado,
    case when v_lote.es_controlado then null else v_user end,
    case when v_lote.es_controlado then null else now() end,
    v_user
  );

  insert into public.medicamentos_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  )
  values (
    v_lote.eleam_id, v_lote.residente_id, 'medicamentos_stock_lotes',
    v_lote.id, p_tipo,
    jsonb_build_object('cantidad', p_cantidad, 'stock_resultante', v_stock, 'motivo', p_motivo),
    v_user
  );

  return v_lote;
end;
$$;

create or replace function public.conciliar_stock_controlado(
  p_lote_id uuid default null,
  p_cantidad_fisica numeric default null,
  p_motivo text default null,
  p_conciliacion_id uuid default null
)
returns public.medicamentos_conciliaciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_lote public.medicamentos_stock_lotes;
  v_conc public.medicamentos_conciliaciones;
  v_diff numeric(12,2);
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_conciliacion_id is not null then
    select * into v_conc
    from public.medicamentos_conciliaciones
    where id = p_conciliacion_id
    for update;

    if not found then
      raise exception 'Conciliacion no encontrada' using errcode = 'P0001';
    end if;

    if v_conc.estado <> 'pendiente_validacion' then
      raise exception 'La conciliacion ya fue cerrada' using errcode = 'P0001';
    end if;

    if v_conc.creado_por = v_user then
      raise exception 'La validacion debe realizarla otro usuario' using errcode = '42501';
    end if;

    select * into v_lote
    from public.medicamentos_stock_lotes
    where id = v_conc.lote_id
    for update;
  else
    if p_lote_id is null or p_cantidad_fisica is null or nullif(trim(coalesce(p_motivo, '')), '') is null then
      raise exception 'Lote, cantidad fisica y motivo son obligatorios' using errcode = 'P0001';
    end if;

    if p_cantidad_fisica < 0 then
      raise exception 'Cantidad fisica invalida' using errcode = 'P0001';
    end if;

    select * into v_lote
    from public.medicamentos_stock_lotes
    where id = p_lote_id
    for update;
  end if;

  if not found then
    raise exception 'Lote no encontrado' using errcode = 'P0001';
  end if;

  if not v_lote.es_controlado then
    raise exception 'Solo se concilian controlados con esta RPC' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_lote.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_lote.eleam_id)
       or not public.funcionario_can('ajustar_stock_medicamentos') then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
  end if;

  if p_conciliacion_id is not null then
    update public.medicamentos_stock_lotes
    set cantidad_actual = v_conc.cantidad_fisica,
        estado = case when v_conc.cantidad_fisica = 0 then 'agotado' else 'activo' end,
        actualizado_por = v_user,
        actualizado_en = now()
    where id = v_lote.id;

    insert into public.medicamentos_stock_movimientos (
      eleam_id, lote_id, indicacion_id, tipo, cantidad, stock_resultante,
      motivo, requiere_validacion, validado_por, validado_en, creado_por
    )
    values (
      v_lote.eleam_id, v_lote.id, v_lote.indicacion_id, 'conciliacion',
      v_conc.diferencia, v_conc.cantidad_fisica,
      v_conc.motivo, true, v_user, now(), v_conc.creado_por
    );

    update public.medicamentos_conciliaciones
    set estado = 'validada',
        validado_por = v_user,
        validado_en = now()
    where id = v_conc.id
    returning * into v_conc;
  else
    v_diff := p_cantidad_fisica - v_lote.cantidad_actual;

    insert into public.medicamentos_conciliaciones (
      eleam_id, lote_id, cantidad_sistema, cantidad_fisica,
      diferencia, motivo, creado_por
    )
    values (
      v_lote.eleam_id, v_lote.id, v_lote.cantidad_actual, p_cantidad_fisica,
      v_diff, nullif(trim(coalesce(p_motivo, '')), ''), v_user
    )
    returning * into v_conc;
  end if;

  insert into public.medicamentos_audit (
    eleam_id, residente_id, entidad, entidad_id, accion, detalle, realizado_por
  )
  values (
    v_lote.eleam_id, v_lote.residente_id, 'medicamentos_conciliaciones',
    v_conc.id, v_conc.estado,
    jsonb_build_object('cantidad_sistema', v_conc.cantidad_sistema, 'cantidad_fisica', v_conc.cantidad_fisica, 'diferencia', v_conc.diferencia),
    v_user
  );

  return v_conc;
end;
$$;

create or replace function public.asignar_residente_a_cama(
  p_residente_id uuid,
  p_cama_id uuid,
  p_notas text default null
)
returns public.cama_asignaciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_residente public.residentes;
  v_cama record;
  v_current_assignment public.cama_asignaciones;
  v_bed_assignment public.cama_asignaciones;
  v_assignment public.cama_asignaciones;
  v_notas text := nullif(trim(coalesce(p_notas, '')), '');
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_residente_id is null or p_cama_id is null then
    raise exception 'Residente y cama son obligatorios' using errcode = 'P0001';
  end if;

  select *
  into v_residente
  from public.residentes
  where id = p_residente_id
  for update;

  if not found then
    raise exception 'Residente no encontrado' using errcode = 'P0001';
  end if;

  if v_residente.estado <> 'activo' then
    raise exception 'Solo se puede asignar cama a residentes activos' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_residente.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_residente.eleam_id)
       or not public.funcionario_can('asignar_camas') then
      raise exception 'No autorizado a asignar camas' using errcode = '42501';
    end if;
  end if;

  select
    c.*,
    h.estado as habitacion_estado,
    h.codigo as habitacion_codigo
  into v_cama
  from public.camas c
  join public.habitaciones h on h.id = c.habitacion_id
  where c.id = p_cama_id
  for update of c, h;

  if not found then
    raise exception 'Cama no encontrada' using errcode = 'P0001';
  end if;

  if v_cama.eleam_id is distinct from v_residente.eleam_id then
    raise exception 'La cama no pertenece al ELEAM del residente' using errcode = 'P0001';
  end if;

  if v_cama.habitacion_estado <> 'operativa' then
    raise exception 'La habitacion % no esta operativa', v_cama.habitacion_codigo using errcode = 'P0001';
  end if;

  if v_cama.estado <> 'operativa' then
    raise exception 'La cama no esta operativa' using errcode = 'P0001';
  end if;

  perform set_config('app.allow_bed_assignment_sync', 'on', true);

  select *
  into v_bed_assignment
  from public.cama_asignaciones
  where cama_id = p_cama_id
    and fecha_fin is null
  for update;

  if found and v_bed_assignment.residente_id is distinct from p_residente_id then
    if v_bed_assignment.estado = 'reservada_hospitalizacion' then
      raise exception 'La cama esta reservada por hospitalizacion de otro residente' using errcode = 'P0001';
    end if;

    raise exception 'La cama ya esta ocupada por otro residente' using errcode = 'P0001';
  end if;

  select *
  into v_current_assignment
  from public.cama_asignaciones
  where residente_id = p_residente_id
    and fecha_fin is null
  for update;

  if found and v_current_assignment.cama_id = p_cama_id then
    update public.cama_asignaciones
    set estado = 'ocupada',
        notas = coalesce(v_notas, notas),
        actualizado_en = now()
    where id = v_current_assignment.id
    returning * into v_assignment;

    update public.residentes
    set cama_actual_id = p_cama_id
    where id = p_residente_id;

    insert into public.camas_audit (
      eleam_id, cama_id, residente_id, accion, detalle, realizado_por
    )
    values (
      v_residente.eleam_id, p_cama_id, p_residente_id, 'asignacion_confirmada',
      jsonb_build_object('notas', v_notas),
      v_user
    );

    return v_assignment;
  elsif found then
    update public.cama_asignaciones
    set fecha_fin = now(),
        motivo_fin = 'traslado',
        notas = trim(both from concat_ws(E'\n', notas, v_notas)),
        cerrado_por = v_user,
        actualizado_en = now()
    where id = v_current_assignment.id;
  end if;

  insert into public.cama_asignaciones (
    eleam_id, cama_id, residente_id, estado, notas, creado_por
  )
  values (
    v_residente.eleam_id, p_cama_id, p_residente_id, 'ocupada', v_notas, v_user
  )
  returning * into v_assignment;

  update public.residentes
  set cama_actual_id = p_cama_id
  where id = p_residente_id;

  insert into public.camas_audit (
    eleam_id, cama_id, residente_id, accion, detalle, realizado_por
  )
  values (
    v_residente.eleam_id, p_cama_id, p_residente_id,
    case when v_current_assignment.id is null then 'asignacion' else 'traslado' end,
    jsonb_build_object(
      'cama_anterior_id', v_current_assignment.cama_id,
      'cama_nueva_id', p_cama_id,
      'notas', v_notas
    ),
    v_user
  );

  return v_assignment;
end;
$$;

create or replace function public.liberar_cama_residente(
  p_residente_id uuid,
  p_motivo text default 'liberacion',
  p_notas text default null
)
returns public.cama_asignaciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_residente public.residentes;
  v_assignment public.cama_asignaciones;
  v_updated public.cama_asignaciones;
  v_motivo text := coalesce(nullif(trim(coalesce(p_motivo, '')), ''), 'liberacion');
  v_notas text := nullif(trim(coalesce(p_notas, '')), '');
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_residente_id is null then
    raise exception 'Residente obligatorio' using errcode = 'P0001';
  end if;

  select *
  into v_residente
  from public.residentes
  where id = p_residente_id
  for update;

  if not found then
    raise exception 'Residente no encontrado' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_residente.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_residente.eleam_id)
       or not public.funcionario_can('asignar_camas') then
      raise exception 'No autorizado a liberar camas' using errcode = '42501';
    end if;
  end if;

  perform set_config('app.allow_bed_assignment_sync', 'on', true);

  select *
  into v_assignment
  from public.cama_asignaciones
  where residente_id = p_residente_id
    and fecha_fin is null
  for update;

  if not found then
    update public.residentes
    set cama_actual_id = null
    where id = p_residente_id
      and cama_actual_id is not null;

    return null;
  end if;

  perform set_config('app.allow_bed_assignment_sync', 'on', true);

  update public.cama_asignaciones
  set fecha_fin = now(),
      motivo_fin = v_motivo,
      notas = trim(both from concat_ws(E'\n', notas, v_notas)),
      cerrado_por = v_user,
      actualizado_en = now()
  where id = v_assignment.id
  returning * into v_updated;

  update public.residentes
  set cama_actual_id = null
  where id = p_residente_id;

  insert into public.camas_audit (
    eleam_id, cama_id, residente_id, accion, detalle, realizado_por
  )
  values (
    v_assignment.eleam_id, v_assignment.cama_id, p_residente_id, 'liberacion',
    jsonb_build_object('motivo', v_motivo, 'notas', v_notas),
    v_user
  );

  return v_updated;
end;
$$;

create or replace function public.resolver_cama_hospitalizacion(
  p_residente_id uuid,
  p_accion text,
  p_notas text default null
)
returns public.cama_asignaciones
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_residente public.residentes;
  v_assignment public.cama_asignaciones;
  v_updated public.cama_asignaciones;
  v_accion text := lower(nullif(trim(coalesce(p_accion, '')), ''));
  v_notas text := nullif(trim(coalesce(p_notas, '')), '');
begin
  if v_user is null then
    raise exception 'Debe iniciar sesion' using errcode = '42501';
  end if;

  if p_residente_id is null or v_accion not in ('reservar','liberar') then
    raise exception 'Accion de hospitalizacion invalida' using errcode = 'P0001';
  end if;

  select *
  into v_residente
  from public.residentes
  where id = p_residente_id
  for update;

  if not found then
    raise exception 'Residente no encontrado' using errcode = 'P0001';
  end if;

  if v_residente.estado <> 'hospitalizado' then
    raise exception 'La decision de cama por hospitalizacion requiere estado hospitalizado' using errcode = 'P0001';
  end if;

  if not public.is_superadmin() then
    if v_residente.eleam_id is distinct from public.my_eleam_id()
       or not public.eleam_has_access(v_residente.eleam_id)
       or not public.funcionario_can('asignar_camas') then
      raise exception 'No autorizado a resolver camas por hospitalizacion' using errcode = '42501';
    end if;
  end if;

  perform set_config('app.allow_bed_assignment_sync', 'on', true);

  select *
  into v_assignment
  from public.cama_asignaciones
  where residente_id = p_residente_id
    and fecha_fin is null
  for update;

  if v_accion = 'reservar' then
    if not found then
      raise exception 'El residente no tiene una cama activa para reservar' using errcode = 'P0001';
    end if;

    update public.cama_asignaciones
    set estado = 'reservada_hospitalizacion',
        notas = trim(both from concat_ws(E'\n', notas, v_notas)),
        actualizado_en = now()
    where id = v_assignment.id
    returning * into v_updated;

    update public.residentes
    set cama_actual_id = v_assignment.cama_id
    where id = p_residente_id;

    insert into public.camas_audit (
      eleam_id, cama_id, residente_id, accion, detalle, realizado_por
    )
    values (
      v_assignment.eleam_id, v_assignment.cama_id, p_residente_id,
      'reserva_hospitalizacion',
      jsonb_build_object('notas', v_notas),
      v_user
    );

    return v_updated;
  end if;

  if not found then
    update public.residentes
    set cama_actual_id = null
    where id = p_residente_id
      and cama_actual_id is not null;

    return null;
  end if;

  update public.cama_asignaciones
  set fecha_fin = now(),
      motivo_fin = 'hospitalizacion_liberada',
      notas = trim(both from concat_ws(E'\n', notas, v_notas)),
      cerrado_por = v_user,
      actualizado_en = now()
  where id = v_assignment.id
  returning * into v_updated;

  update public.residentes
  set cama_actual_id = null
  where id = p_residente_id;

  insert into public.camas_audit (
    eleam_id, cama_id, residente_id, accion, detalle, realizado_por
  )
  values (
    v_assignment.eleam_id, v_assignment.cama_id, p_residente_id,
    'liberacion_hospitalizacion',
    jsonb_build_object('notas', v_notas),
    v_user
  );

  return v_updated;
end;
$$;

create or replace function public.prevent_habitacion_estado_ocupada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado and new.estado <> 'operativa' then
    if exists (
      select 1
      from public.camas c
      join public.cama_asignaciones ca on ca.cama_id = c.id
      where c.habitacion_id = new.id
        and ca.fecha_fin is null
    ) then
      raise exception 'No se puede cambiar la habitacion a % porque tiene camas ocupadas o reservadas', new.estado
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_cama_estado_ocupada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado and new.estado <> 'operativa' then
    if exists (
      select 1
      from public.cama_asignaciones ca
      where ca.cama_id = new.id
        and ca.fecha_fin is null
    ) then
      raise exception 'No se puede cambiar la cama a % porque esta ocupada o reservada', new.estado
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_residente_cama_direct_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cama_actual_id is distinct from old.cama_actual_id
     and current_setting('app.allow_bed_assignment_sync', true) is distinct from 'on' then
    raise exception 'La cama del residente se gestiona desde el modulo Camas' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.sync_residente_cama_por_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.cama_asignaciones;
  v_user uuid := (select auth.uid());
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;

  if new.estado in ('egresado','fallecido') and old.cama_actual_id is not null then
    select *
    into v_assignment
    from public.cama_asignaciones
    where residente_id = new.id
      and fecha_fin is null
    for update;

    if found then
      update public.cama_asignaciones
      set fecha_fin = now(),
          motivo_fin = case when new.estado = 'fallecido' then 'fallecimiento' else 'egreso' end,
          cerrado_por = v_user,
          actualizado_en = now()
      where id = v_assignment.id;

      insert into public.camas_audit (
        eleam_id, cama_id, residente_id, accion, detalle, realizado_por
      )
      values (
        v_assignment.eleam_id, v_assignment.cama_id, new.id, 'liberacion_automatica',
        jsonb_build_object('estado_residente', new.estado),
        v_user
      );
    end if;

    new.cama_actual_id := null;
  elsif new.estado = 'activo' and new.cama_actual_id is not null then
    update public.cama_asignaciones
    set estado = 'ocupada',
        actualizado_en = now()
    where residente_id = new.id
      and fecha_fin is null
      and estado = 'reservada_hospitalizacion';
  end if;

  return new;
end;
$$;

-- Previene que admin_eleam escale sus propios privilegios de suscripcion
-- actualizando campos sensibles directamente via el cliente Supabase.
-- Service role (auth.uid() IS NULL) y superadmin pasan sin restriccion.
create or replace function public.prevent_eleam_subscription_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_rol text;
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

  if new.subscription_status is distinct from old.subscription_status
     or new.pago_activo is distinct from old.pago_activo
     or new.plan is distinct from old.plan
     or new.plan_id is distinct from old.plan_id
     or new.fecha_pago is distinct from old.fecha_pago
     or new.fecha_vencimiento_suscripcion is distinct from old.fecha_vencimiento_suscripcion
     or new.proximo_cobro_en is distinct from old.proximo_cobro_en
     or new.cancelado_en is distinct from old.cancelado_en
     or new.mp_preapproval_id is distinct from old.mp_preapproval_id
     or new.mp_payer_email is distinct from old.mp_payer_email
     or new.max_residentes is distinct from old.max_residentes
     or new.max_funcionarios is distinct from old.max_funcionarios
     or new.crm_estado is distinct from old.crm_estado
     or new.origen_lead is distinct from old.origen_lead
     or new.ultimo_contacto is distinct from old.ultimo_contacto
     or new.proxima_accion_fecha is distinct from old.proxima_accion_fecha
     or new.responsable_comercial is distinct from old.responsable_comercial
     or new.riesgo_churn is distinct from old.riesgo_churn
     or new.notas_admin is distinct from old.notas_admin
  then
    raise exception 'No autorizado a modificar campos de suscripcion o CRM del ELEAM'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.sync_medicamento_controlado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.es_controlado then
    new.requiere_doble_validacion := true;
  end if;
  return new;
end;
$$;

create or replace function public.sync_stock_lote_controlado()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_indicacion record;
begin
  if new.indicacion_id is not null then
    select es_controlado, tipo_controlado
    into v_indicacion
    from public.medicamentos_indicaciones
    where id = new.indicacion_id;

    if found and v_indicacion.es_controlado then
      new.es_controlado := true;
      new.tipo_controlado := coalesce(new.tipo_controlado, v_indicacion.tipo_controlado, 'psicotropico');
    end if;
  end if;

  if new.es_controlado and new.tipo_controlado is null then
    new.tipo_controlado := 'psicotropico';
  end if;

  return new;
end;
$$;

-- Triggers
drop trigger if exists trg_sync_pago_activo on public.eleams;
create trigger trg_sync_pago_activo
  before insert or update of subscription_status, fecha_vencimiento_suscripcion on public.eleams
  for each row execute function public.sync_pago_activo();

drop trigger if exists trg_eleam_plan_capacity on public.eleams;
create trigger trg_eleam_plan_capacity
  before insert or update of plan_id, max_residentes, max_funcionarios on public.eleams
  for each row execute function public.check_eleam_plan_capacity();

drop trigger if exists trg_prevent_eleam_subscription_escalation on public.eleams;
create trigger trg_prevent_eleam_subscription_escalation
  before update on public.eleams
  for each row execute function public.prevent_eleam_subscription_escalation();

drop trigger if exists trg_residentes_limit on public.residentes;
create trigger trg_residentes_limit
  before insert or update of estado, eleam_id on public.residentes
  for each row execute function public.check_residentes_limit();

drop trigger if exists trg_residentes_cama_estado on public.residentes;
create trigger trg_residentes_cama_estado
  before update of estado on public.residentes
  for each row execute function public.sync_residente_cama_por_estado();

drop trigger if exists trg_prevent_residente_cama_direct_update on public.residentes;
create trigger trg_prevent_residente_cama_direct_update
  before update of cama_actual_id on public.residentes
  for each row execute function public.prevent_residente_cama_direct_update();

drop trigger if exists trg_prevent_habitacion_estado_ocupada on public.habitaciones;
create trigger trg_prevent_habitacion_estado_ocupada
  before update of estado on public.habitaciones
  for each row execute function public.prevent_habitacion_estado_ocupada();

drop trigger if exists trg_prevent_cama_estado_ocupada on public.camas;
create trigger trg_prevent_cama_estado_ocupada
  before update of estado on public.camas
  for each row execute function public.prevent_cama_estado_ocupada();

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

drop trigger if exists trg_eleam_feature_permissions_updated_at on public.eleam_feature_permissions;
create trigger trg_eleam_feature_permissions_updated_at
  before update on public.eleam_feature_permissions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profile_feature_permissions_updated_at on public.profile_feature_permissions;
create trigger trg_profile_feature_permissions_updated_at
  before update on public.profile_feature_permissions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_residentes_updated_at on public.residentes;
create trigger trg_residentes_updated_at
  before update on public.residentes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_habitaciones_updated_at on public.habitaciones;
create trigger trg_habitaciones_updated_at
  before update on public.habitaciones
  for each row execute function public.set_updated_at();

drop trigger if exists trg_camas_updated_at on public.camas;
create trigger trg_camas_updated_at
  before update on public.camas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_cama_asignaciones_updated_at on public.cama_asignaciones;
create trigger trg_cama_asignaciones_updated_at
  before update on public.cama_asignaciones
  for each row execute function public.set_updated_at();

drop trigger if exists trg_observaciones_updated_at on public.observaciones_diarias;
create trigger trg_observaciones_updated_at
  before update on public.observaciones_diarias
  for each row execute function public.set_updated_at();

drop trigger if exists trg_evaluaciones_clinicas_updated_at on public.evaluaciones_clinicas;
create trigger trg_evaluaciones_clinicas_updated_at
  before update on public.evaluaciones_clinicas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_eval_sync_resumen_residente on public.evaluaciones_clinicas;
create trigger trg_eval_sync_resumen_residente
  after insert or update of puntaje, resultado, fecha_evaluacion on public.evaluaciones_clinicas
  for each row execute function public.sync_resumen_evaluacion_residente();

drop trigger if exists trg_turno_entregas_updated_at on public.turno_entregas;
create trigger trg_turno_entregas_updated_at
  before update on public.turno_entregas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_eventos_adversos_updated_at on public.eventos_adversos;
create trigger trg_eventos_adversos_updated_at
  before update on public.eventos_adversos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planes_cuidado_updated_at on public.planes_cuidado;
create trigger trg_planes_cuidado_updated_at
  before update on public.planes_cuidado
  for each row execute function public.set_updated_at();

drop trigger if exists trg_plan_actividades_updated_at on public.plan_cuidado_actividades;
create trigger trg_plan_actividades_updated_at
  before update on public.plan_cuidado_actividades
  for each row execute function public.set_updated_at();

drop trigger if exists trg_plan_horarios_updated_at on public.plan_cuidado_horarios;
create trigger trg_plan_horarios_updated_at
  before update on public.plan_cuidado_horarios
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tareas_cuidado_updated_at on public.tareas_cuidado;
create trigger trg_tareas_cuidado_updated_at
  before update on public.tareas_cuidado
  for each row execute function public.set_updated_at();

drop trigger if exists trg_med_indicaciones_controlado on public.medicamentos_indicaciones;
create trigger trg_med_indicaciones_controlado
  before insert or update of es_controlado, requiere_doble_validacion on public.medicamentos_indicaciones
  for each row execute function public.sync_medicamento_controlado();

drop trigger if exists trg_med_stock_lotes_controlado on public.medicamentos_stock_lotes;
create trigger trg_med_stock_lotes_controlado
  before insert or update of indicacion_id, es_controlado, tipo_controlado on public.medicamentos_stock_lotes
  for each row execute function public.sync_stock_lote_controlado();

update public.medicamentos_stock_lotes l
set es_controlado = true,
    tipo_controlado = coalesce(l.tipo_controlado, i.tipo_controlado, 'psicotropico'),
    actualizado_en = now()
from public.medicamentos_indicaciones i
where l.indicacion_id = i.id
  and i.es_controlado = true
  and l.es_controlado = false;

drop trigger if exists trg_med_indicaciones_updated_at on public.medicamentos_indicaciones;
create trigger trg_med_indicaciones_updated_at
  before update on public.medicamentos_indicaciones
  for each row execute function public.set_updated_at();

drop trigger if exists trg_med_horarios_updated_at on public.medicamentos_horarios;
create trigger trg_med_horarios_updated_at
  before update on public.medicamentos_horarios
  for each row execute function public.set_updated_at();

drop trigger if exists trg_med_stock_lotes_updated_at on public.medicamentos_stock_lotes;
create trigger trg_med_stock_lotes_updated_at
  before update on public.medicamentos_stock_lotes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_med_admin_updated_at on public.medicamentos_administraciones;
create trigger trg_med_admin_updated_at
  before update on public.medicamentos_administraciones
  for each row execute function public.set_updated_at();

drop trigger if exists trg_func_permisos_updated_at on public.funcionario_permisos;
create trigger trg_func_permisos_updated_at
  before update on public.funcionario_permisos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_acred_re_updated_at on public.acred_requisitos_eleam;
create trigger trg_acred_re_updated_at
  before update on public.acred_requisitos_eleam
  for each row execute function public.set_updated_at();

drop trigger if exists trg_acred_obs_updated_at on public.acred_observaciones;
create trigger trg_acred_obs_updated_at
  before update on public.acred_observaciones
  for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_prospect_lists_updated_at on public.crm_prospect_lists;
create trigger trg_crm_prospect_lists_updated_at
  before update on public.crm_prospect_lists
  for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_prospects_normalize on public.crm_prospects;
create trigger trg_crm_prospects_normalize
  before insert or update on public.crm_prospects
  for each row execute function public.crm_normalize_prospect();

drop trigger if exists trg_crm_prospects_updated_at on public.crm_prospects;
create trigger trg_crm_prospects_updated_at
  before update on public.crm_prospects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_prospects_stage_history on public.crm_prospects;
create trigger trg_crm_prospects_stage_history
  after insert or update of estado on public.crm_prospects
  for each row execute function public.crm_log_prospect_stage_change();

drop trigger if exists trg_demo_leads_sync_crm_prospect on public.demo_leads;
create trigger trg_demo_leads_sync_crm_prospect
  after insert or update of nombre, cargo, eleam_nombre, email, telefono, num_residentes, utm_source, utm_campaign, estado, demo_user_id on public.demo_leads
  for each row execute function public.crm_sync_demo_lead_to_prospect();

drop trigger if exists trg_crm_email_campaigns_updated_at on public.crm_email_campaigns;
create trigger trg_crm_email_campaigns_updated_at
  before update on public.crm_email_campaigns
  for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_campaign_members_updated_at on public.crm_campaign_members;
create trigger trg_crm_campaign_members_updated_at
  before update on public.crm_campaign_members
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

drop trigger if exists trg_acred_provision_on_requisito on public.acred_requisitos;
create trigger trg_acred_provision_on_requisito
  after insert on public.acred_requisitos
  for each row execute function public.acred_on_requisito_created();

-- RPC permissions
revoke all on function public.request_demo_lead(text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.request_demo_lead(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.demo_lead_status(text) from public;
grant execute on function public.demo_lead_status(text) to anon, authenticated;

revoke all on function public.crm_unsubscribe_by_token(uuid) from public;
grant execute on function public.crm_unsubscribe_by_token(uuid) to anon, authenticated;

revoke all on function public.acred_provision_requisitos(uuid) from public;
grant execute on function public.acred_provision_requisitos(uuid) to authenticated;

revoke all on function public.acred_marcar_vencidos(uuid) from public;
grant execute on function public.acred_marcar_vencidos(uuid) to authenticated;

revoke all on function public.registrar_pago_y_activar_eleam(uuid, integer, text, text, date, date, text, text) from public;
grant execute on function public.registrar_pago_y_activar_eleam(uuid, integer, text, text, date, date, text, text) to authenticated;

revoke all on function public.blog_increment_views(text) from public;
grant execute on function public.blog_increment_views(text) to anon, authenticated;

revoke all on function public.registrar_signos_vitales(uuid, timestamptz, text, integer, integer, integer, integer, numeric, integer, integer, numeric, integer, text, text, boolean, date, text) from public;
grant execute on function public.registrar_signos_vitales(uuid, timestamptz, text, integer, integer, integer, integer, numeric, integer, integer, numeric, integer, text, text, boolean, date, text) to authenticated;

revoke all on function public.crear_rutinas_cuidado_desde_presets(uuid, jsonb) from public;
grant execute on function public.crear_rutinas_cuidado_desde_presets(uuid, jsonb) to authenticated;

revoke all on function public.generar_tareas_cuidado(date, text) from public;
grant execute on function public.generar_tareas_cuidado(date, text) to authenticated;

revoke all on function public.completar_tarea_cuidado(uuid, text, text, text, boolean, date, text) from public;
grant execute on function public.completar_tarea_cuidado(uuid, text, text, text, boolean, date, text) to authenticated;

revoke all on function public.reprogramar_tarea_cuidado(uuid, date, text, time, text, boolean, date, text) from public;
grant execute on function public.reprogramar_tarea_cuidado(uuid, date, text, time, text, boolean, date, text) to authenticated;

revoke all on function public.generar_administraciones_medicamentos(date, text) from public;
grant execute on function public.generar_administraciones_medicamentos(date, text) to authenticated;

revoke all on function public.guardar_indicacion_medicamento_con_horarios(uuid, jsonb, jsonb) from public;
grant execute on function public.guardar_indicacion_medicamento_con_horarios(uuid, jsonb, jsonb) to authenticated;

revoke all on function public.registrar_administracion_medicamento(uuid, text, uuid, numeric, text, text, boolean, date, text) from public;
grant execute on function public.registrar_administracion_medicamento(uuid, text, uuid, numeric, text, text, boolean, date, text) to authenticated;

revoke all on function public.validar_administracion_controlada(uuid, text) from public;
grant execute on function public.validar_administracion_controlada(uuid, text) to authenticated;

revoke all on function public.registrar_movimiento_stock_medicamento(uuid, text, numeric, text) from public;
grant execute on function public.registrar_movimiento_stock_medicamento(uuid, text, numeric, text) to authenticated;

revoke all on function public.conciliar_stock_controlado(uuid, numeric, text, uuid) from public;
grant execute on function public.conciliar_stock_controlado(uuid, numeric, text, uuid) to authenticated;

revoke all on function public.asignar_residente_a_cama(uuid, uuid, text) from public;
grant execute on function public.asignar_residente_a_cama(uuid, uuid, text) to authenticated;

revoke all on function public.liberar_cama_residente(uuid, text, text) from public;
grant execute on function public.liberar_cama_residente(uuid, text, text) to authenticated;

revoke all on function public.resolver_cama_hospitalizacion(uuid, text, text) from public;
grant execute on function public.resolver_cama_hospitalizacion(uuid, text, text) to authenticated;

-- ============================================================
-- 7.5 Grants base de schema para anon / authenticated / service_role
-- ============================================================
-- Sin estos grants a nivel SQL, ninguna query del cliente Supabase pasa,
-- aun cuando RLS lo permita: PostgREST devolveria 42501 "permission denied
-- for table X". Supabase normalmente aplica default privileges al crear el
-- proyecto, pero si fueron revocados o el schema se aplica antes de que
-- existan esos defaults, todo el cliente falla. Estos grants son la base
-- minima; RLS sigue filtrando filas.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to anon;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant all on routines to service_role;

-- ============================================================
-- 8. Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.planes enable row level security;
alter table public.eleams enable row level security;
alter table public.residentes enable row level security;
alter table public.habitaciones enable row level security;
alter table public.camas enable row level security;
alter table public.cama_asignaciones enable row level security;
alter table public.camas_audit enable row level security;
alter table public.signos_vitales enable row level security;
alter table public.observaciones_diarias enable row level security;
alter table public.turno_entregas enable row level security;
alter table public.eventos_adversos enable row level security;
alter table public.eventos_adversos_acciones enable row level security;
alter table public.eventos_adversos_audit enable row level security;
alter table public.planes_cuidado enable row level security;
alter table public.plan_cuidado_actividades enable row level security;
alter table public.plan_cuidado_horarios enable row level security;
alter table public.tareas_cuidado enable row level security;
alter table public.plan_cuidado_audit enable row level security;
alter table public.medicamentos_indicaciones enable row level security;
alter table public.medicamentos_horarios enable row level security;
alter table public.medicamentos_administraciones enable row level security;
alter table public.medicamentos_stock_lotes enable row level security;
alter table public.medicamentos_stock_movimientos enable row level security;
alter table public.medicamentos_conciliaciones enable row level security;
alter table public.medicamentos_audit enable row level security;
alter table public.funcionario_invitaciones enable row level security;
alter table public.auth_provision_requests enable row level security;
alter table public.familiar_residentes enable row level security;
alter table public.visitas_familiar enable row level security;
alter table public.eleam_feature_permissions enable row level security;
alter table public.profile_feature_permissions enable row level security;
alter table public.pagos enable row level security;
alter table public.mp_webhook_events enable row level security;
alter table public.acred_ambitos enable row level security;
alter table public.acred_requisitos enable row level security;
alter table public.acred_requisitos_eleam enable row level security;
alter table public.acred_documentos enable row level security;
alter table public.acred_observaciones enable row level security;
alter table public.acred_audit enable row level security;
alter table public.crm_prospect_lists enable row level security;
alter table public.crm_prospects enable row level security;
alter table public.crm_email_campaigns enable row level security;
alter table public.crm_campaign_members enable row level security;
alter table public.crm_email_sends enable row level security;
alter table public.crm_stage_history enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_interactions enable row level security;
alter table public.blog_posts enable row level security;
alter table public.demo_leads enable row level security;
alter table public.landing_events enable row level security;

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

-- Habitaciones, camas y ocupacion
drop policy if exists "habitaciones_select" on public.habitaciones;
drop policy if exists "habitaciones_insert_admin" on public.habitaciones;
drop policy if exists "habitaciones_update_admin" on public.habitaciones;
drop policy if exists "habitaciones_delete_admin" on public.habitaciones;

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

create policy "habitaciones_insert_admin" on public.habitaciones
  for insert with check (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "habitaciones_update_admin" on public.habitaciones
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

create policy "habitaciones_delete_admin" on public.habitaciones
  for delete using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "camas_select" on public.camas;
drop policy if exists "camas_insert_admin" on public.camas;
drop policy if exists "camas_update_admin" on public.camas;
drop policy if exists "camas_delete_admin" on public.camas;

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

create policy "camas_delete_admin" on public.camas
  for delete using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "cama_asignaciones_select" on public.cama_asignaciones;
drop policy if exists "cama_asignaciones_insert" on public.cama_asignaciones;
drop policy if exists "cama_asignaciones_update" on public.cama_asignaciones;
drop policy if exists "cama_asignaciones_delete_admin" on public.cama_asignaciones;

create policy "cama_asignaciones_select" on public.cama_asignaciones
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "cama_asignaciones_insert" on public.cama_asignaciones
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('asignar_camas')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "cama_asignaciones_update" on public.cama_asignaciones
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('asignar_camas')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('asignar_camas')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "cama_asignaciones_delete_admin" on public.cama_asignaciones
  for delete using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "camas_audit_select" on public.camas_audit;
create policy "camas_audit_select" on public.camas_audit
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
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

-- Evaluaciones clínicas (Barthel/Katz)
alter table public.evaluaciones_clinicas enable row level security;

drop policy if exists "eval_select" on public.evaluaciones_clinicas;
drop policy if exists "eval_insert" on public.evaluaciones_clinicas;
drop policy if exists "eval_update" on public.evaluaciones_clinicas;
drop policy if exists "eval_delete" on public.evaluaciones_clinicas;

create policy "eval_select" on public.evaluaciones_clinicas
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

create policy "eval_insert" on public.evaluaciones_clinicas
  for insert with check (
    public.funcionario_can('aplicar_evaluaciones_clinicas')
    and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
  );

create policy "eval_update" on public.evaluaciones_clinicas
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('aplicar_evaluaciones_clinicas')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('aplicar_evaluaciones_clinicas')
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
    )
  );

create policy "eval_delete" on public.evaluaciones_clinicas
  for delete using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and public.residente_belongs_to_eleam(residente_id, public.my_eleam_id())
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

-- Entrega de turno
drop policy if exists "te_select" on public.turno_entregas;
drop policy if exists "te_insert" on public.turno_entregas;
drop policy if exists "te_update" on public.turno_entregas;
drop policy if exists "te_delete" on public.turno_entregas;

create policy "te_select" on public.turno_entregas
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "te_insert" on public.turno_entregas
  for insert with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
    and public.eleam_has_access(eleam_id)
    and creado_por = (select auth.uid())
  );

create policy "te_update" on public.turno_entregas
  for update using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
    or (
      public.my_rol() = 'funcionario'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
      and creado_por = (select auth.uid())
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
    or (
      public.my_rol() = 'funcionario'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
      and creado_por = (select auth.uid())
    )
  );

create policy "te_delete" on public.turno_entregas
  for delete using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

-- Eventos adversos
drop policy if exists "eventos_adv_select" on public.eventos_adversos;
drop policy if exists "eventos_adv_insert" on public.eventos_adversos;
drop policy if exists "eventos_adv_update" on public.eventos_adversos;

create policy "eventos_adv_select" on public.eventos_adversos
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
    or (
      visible_familiar = true
      and residente_id is not null
      and public.familiar_can_view_residente(residente_id)
    )
  );

create policy "eventos_adv_insert" on public.eventos_adversos
  for insert with check (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and public.funcionario_can('crear_eventos_adversos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
      and (residente_id is null or public.residente_belongs_to_eleam(residente_id, public.my_eleam_id()))
    )
  );

create policy "eventos_adv_update" on public.eventos_adversos
  for update using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
      and (
        public.funcionario_can('editar_eventos_adversos')
        or public.funcionario_can('cerrar_eventos_adversos')
      )
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
      and (residente_id is null or public.residente_belongs_to_eleam(residente_id, public.my_eleam_id()))
      and (
        public.funcionario_can('editar_eventos_adversos')
        or public.funcionario_can('cerrar_eventos_adversos')
      )
    )
  );

drop policy if exists "eventos_adv_acciones_select" on public.eventos_adversos_acciones;
drop policy if exists "eventos_adv_acciones_insert" on public.eventos_adversos_acciones;

create policy "eventos_adv_acciones_select" on public.eventos_adversos_acciones
  for select using (
    exists (
      select 1
      from public.eventos_adversos e
      where e.id = evento_id
        and (
          public.is_superadmin()
          or (
            public.my_rol() in ('admin_eleam','funcionario')
            and e.eleam_id = public.my_eleam_id()
            and public.eleam_has_access(e.eleam_id)
          )
        )
    )
  );

create policy "eventos_adv_acciones_insert" on public.eventos_adversos_acciones
  for insert with check (
    exists (
      select 1
      from public.eventos_adversos e
      where e.id = evento_id
        and (
          public.is_superadmin()
          or (
            public.my_rol() in ('admin_eleam','funcionario')
            and e.eleam_id = public.my_eleam_id()
            and public.eleam_has_access(e.eleam_id)
            and (
              public.funcionario_can('crear_eventos_adversos')
              or public.funcionario_can('editar_eventos_adversos')
              or public.funcionario_can('cerrar_eventos_adversos')
            )
          )
        )
    )
  );

drop policy if exists "eventos_adv_audit_select" on public.eventos_adversos_audit;
drop policy if exists "eventos_adv_audit_insert" on public.eventos_adversos_audit;

create policy "eventos_adv_audit_select" on public.eventos_adversos_audit
  for select using (
    public.is_superadmin()
    or (
      eleam_id = public.my_eleam_id()
      and public.my_rol() in ('admin_eleam','funcionario')
      and public.eleam_has_access(eleam_id)
    )
    or exists (
      select 1
      from public.eventos_adversos e
      where e.id = evento_id
        and e.eleam_id = public.my_eleam_id()
        and public.my_rol() in ('admin_eleam','funcionario')
        and public.eleam_has_access(e.eleam_id)
    )
  );

create policy "eventos_adv_audit_insert" on public.eventos_adversos_audit
  for insert with check (
    public.is_superadmin()
    or (
      eleam_id = public.my_eleam_id()
      and public.my_rol() in ('admin_eleam','funcionario')
      and public.eleam_has_access(eleam_id)
    )
    or exists (
      select 1
      from public.eventos_adversos e
      where e.id = evento_id
        and e.eleam_id = public.my_eleam_id()
        and public.my_rol() in ('admin_eleam','funcionario')
        and public.eleam_has_access(e.eleam_id)
    )
  );

-- Plan de cuidado
drop policy if exists "pc_select" on public.planes_cuidado;
drop policy if exists "pc_insert" on public.planes_cuidado;
drop policy if exists "pc_update" on public.planes_cuidado;
drop policy if exists "pc_delete" on public.planes_cuidado;

create policy "pc_select" on public.planes_cuidado
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

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

create policy "pc_update" on public.planes_cuidado
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "pc_delete" on public.planes_cuidado
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "pca_select" on public.plan_cuidado_actividades;
drop policy if exists "pca_insert" on public.plan_cuidado_actividades;
drop policy if exists "pca_update" on public.plan_cuidado_actividades;
drop policy if exists "pca_delete" on public.plan_cuidado_actividades;

create policy "pca_select" on public.plan_cuidado_actividades
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "pca_insert" on public.plan_cuidado_actividades
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('crear_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "pca_update" on public.plan_cuidado_actividades
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "pca_delete" on public.plan_cuidado_actividades
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "pch_select" on public.plan_cuidado_horarios;
drop policy if exists "pch_insert" on public.plan_cuidado_horarios;
drop policy if exists "pch_update" on public.plan_cuidado_horarios;
drop policy if exists "pch_delete" on public.plan_cuidado_horarios;

create policy "pch_select" on public.plan_cuidado_horarios
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "pch_insert" on public.plan_cuidado_horarios
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('crear_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "pch_update" on public.plan_cuidado_horarios
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "pch_delete" on public.plan_cuidado_horarios
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_planes_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "tc_select" on public.tareas_cuidado;
drop policy if exists "tc_insert" on public.tareas_cuidado;
drop policy if exists "tc_update" on public.tareas_cuidado;

create policy "tc_select" on public.tareas_cuidado
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "tc_insert" on public.tareas_cuidado
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('completar_tareas_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "tc_update" on public.tareas_cuidado
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('completar_tareas_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('completar_tareas_cuidado')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "pc_audit_select" on public.plan_cuidado_audit;
create policy "pc_audit_select" on public.plan_cuidado_audit
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

-- Medicamentos
drop policy if exists "mi_select" on public.medicamentos_indicaciones;
drop policy if exists "mi_insert" on public.medicamentos_indicaciones;
drop policy if exists "mi_update" on public.medicamentos_indicaciones;

create policy "mi_select" on public.medicamentos_indicaciones
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "mi_insert" on public.medicamentos_indicaciones
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('crear_indicaciones_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "mi_update" on public.medicamentos_indicaciones
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_indicaciones_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_indicaciones_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "mh_select" on public.medicamentos_horarios;
drop policy if exists "mh_insert" on public.medicamentos_horarios;
drop policy if exists "mh_update" on public.medicamentos_horarios;
drop policy if exists "mh_delete" on public.medicamentos_horarios;

create policy "mh_select" on public.medicamentos_horarios
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "mh_insert" on public.medicamentos_horarios
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('crear_indicaciones_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "mh_update" on public.medicamentos_horarios
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_indicaciones_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_indicaciones_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "mh_delete" on public.medicamentos_horarios
  for delete using (
    public.is_superadmin()
    or (
      public.funcionario_can('editar_indicaciones_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "ma_select" on public.medicamentos_administraciones;
drop policy if exists "ma_insert" on public.medicamentos_administraciones;
drop policy if exists "ma_update" on public.medicamentos_administraciones;

create policy "ma_select" on public.medicamentos_administraciones
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "ma_insert" on public.medicamentos_administraciones
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('administrar_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "ma_update" on public.medicamentos_administraciones
  for update using (
    public.is_superadmin()
    or (
      (
        public.funcionario_can('administrar_medicamentos')
        or public.funcionario_can('validar_medicamentos_controlados')
      )
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      (
        public.funcionario_can('administrar_medicamentos')
        or public.funcionario_can('validar_medicamentos_controlados')
      )
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "msl_select" on public.medicamentos_stock_lotes;
drop policy if exists "msl_insert" on public.medicamentos_stock_lotes;
drop policy if exists "msl_update" on public.medicamentos_stock_lotes;

create policy "msl_select" on public.medicamentos_stock_lotes
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "msl_insert" on public.medicamentos_stock_lotes
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('ajustar_stock_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "msl_update" on public.medicamentos_stock_lotes
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('ajustar_stock_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('ajustar_stock_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "msm_select" on public.medicamentos_stock_movimientos;
drop policy if exists "msm_insert" on public.medicamentos_stock_movimientos;

create policy "msm_select" on public.medicamentos_stock_movimientos
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "msm_insert" on public.medicamentos_stock_movimientos
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('ajustar_stock_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "mc_select" on public.medicamentos_conciliaciones;
drop policy if exists "mc_insert" on public.medicamentos_conciliaciones;
drop policy if exists "mc_update" on public.medicamentos_conciliaciones;

create policy "mc_select" on public.medicamentos_conciliaciones
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "mc_insert" on public.medicamentos_conciliaciones
  for insert with check (
    public.is_superadmin()
    or (
      public.funcionario_can('ajustar_stock_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "mc_update" on public.medicamentos_conciliaciones
  for update using (
    public.is_superadmin()
    or (
      public.funcionario_can('ajustar_stock_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.funcionario_can('ajustar_stock_medicamentos')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
  );

drop policy if exists "med_audit_select" on public.medicamentos_audit;
create policy "med_audit_select" on public.medicamentos_audit
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() in ('admin_eleam','funcionario')
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
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

-- Permisos por feature (sidebar/rutas)
drop policy if exists "efp_select" on public.eleam_feature_permissions;
drop policy if exists "efp_superadmin_all" on public.eleam_feature_permissions;
drop policy if exists "pfp_select" on public.profile_feature_permissions;
drop policy if exists "pfp_admin_all" on public.profile_feature_permissions;

create policy "efp_select" on public.eleam_feature_permissions
  for select using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and eleam_id = public.my_eleam_id()
      and public.eleam_has_access(eleam_id)
    )
    or (
      eleam_id = public.my_eleam_id()
      and rol = public.my_rol()
      and public.eleam_has_access(eleam_id)
    )
  );

create policy "efp_superadmin_all" on public.eleam_feature_permissions
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "pfp_select" on public.profile_feature_permissions
  for select using (
    public.is_superadmin()
    or profile_id = (select auth.uid())
    or (
      public.my_rol() = 'admin_eleam'
      and profile_id in (
        select id from public.profiles
        where eleam_id = public.my_eleam_id()
          and rol in ('funcionario','familiar')
      )
    )
  );

create policy "pfp_admin_all" on public.profile_feature_permissions
  for all using (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and profile_id in (
        select id from public.profiles
        where eleam_id = public.my_eleam_id()
          and rol in ('funcionario','familiar')
      )
    )
  )
  with check (
    public.is_superadmin()
    or (
      public.my_rol() = 'admin_eleam'
      and profile_id in (
        select id from public.profiles
        where eleam_id = public.my_eleam_id()
          and rol in ('funcionario','familiar')
      )
      and (
        enabled = false
        or not exists (
          select 1
          from public.eleam_feature_permissions efp
          join public.profiles p on p.id = profile_feature_permissions.profile_id
          where efp.eleam_id = p.eleam_id
            and efp.rol = p.rol
            and efp.feature_id = profile_feature_permissions.feature_id
            and efp.enabled = false
        )
      )
    )
  );

drop policy if exists "vf_select" on public.visitas_familiar;
drop policy if exists "vf_insert" on public.visitas_familiar;
drop policy if exists "vf_update" on public.visitas_familiar;
drop policy if exists "vf_update_familiar_salida" on public.visitas_familiar;
drop policy if exists "vf_update_familiar_cancel_pending" on public.visitas_familiar;
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

create policy "vf_update_familiar_salida" on public.visitas_familiar
  for update using (
    public.my_rol() = 'familiar'
    and profile_id = (select auth.uid())
    and estado = 'activa'
    and residente_id in (select public.my_familiar_residente_ids())
  )
  with check (
    public.my_rol() = 'familiar'
    and profile_id = (select auth.uid())
    and estado = 'salida_pendiente'
    and salida_anunciada_en is not null
    and salida_hora is null
    and salida_validada_por is null
    and salida_validada_en is null
    and residente_id in (select public.my_familiar_residente_ids())
  );

create policy "vf_update_familiar_cancel_pending" on public.visitas_familiar
  for update using (
    public.my_rol() = 'familiar'
    and profile_id = (select auth.uid())
    and estado = 'pendiente'
    and validado_en is null
    and residente_id in (select public.my_familiar_residente_ids())
  )
  with check (
    public.my_rol() = 'familiar'
    and profile_id = (select auth.uid())
    and estado = 'cancelada'
    and validado_en is null
    and salida_anunciada_en is null
    and salida_hora is null
    and salida_validada_por is null
    and salida_validada_en is null
    and residente_id in (select public.my_familiar_residente_ids())
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
drop policy if exists "crm_prospect_lists_superadmin_all" on public.crm_prospect_lists;
create policy "crm_prospect_lists_superadmin_all" on public.crm_prospect_lists
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "crm_prospects_superadmin_all" on public.crm_prospects;
create policy "crm_prospects_superadmin_all" on public.crm_prospects
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "crm_email_campaigns_superadmin_all" on public.crm_email_campaigns;
create policy "crm_email_campaigns_superadmin_all" on public.crm_email_campaigns
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "crm_campaign_members_superadmin_all" on public.crm_campaign_members;
create policy "crm_campaign_members_superadmin_all" on public.crm_campaign_members
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "crm_email_sends_superadmin_all" on public.crm_email_sends;
create policy "crm_email_sends_superadmin_all" on public.crm_email_sends
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "crm_stage_history_superadmin_all" on public.crm_stage_history;
create policy "crm_stage_history_superadmin_all" on public.crm_stage_history
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

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

-- Landing: leads de demo y eventos anonimos
drop policy if exists "anon_insert_leads" on public.demo_leads;
drop policy if exists "superadmin_manage_leads" on public.demo_leads;

create policy "superadmin_manage_leads" on public.demo_leads
  for all to authenticated using (public.is_superadmin())
  with check (public.is_superadmin());

-- landing_events ya no acepta inserts directos del cliente: la Edge
-- Function track-landing-event inserta con service role tras validar tipo,
-- longitudes y rate limit. Se mantiene el drop de anon_insert_events para
-- retirar esa politica de bases que la tengan de versiones anteriores.
drop policy if exists "anon_insert_events" on public.landing_events;
drop policy if exists "superadmin_read_events" on public.landing_events;

create policy "superadmin_read_events" on public.landing_events
  for select to authenticated using (public.is_superadmin());

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
        public.funcionario_can('subir_acreditacion')
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
        public.funcionario_can('archivar_acreditacion')
        and public.eleam_has_access(public.my_eleam_id())
        and split_part(name, '/', 2) = public.my_eleam_id()::text
      )
    )
  );

-- ============================================================
-- 10. Seeds
-- ============================================================

insert into public.planes
  (codigo, nombre, descripcion, precio_clp, max_residentes, max_funcionarios, frequency, frequency_type, orden, destacado)
values
  ('plan-14', 'Hasta 14 residentes', 'Ideal para residencias pequeñas', 50000, 14, 10, 1, 'months', 1, false),
  ('plan-24', 'Hasta 24 residentes', 'El plan mas elegido', 80000, 24, 20, 1, 'months', 2, true),
  ('plan-34', 'Hasta 34 residentes', 'Para residencias grandes', 120000, 34, 30, 1, 'months', 3, false)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  precio_clp = excluded.precio_clp,
  max_residentes = excluded.max_residentes,
  max_funcionarios = excluded.max_funcionarios,
  frequency = excluded.frequency,
  frequency_type = excluded.frequency_type,
  orden = excluded.orden,
  destacado = excluded.destacado,
  activo = true;

insert into public.acred_ambitos (
  codigo, nombre, descripcion, icono, norma_codigo, articulo_ref, fuente_url, orden
) values
  ('DS20-A05','Autorización sanitaria','Antecedentes de solicitud, autorización de instalación y funcionamiento, documentos del establecimiento y programa integral.','📄','DS20','Art. 5','https://www.bcn.cl/leychile/navegar?idNorma=1182129',1),
  ('DS20-A06','Vigencia, observaciones y cierre','Resolución sanitaria, vigencia de tres años, observaciones SEREMI, subsanaciones y avisos de cierre.','🗓️','DS20','Art. 6','https://www.bcn.cl/leychile/navegar?idNorma=1182129',2),
  ('DS20-A07','Modificaciones ante SEREMI','Cambios de propietario, planta física, dirección técnica, personal, turnos o dotación.','🔁','DS20','Art. 7','https://www.bcn.cl/leychile/navegar?idNorma=1182129',3),
  ('DS20-A08','Infraestructura y ubicación','Condiciones sanitarias, accesibilidad, aseo, ubicación segura y evidencia física del establecimiento.','🏠','DS20','Arts. 8-9','https://www.bcn.cl/leychile/navegar?idNorma=1182129',4),
  ('DS20-A10','Instalaciones, equipamiento y seguridad','Letrero, habitaciones, baños, evacuación, incendios, cocina, sala de salud, medicamentos, lavandería y residuos.','🧯','DS20','Art. 10','https://www.bcn.cl/leychile/navegar?idNorma=1182129',5),
  ('DS20-A12','Dirección técnica y administrativa','Director técnico, director administrativo, jornada, reemplazo, validaciones y responsabilidades sanitarias.','🩺','DS20','Arts. 11-13','https://www.bcn.cl/leychile/navegar?idNorma=1182129',6),
  ('DS20-A15','Personal, competencias y dotación','Personal competente, técnicos, cuidadores, manipuladores, aseo, capacitaciones y cálculo de dotación por dependencia.','👥','DS20','Arts. 14-21','https://www.bcn.cl/leychile/navegar?idNorma=1182129',7),
  ('DS20-A23','Ingreso y carpeta personal','Consentimiento voluntario, condición de salud grave, historial social y de salud, evaluaciones y documentos del residente.','🧓','DS20','Arts. 22-24','https://www.bcn.cl/leychile/navegar?idNorma=1182129',8),
  ('DS20-A25','Protocolos y programa integral','Protocolos obligatorios, plan de capacitación anual, programa de atención integral usuaria e integración sociocomunitaria.','📋','DS20','Art. 25','https://www.bcn.cl/leychile/navegar?idNorma=1182129',9),
  ('DS20-A26','Red de salud y derivaciones','Controles de salud, APS o red privada, derivaciones, servicios externos y acceso de funcionarios de salud.','🏥','DS20','Art. 26','https://www.bcn.cl/leychile/navegar?idNorma=1182129',10),
  ('DS20-A27','Reglamento, contrato y registros','Reglamento interno, contrato, inventario, derechos y deberes, reclamos y registros específicos.','📝','DS20','Arts. 27-30','https://www.bcn.cl/leychile/navegar?idNorma=1182129',11),
  ('DS20-A31','Fiscalización, SENAMA y transitorios','Modo fiscalización, pauta MINSAL, reporte SENAMA, brechas críticas y plazos transitorios.','🔍','DS20','Arts. 3, 31-32 y transitorios','https://www.bcn.cl/leychile/navegar?idNorma=1182129',12)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  icono = excluded.icono,
  norma_codigo = excluded.norma_codigo,
  articulo_ref = excluded.articulo_ref,
  fuente_url = excluded.fuente_url,
  orden = excluded.orden;

with vals(
  ambito_codigo, codigo, nombre, descripcion, medio_verificador,
  obligatorio, permite_no_aplica, requiere_vencimiento, vigencia_dias_sugerida,
  norma_codigo, articulo_ref, fuente_url, criticidad, tipo_evidencia,
  origen_evidencia, requisito_operacional, orden
) as (values
  ('DS20-A05','DS20-A05-SOLICITUD-AUTORIZACION','Solicitud de autorización sanitaria completa','Individualización del solicitante, establecimiento, director técnico, personal, cupos, residentes por sexo/género y nivel de dependencia.','Formulario o expediente SEREMI con identificación del titular, establecimiento, director técnico, personal y cupos.',true,true,false,null,'DS20','Art. 5','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,1),
  ('DS20-A05','DS20-A05-INMUEBLE-DOMINIO','Dominio o derecho de uso del inmueble','Documento que acredita dominio, arriendo, comodato u otro derecho de uso y goce.','Escritura, contrato, certificado de dominio vigente u otro documento legal.',true,true,false,null,'DS20','Art. 5 letra c','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','documento','documental',false,2),
  ('DS20-A05','DS20-A05-PLANO-CROQUIS','Plano o croquis a escala','Debe identificar áreas, dormitorios, distribución de camas e instalaciones sanitarias de la zona de alimentos.','Plano o croquis a escala del establecimiento.',true,true,false,null,'DS20','Art. 5 letra d','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','documento','documental',false,3),
  ('DS20-A05','DS20-A05-RECEPCION-FINAL','Certificado de recepción final','Certificado emitido por la Dirección de Obras Municipales correspondiente.','Certificado DOM de recepción final.',true,true,true,1095,'DS20','Art. 5 letra e','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','documento','documental',false,4),
  ('DS20-A05','DS20-A05-AGUA-ALCANTARILLADO','Agua potable, alcantarillado o sistemas particulares autorizados','Certificación o autorización sanitaria de agua potable, alcantarillado o sistemas particulares.','Certificados de servicios sanitarios o autorización sanitaria vigente.',true,true,true,365,'DS20','Art. 5 letra f','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,5),
  ('DS20-A05','DS20-A05-PREVENCION-INCENDIOS','Certificación de prevención y protección contra incendios','Certificado de experto en prevención de riesgos o Bomberos según normativa vigente.','Informe de experto o certificado de Bomberos.',true,true,true,365,'DS20','Art. 5 letra g','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,6),
  ('DS20-A05','DS20-A05-ELECTRICIDAD-GAS','Instalaciones eléctricas y de gas certificadas','Certificación de condiciones emitida por instalador autorizado u organismo competente.','Certificados SEC o equivalentes vigentes.',true,true,true,1095,'DS20','Art. 5 letra h','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,7),
  ('DS20-A05','DS20-A05-DIRECTOR-TECNICO-ANTECEDENTES','Antecedentes del director técnico','Certificado de título, carta de aceptación y distribución de jornada.','Título, carta de aceptación, contrato o anexo de jornada.',true,true,false,null,'DS20','Art. 5 letra i','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,8),
  ('DS20-A05','DS20-A05-PLANTA-PERSONAL-TURNOS','Planta de personal, jornadas y sistema de turnos','Nómina y distribución de jornada del personal que funcionará en el establecimiento.','Nómina, contratos/anexos y cuadratura de turnos.',true,true,false,null,'DS20','Art. 5 letra j','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','mixta',true,9),
  ('DS20-A05','DS20-A05-DERECHOS-DEBERES','Carta de derechos y deberes visible','Carta elaborada por SENAMA en colaboración con MINSAL, visible y de uso común.','Archivo vigente y evidencia de publicación visible.',true,true,false,null,'DS20','Art. 5 letra t','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','documento','documental',false,10),
  ('DS20-A06','DS20-A06-RESOLUCION-SANITARIA','Resolución sanitaria de instalación y funcionamiento','Autorización SEREMI con vigencia de tres años y renovación automática mientras no sea dejada sin efecto.','Resolución sanitaria con número, fecha de otorgamiento y vigencia calculada.',true,true,true,1095,'DS20','Art. 6','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,1),
  ('DS20-A06','DS20-A06-OBSERVACIONES-SEREMI','Observaciones SEREMI y subsanaciones dentro de plazo','Registro de observaciones, plazo de siete días y acciones de subsanación.','Acta u oficio SEREMI, plan de subsanación y evidencia de cierre.',true,true,false,null,'DS20','Art. 6','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','mixta',true,2),
  ('DS20-A06','DS20-A06-CIERRE-TRANSITORIO-DEFINITIVO','Aviso de cierre transitorio o definitivo','Cuando corresponda, el titular debe avisar a SEREMI para suspensión o término de autorización.','Comunicación formal enviada a SEREMI y respuesta si existe.',false,true,false,null,'DS20','Art. 6','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','documento','documental',false,3),
  ('DS20-A07','DS20-A07-MODIFICACION-PROPIETARIO-PLANTA','Solicitud por cambio de propietario o planta física','Debe presentarse dentro de 20 días hábiles desde el cambio.','Solicitud SEREMI, antecedentes de respaldo y resolución.',false,true,false,null,'DS20','Art. 7 letra a','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,1),
  ('DS20-A07','DS20-A07-CAMBIO-DIRECTOR-TECNICO','Solicitud por cambio de director técnico','Debe presentarse dentro de 5 días hábiles desde el cambio.','Solicitud, título, carta de aceptación y jornada del nuevo director técnico.',false,true,false,null,'DS20','Art. 7 letra b','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,2),
  ('DS20-A07','DS20-A07-CAMBIO-PERSONAL-TURNOS','Solicitud por cambio de personal, jornada, turnos o dotación','Debe presentarse dentro de 5 días hábiles cuando afecta personal o proporción con residentes.','Solicitud SEREMI y nueva planta de personal con turnos.',false,true,false,null,'DS20','Art. 7 letra c','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','mixta',true,3),
  ('DS20-A08','DS20-A08-INFRAESTRUCTURA-SEGURA','Infraestructura libre de riesgo estructural y sanitario','Muros, pisos, instalaciones sanitarias, iluminación, climatización y superficies en buen estado.','Checklist de infraestructura, fotografías y mantenciones.',true,true,false,null,'DS20','Art. 8','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','mixta',true,1),
  ('DS20-A08','DS20-A08-ASEO-DESINFECCION','Rutina de aseo y desinfección','Procedimiento de aseo y limpieza con desinfectantes según protocolos MINSAL.','Procedimiento vigente y bitácoras de aseo.',true,true,false,null,'DS20','Art. 8 letra g','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','registro','operacional',true,2),
  ('DS20-A08','DS20-A08-UBICACION-SEGURA','Ubicación alejada de fuentes de riesgo sanitario','Al menos 500 metros de residuos, aguas residuales, ruidos, gases u otras emanaciones de riesgo.','Declaración, mapa, informe municipal o respaldo territorial.',true,true,false,null,'DS20','Art. 9','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,3),
  ('DS20-A10','DS20-A10-LETRERO-AUTORIZACION','Letrero de autorización en frontis','Mínimo 40 x 40 cm, letras de al menos 2 cm, número y fecha de resolución sanitaria.','Fotografía del frontis y datos de resolución.',true,true,false,null,'DS20','Art. 10 letra a','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','documento','documental',false,1),
  ('DS20-A10','DS20-A10-HABITACIONES-CAMAS','Habitaciones y camas según estándar DS 20','Máximo 4 camas por habitación, circulación mínima, guardado individual, mesa de noche y sistema de llamado.','Plano/croquis, registro de habitaciones/camas y checklist de equipamiento.',true,true,false,null,'DS20','Art. 10 letra j','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','mixta',true,2),
  ('DS20-A10','DS20-A10-EVACUACION-INCENDIOS','Seguridad contra incendios y vías de evacuación','Cumplimiento de normativa de incendios, salidas expeditas, iluminación autónoma, señalética y plano de evacuación.','Certificados, plan de evacuación, señalética y evidencia fotográfica.',true,true,true,365,'DS20','Art. 10 letras k-m','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,3),
  ('DS20-A10','DS20-A10-BANOS-ACCESIBLES','Servicios higiénicos accesibles y suficientes','Al menos 1 baño por cada 5 residentes, con ducha teléfono, barras, alerta, agua fría/caliente y baño asistido.','Checklist por baño, fotografías y relación baños/residentes.',true,true,false,null,'DS20','Art. 10 letra n','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','mixta',false,4),
  ('DS20-A10','DS20-A10-COCINA-ALIMENTOS','Cocina o zona de alimentos autorizada','Debe cumplir DS N°977/1996 y estar incorporada en autorización del establecimiento.','Autorización sanitaria, checklist de cocina y certificados de manipuladores.',true,true,false,null,'DS20','Art. 10 letra o','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,5),
  ('DS20-A10','DS20-A10-SALA-SALUD-EQUIPO-MOVIL','Sala de salud o equipo móvil con insumos mínimos','Esfigmomanómetro, fonendoscopio, termómetro, glicemia, saturómetro, primeros auxilios y estantería de carpetas.','Inventario de equipamiento, fotografías y revisión periódica.',true,true,false,null,'DS20','Art. 10 letra p','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','mixta',false,6),
  ('DS20-A10','DS20-A10-MEDICAMENTOS-ALMACENAMIENTO','Almacenamiento seguro de medicamentos','Acceso restringido, temperatura menor a 25 °C, gavetas individualizadas, cadena de frío y controlados bajo llave.','Registro de almacenamiento, temperatura, gavetas, lote, vencimiento y responsable.',true,true,false,null,'DS20','Art. 10 letra q','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','registro','operacional',true,7),
  ('DS20-A10','DS20-A10-LAVANDERIA-RESIDUOS','Aseo, lavandería y residuos domiciliarios','Espacios e insumos para aseo, flujo de ropa sucia/limpia y retiro de residuos al menos diario o al 3/4 de capacidad.','Procedimientos, bitácoras y evidencia de espacios diferenciados.',true,true,false,null,'DS20','Art. 10 letras r-t','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','registro','operacional',true,8),
  ('DS20-A12','DS20-A12-DIRECTOR-CALIFICACION','Director técnico con calificación exigida','Título profesional salud/social de 8 o más semestres, habilitación y postítulo/experiencia en geriatría, gerontología o ELEAM.','Título, habilitación, diplomado/postítulo o certificado de experiencia.',true,true,false,null,'DS20','Art. 12','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,1),
  ('DS20-A12','DS20-A12-JORNADA-REEMPLAZO','Permanencia, reemplazante y disponibilidad del director técnico','4 horas semanales hasta 15 residentes, 5 horas si mayor capacidad, reemplazante y disponibilidad telefónica.','Contrato/anexo de jornada, registro de asistencia, reemplazante designado.',true,true,false,null,'DS20','Art. 13','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','mixta',true,2),
  ('DS20-A12','DS20-A12-VALIDACIONES-DIRECCION-TECNICA','Validaciones clínicas y sociales por dirección técnica','Dependencia funcional, cognitiva y nutricional al ingreso, programa integral, red de salud, medicamentos y eventos críticos.','Registros firmados/validados, evaluaciones y reportes de seguimiento.',true,true,false,null,'DS20','Art. 12','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','registro','operacional',true,3),
  ('DS20-A12','DS20-A12-REPORTE-SENAMA','Reporte trimestral a SENAMA','Información administrativa, residentes y trabajadores reportada al menos trimestralmente.','Reporte trimestral SENAMA, PDF/Excel/CSV y comprobante de envío.',true,true,true,90,'DS20','Art. 12 N°24','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','mixta',true,4),
  ('DS20-A15','DS20-A15-CALCULADORA-DOTACION-DEPENDENCIA','Dotación calculada por dependencia y turno','Cuidadores diurnos/nocturnos según dependencia, autovalencia y mínimo nocturno de dos cuidadores.','Cálculo de dotación, nómina por turno y residentes por dependencia.',true,true,false,null,'DS20','Arts. 15-17','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','registro','operacional',true,1),
  ('DS20-A15','DS20-A15-TENS-AUXILIAR','Auxiliar o técnico de enfermería disponible según norma','12 horas diurnas y llamada nocturna para residentes con dependencia; llamada 24 horas para autovalentes.','Turnos, contratos, certificados y registros de llamada.',true,true,false,null,'DS20','Art. 18','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','operacional',true,2),
  ('DS20-A15','DS20-A15-COMPETENCIAS-CUIDADORES','Competencias y capacitaciones de cuidadores/TENS','Medicamentos, signos vitales, alimentación por sonda, insulina/heparina, soporte vital básico y actividades de vida diaria.','Certificados, plan de capacitación anual y matriz de competencias.',true,true,true,365,'DS20','Arts. 18-19','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','mixta',true,3),
  ('DS20-A15','DS20-A15-MANIPULADORES-ALIMENTOS','Manipuladores de alimentos o servicio externalizado','Personal o servicio que cumple DS N°977/1996, con plan de contingencia si corresponde.','Nómina, certificados, contrato de servicio externo y plan de contingencia.',true,true,true,365,'DS20','Art. 20','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','documento','documental',false,4),
  ('DS20-A23','DS20-A23-CONSENTIMIENTO-INGRESO','Consentimiento voluntario de ingreso','La voluntad libre y expresa debe constar por escrito; puede firmar representante legal si corresponde.','Consentimiento firmado y registro de representante legal cuando aplique.',true,true,false,null,'DS20','Art. 23','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,1),
  ('DS20-A23','DS20-A23-CONDICION-SALUD-GRAVE','Evaluación de condición de salud grave al ingreso','No pueden ingresar personas con condición que requiera asistencia médica continua o permanente.','Declaración/evaluación de ingreso, informe de salud y validación técnica.',true,true,false,null,'DS20','Art. 23','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','registro','operacional',true,2),
  ('DS20-A23','DS20-A23-EVALUACIONES-GERIATRICAS','Evaluaciones funcional, cognitiva y nutricional','Determinación del nivel de dependencia mediante instrumentos de valoración geriátrica integral.','Evaluaciones registradas, puntajes, instrumentos usados y fecha de próxima evaluación.',true,true,false,null,'DS20','Arts. 12 y 23','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','registro','operacional',true,3),
  ('DS20-A23','DS20-A23-CARPETA-PERSONAL-ACTUALIZADA','Carpeta personal digital actualizada','Sistema de salud, historial de salud, historial social, medicamentos, registros diarios y acceso restringido.','Carpeta digital por residente con auditoría, documentos y registros recientes.',true,true,false,null,'DS20','Art. 29','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','registro','operacional',true,4),
  ('DS20-A23','DS20-A24-EVENTOS-AGUDOS-DERIVACION','Registro de eventos agudos, indicación médica y derivación','Continuidad excepcional con indicación médica escrita o traslado a establecimiento resolutivo/urgencia.','Evento crítico, signos vitales, indicación médica, consentimiento informado y derivación.',true,true,false,null,'DS20','Art. 24','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','operacional',true,5),
  ('DS20-A25','DS20-A25-PROTOCOLO-INGRESO-EGRESO','Protocolo de ingreso y egreso','Incluye dependencia, evaluación de ingreso, consentimiento, inducción y situaciones de egreso.','Protocolo vigente, versión, responsable y evidencia de aplicación.',true,true,true,365,'DS20','Art. 25 N°1','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','documento','documental',false,1),
  ('DS20-A25','DS20-A25-CAPACITACION-ANUAL-22H','Plan de inducción y capacitación anual de 22 horas','Objetivos, contenidos, evaluación y duración mínima de 22 horas.','Plan anual, asistencia, evaluaciones y certificados emitidos.',true,true,true,365,'DS20','Art. 25 N°2','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','mixta',true,2),
  ('DS20-A25','DS20-A25-PLAN-EMERGENCIAS','Plan de emergencias y desastres','Incendios, sismos, cortes de agua/luz, robos y otros eventos, con responsables y herramientas.','Plan vigente, simulacros, responsables y evidencias de socialización.',true,true,true,365,'DS20','Art. 25 N°3','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,3),
  ('DS20-A25','DS20-A25-URGENCIAS-FALLECIMIENTO','Protocolos de urgencias médicas y fallecimiento','Protocolos actualizados, socializados y aplicables por el equipo.','Protocolos, versiones, responsables y evidencia de capacitación.',true,true,true,365,'DS20','Art. 25 N°4-5','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,4),
  ('DS20-A25','DS20-A25-PROGRAMA-INTEGRAL-USUARIA','Programa de atención integral usuaria vigente','Intervenciones biopsicosociales de prevención, mantención, promoción, necesidades básicas, autonomía y bienestar.','Programa individual vigente, intervenciones, frecuencia, responsable y validación técnica.',true,true,false,null,'DS20','Art. 25 N°6','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','registro','operacional',true,5),
  ('DS20-A25','DS20-A25-INTEGRACION-SOCIOCOMUNITARIA','Plan de integración sociocomunitaria','Redes socioafectivas, persona significativa, inclusión comunitaria, voluntariado y actividades intergeneracionales.','Plan, actividades, participantes, calendario y registros de ejecución.',true,true,false,null,'DS20','Art. 25 N°7','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','registro','mixta',true,6),
  ('DS20-A26','DS20-A26-RED-SALUD-APS-PRIVADA','Vinculación con red de salud','Control de salud mediante APS o centro privado y acceso de funcionarios de salud al ELEAM.','Centro de salud por residente, controles, derivaciones y contactos de red.',true,true,false,null,'DS20','Art. 26','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','operacional',true,1),
  ('DS20-A26','DS20-A26-SERVICIOS-PRIVADOS','Servicios privados cuando no hay acceso oportuno','Preferentemente geriatra, neurólogo o médico de familia cuando corresponda.','Contratos, órdenes, informes y registros de atención.',false,true,false,null,'DS20','Art. 26','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','registro','mixta',true,2),
  ('DS20-A27','DS20-A27-REGLAMENTO-INTERNO','Reglamento interno visible, entregado y explicado','Debe declarar derechos, autonomía, reclamos, uso de lugares comunes, orden, higiene y seguridad.','Reglamento vigente, evidencia visible, entrega y explicación al ingreso.',true,true,true,365,'DS20','Art. 27','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,1),
  ('DS20-A27','DS20-A28-CONTRATO-RESIDENCIA','Contrato de residencia sin cláusulas prohibidas','Derechos/deberes, causales de exclusión, rendición de gastos si aplica e inventario.','Contrato firmado por residente o representante y revisión documental.',true,true,false,null,'DS20','Art. 28','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','documento','documental',false,2),
  ('DS20-A27','DS20-A28-INVENTARIO-BIENES','Inventario de bienes al ingreso, anual y egreso','Inventario simple de bienes personales al ingreso, al menos anual y al término del contrato.','Inventario firmado, revisión anual y registro de egreso.',true,true,true,365,'DS20','Art. 28','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','registro','operacional',true,3),
  ('DS20-A27','DS20-A29-REGISTRO-RECLAMOS','Registro de sugerencias o reclamos visible y codificado','Libro foliado o digitalizado, con codificación y fácil consulta para residentes, familiares o persona significativa.','Registro digital/foliado, códigos, estados, respuestas y cierres.',true,true,false,null,'DS20','Art. 29 N°2','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','operacional',true,4),
  ('DS20-A27','DS20-A29-DERECHOS-ENTREGADOS','Carta de derechos y deberes entregada al ingreso','Entrega por escrito al ingreso y consignación en consentimiento.','Registro de entrega, firma o confirmación digital.',true,true,false,null,'DS20','Art. 29 N°4','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','documento','documental',false,5),
  ('DS20-A27','DS20-A30-DATOS-SENSIBLES','Reserva y control de datos personales sensibles','El personal con acceso a datos sensibles debe guardar reserva conforme a Ley N°19.628 y normativa aplicable.','Roles, permisos, auditoría de acceso y compromisos de confidencialidad.',true,true,false,null,'DS20','Art. 30','https://www.bcn.cl/leychile/navegar?idNorma=1182129','critica','registro','operacional',true,6),
  ('DS20-A31','DS20-A31-MODO-FISCALIZACION','Modo fiscalización SEREMI con evidencia descargable','SEREMI fiscaliza cumplimiento del reglamento y MINSAL proporciona pauta de fiscalización publicada y actualizada.','Carpeta exportable, matriz de brechas, documentos y registros por artículo.',true,true,false,null,'DS20','Art. 31','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','mixta',true,1),
  ('DS20-A31','DS20-A31-PLAZOS-TRANSITORIOS','Control de plazos transitorios DS 20','Obligación general cumplidos 3 años desde vigencia y 5 años para seguridad contra incendios.','Matriz de cumplimiento transitorio y plan de adecuación.',true,true,false,null,'DS20','Art. 1 transitorio','https://www.bcn.cl/leychile/navegar?idNorma=1182129','alta','registro','mixta',true,2),
  ('DS20-A31','DS20-A31-REPORTES-SENAMA-SEREMI','Reportes y antecedentes para SENAMA/SEREMI','Capacidad de conservar y generar información administrativa, residentes, trabajadores, brechas y subsanaciones.','Reportes PDF/Excel/CSV, historial de envíos y respaldo de comunicaciones.',true,true,false,null,'DS20','Arts. 3 y 31','https://www.bcn.cl/leychile/navegar?idNorma=1182129','media','registro','operacional',true,3)
)
insert into public.acred_requisitos (
  ambito_id, codigo, nombre, descripcion, medio_verificador,
  obligatorio, permite_no_aplica, requiere_vencimiento, vigencia_dias_sugerida,
  norma_codigo, articulo_ref, fuente_url, criticidad, tipo_evidencia,
  origen_evidencia, requisito_operacional, orden
)
select
  a.id, v.codigo, v.nombre, v.descripcion, v.medio_verificador,
  v.obligatorio, v.permite_no_aplica, v.requiere_vencimiento, v.vigencia_dias_sugerida,
  v.norma_codigo, v.articulo_ref, v.fuente_url, v.criticidad, v.tipo_evidencia,
  v.origen_evidencia, v.requisito_operacional, v.orden
from vals v
join public.acred_ambitos a on a.codigo = v.ambito_codigo
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  medio_verificador = excluded.medio_verificador,
  obligatorio = excluded.obligatorio,
  permite_no_aplica = excluded.permite_no_aplica,
  requiere_vencimiento = excluded.requiere_vencimiento,
  vigencia_dias_sugerida = excluded.vigencia_dias_sugerida,
  norma_codigo = excluded.norma_codigo,
  articulo_ref = excluded.articulo_ref,
  fuente_url = excluded.fuente_url,
  criticidad = excluded.criticidad,
  tipo_evidencia = excluded.tipo_evidencia,
  origen_evidencia = excluded.origen_evidencia,
  requisito_operacional = excluded.requisito_operacional,
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
