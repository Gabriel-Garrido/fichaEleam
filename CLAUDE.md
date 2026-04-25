# FichaEleam — Documentación del Proyecto

## Resumen

**FichaEleam** es una aplicación web SPA para la digitalización de registros clínicos, administrativos y documentales de **ELEAM** (Establecimientos de Larga Estadía para Adultos Mayores) en Chile. Diseñada para apoyar la gestión diaria del personal y facilitar la preparación para fiscalizaciones de la **SEREMI de Salud** según el **DS 14/2017**.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite 6 |
| Estilos | Tailwind CSS 4 |
| Routing | React Router DOM 7 |
| Backend / Auth | Supabase (PostgreSQL + Auth + Storage) |
| Build | Vite |
| Linting | ESLint 9 |

---

## Comandos de Desarrollo

```bash
npm run dev       # Servidor de desarrollo en localhost:5173
npm run build     # Build de producción en /dist
npm run lint      # Análisis de código con ESLint
npm run preview   # Preview del build de producción
```

---

## Configuración de Variables de Entorno

Copiar `.env.example` a `.env` y rellenar con las credenciales del proyecto Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Las variables con prefijo `VITE_` son expuestas al cliente (comportamiento estándar de Vite). Las anon keys de Supabase son seguras para exponer en el cliente porque la seguridad se gestiona con Row Level Security (RLS).

---

## Estructura del Proyecto

```
src/
├── components/
│   ├── Button.jsx           # Botón base con type="button" por defecto
│   ├── ErrorBoundary.jsx    # Class component; muestra stack trace solo en DEV
│   ├── Input.jsx            # Input que propaga todos los props
│   ├── Loading.jsx          # Spinner inline con prop message
│   ├── Modal.jsx            # Modal accesible: Escape, backdrop, role="dialog"
│   ├── Navbar.jsx           # Nav sin prop isLoggedIn; lee useAuth() directamente
│   ├── ProtectedRoute.jsx   # Redirige a /login si no hay sesión o pago activo
│   ├── SuperAdminRoute.jsx  # Redirige a /dashboard si rol !== 'superadmin'
│   └── Toast.jsx            # ToastProvider + useToast() hook
├── context/
│   └── AuthContext.jsx      # useAuth() + useLoading(); escucha onAuthStateChange
├── features/
│   ├── accreditation/
│   │   ├── AccreditationDashboard.jsx  # Progreso global + lista de categorías
│   │   ├── AccreditationCategory.jsx   # Documentos por categoría + signed URLs
│   │   ├── AccreditationUpload.jsx     # Subida con validación MIME + tamaño
│   │   └── accreditationService.js     # CRUD + sanitizeFilename + getSignedUrl
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx                # Valida email con validateEmail()
│   │   ├── authService.js              # login(), register(), logout()
│   │   └── useAuth.js                  # Re-exporta useAuth desde AuthContext
│   ├── dashboard/
│   │   ├── AdminDashboard.jsx          # Stats + follow-ups + docs por vencer
│   │   └── dashboardService.js         # loadDashboard() con Promise.allSettled
│   ├── landing/
│   │   └── LandingPage.jsx
│   ├── observations/
│   │   ├── ObservationForm.jsx         # 12 tipos; usa useToast
│   │   ├── ObservationList.jsx         # Filtros: residente, tipo, fecha, seguimiento
│   │   └── observationsService.js      # getObservations({ desde, hasta, tipo, soloSeguimiento })
│   ├── residents/
│   │   ├── ResidentDetails.jsx         # Tabs lazy: info, signos (5 recientes), observaciones (5 recientes)
│   │   ├── ResidentForm.jsx            # Campos: escala_katz, fecha_egreso, motivo_egreso
│   │   ├── ResidentList.jsx            # Búsqueda + filtro estado; useCallback
│   │   └── residentService.js
│   ├── superadmin/
│   │   ├── SuperAdminDashboard.jsx     # Métricas, tabla ELEAMs, pagos, modales edición/pago
│   │   └── superadminService.js        # getMetrics, getAllEleams, updateEleam, registerPayment
│   └── vitalSigns/
│       ├── VitalSignsForm.jsx          # Todos los parámetros clínicos; useToast
│       ├── VitalSignsList.jsx          # Tabla + filtros fecha desde/hasta + residente
│       └── vitalSignsService.js        # getVitalSigns({ desde, hasta, limit })
├── routes/
│   └── AppRouter.jsx                   # Rutas con ProtectedRoute + /superadmin con SuperAdminRoute
├── services/
│   └── supabaseConfig.js               # Cliente Supabase singleton; null si faltan env vars
└── utils/
    ├── constants.js
    ├── dateUtils.js
    └── validators.js                   # validateEmail, validateRut, isValidUUID, validatePhone
```

---

## Base de Datos (Supabase / PostgreSQL)

El schema completo está en `supabase_schema.sql`. Ejecutarlo en **Supabase Dashboard → SQL Editor**.

### Tablas

#### `profiles`
Extiende `auth.users`. Se crea automáticamente vía trigger `on_auth_user_created`.
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid (FK → auth.users) | PK |
| nombre | text | Nombre del usuario |
| email | text | Correo |
| rol | text | `admin_eleam`, `funcionario`, `superadmin` |
| creado_en | timestamptz | Fecha de creación |

#### `residentes`
Ficha maestra de cada residente del ELEAM.
| Columna | Descripción |
|---------|-------------|
| id | UUID PK |
| nombre, apellido | Nombre completo |
| rut | RUT chileno (único, opcional) |
| fecha_nacimiento, sexo, estado_civil | Datos personales |
| diagnostico_principal | Diagnóstico base |
| alergias | `text[]` — array de alergias |
| indice_barthel | Entero 0-100 |
| nivel_dependencia | leve/moderado/severo/total |
| fecha_ingreso, fecha_egreso | Fechas de estadía |
| estado | activo/hospitalizado/egresado/fallecido |
| habitacion, cama | Ubicación física |

#### `signos_vitales`
Registro diario por turno de signos vitales.
| Columna | Descripción |
|---------|-------------|
| residente_id | FK → residentes |
| fecha_hora | Timestamp del registro |
| turno | mañana/tarde/noche |
| presion_sistolica, presion_diastolica | mmHg (check 50–300 / 30–200) |
| frecuencia_cardiaca | lpm (check 20–300) |
| frecuencia_respiratoria | rpm (check 5–60) |
| temperatura | °C (check 30–45) |
| saturacion_oxigeno | % (check 0–100) |
| glucosa | mg/dL |
| peso | kg |
| dolor_escala | 0-10 |
| estado_conciencia | alerta/somnoliento/estuporoso/coma |

#### `observaciones_diarias`
Notas de turno, incidentes, procedimientos.
| Columna | Descripción |
|---------|-------------|
| residente_id | FK → residentes |
| turno | mañana/tarde/noche |
| tipo | observacion_general, caida, incidente, curacion, visita_medica, administracion_medicamento, cambio_posicion, higiene, alimentacion, eliminacion, actividad, otro |
| descripcion | Texto libre obligatorio |
| acciones_tomadas | Texto libre |
| requiere_seguimiento | Boolean |

#### `categorias_acreditacion`
10 categorías fijas según DS 14/2017. Se insertan vía SQL seed con `ON CONFLICT DO UPDATE`.

#### `documentos_acreditacion`
Documentos subidos para cada categoría de acreditación.
| Columna | Descripción |
|---------|-------------|
| categoria_id | FK → categorias_acreditacion |
| nombre | Nombre descriptivo del documento |
| storage_path | Ruta relativa en Supabase Storage (NO URL pública) |
| estado | pendiente/subido/aprobado/rechazado/vencido |
| fecha_vencimiento | Para certificados con vencimiento |

> **Nota**: se guarda `storage_path` (ej. `acreditacion/uuid/timestamp_archivo.pdf`), no una URL. La URL firmada se genera en el cliente con `getSignedUrl()` cuando el usuario quiere ver el archivo.

---

## Categorías de Acreditación SEREMI (DS 14/2017)

| Código | Categoría |
|--------|-----------|
| CAT-01 | Autorización de Funcionamiento |
| CAT-02 | Planta Física e Infraestructura |
| CAT-03 | Recursos Humanos |
| CAT-04 | Fichas Clínicas y Registros Médicos |
| CAT-05 | Medicamentos y Farmacia |
| CAT-06 | Alimentación y Nutrición |
| CAT-07 | Prevención y Control de Infecciones (PCI) |
| CAT-08 | Seguridad y Plan de Emergencias |
| CAT-09 | Registros de Atención Diaria |
| CAT-10 | Actividades y Rehabilitación |

Cada categoría tiene `documentos_requeridos` (array JSON) que se muestra como checklist en `AccreditationCategory.jsx`.

---

## Rutas de la Aplicación

| Ruta | Componente | Auth |
|------|-----------|------|
| `/` | LandingPage | Pública |
| `/login` | Login | Pública |
| `/register` | Register | Pública |
| `/dashboard` | AdminDashboard | ✓ |
| `/residents` | ResidentList | ✓ |
| `/residents/new` | ResidentForm | ✓ |
| `/residents/:id` | ResidentDetails | ✓ |
| `/residents/:id/edit` | ResidentForm | ✓ |
| `/vital-signs` | VitalSignsList | ✓ |
| `/vital-signs/new` | VitalSignsForm | ✓ |
| `/observations` | ObservationList | ✓ |
| `/observations/new` | ObservationForm | ✓ |
| `/accreditation` | AccreditationDashboard | ✓ |
| `/accreditation/category/:id` | AccreditationCategory | ✓ |
| `/accreditation/upload` | AccreditationUpload | ✓ |

Query params soportados:
- `/vital-signs/new?residenteId=UUID` — preselecciona residente
- `/observations/new?residenteId=UUID` — preselecciona residente
- `/accreditation/upload?categoriaId=UUID` — preselecciona categoría

---

## Autenticación

Supabase Auth con email/password. El flujo:

1. `register()` → `supabase.auth.signUp()` + upsert en `profiles`
2. Trigger de Supabase crea el perfil automáticamente (fallback)
3. `login()` → `supabase.auth.signInWithPassword()`
4. `AuthContext` escucha `onAuthStateChange` y expone `user`, `profile`, `authLoading`
5. `ProtectedRoute` redirige a `/login` si no hay sesión

---

## Supabase Storage

**Buckets:**
- `documentos-acreditacion` — Archivos de acreditación (privado, 10 MB máx.)
- `residentes-archivos` — Archivos de residentes (privado)

**Tipos MIME permitidos en `documentos-acreditacion`:**
`application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Los archivos se almacenan en: `acreditacion/{eleamId}/{categoriaId}/{timestamp}_{nombre_sanitizado}`

**Acceso a archivos:** se genera una URL firmada de 1 hora con `supabase.storage.from('documentos-acreditacion').createSignedUrl(path, 3600)`. Las URLs cacheadas en el estado local expiran; se regeneran al hacer clic en "Ver".

---

## Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Patrón usado:

```sql
-- Correcto (evita cache de role stale):
(select auth.uid()) is not null

-- Evitado (patrón antiguo/deprecated):
auth.role() = 'authenticated'
```

### Modelo multi-tenant

Cada ELEAM es un tenant independiente. El aislamiento funciona así:

1. `profiles.eleam_id` vincula cada usuario a su ELEAM.
2. Las tablas de datos (`residentes`, `documentos_acreditacion`) tienen columna `eleam_id`.
3. Las tablas derivadas (`signos_vitales`, `observaciones_diarias`) se aislan via JOIN con `residentes.eleam_id`.
4. RLS verifica el `eleam_id` del perfil del usuario autenticado en cada operación.

```sql
-- Patrón RLS para tabla con eleam_id directo:
(select eleam_id from public.profiles where id = (select auth.uid())) = eleam_id

-- Patrón RLS para tabla con FK a residentes:
residente_id in (
  select id from public.residentes
  where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
)
```

### Patrón getMyContext() / getMyEleamId()

Los servicios que insertan datos obtienen el `eleam_id` del perfil en el servidor, no confían en ningún parámetro enviado por el cliente:

```js
// accreditationService.js
async function getMyContext() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("eleam_id").eq("id", user.id).single();
  return { userId: user.id, eleamId: data.eleam_id };
}
```

Esto garantiza que aunque el cliente envíe un `eleam_id` malicioso, el INSERT siempre usa el del perfil.

### Políticas implementadas

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | propio perfil **o** superadmin | propio | propio | — |
| eleams | propio ELEAM **o** superadmin | autenticado **o** superadmin | admin_eleam **o** superadmin | — |
| residentes | mismo eleam_id **o** superadmin | mismo eleam_id | mismo eleam_id | mismo eleam_id |
| signos_vitales | residente del ELEAM | residente del ELEAM | residente del ELEAM | residente del ELEAM |
| observaciones_diarias | residente del ELEAM | residente del ELEAM | residente del ELEAM | residente del ELEAM |
| categorias_acreditacion | autenticado | — | — | — |
| documentos_acreditacion | mismo eleam_id | mismo eleam_id | mismo eleam_id | mismo eleam_id |
| pagos | mismo eleam_id (solo SELECT) **o** superadmin (todo) | superadmin | superadmin | superadmin |

**Storage policies** (scoped a `bucket_id = 'documentos-acreditacion'`):
- SELECT / INSERT / DELETE: path scoped por `eleam_id` (`split_part(name, '/', 2)`)

**Storage path**: `acreditacion/{eleamId}/{categoriaId}/{timestamp}_{filename}` — el `eleamId` en el path asegura aislamiento físico adicional en Storage.

### Función `is_superadmin()`

```sql
create or replace function public.is_superadmin()
  returns boolean language sql stable security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol = 'superadmin'
  );
$$;
```

Todas las políticas de superadmin llaman a esta función en lugar de hardcodear la condición, lo que permite futuros cambios de rol sin tocar cada política.

---

## Seguridad — Decisiones Clave

### Sanitización de nombres de archivo
`accreditationService.js` → `sanitizeFilename()`: elimina `..`, `/`, `\` y caracteres especiales para prevenir path traversal en Storage. Whitelist de extensiones: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `jpg`, `jpeg`, `png`.

### Validación de archivos en el cliente
`AccreditationUpload.jsx` → `validateFile()`: comprueba MIME type (whitelist) y tamaño (≤ 10 MB) antes de hacer el upload. El check se aplica tanto al input como al drag-and-drop.

### Validación de UUID en parámetros de ruta y query
Todos los componentes que reciben IDs desde la URL (`:id` params o `?residenteId=`) los validan con `isValidUUID()` antes de usarlos. Si el UUID es inválido: redirigen al listado o muestran error, sin hacer queries a la DB.

Archivos con validación: `ResidentDetails.jsx`, `ResidentForm.jsx`, `VitalSignsForm.jsx`, `ObservationForm.jsx`, `AccreditationUpload.jsx`, `residentService.js`.

### Sin URLs públicas de Storage
Se usa `storage_path` (ruta relativa) en la base de datos, no una URL pública. `getSignedUrl()` genera URLs temporales de 1 hora.

### ErrorBoundary seguro
`ErrorBoundary.jsx` muestra el stack trace del error solo si `import.meta.env.DEV` es `true`. En producción muestra únicamente un mensaje genérico.

### Headers de seguridad (Vite dev)
`vite.config.js` inyecta: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=()`.

### Modal accesible
`Modal.jsx` implementa: `role="dialog"`, `aria-modal="true"`, cierre con tecla Escape, cierre al hacer clic en el backdrop, `aria-label="Cerrar"` en el botón X, y `z-index: 50` para superposición correcta.

---

## Componentes Compartidos

### `Toast.jsx`
- `<ToastProvider>` envuelve toda la app en `main.jsx`
- `useToast()` devuelve una función `toast(message, type)` donde `type` es `success | error | warning | info`
- Auto-dismiss a los 4 segundos; también dismissible manualmente
- `aria-live="polite"` para accesibilidad

### `ErrorBoundary.jsx`
- Class component que captura errores no manejados en el árbol de React
- Botón "Recargar página" para recovery
- Stack trace visible solo en desarrollo

### `Loading.jsx`
- Spinner inline con prop `message` (default: `"Cargando..."`)
- No es full-screen; se inserta en el flujo del documento

### `Button.jsx`
- `type="button"` por defecto (evita submit accidental en formularios)
- Propaga `disabled`, `className` y `...rest`

---

## Validadores (`utils/validators.js`)

### `validateEmail(email)`
Regex estricto: requiere `@`, dominio y TLD de al menos 2 caracteres. Usado en `Register.jsx` antes de enviar a Supabase. Maneja `null`/`undefined` sin lanzar excepción.

### `isValidUUID(str)`
Valida formato UUID v4 (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`). Usado en todos los componentes que reciben IDs desde URL params y en `residentService.js` antes de queries a la DB.

### `validateRut(rut)`
Valida RUT chileno con algoritmo módulo-11. Acepta formatos `12345678-9`, `12.345.678-9` o sin formato. Retorna `true` si el RUT está vacío (campo opcional).

### `formatRut(rut)`
Formatea un RUT al estilo `XX.XXX.XXX-X`.

### `validatePhone(phone)`
Valida número de teléfono chileno. Acepta `+56912345678`, `912345678` o formatos internacionales de 9-12 dígitos. Retorna `true` si está vacío (campo opcional).

---

## Configuración Inicial de Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `supabase_schema.sql`
3. Verificar en **Storage** que el bucket `documentos-acreditacion` fue creado
4. Ir a **Project Settings → API** y copiar `Project URL` y `anon public` key
5. Crear `.env` con esas credenciales (ver `.env.example`)

---

## Superadmin — Gestión del Negocio

Rol `superadmin` reservado para el dueño/operador de la plataforma FichaEleam.

### Ruta y acceso

- Ruta: `/superadmin`
- Guard: `SuperAdminRoute` (`src/components/SuperAdminRoute.jsx`) — redirige a `/dashboard` si `profile.rol !== 'superadmin'`
- Aparece en el Navbar solo cuando `profile.rol === 'superadmin'`

### Cómo crear el primer superadmin

```sql
-- Ejecutar en Supabase SQL Editor después de registrar la cuenta:
UPDATE public.profiles
SET rol = 'superadmin'
WHERE email = 'operador@fichaeleam.cl';
```

El superadmin no necesita `eleam_id`. `pagoActivo` siempre es `true` para este rol.

### Funcionalidades del panel

| Sección | Descripción |
|---------|-------------|
| Métricas del negocio | ELEAMs totales, activos, demos, nuevos este mes, residentes, ingresos del mes (CLP) |
| Tabla de ELEAMs | Listado completo con búsqueda por nombre/email, plan, estado, vencimiento |
| Editar ELEAM | Activar/desactivar suscripción, cambiar plan, límite de residentes, fecha de vencimiento, notas internas |
| Registrar Pago | Asociar pago a ELEAM (monto, plan, método) — activa suscripción automáticamente |
| Historial de pagos | Últimos 20 pagos con ELEAM, monto, plan y estado |

### Tabla `pagos`

Registro manual de pagos. No es una integración con pasarela (eso es trabajo futuro).

```sql
pagos (
  eleam_id uuid,      -- FK a eleams
  monto integer,      -- CLP, > 0
  plan text,          -- 'mensual' | 'anual'
  fecha_inicio date,
  fecha_fin date,
  metodo_pago text,   -- texto libre
  estado text,        -- 'pendiente' | 'completado' | 'fallido' | 'reembolsado'
  registrado_por uuid -- FK a auth.users (superadmin que registró)
)
```

### Seguridad del superadmin

- Las políticas RLS llaman a `public.is_superadmin()` (función `security definer`)
- El superadmin no puede modificar RLS ni el schema (eso requiere service role en el servidor)
- Los datos de un ELEAM (signos, observaciones) NO son accesibles al superadmin a menos que se agreguen políticas explícitas — actualmente solo accede a `eleams`, `profiles`, `residentes` (solo conteo) y `pagos`

---

## Posibles Mejoras Futuras

- Integración con pasarela de pago (Transbank / Stripe) para activación automática de suscripciones
- Envío de email de bienvenida y recordatorio de vencimiento al admin del ELEAM
- Dashboard de analytics: gráficos de crecimiento de ELEAMs, MRR histórico, churn
- Exportación PDF de fichas clínicas y listas de signos vitales
- Módulo de medicamentos con kardex digital
- Notificaciones push de documentos próximos a vencer
- Módulo de agenda / citas médicas
- Confirmación de email al registrarse
