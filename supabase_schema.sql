-- ============================================================
-- SCHEMA SUPABASE — FichaEleam v2
-- ELEAM: Establecimiento de Larga Estadía para Adultos Mayores
-- DS 14/2017 — Fiscalización SEREMI de Salud
--
-- INSTRUCCIONES:
--   1. Abrir Supabase Dashboard → SQL Editor
--   2. Pegar este script completo y ejecutar (Run All)
--   3. Crear los Storage buckets en Dashboard → Storage si el
--      script da error de permisos en esa sección (ver nota al final)
-- ============================================================

-- Extensión para UUIDs (gen_random_uuid() viene nativo en PG 13+)
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLA: profiles
-- Extiende auth.users de Supabase Auth.
-- Se crea automáticamente vía trigger on_auth_user_created.
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  rol         text not null default 'usuario'
                check (rol in ('admin', 'usuario', 'enfermera', 'medico')),
  creado_en   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Política: cada usuario ve y edita solo su propio perfil
drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Trigger: crea el perfil automáticamente al registrar un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
    new.email,
    'usuario'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TABLA: residentes
-- Ficha maestra de cada residente del ELEAM.
-- ============================================================
create table if not exists public.residentes (
  id                      uuid primary key default gen_random_uuid(),
  -- Identificación
  nombre                  text not null,
  apellido                text not null,
  rut                     text unique,
  fecha_nacimiento        date,
  sexo                    text check (sexo in ('masculino', 'femenino', 'otro')),
  nacionalidad            text default 'Chilena',
  estado_civil            text check (estado_civil in ('soltero', 'casado', 'viudo', 'divorciado', 'otro')),
  -- Contacto de emergencia
  direccion_anterior      text,
  nombre_contacto         text,
  telefono_contacto       text,
  parentesco_contacto     text,
  -- Información clínica base
  prevision               text,
  diagnostico_principal   text,
  diagnosticos_secundarios text[],
  alergias                text[],
  grupo_sanguineo         text,
  -- Estadía en el establecimiento
  fecha_ingreso           date not null default current_date,
  fecha_egreso            date,
  motivo_egreso           text,
  habitacion              text,
  cama                    text,
  estado                  text not null default 'activo'
                            check (estado in ('activo', 'hospitalizado', 'egresado', 'fallecido')),
  -- Evaluaciones funcionales
  indice_barthel          integer check (indice_barthel between 0 and 100),
  escala_katz             text,
  nivel_dependencia       text check (nivel_dependencia in ('leve', 'moderado', 'severo', 'total')),
  -- Metadatos
  creado_por              uuid references auth.users(id) on delete set null,
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now()
);

alter table public.residentes enable row level security;

drop policy if exists "residentes_select" on public.residentes;
create policy "residentes_select"
  on public.residentes for select
  using ((select auth.uid()) is not null);

drop policy if exists "residentes_insert" on public.residentes;
create policy "residentes_insert"
  on public.residentes for insert
  with check ((select auth.uid()) is not null);

drop policy if exists "residentes_update" on public.residentes;
create policy "residentes_update"
  on public.residentes for update
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "residentes_delete" on public.residentes;
create policy "residentes_delete"
  on public.residentes for delete
  using ((select auth.uid()) is not null);

-- ============================================================
-- TABLA: signos_vitales
-- Registro de signos vitales por turno.
-- ============================================================
create table if not exists public.signos_vitales (
  id                    uuid primary key default gen_random_uuid(),
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  fecha_hora            timestamptz not null default now(),
  turno                 text check (turno in ('mañana', 'tarde', 'noche')),
  -- Mediciones
  presion_sistolica     integer check (presion_sistolica between 50 and 300),
  presion_diastolica    integer check (presion_diastolica between 30 and 200),
  frecuencia_cardiaca   integer check (frecuencia_cardiaca between 20 and 300),
  frecuencia_respiratoria integer check (frecuencia_respiratoria between 5 and 60),
  temperatura           numeric(4,1) check (temperatura between 30.0 and 45.0),
  saturacion_oxigeno    integer check (saturacion_oxigeno between 0 and 100),
  glucosa               integer check (glucosa between 20 and 800),
  peso                  numeric(5,2) check (peso between 10.0 and 300.0),
  -- Evaluación
  dolor_escala          integer check (dolor_escala between 0 and 10),
  estado_conciencia     text check (estado_conciencia in ('alerta', 'somnoliento', 'estuporoso', 'coma')),
  observaciones         text,
  -- Metadatos
  registrado_por        uuid references auth.users(id) on delete set null
);

alter table public.signos_vitales enable row level security;

drop policy if exists "signos_select" on public.signos_vitales;
create policy "signos_select"
  on public.signos_vitales for select
  using ((select auth.uid()) is not null);

drop policy if exists "signos_insert" on public.signos_vitales;
create policy "signos_insert"
  on public.signos_vitales for insert
  with check ((select auth.uid()) is not null);

drop policy if exists "signos_update" on public.signos_vitales;
create policy "signos_update"
  on public.signos_vitales for update
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "signos_delete" on public.signos_vitales;
create policy "signos_delete"
  on public.signos_vitales for delete
  using ((select auth.uid()) is not null);

-- ============================================================
-- TABLA: observaciones_diarias
-- Notas de turno, incidentes, procedimientos.
-- ============================================================
create table if not exists public.observaciones_diarias (
  id                    uuid primary key default gen_random_uuid(),
  residente_id          uuid not null references public.residentes(id) on delete cascade,
  fecha_hora            timestamptz not null default now(),
  turno                 text check (turno in ('mañana', 'tarde', 'noche')),
  tipo                  text not null check (tipo in (
                          'observacion_general', 'caida', 'incidente', 'curacion',
                          'visita_medica', 'administracion_medicamento', 'cambio_posicion',
                          'higiene', 'alimentacion', 'eliminacion', 'actividad', 'otro'
                        )),
  descripcion           text not null,
  acciones_tomadas      text,
  requiere_seguimiento  boolean not null default false,
  -- Metadatos
  registrado_por        uuid references auth.users(id) on delete set null,
  creado_en             timestamptz not null default now()
);

alter table public.observaciones_diarias enable row level security;

drop policy if exists "observaciones_select" on public.observaciones_diarias;
create policy "observaciones_select"
  on public.observaciones_diarias for select
  using ((select auth.uid()) is not null);

drop policy if exists "observaciones_insert" on public.observaciones_diarias;
create policy "observaciones_insert"
  on public.observaciones_diarias for insert
  with check ((select auth.uid()) is not null);

drop policy if exists "observaciones_update" on public.observaciones_diarias;
create policy "observaciones_update"
  on public.observaciones_diarias for update
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "observaciones_delete" on public.observaciones_diarias;
create policy "observaciones_delete"
  on public.observaciones_diarias for delete
  using ((select auth.uid()) is not null);

-- ============================================================
-- TABLA: categorias_acreditacion
-- 10 categorías fijas del DS 14/2017 (seed al final).
-- ============================================================
create table if not exists public.categorias_acreditacion (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text unique not null,
  nombre                text not null,
  descripcion           text,
  orden                 integer not null,
  documentos_requeridos jsonb
);

-- Sin RLS (solo lectura, datos de referencia no sensibles)
alter table public.categorias_acreditacion enable row level security;

drop policy if exists "categorias_select_all" on public.categorias_acreditacion;
create policy "categorias_select_all"
  on public.categorias_acreditacion for select
  using (true);

-- ============================================================
-- TABLA: documentos_acreditacion
-- Documentos subidos por categoría. Los archivos se guardan
-- en Supabase Storage; aquí se almacena el path relativo.
-- ============================================================
create table if not exists public.documentos_acreditacion (
  id               uuid primary key default gen_random_uuid(),
  categoria_id     uuid not null references public.categorias_acreditacion(id) on delete restrict,
  nombre           text not null,
  descripcion      text,
  -- Referencia al archivo en Storage (path relativo dentro del bucket)
  storage_path     text,
  archivo_nombre   text,
  archivo_tipo     text,
  archivo_tamaño   bigint check (archivo_tamaño >= 0),
  -- Estado y vencimiento
  estado           text not null default 'pendiente'
                     check (estado in ('pendiente', 'subido', 'aprobado', 'rechazado', 'vencido')),
  fecha_vencimiento date,
  observaciones    text,
  -- Metadatos
  subido_por       uuid references auth.users(id) on delete set null,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

alter table public.documentos_acreditacion enable row level security;

drop policy if exists "documentos_select" on public.documentos_acreditacion;
create policy "documentos_select"
  on public.documentos_acreditacion for select
  using ((select auth.uid()) is not null);

drop policy if exists "documentos_insert" on public.documentos_acreditacion;
create policy "documentos_insert"
  on public.documentos_acreditacion for insert
  with check ((select auth.uid()) is not null);

drop policy if exists "documentos_update" on public.documentos_acreditacion;
create policy "documentos_update"
  on public.documentos_acreditacion for update
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "documentos_delete" on public.documentos_acreditacion;
create policy "documentos_delete"
  on public.documentos_acreditacion for delete
  using ((select auth.uid()) is not null);

-- ============================================================
-- STORAGE BUCKETS
-- NOTA: Si este bloque falla con error de permisos, crear los
-- buckets manualmente en Dashboard → Storage → New bucket.
-- Marcar como "Private" (no público).
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-acreditacion',
  'documentos-acreditacion',
  false,
  10485760,  -- 10 MB en bytes
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public)
values ('residentes-archivos', 'residentes-archivos', false)
on conflict (id) do nothing;

-- Políticas de Storage: acotadas a usuarios autenticados y por bucket
drop policy if exists "storage_acreditacion_select" on storage.objects;
create policy "storage_acreditacion_select"
  on storage.objects for select
  using (
    bucket_id = 'documentos-acreditacion'
    and (select auth.uid()) is not null
  );

drop policy if exists "storage_acreditacion_insert" on storage.objects;
create policy "storage_acreditacion_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-acreditacion'
    and (select auth.uid()) is not null
  );

drop policy if exists "storage_acreditacion_delete" on storage.objects;
create policy "storage_acreditacion_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documentos-acreditacion'
    and (select auth.uid()) is not null
  );

drop policy if exists "storage_residentes_select" on storage.objects;
create policy "storage_residentes_select"
  on storage.objects for select
  using (
    bucket_id = 'residentes-archivos'
    and (select auth.uid()) is not null
  );

drop policy if exists "storage_residentes_insert" on storage.objects;
create policy "storage_residentes_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'residentes-archivos'
    and (select auth.uid()) is not null
  );

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index if not exists idx_residentes_estado
  on public.residentes(estado);
create index if not exists idx_residentes_nombre
  on public.residentes(apellido, nombre);
create index if not exists idx_signos_residente_fecha
  on public.signos_vitales(residente_id, fecha_hora desc);
create index if not exists idx_observaciones_residente_fecha
  on public.observaciones_diarias(residente_id, fecha_hora desc);
create index if not exists idx_observaciones_tipo
  on public.observaciones_diarias(tipo);
create index if not exists idx_documentos_categoria
  on public.documentos_acreditacion(categoria_id);
create index if not exists idx_documentos_estado
  on public.documentos_acreditacion(estado);
create index if not exists idx_documentos_vencimiento
  on public.documentos_acreditacion(fecha_vencimiento)
  where fecha_vencimiento is not null;

-- ============================================================
-- SEED: Categorías de acreditación DS 14/2017
-- ============================================================
insert into public.categorias_acreditacion
  (codigo, nombre, descripcion, orden, documentos_requeridos)
values
(
  'CAT-01', 'Autorización de Funcionamiento',
  'Documentación legal y sanitaria que acredita el funcionamiento autorizado del ELEAM.',
  1,
  '["Resolución de autorización sanitaria vigente",
    "Escritura de constitución de la entidad sostenedora",
    "Certificado de vigencia de la persona jurídica",
    "Contrato de arriendo o escritura del inmueble",
    "Certificado de Informes Previos (CIP) Municipal",
    "Permiso de edificación municipal",
    "Recepción final de obra"]'::jsonb
),
(
  'CAT-02', 'Planta Física e Infraestructura',
  'Planos, certificaciones e informes sobre las instalaciones físicas del establecimiento.',
  2,
  '["Planos del establecimiento actualizados y aprobados",
    "Certificado de instalaciones eléctricas (SEC)",
    "Certificado de instalaciones de gas (SEC)",
    "Certificado de calderas y calefacción (si aplica)",
    "Informe de potabilidad del agua",
    "Certificado de fumigación y desratización vigente",
    "Certificado de ascensor (si aplica)"]'::jsonb
),
(
  'CAT-03', 'Recursos Humanos',
  'Dotación, calificación y gestión del personal según normativa vigente.',
  3,
  '["Nómina de trabajadores actualizada",
    "Contratos de trabajo del personal",
    "Títulos y certificados del personal profesional",
    "Credencial del director técnico",
    "Certificados de salud del personal",
    "Registro de capacitaciones del personal",
    "Convenios con prestadores de salud externos",
    "Protocolo de turnos y guardia nocturna"]'::jsonb
),
(
  'CAT-04', 'Fichas Clínicas y Registros Médicos',
  'Fichas clínicas individuales, evaluaciones funcionales y planes de cuidado por residente.',
  4,
  '["Ficha clínica completa por cada residente",
    "Evaluación funcional (Índice de Barthel)",
    "Evaluación cognitiva (MMSE / Test del reloj)",
    "Evaluación nutricional por residente",
    "Plan de cuidados individualizado (PAI)",
    "Consentimiento informado firmado",
    "Historia clínica completa",
    "Registro de visitas médicas",
    "Evaluación de riesgo de caídas (Escala de Morse)"]'::jsonb
),
(
  'CAT-05', 'Medicamentos y Farmacia',
  'Gestión, control y almacenamiento de medicamentos, psicotrópicos y botiquín.',
  5,
  '["Inventario de botiquín actualizado",
    "Kardex de administración de medicamentos por residente",
    "Prescripciones médicas vigentes por residente",
    "Control de psicotrópicos y estupefacientes (libro foliado)",
    "Protocolo de manejo y almacenamiento de medicamentos",
    "Registro de medicamentos vencidos y destruidos",
    "Convenio con farmacia o químico farmacéutico asesor"]'::jsonb
),
(
  'CAT-06', 'Alimentación y Nutrición',
  'Minutas, evaluaciones nutricionales y certificaciones del personal de cocina.',
  6,
  '["Minuta alimentaria mensual aprobada por nutricionista",
    "Evaluación nutricional individual de cada residente",
    "Certificados de manipulación de alimentos del personal de cocina",
    "Registro de control de temperaturas (HACCP)",
    "Informe de instalaciones de cocina",
    "Protocolo de dietas especiales y deglución",
    "Registro de encuestas de satisfacción alimentaria"]'::jsonb
),
(
  'CAT-07', 'Prevención y Control de Infecciones (PCI)',
  'Protocolos y registros del programa de prevención y control de infecciones intrahospitalarias.',
  7,
  '["Programa de PCI del establecimiento",
    "Protocolo de lavado de manos",
    "Protocolo de aislamiento de contacto y gotitas",
    "Registro de vigilancia epidemiológica (IIH)",
    "Protocolo de manejo de residuos hospitalarios",
    "Registro de uso de antibióticos",
    "Protocolo de higiene y antisepsia",
    "Registro de esterilización y desinfección de material"]'::jsonb
),
(
  'CAT-08', 'Seguridad y Plan de Emergencias',
  'Plan de emergencia, certificaciones de seguridad contra incendios y registros de simulacros.',
  8,
  '["Plan de emergencia y evacuación aprobado",
    "Certificado de extintores vigente",
    "Señalética de emergencia instalada",
    "Registro de simulacros de evacuación (mínimo 2 por año)",
    "Luces de emergencia certificadas",
    "Protocolo de búsqueda y rescate de residentes",
    "Plan de continuidad operacional"]'::jsonb
),
(
  'CAT-09', 'Registros de Atención Diaria',
  'Registros diarios de signos vitales, actividades, incidentes y procedimientos de enfermería.',
  9,
  '["Registro diario de signos vitales por turno",
    "Registro de actividades diarias por residente",
    "Registro de caídas e incidentes (libro de novedades)",
    "Registro de curaciones y procedimientos de enfermería",
    "Registro de cambios posturales",
    "Registro de higiene y cuidados básicos diarios",
    "Hoja de balance hídrico (si aplica)"]'::jsonb
),
(
  'CAT-10', 'Actividades y Rehabilitación',
  'Programa de actividades terapéuticas y recreativas, y plan de rehabilitación kinésica.',
  10,
  '["Programa mensual de actividades recreativas y terapéuticas",
    "Registro de asistencia a actividades por residente",
    "Plan de rehabilitación individualizado (kinesiología)",
    "Convenio o contrato con kinesiólogo",
    "Registro de sesiones de rehabilitación",
    "Evaluación de funcionalidad motora",
    "Programa de estimulación cognitiva"]'::jsonb
)
on conflict (codigo) do update set
  nombre                = excluded.nombre,
  descripcion           = excluded.descripcion,
  documentos_requeridos = excluded.documentos_requeridos;

-- ============================================================
-- MÓDULO SAAS: ELEAMS + PAGO + ROLES
-- Ejecutar después del schema base para habilitar la lógica
-- de suscripción y multi-ELEAM.
-- ============================================================

-- ── Tabla: eleams ────────────────────────────────────────────
-- Representa cada establecimiento cliente.
-- El pago está asociado al ELEAM, no al usuario individual.
create table if not exists public.eleams (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  rut_empresa      text unique,
  email_admin      text not null,
  pago_activo      boolean not null default false,
  plan             text default 'mensual',
  fecha_pago       timestamptz,
  creado_en        timestamptz not null default now()
);

alter table public.eleams enable row level security;

-- Cada usuario ve solo el ELEAM al que pertenece
drop policy if exists "eleams_select_own" on public.eleams;
create policy "eleams_select_own" on public.eleams for select
  using (
    id in (
      select eleam_id from public.profiles
      where id = (select auth.uid())
    )
  );

-- Cualquier usuario autenticado puede crear su ELEAM (registro)
drop policy if exists "eleams_insert_auth" on public.eleams;
create policy "eleams_insert_auth" on public.eleams for insert
  with check ((select auth.uid()) is not null);

-- Solo el admin del ELEAM puede actualizarlo
drop policy if exists "eleams_update_admin" on public.eleams;
create policy "eleams_update_admin" on public.eleams for update
  using (
    id in (
      select eleam_id from public.profiles
      where id = (select auth.uid()) and rol = 'admin_eleam'
    )
  )
  with check (
    id in (
      select eleam_id from public.profiles
      where id = (select auth.uid()) and rol = 'admin_eleam'
    )
  );

-- ── Agregar eleam_id a profiles (si no existe) ────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'eleam_id'
  ) then
    alter table public.profiles
      add column eleam_id uuid references public.eleams(id) on delete set null;
  end if;
end $$;

-- ── Actualizar constraint de roles en profiles ─────────────────
-- Se mantienen roles legacy para compatibilidad.
alter table public.profiles
  drop constraint if exists profiles_rol_check;

alter table public.profiles
  add constraint profiles_rol_check
  check (rol in ('admin_eleam', 'funcionario', 'superadmin', 'admin', 'usuario', 'enfermera', 'medico'));

-- ── Policy INSERT en profiles (necesaria para registro manual) ──
drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert" on public.profiles for insert
  with check ((select auth.uid()) = id);

-- ── ELEAM de prueba con pago siempre activo ───────────────────
-- Este registro permite que el usuario de prueba acceda sin pago real.
-- IMPORTANTE: eliminar o deshabilitar al integrar el sistema de pago real.
insert into public.eleams (id, nombre, email_admin, pago_activo, plan)
values (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'ELEAM Demo — FichaEleam',
  'demo@fichaeleam.cl',
  true,   -- ← pago_activo = true permanente para pruebas
  'demo'
)
on conflict (id) do update set
  pago_activo = true,
  nombre      = excluded.nombre;

-- ── Trigger actualizado: incluye rol y eleam_id ───────────────
-- Si el usuario se registra con email demo@fichaeleam.cl,
-- se asocia automáticamente al ELEAM de prueba como superadmin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol      text := 'admin_eleam';
  v_eleam_id uuid := null;
begin
  -- El email de prueba obtiene superadmin con pago activo permanente
  if new.email = 'demo@fichaeleam.cl' then
    v_rol      := 'superadmin';
    v_eleam_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
  end if;

  insert into public.profiles (id, nombre, email, rol, eleam_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    v_rol,
    v_eleam_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Recrear el trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Instrucciones para el usuario de prueba ──────────────────
-- 1. Crear el usuario en Supabase Dashboard → Authentication → Users:
--       Email: demo@fichaeleam.cl
--       Password: FichaEleam2025!
-- 2. O usar la API: supabase.auth.signUp({ email, password })
-- 3. El trigger automáticamente lo asocia al ELEAM de prueba
--    con rol='superadmin' y pago_activo=true.
-- 4. Si el usuario ya existe, ejecutar manualmente:
--    UPDATE public.profiles
--    SET rol='superadmin', eleam_id='a0000000-0000-0000-0000-000000000001'
--    WHERE email='demo@fichaeleam.cl';

-- ============================================================
-- MULTI-TENANCY: eleam_id en tablas de datos
-- Ejecutar después del bloque SaaS anterior.
-- Garantiza aislamiento completo de datos entre ELEAMs.
-- ============================================================

-- ── Columna eleam_id en residentes ───────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'residentes' and column_name = 'eleam_id'
  ) then
    alter table public.residentes
      add column eleam_id uuid references public.eleams(id) on delete restrict;
  end if;
end $$;

-- ── RLS residentes: solo el propio ELEAM ─────────────────────
drop policy if exists "residentes_select" on public.residentes;
drop policy if exists "residentes_insert" on public.residentes;
drop policy if exists "residentes_update" on public.residentes;
drop policy if exists "residentes_delete" on public.residentes;

create policy "residentes_select" on public.residentes for select
  using (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  );

create policy "residentes_insert" on public.residentes for insert
  with check (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  );

create policy "residentes_update" on public.residentes for update
  using (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  )
  with check (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  );

create policy "residentes_delete" on public.residentes for delete
  using (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  );

-- ── RLS signos_vitales: aislamiento vía residentes.eleam_id ──
drop policy if exists "signos_select" on public.signos_vitales;
drop policy if exists "signos_insert" on public.signos_vitales;
drop policy if exists "signos_update" on public.signos_vitales;
drop policy if exists "signos_delete" on public.signos_vitales;
drop policy if exists "sv_select" on public.signos_vitales;
drop policy if exists "sv_insert" on public.signos_vitales;
drop policy if exists "sv_update" on public.signos_vitales;
drop policy if exists "sv_delete" on public.signos_vitales;
drop policy if exists "signos_vitales_select" on public.signos_vitales;
drop policy if exists "signos_vitales_insert" on public.signos_vitales;
drop policy if exists "signos_vitales_update" on public.signos_vitales;
drop policy if exists "signos_vitales_delete" on public.signos_vitales;

create policy "sv_select" on public.signos_vitales for select
  using (
    residente_id in (
      select id from public.residentes
      where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
    )
  );

create policy "sv_insert" on public.signos_vitales for insert
  with check (
    residente_id in (
      select id from public.residentes
      where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
    )
  );

create policy "sv_update" on public.signos_vitales for update
  using (
    residente_id in (
      select id from public.residentes
      where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
    )
  );

create policy "sv_delete" on public.signos_vitales for delete
  using (
    residente_id in (
      select id from public.residentes
      where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
    )
  );

-- ── RLS observaciones_diarias: aislamiento vía residentes ────
drop policy if exists "obs_select" on public.observaciones_diarias;
drop policy if exists "obs_insert" on public.observaciones_diarias;
drop policy if exists "obs_update" on public.observaciones_diarias;
drop policy if exists "obs_delete" on public.observaciones_diarias;
drop policy if exists "observaciones_select" on public.observaciones_diarias;
drop policy if exists "observaciones_insert" on public.observaciones_diarias;
drop policy if exists "observaciones_update" on public.observaciones_diarias;
drop policy if exists "observaciones_delete" on public.observaciones_diarias;

create policy "obs_select" on public.observaciones_diarias for select
  using (
    residente_id in (
      select id from public.residentes
      where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
    )
  );

create policy "obs_insert" on public.observaciones_diarias for insert
  with check (
    residente_id in (
      select id from public.residentes
      where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
    )
  );

create policy "obs_update" on public.observaciones_diarias for update
  using (
    residente_id in (
      select id from public.residentes
      where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
    )
  );

create policy "obs_delete" on public.observaciones_diarias for delete
  using (
    residente_id in (
      select id from public.residentes
      where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
    )
  );

-- ── eleam_id en documentos_acreditacion ──────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documentos_acreditacion' and column_name = 'eleam_id'
  ) then
    alter table public.documentos_acreditacion
      add column eleam_id uuid references public.eleams(id) on delete restrict;
  end if;
end $$;

drop policy if exists "docs_select" on public.documentos_acreditacion;
drop policy if exists "docs_insert" on public.documentos_acreditacion;
drop policy if exists "docs_update" on public.documentos_acreditacion;
drop policy if exists "docs_delete" on public.documentos_acreditacion;
drop policy if exists "documentos_select" on public.documentos_acreditacion;
drop policy if exists "documentos_insert" on public.documentos_acreditacion;
drop policy if exists "documentos_update" on public.documentos_acreditacion;
drop policy if exists "documentos_delete" on public.documentos_acreditacion;

create policy "docs_select" on public.documentos_acreditacion for select
  using (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  );

create policy "docs_insert" on public.documentos_acreditacion for insert
  with check (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  );

create policy "docs_update" on public.documentos_acreditacion for update
  using (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  );

create policy "docs_delete" on public.documentos_acreditacion for delete
  using (
    eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
  );

-- ============================================================
-- SCHEMA v3 — FichaEleam
-- Mejoras de modelo, performance e integridad.
-- Seguro para re-ejecución: todas las sentencias son idempotentes.
-- ============================================================

-- ── 1. Función set_updated_at (reemplaza new Date() en JS) ──
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- ── 2. Corregir valores de rol (eliminar legacy) ─────────────
update public.profiles
  set rol = 'funcionario'
  where rol in ('usuario', 'enfermera', 'medico');

update public.profiles
  set rol = 'admin_eleam'
  where rol = 'admin';

alter table public.profiles
  drop constraint if exists profiles_rol_check;

alter table public.profiles
  add constraint profiles_rol_check
  check (rol in ('admin_eleam', 'funcionario', 'superadmin'));

-- ── 3. rut único por ELEAM (no globalmente) ──────────────────
alter table public.residentes
  drop constraint if exists residentes_rut_key;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'residentes_rut_eleam_unique'
  ) then
    alter table public.residentes
      add constraint residentes_rut_eleam_unique
      unique (rut, eleam_id);
  end if;
end $$;

-- ── 4. Índices de performance ─────────────────────────────────
-- profiles.eleam_id — subquery en cada política RLS de datos
create index if not exists idx_profiles_eleam_id
  on public.profiles(eleam_id);

-- residentes.eleam_id — subquery en RLS de signos_vitales y observaciones
create index if not exists idx_residentes_eleam_id
  on public.residentes(eleam_id);

-- documentos_acreditacion.eleam_id — RLS directa
create index if not exists idx_documentos_eleam_id
  on public.documentos_acreditacion(eleam_id);

-- Partial index para alertas del dashboard (seguimientos pendientes)
create index if not exists idx_observaciones_seguimiento
  on public.observaciones_diarias(residente_id, fecha_hora desc)
  where requiere_seguimiento = true;

-- Índice compuesto para documentos por vencer (query del dashboard)
create index if not exists idx_documentos_eleam_vencimiento
  on public.documentos_acreditacion(eleam_id, fecha_vencimiento)
  where fecha_vencimiento is not null;

-- ── 5. Nuevas columnas en eleams ──────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='telefono'
  ) then alter table public.eleams add column telefono text; end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='fecha_vencimiento_suscripcion'
  ) then alter table public.eleams add column fecha_vencimiento_suscripcion timestamptz; end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='max_residentes'
  ) then
    -- NULL = ilimitado (tier demo/free). Integer para planes de pago.
    alter table public.eleams add column max_residentes integer;
  end if;
end $$;

-- CHECK en plan (demo seed ya usa 'demo', seguro)
alter table public.eleams
  drop constraint if exists eleams_plan_check;
alter table public.eleams
  add constraint eleams_plan_check
  check (plan in ('demo', 'mensual', 'anual', 'inactivo') or plan is null);

-- ── 6. observaciones_diarias — columna actualizado_en ────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='observaciones_diarias'
    and column_name='actualizado_en'
  ) then
    alter table public.observaciones_diarias
      add column actualizado_en timestamptz not null default now();
    update public.observaciones_diarias
      set actualizado_en = creado_en
      where actualizado_en is distinct from creado_en;
  end if;
end $$;

drop trigger if exists trg_observaciones_updated_at on public.observaciones_diarias;
create trigger trg_observaciones_updated_at
  before update on public.observaciones_diarias
  for each row execute function public.set_updated_at();

-- ── 7. signos_vitales — columna creado_en (audit trail) ──────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='signos_vitales'
    and column_name='creado_en'
  ) then
    alter table public.signos_vitales
      add column creado_en timestamptz not null default now();
    update public.signos_vitales
      set creado_en = fecha_hora
      where creado_en is distinct from fecha_hora;
  end if;
end $$;

-- ── 8. Triggers updated_at para residentes y documentos ──────
drop trigger if exists trg_residentes_updated_at on public.residentes;
create trigger trg_residentes_updated_at
  before update on public.residentes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_documentos_updated_at on public.documentos_acreditacion;
create trigger trg_documentos_updated_at
  before update on public.documentos_acreditacion
  for each row execute function public.set_updated_at();

-- ── 9. Storage policies con scope por eleam_id en el path ────
-- Path: acreditacion/{eleamId}/{categoriaId}/{timestamp}_{filename}
-- split_part(name, '/', 2) extrae el eleam_id del path.
drop policy if exists "storage_acreditacion_select" on storage.objects;
drop policy if exists "storage_acreditacion_insert" on storage.objects;
drop policy if exists "storage_acreditacion_delete" on storage.objects;
drop policy if exists "storage_residentes_select" on storage.objects;
drop policy if exists "storage_residentes_insert" on storage.objects;
drop policy if exists "storage_residentes_delete" on storage.objects;

create policy "storage_acreditacion_select"
  on storage.objects for select
  using (
    bucket_id = 'documentos-acreditacion'
    and split_part(name, '/', 2) = (
      select eleam_id::text from public.profiles
      where id = (select auth.uid())
    )
  );

create policy "storage_acreditacion_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-acreditacion'
    and split_part(name, '/', 2) = (
      select eleam_id::text from public.profiles
      where id = (select auth.uid())
    )
  );

create policy "storage_acreditacion_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documentos-acreditacion'
    and split_part(name, '/', 2) = (
      select eleam_id::text from public.profiles
      where id = (select auth.uid())
    )
  );


-- ════════════════════════════════════════════════════════════════
-- v4: Superadmin — rol, políticas globales, tabla pagos
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ── 1. Columna notas_admin en eleams ────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='notas_admin'
  ) then
    alter table public.eleams add column notas_admin text;
  end if;
end $$;

-- ── 2. Función helper: es superadmin el usuario actual ──────────
create or replace function public.is_superadmin()
  returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and rol = 'superadmin'
  );
$$;

-- ── 3. Políticas RLS superadmin en eleams ───────────────────────
-- Superadmin puede ver y editar TODOS los ELEAMs
drop policy if exists "superadmin_select_eleams"  on public.eleams;
drop policy if exists "superadmin_update_eleams"  on public.eleams;
drop policy if exists "superadmin_insert_eleams"  on public.eleams;

create policy "superadmin_select_eleams" on public.eleams
  for select using (public.is_superadmin());

create policy "superadmin_update_eleams" on public.eleams
  for update using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "superadmin_insert_eleams" on public.eleams
  for insert with check (public.is_superadmin());

-- ── 4. Política RLS superadmin en profiles ──────────────────────
-- Superadmin puede ver todos los perfiles
drop policy if exists "superadmin_select_profiles" on public.profiles;

create policy "superadmin_select_profiles" on public.profiles
  for select using (public.is_superadmin());

-- ── 5. Política RLS superadmin en residentes ────────────────────
-- Superadmin puede ver todos los residentes (para métricas)
drop policy if exists "superadmin_select_residentes" on public.residentes;

create policy "superadmin_select_residentes" on public.residentes
  for select using (public.is_superadmin());

-- ── 6. Tabla pagos ──────────────────────────────────────────────
create table if not exists public.pagos (
  id                  uuid        primary key default gen_random_uuid(),
  eleam_id            uuid        not null references public.eleams(id) on delete cascade,
  monto               integer     not null check (monto > 0),
  moneda              text        not null default 'CLP',
  plan                text        not null check (plan in ('mensual', 'anual')),
  fecha_pago          timestamptz not null default now(),
  fecha_inicio        date        not null,
  fecha_fin           date,
  metodo_pago         text,
  referencia_externa  text,
  estado              text        not null default 'completado'
                        check (estado in ('pendiente', 'completado', 'fallido', 'reembolsado')),
  notas               text,
  registrado_por      uuid        references auth.users(id),
  creado_en           timestamptz not null default now()
);

alter table public.pagos enable row level security;

-- Superadmin: acceso total a pagos
drop policy if exists "superadmin_all_pagos" on public.pagos;
create policy "superadmin_all_pagos" on public.pagos
  for all
  using    (public.is_superadmin())
  with check (public.is_superadmin());

-- Admin del ELEAM puede ver los pagos de su propio ELEAM
drop policy if exists "eleam_select_pagos" on public.pagos;
create policy "eleam_select_pagos" on public.pagos
  for select using (
    eleam_id = (
      select eleam_id from public.profiles
      where id = (select auth.uid())
    )
  );

-- Índices para pagos
create index if not exists idx_pagos_eleam_id   on public.pagos(eleam_id);
create index if not exists idx_pagos_fecha_pago on public.pagos(fecha_pago desc);

-- ── 7. Cómo crear un superadmin ─────────────────────────────────
-- Después de que el usuario se registre, ejecutar en SQL Editor:
-- update public.profiles set rol = 'superadmin' where email = 'tu@email.com';
-- El superadmin NO necesita eleam_id y tiene acceso a todos los datos.


-- ════════════════════════════════════════════════════════════════
-- v5: Integración MercadoPago — Suscripciones por ELEAM
--
-- Modelo:
--   • Cada ELEAM tiene un PLAN (precio, max_residentes, max_funcionarios).
--   • El admin del ELEAM (rol = 'admin_eleam') paga la suscripción.
--   • Los funcionarios del mismo ELEAM NO pagan; heredan el acceso.
--   • Las cuotas mensuales se procesan con MP (preapproval) y se
--     reflejan en eleams.subscription_status / proximo_cobro_en.
--   • Los webhooks llegan a la Edge Function `mp-webhook` que valida
--     la firma HMAC SHA-256 y refresca el estado del ELEAM.
--   • Triggers de límite (residentes/funcionarios) y de prevención
--     de escalamiento de roles operan en SECURITY DEFINER.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Tabla planes ─────────────────────────────────────────────
create table if not exists public.planes (
  id                uuid        primary key default gen_random_uuid(),
  codigo            text        unique not null,
  nombre            text        not null,
  descripcion       text,
  precio_clp        integer     not null check (precio_clp > 0),
  max_residentes    integer     check (max_residentes is null or max_residentes > 0),
  max_funcionarios  integer     check (max_funcionarios is null or max_funcionarios > 0),
  frequency         integer     not null default 1 check (frequency > 0),
  frequency_type    text        not null default 'months'
                      check (frequency_type in ('days','months')),
  activo            boolean     not null default true,
  orden             integer     not null default 0,
  destacado         boolean     not null default false,
  creado_en         timestamptz not null default now()
);

alter table public.planes enable row level security;

drop policy if exists "planes_select_public" on public.planes;
create policy "planes_select_public" on public.planes
  for select using (activo = true or public.is_superadmin());

drop policy if exists "planes_superadmin_write" on public.planes;
create policy "planes_superadmin_write" on public.planes
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

-- Seed de planes (idempotente)
insert into public.planes
  (codigo, nombre, descripcion, precio_clp, max_residentes, max_funcionarios, orden, destacado)
values
  ('plan-14',  'Hasta 14 residentes', 'Ideal para residencias pequeñas',  50000,  14,  10, 1, false),
  ('plan-24',  'Hasta 24 residentes', 'El plan más elegido',              80000,  24,  20, 2, true),
  ('plan-34',  'Hasta 34 residentes', 'Para residencias grandes',         120000, 34,  30, 3, false)
on conflict (codigo) do update set
  nombre           = excluded.nombre,
  descripcion      = excluded.descripcion,
  precio_clp       = excluded.precio_clp,
  max_residentes   = excluded.max_residentes,
  max_funcionarios = excluded.max_funcionarios,
  orden            = excluded.orden,
  destacado        = excluded.destacado;

-- ── 2. Columnas nuevas en eleams ────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='plan_id'
  ) then alter table public.eleams add column plan_id uuid references public.planes(id);
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='mp_preapproval_id'
  ) then alter table public.eleams add column mp_preapproval_id text unique;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='mp_payer_email'
  ) then alter table public.eleams add column mp_payer_email text;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='subscription_status'
  ) then alter table public.eleams
    add column subscription_status text not null default 'inactivo'
      check (subscription_status in
        ('inactivo','pendiente','activo','en_gracia','pausado','cancelado','vencido'));
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='proximo_cobro_en'
  ) then alter table public.eleams add column proximo_cobro_en timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='cancelado_en'
  ) then alter table public.eleams add column cancelado_en timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='eleams' and column_name='max_funcionarios'
  ) then alter table public.eleams add column max_funcionarios integer;
  end if;
end $$;

create index if not exists idx_eleams_subscription_status
  on public.eleams(subscription_status);
create index if not exists idx_eleams_mp_preapproval_id
  on public.eleams(mp_preapproval_id);

-- ── 3. Columnas MP en pagos ─────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='pagos' and column_name='mp_payment_id'
  ) then alter table public.pagos add column mp_payment_id text unique;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='pagos' and column_name='mp_preapproval_id'
  ) then alter table public.pagos add column mp_preapproval_id text;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='pagos' and column_name='mp_authorized_payment_id'
  ) then alter table public.pagos add column mp_authorized_payment_id text unique;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='pagos' and column_name='raw'
  ) then alter table public.pagos add column raw jsonb;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='pagos' and column_name='plan_id'
  ) then alter table public.pagos add column plan_id uuid references public.planes(id);
  end if;
end $$;

create index if not exists idx_pagos_mp_preapproval on public.pagos(mp_preapproval_id);

-- ── 4. Tabla mp_webhook_events (idempotencia + auditoría) ──────
create table if not exists public.mp_webhook_events (
  id              uuid        primary key default gen_random_uuid(),
  mp_request_id   text        unique,
  topic           text,
  data_id         text,
  action          text,
  payload         jsonb,
  signature_ok    boolean     not null default false,
  processed_ok    boolean     not null default false,
  error           text,
  recibido_en     timestamptz not null default now(),
  procesado_en    timestamptz
);

alter table public.mp_webhook_events enable row level security;

drop policy if exists "mp_events_superadmin_select" on public.mp_webhook_events;
create policy "mp_events_superadmin_select" on public.mp_webhook_events
  for select using (public.is_superadmin());

create index if not exists idx_mp_events_data_id    on public.mp_webhook_events(data_id);
create index if not exists idx_mp_events_recibido   on public.mp_webhook_events(recibido_en desc);

-- ── 5. Tabla funcionario_invitaciones ───────────────────────────
create table if not exists public.funcionario_invitaciones (
  id            uuid        primary key default gen_random_uuid(),
  eleam_id      uuid        not null references public.eleams(id) on delete cascade,
  email         text        not null,
  token         text        unique not null,
  expira_en     timestamptz not null default (now() + interval '7 days'),
  usado         boolean     not null default false,
  usado_en      timestamptz,
  creado_por    uuid        references auth.users(id) on delete set null,
  creado_en     timestamptz not null default now()
);

alter table public.funcionario_invitaciones enable row level security;

-- Admin del ELEAM puede ver y crear invitaciones de su ELEAM
drop policy if exists "inv_admin_select" on public.funcionario_invitaciones;
create policy "inv_admin_select" on public.funcionario_invitaciones
  for select using (
    eleam_id = (select eleam_id from public.profiles
                 where id = (select auth.uid()) and rol = 'admin_eleam')
    or public.is_superadmin()
  );

drop policy if exists "inv_admin_insert" on public.funcionario_invitaciones;
create policy "inv_admin_insert" on public.funcionario_invitaciones
  for insert with check (
    eleam_id = (select eleam_id from public.profiles
                 where id = (select auth.uid()) and rol = 'admin_eleam')
  );

drop policy if exists "inv_admin_delete" on public.funcionario_invitaciones;
create policy "inv_admin_delete" on public.funcionario_invitaciones
  for delete using (
    eleam_id = (select eleam_id from public.profiles
                 where id = (select auth.uid()) and rol = 'admin_eleam')
    or public.is_superadmin()
  );

create index if not exists idx_inv_eleam on public.funcionario_invitaciones(eleam_id);
create index if not exists idx_inv_email on public.funcionario_invitaciones(lower(email));

-- ── 6. Helpers SECURITY DEFINER (sin recursión RLS) ─────────────
create or replace function public.my_eleam_id()
  returns uuid
  language sql stable security definer
  set search_path = public
as $$ select eleam_id from public.profiles where id = (select auth.uid()) $$;

create or replace function public.my_rol()
  returns text
  language sql stable security definer
  set search_path = public
as $$ select rol from public.profiles where id = (select auth.uid()) $$;

-- ── 7. Política: admin_eleam puede ver perfiles de su ELEAM ─────
drop policy if exists "profiles_admin_eleam_select" on public.profiles;
create policy "profiles_admin_eleam_select" on public.profiles
  for select using (
    public.my_rol() = 'admin_eleam'
    and eleam_id is not null
    and eleam_id = public.my_eleam_id()
  );

-- ── 8. Trigger: límite de residentes por plan ───────────────────
create or replace function public.check_residentes_limit()
  returns trigger
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_max     integer;
  v_count   integer;
  v_status  text;
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
    raise exception 'La suscripción del ELEAM no está activa (%). Activa el plan antes de agregar residentes.', v_status
      using errcode = 'P0001';
  end if;

  if v_max is not null then
    select count(*) into v_count
      from public.residentes
      where eleam_id = new.eleam_id
        and estado = 'activo'
        and id <> new.id;
    if v_count >= v_max then
      raise exception 'El plan permite máximo % residentes activos', v_max
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_residentes_limit on public.residentes;
create trigger trg_residentes_limit
  before insert or update of estado, eleam_id on public.residentes
  for each row execute function public.check_residentes_limit();

-- ── 9. Trigger: límite de funcionarios por plan ─────────────────
create or replace function public.check_funcionarios_limit()
  returns trigger
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_max    integer;
  v_count  integer;
begin
  if new.eleam_id is null or new.rol <> 'funcionario' then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.eleam_id is not distinct from new.eleam_id
     and old.rol      is not distinct from new.rol then
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
      raise exception 'El plan permite máximo % funcionarios', v_max
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_funcionarios_limit on public.profiles;
create trigger trg_funcionarios_limit
  before insert or update of eleam_id, rol on public.profiles
  for each row execute function public.check_funcionarios_limit();

-- ── 10. Trigger: prevenir escalamiento de rol/eleam_id ──────────
-- Un usuario común NO puede cambiar su propio rol ni su eleam_id.
-- Solo superadmin (mediante service_role o por la fn is_superadmin).
create or replace function public.prevent_role_eleam_escalation()
  returns trigger
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_caller_rol text;
begin
  -- Las inserciones por trigger handle_new_user (security definer)
  -- no tienen auth.uid(); las dejamos pasar.
  if (select auth.uid()) is null then
    return new;
  end if;

  select rol into v_caller_rol from public.profiles where id = (select auth.uid());
  if v_caller_rol = 'superadmin' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.rol is distinct from old.rol then
      raise exception 'No autorizado a modificar el rol' using errcode = '42501';
    end if;
    if new.eleam_id is distinct from old.eleam_id then
      raise exception 'No autorizado a modificar el ELEAM' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_role_eleam_escalation on public.profiles;
create trigger trg_prevent_role_eleam_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_eleam_escalation();

-- ── 11. handle_new_user — soporta token de invitación ───────────
-- Si el signup incluye user_metadata.invite_token, se valida contra
-- funcionario_invitaciones (token + email + no usado + no expirado).
-- Si la invitación es válida → rol='funcionario' + eleam_id de la invitación.
-- En caso contrario → rol='admin_eleam' sin eleam (UI lo creará).
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_rol         text  := 'admin_eleam';
  v_eleam_id    uuid  := null;
  v_token       text;
  v_invitacion  record;
begin
  -- Cuenta demo (siempre superadmin con ELEAM demo activo)
  if new.email = 'demo@fichaeleam.cl' then
    insert into public.profiles (id, nombre, email, rol, eleam_id)
    values (new.id,
            coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)),
            new.email,
            'superadmin',
            'a0000000-0000-0000-0000-000000000001'::uuid)
    on conflict (id) do nothing;
    return new;
  end if;

  v_token := new.raw_user_meta_data->>'invite_token';

  if v_token is not null and v_token <> '' then
    select i.* into v_invitacion
    from public.funcionario_invitaciones i
    where i.token = v_token
      and lower(i.email) = lower(new.email)
      and i.usado = false
      and i.expira_en > now()
    limit 1;

    if found then
      v_eleam_id := v_invitacion.eleam_id;
      v_rol      := 'funcionario';
      update public.funcionario_invitaciones
        set usado = true, usado_en = now()
        where id = v_invitacion.id;
    end if;
  end if;

  insert into public.profiles (id, nombre, email, rol, eleam_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)),
    new.email,
    v_rol,
    v_eleam_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 12. Sincronizar pago_activo con subscription_status ─────────
-- Si subscription_status pasa a 'activo' o 'en_gracia' → pago_activo=true.
-- Si pasa a 'cancelado'/'vencido'/'inactivo'/'pausado' → pago_activo=false.
create or replace function public.sync_pago_activo()
  returns trigger
  language plpgsql
as $$
begin
  if new.subscription_status in ('activo','en_gracia') then
    new.pago_activo := true;
  elsif new.subscription_status in ('inactivo','cancelado','vencido','pausado','pendiente') then
    new.pago_activo := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_pago_activo on public.eleams;
create trigger trg_sync_pago_activo
  before update of subscription_status on public.eleams
  for each row execute function public.sync_pago_activo();

-- ── 13. Backfill: ELEAMs existentes — subscription_status según pago_activo
update public.eleams
  set subscription_status = 'activo'
  where pago_activo = true and subscription_status <> 'activo';

update public.eleams
  set subscription_status = 'inactivo'
  where pago_activo = false and subscription_status = 'activo';

-- ELEAM demo siempre debe permanecer activo
update public.eleams
  set subscription_status = 'activo',
      pago_activo         = true
  where id = 'a0000000-0000-0000-0000-000000000001'::uuid;

-- ── 14. RLS profiles UPDATE más estricta ────────────────────────
-- Reemplaza la policy original; el trigger prevent_role_eleam_escalation
-- es la barrera definitiva contra escalada de privilegios.
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles
  for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── 15. Vista helper: eleam_subscription_summary ────────────────
create or replace view public.eleam_subscription_summary as
  select
    e.id,
    e.nombre,
    e.subscription_status,
    e.pago_activo,
    e.proximo_cobro_en,
    e.fecha_vencimiento_suscripcion,
    e.plan_id,
    p.codigo            as plan_codigo,
    p.nombre            as plan_nombre,
    p.precio_clp        as plan_precio_clp,
    p.max_residentes    as plan_max_residentes,
    p.max_funcionarios  as plan_max_funcionarios,
    e.max_residentes    as override_max_residentes,
    e.max_funcionarios  as override_max_funcionarios
  from public.eleams e
  left join public.planes p on p.id = e.plan_id;

-- Las vistas heredan la RLS de las tablas subyacentes (eleams).


-- ════════════════════════════════════════════════════════════════
-- v6: Rol "familiar" — acceso de solo lectura al residente vinculado
--
-- Modelo:
--   • El admin del ELEAM crea un perfil "familiar" mediante invitación
--     (mismo flujo que funcionario, con campo extra residente_id).
--   • El familiar accede a un portal limitado donde ve los registros
--     de atención (signos vitales, observaciones) de SU residente
--     y registra visitas familiares.
--   • RLS estricto: el familiar sólo ve datos del/los residentes
--     vinculados en familiar_residentes — nunca ve otros pacientes.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Habilitar 'familiar' en el constraint de roles ───────────
alter table public.profiles
  drop constraint if exists profiles_rol_check;
alter table public.profiles
  add constraint profiles_rol_check
  check (rol in ('admin_eleam','funcionario','familiar','superadmin'));

-- ── 2. Tabla de vínculo familiar ↔ residente(s) ─────────────────
create table if not exists public.familiar_residentes (
  profile_id    uuid not null references public.profiles(id)   on delete cascade,
  residente_id  uuid not null references public.residentes(id) on delete cascade,
  parentesco    text,
  creado_por    uuid references auth.users(id) on delete set null,
  creado_en     timestamptz not null default now(),
  primary key (profile_id, residente_id)
);

alter table public.familiar_residentes enable row level security;

create index if not exists idx_familiar_residentes_profile
  on public.familiar_residentes(profile_id);
create index if not exists idx_familiar_residentes_residente
  on public.familiar_residentes(residente_id);

-- ── 3. Helpers RLS ──────────────────────────────────────────────

-- ¿El usuario actual es familiar autorizado para ver este residente?
create or replace function public.familiar_can_view_residente(rid uuid)
  returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.familiar_residentes
    where profile_id = (select auth.uid())
      and residente_id = rid
  );
$$;

-- Lista de residente_ids del familiar autenticado (para queries)
create or replace function public.my_familiar_residente_ids()
  returns setof uuid
  language sql stable security definer
  set search_path = public
as $$
  select residente_id from public.familiar_residentes
  where profile_id = (select auth.uid());
$$;

-- ── 4. Políticas RLS para familiar_residentes ───────────────────

drop policy if exists "fr_select_self_or_admin" on public.familiar_residentes;
create policy "fr_select_self_or_admin" on public.familiar_residentes
  for select using (
    profile_id = (select auth.uid())                                         -- el propio familiar ve sus vínculos
    or public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and residente_id in (select id from public.residentes
                              where eleam_id = public.my_eleam_id()))
  );

drop policy if exists "fr_insert_admin" on public.familiar_residentes;
create policy "fr_insert_admin" on public.familiar_residentes
  for insert with check (
    public.my_rol() = 'admin_eleam'
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

drop policy if exists "fr_delete_admin" on public.familiar_residentes;
create policy "fr_delete_admin" on public.familiar_residentes
  for delete using (
    public.is_superadmin()
    or (public.my_rol() = 'admin_eleam'
        and residente_id in (select id from public.residentes
                              where eleam_id = public.my_eleam_id()))
  );

-- ── 5. Tabla visitas_familiar ───────────────────────────────────
-- Registro de visitas familiares al residente. Útil para que el
-- equipo del ELEAM sepa quién pasó a ver al residente.
create table if not exists public.visitas_familiar (
  id            uuid        primary key default gen_random_uuid(),
  residente_id  uuid        not null references public.residentes(id) on delete cascade,
  profile_id    uuid        references public.profiles(id) on delete set null,
  fecha_hora    timestamptz not null default now(),
  duracion_min  integer     check (duracion_min is null or duracion_min between 1 and 1440),
  notas         text,
  registrado_por uuid       references auth.users(id) on delete set null,
  creado_en     timestamptz not null default now()
);

alter table public.visitas_familiar enable row level security;

create index if not exists idx_visitas_residente_fecha
  on public.visitas_familiar(residente_id, fecha_hora desc);

-- SELECT: familiar ve visitas de SUS residentes; staff del ELEAM ve todas las del ELEAM.
drop policy if exists "vf_select" on public.visitas_familiar;
create policy "vf_select" on public.visitas_familiar
  for select using (
    public.is_superadmin()
    or (public.my_rol() = 'familiar'
        and residente_id in (select public.my_familiar_residente_ids()))
    or (public.my_rol() in ('admin_eleam','funcionario')
        and residente_id in (select id from public.residentes
                              where eleam_id = public.my_eleam_id()))
  );

-- INSERT: familiar registra su propia visita; staff registra visitas del ELEAM.
drop policy if exists "vf_insert" on public.visitas_familiar;
create policy "vf_insert" on public.visitas_familiar
  for insert with check (
    (public.my_rol() = 'familiar'
       and residente_id in (select public.my_familiar_residente_ids())
       and profile_id   = (select auth.uid()))
    or (public.my_rol() in ('admin_eleam','funcionario')
        and residente_id in (select id from public.residentes
                              where eleam_id = public.my_eleam_id()))
  );

-- DELETE: solo el autor o el admin del ELEAM
drop policy if exists "vf_delete" on public.visitas_familiar;
create policy "vf_delete" on public.visitas_familiar
  for delete using (
    public.is_superadmin()
    or profile_id = (select auth.uid())
    or (public.my_rol() = 'admin_eleam'
        and residente_id in (select id from public.residentes
                              where eleam_id = public.my_eleam_id()))
  );

-- ── 6. Ampliar funcionario_invitaciones para soportar familiares ─
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='funcionario_invitaciones' and column_name='rol'
  ) then
    alter table public.funcionario_invitaciones
      add column rol text not null default 'funcionario'
        check (rol in ('funcionario','familiar'));
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='funcionario_invitaciones' and column_name='residente_id'
  ) then
    alter table public.funcionario_invitaciones
      add column residente_id uuid references public.residentes(id) on delete cascade;
  end if;
end $$;

-- ── 7. handle_new_user — soporta rol y residente_id de la invitación
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_rol         text  := 'admin_eleam';
  v_eleam_id    uuid  := null;
  v_token       text;
  v_invitacion  record;
begin
  -- Cuenta demo (siempre superadmin con ELEAM demo activo)
  if new.email = 'demo@fichaeleam.cl' then
    insert into public.profiles (id, nombre, email, rol, eleam_id)
    values (new.id,
            coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)),
            new.email,
            'superadmin',
            'a0000000-0000-0000-0000-000000000001'::uuid)
    on conflict (id) do nothing;
    return new;
  end if;

  v_token := new.raw_user_meta_data->>'invite_token';

  if v_token is not null and v_token <> '' then
    select i.* into v_invitacion
    from public.funcionario_invitaciones i
    where i.token = v_token
      and lower(i.email) = lower(new.email)
      and i.usado = false
      and i.expira_en > now()
    limit 1;

    if found then
      v_eleam_id := v_invitacion.eleam_id;
      v_rol      := coalesce(v_invitacion.rol, 'funcionario');
      update public.funcionario_invitaciones
        set usado = true, usado_en = now()
        where id = v_invitacion.id;
    end if;
  end if;

  insert into public.profiles (id, nombre, email, rol, eleam_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)),
    new.email,
    v_rol,
    v_eleam_id
  )
  on conflict (id) do nothing;

  -- Si la invitación es de familiar y trae residente_id → vincular
  if v_rol = 'familiar' and v_invitacion.residente_id is not null then
    insert into public.familiar_residentes (profile_id, residente_id, creado_por)
    values (new.id, v_invitacion.residente_id, v_invitacion.creado_por)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 8. RLS extendida — familiar puede leer SU residente y registros
-- Reescribimos las políticas SELECT para incorporar el path de familiar.

-- residentes
drop policy if exists "residentes_select" on public.residentes;
create policy "residentes_select" on public.residentes
  for select using (
    public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and eleam_id = public.my_eleam_id())
    or (public.my_rol() = 'familiar'
        and id in (select public.my_familiar_residente_ids()))
  );

-- signos_vitales
drop policy if exists "sv_select" on public.signos_vitales;
create policy "sv_select" on public.signos_vitales
  for select using (
    public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and residente_id in (select id from public.residentes
                              where eleam_id = public.my_eleam_id()))
    or (public.my_rol() = 'familiar'
        and residente_id in (select public.my_familiar_residente_ids()))
  );

-- observaciones_diarias
drop policy if exists "obs_select" on public.observaciones_diarias;
create policy "obs_select" on public.observaciones_diarias
  for select using (
    public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and residente_id in (select id from public.residentes
                              where eleam_id = public.my_eleam_id()))
    or (public.my_rol() = 'familiar'
        and residente_id in (select public.my_familiar_residente_ids()))
  );

-- documentos_acreditacion: NO acceso para familiar; mantener sólo staff.
drop policy if exists "docs_select" on public.documentos_acreditacion;
create policy "docs_select" on public.documentos_acreditacion
  for select using (
    public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and eleam_id = public.my_eleam_id())
  );

-- ── 9. Reforzar residentes_insert/update/delete: solo admin_eleam puede borrar
drop policy if exists "residentes_insert" on public.residentes;
create policy "residentes_insert" on public.residentes
  for insert with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "residentes_update" on public.residentes;
create policy "residentes_update" on public.residentes
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  )
  with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "residentes_delete" on public.residentes;
create policy "residentes_delete" on public.residentes
  for delete using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

-- ── 10. signos_vitales / observaciones — INSERT/UPDATE/DELETE solo staff
-- (familiar NO puede modificar registros clínicos; solo lectura.)
drop policy if exists "sv_insert" on public.signos_vitales;
create policy "sv_insert" on public.signos_vitales
  for insert with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

drop policy if exists "sv_update" on public.signos_vitales;
create policy "sv_update" on public.signos_vitales
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

drop policy if exists "sv_delete" on public.signos_vitales;
create policy "sv_delete" on public.signos_vitales
  for delete using (
    public.my_rol() = 'admin_eleam'
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

drop policy if exists "obs_insert" on public.observaciones_diarias;
create policy "obs_insert" on public.observaciones_diarias
  for insert with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

drop policy if exists "obs_update" on public.observaciones_diarias;
create policy "obs_update" on public.observaciones_diarias
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

drop policy if exists "obs_delete" on public.observaciones_diarias;
create policy "obs_delete" on public.observaciones_diarias
  for delete using (
    public.my_rol() = 'admin_eleam'
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

-- ── 11. documentos_acreditacion: INSERT/UPDATE/DELETE solo staff
drop policy if exists "docs_insert" on public.documentos_acreditacion;
create policy "docs_insert" on public.documentos_acreditacion
  for insert with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "docs_update" on public.documentos_acreditacion;
create policy "docs_update" on public.documentos_acreditacion
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "docs_delete" on public.documentos_acreditacion;
create policy "docs_delete" on public.documentos_acreditacion
  for delete using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

-- ── 12. pagos: solo admin_eleam puede ver el historial financiero
-- (los funcionarios y familiares no deben ver datos de cobro).
drop policy if exists "eleam_select_pagos" on public.pagos;
create policy "eleam_select_pagos" on public.pagos
  for select using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );


-- ════════════════════════════════════════════════════════════════
-- v7: Fixes de consistencia detectados en auditoría
--
-- 1) handle_new_user crea el ELEAM para admin_eleam server-side.
--    Antes el frontend (AuthContext/authService) hacía esto, pero
--    el trigger prevent_role_eleam_escalation lo bloquea (no permite
--    cambiar eleam_id desde el cliente). Resolvemos haciendo la
--    creación atómica en el trigger SECURITY DEFINER.
-- 2) eleams_insert solo superadmin (el trigger sigue funcionando
--    porque es SECURITY DEFINER). Esto evita que un usuario común
--    cree ELEAMs arbitrarios desde el cliente.
-- 3) acreditación INSERT/UPDATE pasa a ser admin-only para coincidir
--    con la UI (canManageDocuments) y porque es un proceso sensible
--    de cara a la SEREMI.
-- 4) sync_pago_activo respeta período de gracia: si subscription_status
--    pasa a 'cancelado' pero fecha_vencimiento_suscripcion es futura,
--    pago_activo se mantiene en true hasta esa fecha.
-- ════════════════════════════════════════════════════════════════

-- ── 1. handle_new_user definitivo: crea ELEAM si admin_eleam ────
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_rol         text  := 'admin_eleam';
  v_eleam_id    uuid  := null;
  v_token       text;
  v_invitacion  record;
  v_nombre      text;
begin
  v_nombre := coalesce(new.raw_user_meta_data->>'nombre',
                        split_part(new.email, '@', 1));

  -- Cuenta demo: superadmin con ELEAM demo activo
  if new.email = 'demo@fichaeleam.cl' then
    insert into public.profiles (id, nombre, email, rol, eleam_id)
    values (new.id, v_nombre, new.email, 'superadmin',
            'a0000000-0000-0000-0000-000000000001'::uuid)
    on conflict (id) do nothing;
    return new;
  end if;

  -- Procesar invitación si está presente
  v_token := new.raw_user_meta_data->>'invite_token';
  if v_token is not null and v_token <> '' then
    select i.* into v_invitacion
    from public.funcionario_invitaciones i
    where i.token = v_token
      and lower(i.email) = lower(new.email)
      and i.usado = false
      and i.expira_en > now()
    limit 1;

    if found then
      v_eleam_id := v_invitacion.eleam_id;
      v_rol      := coalesce(v_invitacion.rol, 'funcionario');
      update public.funcionario_invitaciones
        set usado = true, usado_en = now()
        where id = v_invitacion.id;
    end if;
  end if;

  -- Si seguimos siendo admin_eleam (no había invitación), crear ELEAM
  if v_rol = 'admin_eleam' and v_eleam_id is null then
    insert into public.eleams
      (nombre, email_admin, pago_activo, subscription_status)
    values
      ('ELEAM de ' || v_nombre, new.email, false, 'inactivo')
    returning id into v_eleam_id;
  end if;

  -- Crear el profile con el rol y eleam_id correctos en una sola sentencia.
  -- (Evita la UPDATE posterior bloqueada por prevent_role_eleam_escalation.)
  insert into public.profiles (id, nombre, email, rol, eleam_id)
  values (new.id, v_nombre, new.email, v_rol, v_eleam_id)
  on conflict (id) do nothing;

  -- Si la invitación es de familiar y trae residente_id → vincular
  if v_rol = 'familiar' and v_invitacion.residente_id is not null then
    insert into public.familiar_residentes
      (profile_id, residente_id, creado_por)
    values
      (new.id, v_invitacion.residente_id, v_invitacion.creado_por)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. eleams_insert: solo superadmin desde el cliente ──────────
-- El trigger SECURITY DEFINER sigue creando ELEAMs en el signup.
drop policy if exists "eleams_insert_auth"        on public.eleams;
drop policy if exists "eleams_insert_superadmin"  on public.eleams;
create policy "eleams_insert_superadmin" on public.eleams
  for insert with check (public.is_superadmin());

-- ── 3. acreditación: INSERT/UPDATE/DELETE solo admin_eleam ──────
-- (Ya está; aquí lo reafirmamos para que quede consistente con
-- la UI canManageDocuments=admin_eleam.)
drop policy if exists "docs_insert" on public.documentos_acreditacion;
create policy "docs_insert" on public.documentos_acreditacion
  for insert with check (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "docs_update" on public.documentos_acreditacion;
create policy "docs_update" on public.documentos_acreditacion
  for update using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

-- ── 4. sync_pago_activo respeta período de gracia ──────────────
create or replace function public.sync_pago_activo()
  returns trigger
  language plpgsql
as $$
begin
  if new.subscription_status in ('activo','en_gracia') then
    new.pago_activo := true;
  elsif new.subscription_status = 'cancelado' then
    -- Conservar el acceso hasta el fin del período pagado.
    if new.fecha_vencimiento_suscripcion is not null
       and new.fecha_vencimiento_suscripcion > now() then
      new.pago_activo := true;
    else
      new.pago_activo := false;
    end if;
  elsif new.subscription_status in ('inactivo','vencido','pausado','pendiente') then
    new.pago_activo := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_pago_activo on public.eleams;
create trigger trg_sync_pago_activo
  before update of subscription_status on public.eleams
  for each row execute function public.sync_pago_activo();


-- ════════════════════════════════════════════════════════════════
-- v9: Acreditación / Carpeta SEREMI — modelo completo
--
-- Reemplaza el modelo provisorio (categorias_acreditacion +
-- documentos_acreditacion) por uno orientado a "requisito" que
-- soporta:
--   • 14 ámbitos.
--   • Catálogo maestro de requisitos con medio verificador.
--   • Estado por ELEAM por requisito (cumple, pendiente, vencido,
--     no_aplica, observado, no_cumple).
--   • Documentos versionados (reemplazos sin perder historial).
--   • Observaciones internas o de fiscalización con cierre.
--   • Audit log de cambios (quién, cuándo, qué).
--
-- Las tablas legacy (categorias_acreditacion, documentos_acreditacion)
-- permanecen pero la app ya no las usa.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.acred_ambitos (
  id           uuid        primary key default gen_random_uuid(),
  codigo       text        unique not null,
  nombre       text        not null,
  descripcion  text,
  icono        text,
  orden        integer     not null default 0
);

alter table public.acred_ambitos enable row level security;

drop policy if exists "acred_ambitos_select" on public.acred_ambitos;
create policy "acred_ambitos_select" on public.acred_ambitos
  for select using ((select auth.uid()) is not null);

create table if not exists public.acred_requisitos (
  id                       uuid        primary key default gen_random_uuid(),
  ambito_id                uuid        not null references public.acred_ambitos(id) on delete cascade,
  codigo                   text        unique not null,
  nombre                   text        not null,
  descripcion              text,
  medio_verificador        text,
  obligatorio              boolean     not null default true,
  permite_no_aplica        boolean     not null default true,
  requiere_vencimiento     boolean     not null default false,
  vigencia_dias_sugerida   integer,
  orden                    integer     not null default 0
);

alter table public.acred_requisitos enable row level security;

drop policy if exists "acred_requisitos_select" on public.acred_requisitos;
create policy "acred_requisitos_select" on public.acred_requisitos
  for select using ((select auth.uid()) is not null);

create index if not exists idx_acred_requisitos_ambito
  on public.acred_requisitos(ambito_id, orden);

create table if not exists public.acred_requisitos_eleam (
  id                  uuid        primary key default gen_random_uuid(),
  eleam_id            uuid        not null references public.eleams(id) on delete cascade,
  requisito_id        uuid        not null references public.acred_requisitos(id) on delete cascade,
  estado              text        not null default 'pendiente'
                        check (estado in ('pendiente','cumple','no_cumple','no_aplica','vencido','observado')),
  fecha_vencimiento   date,
  no_aplica_motivo    text,
  responsable_id      uuid        references public.profiles(id) on delete set null,
  notas               text,
  ultima_revision_en  timestamptz,
  ultima_revision_por uuid        references public.profiles(id) on delete set null,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  unique (eleam_id, requisito_id)
);

alter table public.acred_requisitos_eleam enable row level security;

create index if not exists idx_acred_re_eleam      on public.acred_requisitos_eleam(eleam_id);
create index if not exists idx_acred_re_estado     on public.acred_requisitos_eleam(eleam_id, estado);
create index if not exists idx_acred_re_vencim     on public.acred_requisitos_eleam(eleam_id, fecha_vencimiento)
  where fecha_vencimiento is not null;

drop trigger if exists trg_acred_re_updated_at on public.acred_requisitos_eleam;
create trigger trg_acred_re_updated_at
  before update on public.acred_requisitos_eleam
  for each row execute function public.set_updated_at();

drop policy if exists "acred_re_select" on public.acred_requisitos_eleam;
create policy "acred_re_select" on public.acred_requisitos_eleam
  for select using (
    public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and eleam_id = public.my_eleam_id())
  );

drop policy if exists "acred_re_insert" on public.acred_requisitos_eleam;
create policy "acred_re_insert" on public.acred_requisitos_eleam
  for insert with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "acred_re_update" on public.acred_requisitos_eleam;
create policy "acred_re_update" on public.acred_requisitos_eleam
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

create table if not exists public.acred_documentos (
  id                  uuid        primary key default gen_random_uuid(),
  eleam_id            uuid        not null references public.eleams(id) on delete cascade,
  requisito_eleam_id  uuid        not null references public.acred_requisitos_eleam(id) on delete cascade,
  version             integer     not null default 1,
  vigente             boolean     not null default true,
  storage_path        text        not null,
  archivo_nombre      text        not null,
  archivo_tipo        text,
  archivo_tamanio     bigint      check (archivo_tamanio is null or archivo_tamanio >= 0),
  fecha_emision       date,
  fecha_vencimiento   date,
  notas               text,
  reemplazado_por_id  uuid        references public.acred_documentos(id) on delete set null,
  reemplazado_en      timestamptz,
  subido_por          uuid        references public.profiles(id) on delete set null,
  creado_en           timestamptz not null default now()
);

alter table public.acred_documentos enable row level security;

create index if not exists idx_acred_docs_re      on public.acred_documentos(requisito_eleam_id, vigente);
create index if not exists idx_acred_docs_eleam   on public.acred_documentos(eleam_id);
create index if not exists idx_acred_docs_vencim  on public.acred_documentos(eleam_id, fecha_vencimiento)
  where fecha_vencimiento is not null and vigente = true;

drop policy if exists "acred_docs_select" on public.acred_documentos;
create policy "acred_docs_select" on public.acred_documentos
  for select using (
    public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and eleam_id = public.my_eleam_id())
  );

drop policy if exists "acred_docs_insert" on public.acred_documentos;
create policy "acred_docs_insert" on public.acred_documentos
  for insert with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "acred_docs_update" on public.acred_documentos;
create policy "acred_docs_update" on public.acred_documentos
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "acred_docs_delete" on public.acred_documentos;
create policy "acred_docs_delete" on public.acred_documentos
  for delete using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

create table if not exists public.acred_observaciones (
  id                   uuid        primary key default gen_random_uuid(),
  eleam_id             uuid        not null references public.eleams(id) on delete cascade,
  requisito_eleam_id   uuid        references public.acred_requisitos_eleam(id) on delete set null,
  origen               text        not null check (origen in ('interna','fiscalizacion')),
  descripcion          text        not null,
  acciones_subsanacion text,
  responsable_id       uuid        references public.profiles(id) on delete set null,
  fecha                date        not null default current_date,
  fecha_compromiso     date,
  estado               text        not null default 'abierta'
                         check (estado in ('abierta','en_proceso','cerrada')),
  cerrada_en           timestamptz,
  cerrada_por          uuid        references public.profiles(id) on delete set null,
  cerrada_nota         text,
  creado_por           uuid        references public.profiles(id) on delete set null,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now()
);

alter table public.acred_observaciones enable row level security;

create index if not exists idx_acred_obs_eleam_estado
  on public.acred_observaciones(eleam_id, estado);
create index if not exists idx_acred_obs_re
  on public.acred_observaciones(requisito_eleam_id);

drop trigger if exists trg_acred_obs_updated_at on public.acred_observaciones;
create trigger trg_acred_obs_updated_at
  before update on public.acred_observaciones
  for each row execute function public.set_updated_at();

drop policy if exists "acred_obs_select" on public.acred_observaciones;
create policy "acred_obs_select" on public.acred_observaciones
  for select using (
    public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and eleam_id = public.my_eleam_id())
  );

drop policy if exists "acred_obs_insert_admin" on public.acred_observaciones;
create policy "acred_obs_insert_admin" on public.acred_observaciones
  for insert with check (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "acred_obs_insert_func_interna" on public.acred_observaciones;
create policy "acred_obs_insert_func_interna" on public.acred_observaciones
  for insert with check (
    public.my_rol() = 'funcionario'
    and eleam_id = public.my_eleam_id()
    and origen = 'interna'
  );

drop policy if exists "acred_obs_update_admin" on public.acred_observaciones;
create policy "acred_obs_update_admin" on public.acred_observaciones
  for update using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

drop policy if exists "acred_obs_update_func" on public.acred_observaciones;
create policy "acred_obs_update_func" on public.acred_observaciones
  for update using (
    public.my_rol() = 'funcionario'
    and eleam_id = public.my_eleam_id()
    and origen = 'interna'
    and creado_por = (select auth.uid())
  );

drop policy if exists "acred_obs_delete" on public.acred_observaciones;
create policy "acred_obs_delete" on public.acred_observaciones
  for delete using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

create table if not exists public.acred_audit (
  id              uuid        primary key default gen_random_uuid(),
  eleam_id        uuid,
  entidad         text not null,
  entidad_id      uuid,
  accion          text not null,
  detalle         jsonb,
  realizado_por   uuid references public.profiles(id) on delete set null,
  realizado_en    timestamptz not null default now()
);

alter table public.acred_audit enable row level security;

create index if not exists idx_acred_audit_eleam on public.acred_audit(eleam_id, realizado_en desc);

drop policy if exists "acred_audit_select" on public.acred_audit;
create policy "acred_audit_select" on public.acred_audit
  for select using (
    public.is_superadmin()
    or (public.my_rol() in ('admin_eleam','funcionario')
        and eleam_id = public.my_eleam_id())
  );

drop policy if exists "acred_audit_insert" on public.acred_audit;
create policy "acred_audit_insert" on public.acred_audit
  for insert with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

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

drop trigger if exists trg_acred_provision_on_eleam on public.eleams;
create trigger trg_acred_provision_on_eleam
  after insert on public.eleams
  for each row execute function public.acred_on_eleam_created();

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

-- ── Seed: 14 ámbitos ───────────────────────────────────────────
insert into public.acred_ambitos (codigo, nombre, descripcion, icono, orden) values
  ('A01','Antecedentes legales del ELEAM',                'Documentos que acreditan la existencia legal y vigencia de la entidad sostenedora.','📄',1),
  ('A02','Autorización sanitaria',                        'Resolución sanitaria, autorización de funcionamiento y permisos municipales.','✅',2),
  ('A03','Infraestructura y condiciones sanitarias',      'Estado del inmueble, instalaciones eléctricas, gas, agua, ascensores, calderas.','🏗️',3),
  ('A04','Seguridad, incendios y evacuación',             'Plan de emergencia, extintores, simulacros, señalética y luces de emergencia.','🚨',4),
  ('A05','Dirección técnica',                             'Profesional responsable, contrato y carta de aceptación SEREMI.','👨‍⚕️',5),
  ('A06','Personal, dotación y turnos',                   'Nómina, contratos, títulos, salud y capacitaciones del personal.','👥',6),
  ('A07','Protocolos obligatorios',                       'Protocolos clínicos y operativos (PCI, lavado de manos, medicamentos, etc.).','📋',7),
  ('A08','Residentes y carpetas personales',              'Fichas clínicas, evaluaciones funcionales y planes de cuidado individual.','📁',8),
  ('A09','Contratos, consentimientos y derechos',         'Contrato de residencia, consentimientos y carta de derechos de los residentes.','✍️',9),
  ('A10','Medicamentos y registros',                      'Botiquín, kardex, prescripciones, control de psicotrópicos y QF asesor.','💊',10),
  ('A11','Alimentación y manipulación',                   'Minutas, manipuladores, control HACCP y dietas especiales.','🍽️',11),
  ('A12','Aseo, lavandería, residuos y plagas',           'Programas y registros de aseo, lavandería, residuos y control de plagas.','🧼',12),
  ('A13','Reclamos, sugerencias y comunicación',          'Libro de reclamos, sugerencias y comunicación con familias.','📣',13),
  ('A14','Fiscalizaciones y subsanaciones',               'Actas, observaciones de fiscalización y planes de subsanación.','🔍',14)
on conflict (codigo) do update set
  nombre      = excluded.nombre,
  descripcion = excluded.descripcion,
  icono       = excluded.icono,
  orden       = excluded.orden;

-- ── Seed: requisitos ───────────────────────────────────────────
-- Patrón: por cada ámbito insertamos un set acotado pero útil de
-- requisitos típicos. (codigo, nombre, descripcion, medio_verificador,
-- requiere_vencimiento, vigencia_dias_sugerida, orden)
with vals(codigo, nombre, descripcion, medio_verificador, req_venc, vigencia, orden) as (values
  -- A01 Antecedentes legales
  ('A01-R01','Escritura de constitución de la sociedad/entidad','Documento legal que constituye la persona jurídica que opera el ELEAM.','Copia escritura inscrita en el Registro de Comercio',false,null,1),
  ('A01-R02','Certificado de vigencia de la persona jurídica','Acredita que la sociedad sigue vigente. Caduca con el tiempo y debe renovarse.','Certificado emitido por el Registro de Comercio',true,180,2),
  ('A01-R03','RUT y rol único tributario de la entidad','Identificación tributaria de la entidad sostenedora.','Cédula RUT o e-RUT del SII',false,null,3),
  ('A01-R04','Iniciación de actividades en el SII','Declaración de inicio de actividades comerciales ante el Servicio de Impuestos Internos.','Formulario 4415 o e-RUT con giro',false,null,4),
  ('A01-R05','Identificación del representante legal','Documento que acredita quién representa legalmente al ELEAM.','Cédula identidad + escritura de poder vigente',false,null,5),

  -- A02 Autorización sanitaria
  ('A02-R01','Resolución sanitaria de funcionamiento vigente','Resolución de la SEREMI de Salud que autoriza operar como ELEAM.','Resolución firmada por la SEREMI',true,365,1),
  ('A02-R02','Solicitud y antecedentes de autorización','Carpeta presentada a la SEREMI con planos, dotación y documentos de apoyo.','Copia del expediente presentado',false,null,2),
  ('A02-R03','Certificado de Informaciones Previas (CIP) municipal','Certificado de la municipalidad que confirma uso de suelo permitido.','CIP emitido por la Dirección de Obras',true,365,3),
  ('A02-R04','Permiso de edificación municipal','Permiso que acredita que el inmueble fue construido con autorización.','Permiso DOM',false,null,4),
  ('A02-R05','Recepción final de obra municipal','Documento que acredita que la obra fue recibida conforme.','Certificado DOM',false,null,5),

  -- A03 Infraestructura
  ('A03-R01','Planos del establecimiento actualizados','Planos arquitectónicos vigentes con la distribución actual del ELEAM.','Planos firmados por arquitecto/a',false,null,1),
  ('A03-R02','Certificado de instalación eléctrica (SEC)','Documento TE-1 emitido por instalador autorizado.','Formulario TE-1 SEC vigente',true,1095,2),
  ('A03-R03','Certificado de instalación de gas (SEC)','Documento TC-6/TC-7 si el establecimiento usa gas.','Certificado SEC vigente',true,730,3),
  ('A03-R04','Informe de potabilidad del agua','Análisis físico-químico del agua de consumo.','Informe laboratorio acreditado',true,365,4),
  ('A03-R05','Certificado de fumigación y desratización','Tratamiento de control de plagas vigente.','Certificado de empresa autorizada',true,180,5),
  ('A03-R06','Certificado de ascensor (si aplica)','Mantención y certificación periódica del o los ascensores.','Certificado empresa de mantención',true,365,6),
  ('A03-R07','Certificado de calderas (si aplica)','Documento de mantención de calderas/calefones.','Certificado SEC vigente',true,365,7),

  -- A04 Seguridad
  ('A04-R01','Plan de emergencia y evacuación aprobado','Documento que define cómo evacuar ante un siniestro.','Plan firmado por responsable y SEREMI',false,null,1),
  ('A04-R02','Certificado de extintores vigente','Mantención y recarga anual de los extintores.','Certificado empresa autorizada',true,365,2),
  ('A04-R03','Señalética de emergencia instalada','Vías de evacuación, salidas y zonas seguras debidamente señalizadas.','Foto inventario + check de inspección',false,null,3),
  ('A04-R04','Registro de simulacros (mínimo 2/año)','Bitácora de simulacros de evacuación realizados.','Acta de simulacro firmada',true,180,4),
  ('A04-R05','Luces de emergencia operativas','Luces que funcionan ante corte eléctrico.','Bitácora de inspección mensual',true,90,5),
  ('A04-R06','Protocolo de búsqueda y rescate','Procedimiento para ubicar residentes en una emergencia.','Protocolo escrito',false,null,6),

  -- A05 Dirección técnica
  ('A05-R01','Credencial vigente del director técnico','Identifica al profesional responsable del ELEAM.','Credencial emitida por SEREMI',true,365,1),
  ('A05-R02','Título profesional del director técnico','Acredita su formación profesional.','Copia legalizada del título',false,null,2),
  ('A05-R03','Contrato de prestación del director técnico','Contrato laboral o de servicios.','Contrato firmado',false,null,3),
  ('A05-R04','Carta de aceptación SEREMI','SEREMI acepta a la persona como dirección técnica del ELEAM.','Resolución/aceptación SEREMI',false,null,4),

  -- A06 Personal
  ('A06-R01','Nómina actualizada del personal','Listado del personal vigente con cargos y horarios.','Excel/PDF con nómina vigente',true,180,1),
  ('A06-R02','Contratos de trabajo del personal','Contratos firmados de cada trabajador.','Copias de los contratos',false,null,2),
  ('A06-R03','Títulos y certificados profesionales','Acredita la formación de TENS, enfermeras, médicos, etc.','Copias de títulos por funcionario',false,null,3),
  ('A06-R04','Certificados de salud del personal','Aptos médicamente para trabajar con adultos mayores.','Certificado de salud vigente',true,365,4),
  ('A06-R05','Registro de capacitaciones del personal','Bitácora con cursos y capacitaciones realizadas.','Bitácora + certificados',false,null,5),
  ('A06-R06','Convenios con prestadores de salud','Acuerdos con clínicas, ambulancias o servicios externos.','Convenios firmados vigentes',false,null,6),
  ('A06-R07','Protocolo de turnos y guardia nocturna','Define la dotación mínima por turno y la guardia nocturna.','Protocolo escrito',false,null,7),

  -- A07 Protocolos
  ('A07-R01','Programa PCI (Prevención y Control de Infecciones)','Documento maestro de control de infecciones intrahospitalarias.','Programa PCI escrito',false,null,1),
  ('A07-R02','Protocolo de lavado de manos','Procedimiento estandarizado de higiene de manos.','Protocolo escrito + difusión',false,null,2),
  ('A07-R03','Protocolo de aislamiento de contacto y gotitas','Acciones ante un residente con sospecha o cuadro infeccioso.','Protocolo escrito',false,null,3),
  ('A07-R04','Protocolo de manejo de residuos hospitalarios','Manejo seguro de residuos generados (REAS).','Protocolo + bitácora retiro',false,null,4),
  ('A07-R05','Protocolo de manejo de medicamentos','Almacenamiento, administración y registro de medicamentos.','Protocolo escrito',false,null,5),
  ('A07-R06','Protocolo de alimentación y deglución','Manejo de pacientes con disfagia y dietas especiales.','Protocolo escrito',false,null,6),
  ('A07-R07','Protocolo de emergencias clínicas','Acción inmediata ante caída, paro, ahogo, hipoglicemia, etc.','Protocolo escrito',false,null,7),

  -- A08 Residentes y carpetas
  ('A08-R01','Ficha clínica completa por residente','Información personal, clínica, social y de contacto al día.','Sistema FichaEleam (módulo Residentes)',false,null,1),
  ('A08-R02','Evaluación funcional (Índice de Barthel)','Evaluación periódica de la independencia para AVD.','Registro en ficha del residente',true,180,2),
  ('A08-R03','Evaluación cognitiva (MMSE / Test del reloj)','Estado cognitivo del residente registrado periódicamente.','Registro en ficha del residente',true,180,3),
  ('A08-R04','Evaluación nutricional individual','Evaluación inicial y de seguimiento por nutricionista.','Registro firmado por nutricionista',true,180,4),
  ('A08-R05','Plan de cuidados individualizado (PAI)','Plan de cuidados con objetivos, intervenciones y responsable.','PAI firmado',true,180,5),
  ('A08-R06','Consentimiento informado firmado','Autorización del residente o representante para los cuidados.','Consentimiento escrito',false,null,6),
  ('A08-R07','Evaluación de riesgo de caídas (Morse)','Identifica residentes con alto riesgo de caer.','Registro en ficha',true,180,7),

  -- A09 Contratos, consentimientos y derechos
  ('A09-R01','Contrato de residencia firmado','Acuerdo formal entre residente/familia y ELEAM.','Contrato firmado por las partes',false,null,1),
  ('A09-R02','Carta de derechos del residente entregada','Documento entregado al ingreso con los derechos del residente.','Acta de entrega firmada',false,null,2),
  ('A09-R03','Reglamento interno del ELEAM','Reglas de convivencia y operación del establecimiento.','Reglamento publicado',false,null,3),
  ('A09-R04','Carta de tarifas vigente','Tarifa actual de cuidados y servicios adicionales.','Carta firmada',true,365,4),

  -- A10 Medicamentos
  ('A10-R01','Inventario de botiquín','Listado actualizado de medicamentos disponibles.','Inventario escrito + ubicación',true,90,1),
  ('A10-R02','Kardex de administración por residente','Registro de cada administración de medicamento.','Sistema FichaEleam (módulo Observaciones)',false,null,2),
  ('A10-R03','Prescripciones médicas vigentes','Indicaciones médicas firmadas por residente.','Receta médica vigente',true,180,3),
  ('A10-R04','Control de psicotrópicos y estupefacientes','Libro foliado con ingreso, salida y stock.','Libro foliado SEREMI',false,null,4),
  ('A10-R05','Convenio con químico farmacéutico asesor','Profesional asesor para el manejo de medicamentos.','Convenio firmado',false,null,5),

  -- A11 Alimentación
  ('A11-R01','Minuta alimentaria mensual','Plan de alimentación visado por nutricionista.','Minuta firmada',true,30,1),
  ('A11-R02','Certificados de manipulación de alimentos','Acredita la formación del personal de cocina.','Certificados vigentes',true,1095,2),
  ('A11-R03','Control de temperaturas (HACCP)','Bitácora diaria de temperaturas de equipos y alimentos.','Bitácora HACCP',true,30,3),
  ('A11-R04','Protocolo de dietas especiales y deglución','Procedimiento para residentes con disfagia o diabetes.','Protocolo escrito',false,null,4),
  ('A11-R05','Encuesta de satisfacción alimentaria','Recoge opinión de residentes sobre la comida.','Encuesta aplicada',true,180,5),

  -- A12 Aseo, lavandería, residuos
  ('A12-R01','Programa de aseo y desinfección','Cronograma y procedimientos de aseo por área.','Programa escrito',false,null,1),
  ('A12-R02','Bitácora de aseo','Registro diario de aseo realizado.','Bitácora firmada',true,30,2),
  ('A12-R03','Manejo de lavandería y ropa de cama','Procedimiento para evitar contaminación cruzada.','Protocolo escrito',false,null,3),
  ('A12-R04','Manejo de residuos peligrosos (REAS)','Convenio con empresa autorizada de retiro.','Convenio + bitácora de retiros',true,365,4),
  ('A12-R05','Certificado de control de plagas','Igual que A03-R05; se replica si se gestiona aparte.','Certificado vigente',true,180,5),

  -- A13 Reclamos
  ('A13-R01','Libro de reclamos disponible','Libro físico foliado o sistema digital equivalente.','Libro foliado',false,null,1),
  ('A13-R02','Procedimiento de respuesta a reclamos','Define plazos y responsables para responder.','Procedimiento escrito',false,null,2),
  ('A13-R03','Buzón de sugerencias','Mecanismo de retroalimentación para residentes y familias.','Foto + bitácora de revisión',false,null,3),
  ('A13-R04','Registro de comunicaciones con familias','Cuaderno o sistema con avisos enviados/recibidos.','Bitácora de comunicaciones',false,null,4),
  ('A13-R05','Reuniones periódicas con familias','Acta de reuniones con familias.','Actas firmadas',true,180,5),

  -- A14 Fiscalizaciones y subsanaciones
  ('A14-R01','Acta de la última fiscalización','Documento entregado por la SEREMI/Municipalidad.','Acta firmada',false,null,1),
  ('A14-R02','Plan de subsanación de observaciones','Compromisos de mejora firmados con plazo y responsable.','Plan escrito',false,null,2),
  ('A14-R03','Bitácora de seguimiento de subsanaciones','Avance en cada compromiso adquirido.','Bitácora interna',true,90,3),
  ('A14-R04','Comunicaciones con SEREMI','Cartas, oficios e informes enviados a la autoridad.','Archivo de oficios',false,null,4)
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
  nombre                  = excluded.nombre,
  descripcion             = excluded.descripcion,
  medio_verificador       = excluded.medio_verificador,
  requiere_vencimiento    = excluded.requiere_vencimiento,
  vigencia_dias_sugerida  = excluded.vigencia_dias_sugerida,
  orden                   = excluded.orden;

-- Provisionar requisitos para los ELEAMs ya existentes (si hay).
do $$
declare
  e record;
begin
  for e in select id from public.eleams loop
    perform public.acred_provision_requisitos(e.id);
  end loop;
end $$;


-- ════════════════════════════════════════════════════════════════
-- v10: Hardening de RLS UPDATE — agregar WITH CHECK a las policies
-- de UPDATE que solo declaran USING. Sin WITH CHECK, un usuario que
-- puede leer/actualizar una fila propia podría modificar columnas
-- sensibles (ej. eleam_id) y mover datos a otro tenant.
-- ════════════════════════════════════════════════════════════════

-- residentes
drop policy if exists "residentes_update" on public.residentes;
create policy "residentes_update" on public.residentes
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  )
  with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

-- signos_vitales
drop policy if exists "sv_update" on public.signos_vitales;
create policy "sv_update" on public.signos_vitales
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  )
  with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

-- observaciones_diarias
drop policy if exists "obs_update" on public.observaciones_diarias;
create policy "obs_update" on public.observaciones_diarias
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  )
  with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and residente_id in (select id from public.residentes
                          where eleam_id = public.my_eleam_id())
  );

-- documentos_acreditacion (legacy, todavía existe)
drop policy if exists "docs_update" on public.documentos_acreditacion;
create policy "docs_update" on public.documentos_acreditacion
  for update using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  )
  with check (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

-- acred_requisitos_eleam
drop policy if exists "acred_re_update" on public.acred_requisitos_eleam;
create policy "acred_re_update" on public.acred_requisitos_eleam
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  )
  with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

-- acred_documentos
drop policy if exists "acred_docs_update" on public.acred_documentos;
create policy "acred_docs_update" on public.acred_documentos
  for update using (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  )
  with check (
    public.my_rol() in ('admin_eleam','funcionario')
    and eleam_id = public.my_eleam_id()
  );

-- acred_observaciones (admin)
drop policy if exists "acred_obs_update_admin" on public.acred_observaciones;
create policy "acred_obs_update_admin" on public.acred_observaciones
  for update using (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  )
  with check (
    public.my_rol() = 'admin_eleam'
    and eleam_id = public.my_eleam_id()
  );

-- acred_observaciones (funcionario solo internas creadas por sí mismo)
drop policy if exists "acred_obs_update_func" on public.acred_observaciones;
create policy "acred_obs_update_func" on public.acred_observaciones
  for update using (
    public.my_rol() = 'funcionario'
    and eleam_id = public.my_eleam_id()
    and origen = 'interna'
    and creado_por = (select auth.uid())
  )
  with check (
    public.my_rol() = 'funcionario'
    and eleam_id = public.my_eleam_id()
    and origen = 'interna'
    and creado_por = (select auth.uid())
  );

-- profiles update (no permitir cambiar id; el trigger
-- prevent_role_eleam_escalation cubre rol/eleam_id)
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles
  for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
