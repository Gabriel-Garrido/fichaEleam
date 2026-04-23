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
create policy "profiles_own_select"
  on public.profiles for select
  using ((select auth.uid()) = id);

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

create policy "residentes_select"
  on public.residentes for select
  using ((select auth.uid()) is not null);

create policy "residentes_insert"
  on public.residentes for insert
  with check ((select auth.uid()) is not null);

create policy "residentes_update"
  on public.residentes for update
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

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

create policy "signos_select"
  on public.signos_vitales for select
  using ((select auth.uid()) is not null);

create policy "signos_insert"
  on public.signos_vitales for insert
  with check ((select auth.uid()) is not null);

create policy "signos_update"
  on public.signos_vitales for update
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

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

create policy "observaciones_select"
  on public.observaciones_diarias for select
  using ((select auth.uid()) is not null);

create policy "observaciones_insert"
  on public.observaciones_diarias for insert
  with check ((select auth.uid()) is not null);

create policy "observaciones_update"
  on public.observaciones_diarias for update
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

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

create policy "documentos_select"
  on public.documentos_acreditacion for select
  using ((select auth.uid()) is not null);

create policy "documentos_insert"
  on public.documentos_acreditacion for insert
  with check ((select auth.uid()) is not null);

create policy "documentos_update"
  on public.documentos_acreditacion for update
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

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
create policy "storage_acreditacion_select"
  on storage.objects for select
  using (
    bucket_id = 'documentos-acreditacion'
    and (select auth.uid()) is not null
  );

create policy "storage_acreditacion_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-acreditacion'
    and (select auth.uid()) is not null
  );

create policy "storage_acreditacion_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documentos-acreditacion'
    and (select auth.uid()) is not null
  );

create policy "storage_residentes_select"
  on storage.objects for select
  using (
    bucket_id = 'residentes-archivos'
    and (select auth.uid()) is not null
  );

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
