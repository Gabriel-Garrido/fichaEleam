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
  check (visible_familiar = false or nullif(trim(coalesce(resumen_familiar, '')), '') is not null)
);

create index if not exists idx_observaciones_residente_fecha on public.observaciones_diarias(residente_id, fecha_hora desc);
create index if not exists idx_observaciones_tipo on public.observaciones_diarias(tipo);
create index if not exists idx_observaciones_seguimiento
  on public.observaciones_diarias(residente_id, fecha_hora desc)
  where requiere_seguimiento = true;
create index if not exists idx_observaciones_seguimiento_turno
  on public.observaciones_diarias(seguimiento_fecha, seguimiento_turno, seguimiento_estado)
  where requiere_seguimiento = true;
create index if not exists idx_observaciones_familiar
  on public.observaciones_diarias(residente_id, fecha_hora desc)
  where visible_familiar = true;

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

-- ============================================================
-- 2.b Plan de cuidado y eMAR
-- ============================================================

create table if not exists public.planes_cuidado (
  id                    uuid primary key default gen_random_uuid(),
  eleam_id              uuid not null references public.eleams(id) on delete cascade,
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  titulo                text not null default 'Plan de cuidado',
  objetivos             text,
  pauta_alimentacion    text,
  pauta_hidratacion     text,
  restricciones         text,
  riesgo_caidas         text check (riesgo_caidas in ('bajo','medio','alto') or riesgo_caidas is null),
  riesgo_up             text check (riesgo_up in ('bajo','medio','alto') or riesgo_up is null),
  estado                text not null default 'activo' check (estado in ('activo','pausado','cerrado')),
  version               integer not null default 1 check (version > 0),
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
  categoria             text not null check (categoria in (
                          'alimentacion','hidratacion','higiene','bano','movilidad',
                          'cambios_posicion','eliminacion','prevencion_caidas',
                          'prevencion_up','actividad','controles','otro'
                        )),
  titulo                text not null,
  descripcion           text,
  instrucciones         text,
  prioridad             text not null default 'media' check (prioridad in ('baja','media','alta','urgente')),
  requiere_observacion  boolean not null default false,
  visible_familiar      boolean not null default false,
  resumen_familiar      text,
  activo                boolean not null default true,
  creado_por            uuid references auth.users(id) on delete set null,
  actualizado_por       uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
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
  turno                 text not null check (turno in ('mañana','tarde','noche')),
  hora                  time not null,
  estado                text not null default 'pendiente'
                        check (estado in ('pendiente','cumplida','omitida','reprogramada','cancelada')),
  motivo_omision        text check (
                          motivo_omision is null
                          or motivo_omision in ('rechazo','no_disponible','contraindicado','residente_ausente','otro')
                        ),
  notas                 text,
  requiere_seguimiento  boolean not null default false,
  observacion_id        uuid references public.observaciones_diarias(id) on delete set null,
  fecha_original        date,
  fechas_programadas    date[] not null default '{}'::date[],
  reprogramada_para     timestamptz,
  cumplida_por          uuid references auth.users(id) on delete set null,
  cumplida_en           timestamptz,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
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
create index if not exists idx_inv_eleam_email_active
  on public.funcionario_invitaciones(eleam_id, lower(email), usado, expira_en desc);

create table if not exists public.auth_provision_requests (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
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
  creado_en     timestamptz not null default now()
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
  add column if not exists editar_indicaciones_cuidado     boolean not null default false;

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

create table if not exists public.landing_events (
  id           uuid default gen_random_uuid() primary key,
  tipo         text not null,
  pagina       text,
  elemento     text,
  valor        text,
  session_id   text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  referrer     text,
  creado_en    timestamptz default now() not null
);

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
        utm_source = coalesce(nullif(trim(coalesce(p_utm_source, '')), ''), utm_source),
        utm_medium = coalesce(nullif(trim(coalesce(p_utm_medium, '')), ''), utm_medium),
        utm_campaign = coalesce(nullif(trim(coalesce(p_utm_campaign, '')), ''), utm_campaign),
        pagina_origen = coalesce(nullif(trim(coalesce(p_pagina_origen, '')), ''), pagina_origen),
        referrer = coalesce(nullif(trim(coalesce(p_referrer, '')), ''), referrer)
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
    nullif(trim(coalesce(p_utm_source, '')), ''),
    nullif(trim(coalesce(p_utm_medium, '')), ''),
    nullif(trim(coalesce(p_utm_campaign, '')), ''),
    nullif(trim(coalesce(p_pagina_origen, '')), ''),
    nullif(trim(coalesce(p_referrer, '')), '')
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
    'nombre_contacto', r.nombre_contacto,
    'telefono_contacto', r.telefono_contacto,
    'parentesco_contacto', r.parentesco_contacto,
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

  return jsonb_build_object(
    'date', v_fecha,
    'resident', v_residente,
    'vitals', v_vitales,
    'observations', v_observaciones,
    'care', v_cuidados,
    'medications', v_medicacion,
    'visits', v_visitas,
    'care_plan', v_plan_cuidado,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.get_familiar_resident_snapshot(uuid, date) from public;
grant execute on function public.get_familiar_resident_snapshot(uuid, date) to authenticated;

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

    insert into public.profiles (id, nombre, email, rol, eleam_id, must_reset_password)
    values (
      new.id,
      v_nombre,
      new.email,
      v_rol,
      case when v_rol = 'superadmin' then null else v_eleam_id end,
      coalesce((new.raw_user_meta_data->>'must_reset_password')::boolean, false)
    )
    on conflict (id) do update set
      nombre              = excluded.nombre,
      email               = excluded.email,
      rol                 = excluded.rol,
      eleam_id            = excluded.eleam_id,
      must_reset_password = excluded.must_reset_password;

    if v_rol = 'familiar'
       and v_residente_id is not null
       and exists (
         select 1 from public.residentes r
         where r.id = v_residente_id
           and r.eleam_id = v_eleam_id
           and r.estado = 'activo'
       ) then
      insert into public.familiar_residentes (profile_id, residente_id, creado_por)
      values (new.id, v_residente_id, null)
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
          and r.estado = 'activo'
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
          and r.estado = 'activo'
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

    select i.id, lower(i.email) as email, i.rol, i.expira_en, i.usado, i.eleam_id, i.residente_id, i.creado_por
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
            and r.estado = 'activo'
        ) then
          raise exception 'El residente asociado al acceso ya no esta activo'
            using errcode = '42501';
        end if;
      end if;

      update public.funcionario_invitaciones
      set usado = true, usado_en = now()
      where id = v_invitacion.id;

      insert into public.profiles (id, nombre, email, rol, eleam_id, must_reset_password)
      values (new.id, v_nombre, new.email, v_rol, v_eleam_id, false)
      on conflict (id) do update set
        nombre              = excluded.nombre,
        email               = excluded.email,
        rol                 = excluded.rol,
        eleam_id            = excluded.eleam_id,
        must_reset_password = false;

      if v_rol = 'familiar' and v_residente_id is not null then
        insert into public.familiar_residentes (profile_id, residente_id, creado_por)
        values (new.id, v_residente_id, v_invitado_por)
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
    and estado = 'cumple'
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
        'Administracion eMAR',
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
      'eMAR ' || case when p_estado = 'omitido' then 'omitido' else 'registrado' end ||
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

drop trigger if exists trg_turno_entregas_updated_at on public.turno_entregas;
create trigger trg_turno_entregas_updated_at
  before update on public.turno_entregas
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

revoke all on function public.generar_tareas_cuidado(date, text) from public;
grant execute on function public.generar_tareas_cuidado(date, text) to authenticated;

revoke all on function public.completar_tarea_cuidado(uuid, text, text, text, boolean, date, text) from public;
grant execute on function public.completar_tarea_cuidado(uuid, text, text, text, boolean, date, text) to authenticated;

revoke all on function public.reprogramar_tarea_cuidado(uuid, date, text, time, text, boolean, date, text) from public;
grant execute on function public.reprogramar_tarea_cuidado(uuid, date, text, time, text, boolean, date, text) to authenticated;

revoke all on function public.generar_administraciones_medicamentos(date, text) from public;
grant execute on function public.generar_administraciones_medicamentos(date, text) to authenticated;

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

-- eMAR
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
