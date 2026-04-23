-- ============================================================
-- SCHEMA SUPABASE - FichaEleam
-- ELEAM: Establecimiento de Larga Estadía para Adultos Mayores
-- ============================================================

-- Habilitar extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: profiles (extiende auth.users de Supabase)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  email text not null,
  rol text not null default 'usuario' check (rol in ('admin', 'usuario', 'enfermera', 'medico')),
  creado_en timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins ven todos los perfiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- Función y trigger para crear perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
    new.email,
    'usuario'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TABLA: residentes
-- ============================================================
create table if not exists public.residentes (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  apellido text not null,
  rut text unique,
  fecha_nacimiento date,
  sexo text check (sexo in ('masculino', 'femenino', 'otro')),
  nacionalidad text default 'Chilena',
  estado_civil text check (estado_civil in ('soltero', 'casado', 'viudo', 'divorciado', 'otro')),
  -- Contacto y familia
  direccion_anterior text,
  nombre_contacto text,
  telefono_contacto text,
  parentesco_contacto text,
  -- Información médica base
  prevision text,
  diagnostico_principal text,
  diagnosticos_secundarios text[],
  alergias text[],
  grupo_sanguineo text,
  -- Estado en el establecimiento
  fecha_ingreso date not null default current_date,
  fecha_egreso date,
  motivo_egreso text,
  habitacion text,
  cama text,
  estado text not null default 'activo' check (estado in ('activo', 'hospitalizado', 'egresado', 'fallecido')),
  -- Evaluaciones funcionales
  indice_barthel integer check (indice_barthel between 0 and 100),
  escala_katz text,
  nivel_dependencia text check (nivel_dependencia in ('leve', 'moderado', 'severo', 'total')),
  -- Metadatos
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.residentes enable row level security;

create policy "Usuarios autenticados pueden ver residentes"
  on public.residentes for select
  using (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden insertar residentes"
  on public.residentes for insert
  with check (auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden actualizar residentes"
  on public.residentes for update
  using (auth.role() = 'authenticated');

-- ============================================================
-- TABLA: signos_vitales (registro diario)
-- ============================================================
create table if not exists public.signos_vitales (
  id uuid primary key default uuid_generate_v4(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  fecha_hora timestamptz not null default now(),
  -- Signos vitales
  presion_sistolica integer,
  presion_diastolica integer,
  frecuencia_cardiaca integer,
  frecuencia_respiratoria integer,
  temperatura numeric(4,1),
  saturacion_oxigeno integer check (saturacion_oxigeno between 0 and 100),
  glucosa integer,
  peso numeric(5,2),
  -- Estado general
  dolor_escala integer check (dolor_escala between 0 and 10),
  estado_conciencia text check (estado_conciencia in ('alerta', 'somnoliento', 'estuporoso', 'coma')),
  observaciones text,
  -- Metadatos
  registrado_por uuid references auth.users(id),
  turno text check (turno in ('mañana', 'tarde', 'noche'))
);

alter table public.signos_vitales enable row level security;

create policy "Autenticados ven signos vitales"
  on public.signos_vitales for select
  using (auth.role() = 'authenticated');

create policy "Autenticados insertan signos vitales"
  on public.signos_vitales for insert
  with check (auth.role() = 'authenticated');

create policy "Autenticados actualizan signos vitales"
  on public.signos_vitales for update
  using (auth.role() = 'authenticated');

create policy "Autenticados eliminan signos vitales"
  on public.signos_vitales for delete
  using (auth.role() = 'authenticated');

-- ============================================================
-- TABLA: observaciones_diarias
-- ============================================================
create table if not exists public.observaciones_diarias (
  id uuid primary key default uuid_generate_v4(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  fecha_hora timestamptz not null default now(),
  turno text check (turno in ('mañana', 'tarde', 'noche')),
  tipo text not null check (tipo in (
    'observacion_general',
    'caida',
    'incidente',
    'curacion',
    'visita_medica',
    'administracion_medicamento',
    'cambio_posicion',
    'higiene',
    'alimentacion',
    'eliminacion',
    'actividad',
    'otro'
  )),
  descripcion text not null,
  acciones_tomadas text,
  requiere_seguimiento boolean default false,
  registrado_por uuid references auth.users(id),
  creado_en timestamptz not null default now()
);

alter table public.observaciones_diarias enable row level security;

create policy "Autenticados ven observaciones"
  on public.observaciones_diarias for select
  using (auth.role() = 'authenticated');

create policy "Autenticados insertan observaciones"
  on public.observaciones_diarias for insert
  with check (auth.role() = 'authenticated');

create policy "Autenticados actualizan observaciones"
  on public.observaciones_diarias for update
  using (auth.role() = 'authenticated');

-- ============================================================
-- TABLA: categorias_acreditacion
-- Categorías fijas según DS 14/2017 - SEREMI evaluación ELEAM
-- ============================================================
create table if not exists public.categorias_acreditacion (
  id uuid primary key default uuid_generate_v4(),
  codigo text unique not null,
  nombre text not null,
  descripcion text,
  orden integer not null,
  documentos_requeridos jsonb
);

-- Insertar categorías según estándar DS 14/2017
insert into public.categorias_acreditacion (codigo, nombre, descripcion, orden, documentos_requeridos) values
(
  'CAT-01',
  'Autorización de Funcionamiento',
  'Documentación legal y sanitaria que acredita el funcionamiento autorizado del ELEAM',
  1,
  '["Resolución de autorización sanitaria vigente", "Escritura de constitución entidad sostenedora", "Certificado de vigencia de la persona jurídica", "Contrato de arriendo o escritura del inmueble", "Certificado de Informes Previos (CIP) Municipal", "Permiso de edificación", "Recepción final de obra"]'::jsonb
),
(
  'CAT-02',
  'Planta Física e Infraestructura',
  'Planos, certificaciones e informes sobre las instalaciones físicas del establecimiento',
  2,
  '["Planos del establecimiento aprobados", "Informe técnico de instalaciones eléctricas", "Certificado de instalaciones eléctricas (SEC)", "Certificado de instalaciones de gas (SEC)", "Certificado de calderas y calefacción (si aplica)", "Informe de potabilidad del agua", "Certificado de fumigación y desratización"]'::jsonb
),
(
  'CAT-03',
  'Recursos Humanos',
  'Dotación y calificación del personal según normativa vigente',
  3,
  '["Nómina de trabajadores actualizada", "Contratos de trabajo del personal", "Títulos y certificados del personal profesional", "Credencial del director técnico", "Certificados de salud del personal", "Registro de capacitaciones del personal", "Convenios con prestadores de salud externos", "Protocolo de turnos y guardia"]'::jsonb
),
(
  'CAT-04',
  'Fichas Clínicas y Registros Médicos',
  'Fichas clínicas individuales, evaluaciones funcionales y planes de cuidado de cada residente',
  4,
  '["Ficha clínica por cada residente", "Evaluación funcional (Índice de Barthel)", "Evaluación cognitiva (MMSE / Test del reloj)", "Evaluación nutricional por residente", "Plan de cuidados individualizado", "Consentimiento informado firmado", "Historia clínica completa", "Registro de visitas médicas", "Evaluación de riesgo de caídas (Escala de Morse)"]'::jsonb
),
(
  'CAT-05',
  'Medicamentos y Farmacia',
  'Gestión y control de medicamentos, psicotrópicos y botiquín',
  5,
  '["Inventario de botiquín actualizado", "Kardex de administración de medicamentos", "Prescripciones médicas vigentes por residente", "Control de psicotrópicos y estupefacientes (libro foliado)", "Protocolo de manejo y almacenamiento de medicamentos", "Registro de medicamentos vencidos y destruidos", "Convenio con farmacia o químico farmacéutico"]'::jsonb
),
(
  'CAT-06',
  'Alimentación y Nutrición',
  'Minutas alimentarias, evaluaciones nutricionales y certificaciones del personal de cocina',
  6,
  '["Minuta alimentaria mensual aprobada por nutricionista", "Evaluación nutricional de cada residente", "Certificados de manipulación de alimentos del personal de cocina", "Registro de control de temperaturas (HACCP)", "Informe de instalaciones de cocina", "Protocolo de dietas especiales", "Registro de encuestas de satisfacción alimentaria"]'::jsonb
),
(
  'CAT-07',
  'Prevención y Control de Infecciones (PCI)',
  'Protocolos y registros del programa de prevención y control de infecciones',
  7,
  '["Programa de PCI del establecimiento", "Protocolo de lavado de manos", "Protocolo de aislamiento de contacto y gotitas", "Registro de vigilancia epidemiológica (IIH)", "Protocolo de manejo de residuos hospitalarios", "Registro de uso de antibióticos", "Protocolo de higiene y antisepsia", "Registro de esterilización y desinfección"]'::jsonb
),
(
  'CAT-08',
  'Seguridad y Plan de Emergencias',
  'Plan de emergencia, certificaciones de seguridad y registros de simulacros',
  8,
  '["Plan de emergencia y evacuación aprobado", "Certificado de extintores vigente", "Señalética de emergencia instalada", "Registro de simulacros de evacuación (mínimo 2 por año)", "Luces de emergencia certificadas", "Protocolo de búsqueda y rescate de residentes", "Plan de continuidad operacional"]'::jsonb
),
(
  'CAT-09',
  'Registros de Atención Diaria',
  'Registros diarios de signos vitales, actividades, incidentes y procedimientos',
  9,
  '["Registro diario de signos vitales", "Registro de actividades diarias por residente", "Registro de caídas e incidentes (libro de novedades)", "Registro de curaciones y procedimientos de enfermería", "Registro de cambios posturales", "Registro de higiene y cuidados básicos", "Hoja de balance hídrico (si aplica)"]'::jsonb
),
(
  'CAT-10',
  'Actividades y Rehabilitación',
  'Programa de actividades terapéuticas, recreativas y plan de rehabilitación',
  10,
  '["Programa mensual de actividades recreativas y terapéuticas", "Registro de asistencia a actividades por residente", "Plan de rehabilitación individualizado (kinesiología)", "Convenio o contrato con kinesiólogo", "Registro de sesiones de rehabilitación", "Evaluación de funcionalidad motora", "Programa de estimulación cognitiva"]'::jsonb
)
on conflict (codigo) do nothing;

-- ============================================================
-- TABLA: documentos_acreditacion
-- ============================================================
create table if not exists public.documentos_acreditacion (
  id uuid primary key default uuid_generate_v4(),
  categoria_id uuid not null references public.categorias_acreditacion(id),
  nombre text not null,
  descripcion text,
  archivo_url text,
  archivo_nombre text,
  archivo_tipo text,
  archivo_tamaño bigint,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'subido', 'aprobado', 'rechazado', 'vencido')),
  fecha_vencimiento date,
  observaciones text,
  subido_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.documentos_acreditacion enable row level security;

create policy "Autenticados ven documentos acreditacion"
  on public.documentos_acreditacion for select
  using (auth.role() = 'authenticated');

create policy "Autenticados insertan documentos acreditacion"
  on public.documentos_acreditacion for insert
  with check (auth.role() = 'authenticated');

create policy "Autenticados actualizan documentos acreditacion"
  on public.documentos_acreditacion for update
  using (auth.role() = 'authenticated');

create policy "Autenticados eliminan documentos acreditacion"
  on public.documentos_acreditacion for delete
  using (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKETS (ejecutar en Supabase Dashboard > Storage)
-- ============================================================
-- Bucket para documentos de acreditación
insert into storage.buckets (id, name, public)
values ('documentos-acreditacion', 'documentos-acreditacion', false)
on conflict (id) do nothing;

-- Bucket para archivos de residentes
insert into storage.buckets (id, name, public)
values ('residentes-archivos', 'residentes-archivos', false)
on conflict (id) do nothing;

-- Políticas de storage
create policy "Autenticados pueden subir documentos"
  on storage.objects for insert
  with check (auth.role() = 'authenticated');

create policy "Autenticados pueden ver documentos"
  on storage.objects for select
  using (auth.role() = 'authenticated');

create policy "Autenticados pueden eliminar documentos"
  on storage.objects for delete
  using (auth.role() = 'authenticated');

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index if not exists idx_residentes_estado on public.residentes(estado);
create index if not exists idx_signos_vitales_residente on public.signos_vitales(residente_id, fecha_hora desc);
create index if not exists idx_observaciones_residente on public.observaciones_diarias(residente_id, fecha_hora desc);
create index if not exists idx_documentos_categoria on public.documentos_acreditacion(categoria_id);
create index if not exists idx_documentos_estado on public.documentos_acreditacion(estado);
