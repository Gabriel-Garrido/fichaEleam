# FichaEleam — Documentación Técnica

## Propósito

Aplicación web SPA para digitalización de registros clínicos, administrativos y documentales de **ELEAM** (Establecimientos de Larga Estadía para Adultos Mayores) en Chile. Incluye suscripción vía MercadoPago, carpeta SEREMI (acreditación v9), blog público y panel CRM para operador.

---

## Stack Tecnológico

- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + React Router 7
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Tooling**: ESLint 9, Vite

**Comandos**:
```bash
npm run dev       # localhost:5173
npm run build     # /dist
npm run lint      # ESLint
npm run preview   # preview del build
```

**Env**: Copiar `.env.example` → `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## Estructura del Proyecto

```
src/
├── components/
│   ├── Navbar.jsx              # Nav responsivo; oculta items según rol/pago
│   ├── ProtectedRoute.jsx      # Guard: sesión, pago activo, rol, cambio de clave
│   ├── SuperAdminRoute.jsx     # Guard: solo superadmin
│   ├── Button.jsx, Input.jsx   # Base UI consistente
│   ├── Modal.jsx               # Accesible: Escape, backdrop, role=dialog
│   ├── Toast.jsx, Loading.jsx  # Notificaciones y spinners
│   ├── ErrorBoundary.jsx       # Stack trace solo en DEV
│   └── SupabaseError.jsx       # Manejo de error de conexión
├── context/
│   └── AuthContext.jsx         # useAuth() + useLoading()
├── features/
│   ├── auth/                   # Login, Register, RecuperarAcceso, ResetPassword, authService
│   ├── landing/                # LandingPage (CTA demo, sin auto-registro público)
│   ├── blog/                   # PublicBlogList, PublicBlogPost, blogService
│   ├── dashboard/              # AdminDashboard + summaries clínicas
│   ├── residents/              # CRUD residentes + detalles
│   ├── vitalSigns/             # Formulario + lista + rangos clínicos
│   ├── observations/           # 12 tipos de observaciones diarias
│   ├── accreditation/          # Modelo v9: ámbitos, requisitos, evidencias, observaciones, auditoría
│   ├── payment/                # PaymentPage, PaymentReturn (MercadoPago)
│   ├── team/                   # TeamManagement (crear funcionarios/familiares) + ChangePasswordPage
│   ├── familiar/               # Portal restringido + registro de visitas
│   ├── demo/                   # DemoSelector, DemoPage (admin/funcionario), FamiliarDemoPage
│   ├── superadmin/             # Dashboard CRM + blog editor + gestión de pagos + LeadsPanel
│   │   └── blog/               # BlogManagement, BlogEditor (solo para superadmin)
│   └── utils/                  # Markdown renderer, customer health, etc.
├── routes/
│   └── AppRouter.jsx           # Rutas con guards
├── services/
│   └── supabaseConfig.js       # Cliente Supabase singleton
└── utils/
    ├── constants.js
    ├── dateUtils.js
    ├── validators.js           # Email, UUID, RUT, phone
    └── seo.js                  # Hook useSEO + JSON-LD builders

supabase/functions/
├── _shared/
│   └── email.ts                # Resend API helper; sendEmail(), staffWelcomeEmail(), demoWelcomeEmail()
├── create-demo-user/           # Crea usuario real cuando superadmin aprueba demo lead
├── create-staff-user/          # Crea funcionario/familiar con contraseña temporal
├── invite-funcionario/         # Flujo antiguo (invitación por email con token)
├── mp-create-subscription/
├── mp-webhook/
└── mp-cancel-subscription/
```

---

## Autenticación y Autorización

### Roles

| Rol | Quién | Paga | Ruta home |
|-----|-------|------|-----------|
| `superadmin` | Operador de la plataforma | n/a | `/superadmin` (sin ELEAM) o `/dashboard` (demo) |
| `admin_eleam` | Dueño del ELEAM | ✓ | `/pago?sinAcceso=1` (sin pago) o `/dashboard` |
| `funcionario` | Personal clínico del ELEAM | ✗ | `/dashboard` |
| `familiar` | Familiar de residente | ✗ | `/familiar` |

### Flujos de acceso

**No existe auto-registro público.** La landing solo muestra "Iniciar sesión" y CTA de demo. Los nuevos admins entran vía el flujo de aprobación de demo:

1. **Demo → Admin**: Prospecto llena formulario en landing → row en `demo_leads` → superadmin aprueba desde `/superadmin` → Edge Function `create-demo-user` crea cuenta `admin_eleam` con contraseña temporal → email con credenciales (vía Resend) + superadmin ve las credenciales en modal UI.
2. **Funcionario/Familiar creado por admin**: Admin crea staff desde `/equipo` → Edge Function `create-staff-user` crea cuenta con contraseña temporal + envía email de bienvenida.
3. **Primer acceso (cualquier rol)**: Si `must_reset_password=true`, `ProtectedRoute` fuerza redirect a `/cambiar-clave`. Allí puede establecer nueva contraseña o, si tiene Gmail, vincular Google con `supabase.auth.linkIdentity` (no crea cuenta duplicada).
4. **Recuperación de contraseña**: `/recuperar-acceso` → `supabase.auth.resetPasswordForEmail` → email con link → `/reset-password` → nueva contraseña vía `supabase.auth.updateUser`.
5. **Google OAuth**: `supabase.auth.signInWithOAuth` en login normal; `supabase.auth.linkIdentity` cuando se quiere vincular desde `/cambiar-clave` (evita cuentas duplicadas).
6. **Registro por invitación (legado)**: `/register?invite=TOKEN&email=EMAIL` — sigue funcionando para compatibilidad. Sin token de invitación, la página muestra pantalla de bloqueo.

### useAuth() — Propiedades

```javascript
{
  user,                    // auth.users
  profile,                 // profiles + eleams (FK) + planes (FK)
  eleam,                   // ELEAM data si aplica
  plan,                    // Plan activo
  pagoActivo,             // bool: superadmin=true, staff=subscripción activa o en gracia
  rol, isAdminEleam, isFuncionario, isFamiliar, isSuperadmin, isStaff, // Helpers
  homePath,               // Ruta inicial según rol+pago
  permisos,               // null (admin/superadmin/familiar) o {perm: bool} (funcionario)
  can(permiso),           // Verifica permiso granular (admin/superadmin siempre true)
  mustResetPassword,      // Requiere cambio de clave (primer acceso)
  profileLoading, authLoading, authNotice, supabaseError,
  refetchProfile(),        // Reload del contexto
}
```

### ProtectedRoute

```jsx
<ProtectedRoute>...</ProtectedRoute>                  // sesión + pago activo
<ProtectedRoute requireActive={false}>...</ProtectedRoute>  // sin pago ok (familiar, cambio clave)
<ProtectedRoute allowedRoles={["admin_eleam"]}>...</ProtectedRoute>  // Restricción de rol
```

Redirige a `homePath` si no cumple; bloquea acceso a `/cambiar-clave` hasta completar.

---

## Rutas

| Ruta | Componente | Guard | Notas |
|------|-----------|-------|-------|
| `/` | LandingPage | — | Público; CTA de demo, sin auto-registro |
| `/login` | Login | — | Público; redirige si ya autenticado |
| `/register` | Register | — | Solo con `?invite=TOKEN`; sin token muestra pantalla de bloqueo |
| `/recuperar-acceso` | RecuperarAcceso | — | Solicita email para reset de contraseña |
| `/reset-password` | ResetPassword | — | Procesa callback de Supabase; timeout 8s para links expirados |
| `/demo` | DemoSelector | — | Selector: Admin / Funcionario / Familiar |
| `/demo/admin`, `/demo/funcionario`, `/demo/familiar` | Demo* | — | Demo offline con localStorage |
| `/pago` | PaymentPage | `requireActive=false` | Planes MercadoPago |
| `/pago/return` | PaymentReturn | — | Post-checkout; polling |
| `/blog` | PublicBlogList | — | Blog público |
| `/blog/:slug` | PublicBlogPost | — | Post público |
| `/cambiar-clave` | ChangePasswordPage | `requireActive=false` | Forzado si `mustResetPassword=true`; opción Google para Gmail |
| `/dashboard` | AdminDashboard | `allowedRoles=[admin_eleam, funcionario]` | Índice operativo |
| `/residents`, `/residents/new`, `/residents/:id`, `/residents/:id/edit` | Resident* | STAFF | CRUD residentes |
| `/vital-signs`, `/vital-signs/new` | VitalSigns* | STAFF | CRUD + rangos visuales |
| `/observations`, `/observations/new` | Observation* | STAFF | 12 tipos de observaciones |
| `/accreditation` | AccreditationDashboard | STAFF | Resumen global: cumplimiento, alertas, ámbitos |
| `/accreditation/ambito/:codigo` | AccreditationAmbito | STAFF | Lista requisitos filtrable por estado |
| `/accreditation/requisito/:id` | AccreditationRequisito | STAFF | Detalle: evidencias, observaciones, auditoría, cambio de estado |
| `/accreditation/observaciones` | AccreditationObservaciones | STAFF | Observaciones internas/fiscalización |
| `/accreditation/carpeta` | AccreditationCarpeta | STAFF | Export imprimible (Ctrl+P) |
| `/equipo` | TeamManagement | `allowedRoles=[admin_eleam]` | Crear funcionarios/familiares con contraseña temporal |
| `/familiar` | FamiliarPortal | `allowedRoles=[familiar]` | Residente asignado + últimos signos + observaciones |
| `/familiar/visitas` | FamiliarVisitas | `allowedRoles=[familiar]` | Historial + registro de visitas |
| `/superadmin` | SuperAdminDashboard | SuperAdminRoute | CRM: métricas, tabla ELEAMs, leads, edición, pagos |
| `/superadmin/blog` | BlogManagement | SuperAdminRoute | Lista de posts |
| `/superadmin/blog/new`, `/superadmin/blog/:id/edit` | BlogEditor | SuperAdminRoute | Editor de posts |
| `*` | Fallback | — | Redirige a `homePath` |

**Query params**:
- `/vital-signs/new?residenteId=UUID` — preselecciona residente
- `/observations/new?residenteId=UUID` — preselecciona residente

---

## Base de Datos

21 tablas en Supabase. Ver `supabase_schema.sql` para SQL completo.

### Tablas principales

#### `profiles` (usuarios)
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid FK auth.users | PK |
| nombre, email | text | |
| rol | text (enum 4) | admin_eleam, funcionario, familiar, superadmin |
| eleam_id | uuid FK eleams | null para superadmin operador |
| must_reset_password | bool | Trigger fuerza cambio en primer acceso |
| creado_en | timestamptz | |

#### `eleams` (tenants)
| Columna | Tipo | Notas |
|---------|------|-------|
| id, nombre, email_admin | uuid, text | PK, contacto |
| rut_empresa, telefono | text | |
| plan_id | uuid FK planes | Planificación actual |
| subscription_status | text (enum 7) | inactivo, pendiente, activo, en_gracia, pausado, cancelado, vencido |
| pago_activo | bool | Derivado de status + vencimiento (sync_pago_activo trigger) |
| mp_preapproval_id, mp_payer_email | text | MercadoPago preapproval |
| fecha_vencimiento_suscripcion, proximo_cobro_en | timestamptz | Lifecycle |
| max_residentes, max_funcionarios | int | Límites del plan |
| crm_estado | text (enum 9) | lead ... cliente_riesgo; gestión comercial |
| origen_lead, ultimo_contacto, proxima_accion_fecha | text, timestamptz, date | Trazabilidad CRM |
| responsable_comercial | uuid FK profiles | Gerente asignado |
| riesgo_churn | text (enum 4) | bajo, medio, alto, desconocido |
| notas_admin | text | Internas (no expuestas a admin_eleam) |
| creado_en | timestamptz | |

#### `residentes` (fichas de pacientes)
| Columna | Tipo | Notas |
|---------|------|-------|
| id, eleam_id | uuid | PK, FK eleams |
| nombre, apellido, rut | text | |
| fecha_nacimiento, sexo, estado_civil | date, text | |
| diagnostico_principal, alergias | text, text[] | |
| indice_barthel, nivel_dependencia | int, text | 0-100; leve/moderado/severo/total |
| fecha_ingreso, fecha_egreso, motivo_egreso | date, date, text | Ciclo de vida |
| estado | text (enum 4) | activo, hospitalizado, egresado, fallecido |
| habitacion, cama | text | Ubicación |
| creado_en | timestamptz | |

#### `signos_vitales`
| Columna | Tipo | Notas |
|---------|------|-------|
| id, residente_id | uuid | PK, FK residentes |
| fecha_hora, turno | timestamptz, text | mañana/tarde/noche |
| presion_sistolica, presion_diastolica | int (50-300, 30-200) | mmHg; checks en DB |
| frecuencia_cardiaca, frecuencia_respiratoria | int | lpm, rpm |
| temperatura, saturacion_oxigeno | numeric, int | °C (30-45), % (0-100) |
| glucosa, peso, dolor_escala | int, numeric, int (0-10) | Variados |
| estado_conciencia | text | alerta, somnoliento, estuporoso, coma |
| creado_en | timestamptz | |

#### `observaciones_diarias`
| Columna | Tipo | Notas |
|---------|------|-------|
| id, residente_id | uuid | PK, FK residentes |
| turno, tipo | text | mañana/tarde/noche; 12 tipos |
| descripcion, acciones_tomadas | text | Obligatorio + opcional |
| requiere_seguimiento | bool | |
| creado_en | timestamptz | |

#### Tablas de acreditación (modelo v9)

**`acred_ambitos`** — 14 ámbitos fijos DS 14/2017 (A01-A14)

**`acred_requisitos`** — Catálogo maestro (~70 requisitos): medio verificador, vigencia sugerida, codelength

**`acred_requisitos_eleam`** — Estado por ELEAM/requisito: `pendiente | cumple | no_cumple | no_aplica | vencido | observado`

**`acred_documentos`** — Evidencias versionadas (vigente=true/false, reemplazado_por_id, reemplazado_en). Storage path: `acreditacion/{eleamId}/req/{requisitoEleamId}/{ts}_v{n}_{filename}`. RLS scoped por eleam_id.

**`acred_observaciones`** — Internas o de fiscalización: `abierta | en_proceso | cerrada`. Con `acciones_subsanacion`, `fecha_compromiso`, `responsable_id`, `autor_cierre`.

**`acred_audit`** — Inmutable: acción (create, update, replace, archive, close), timestamp, usuario, tabla, ID, cambios.

#### Tablas de suscripción

**`planes`** — Catálogo: código, precio_clp, max_residentes, max_funcionarios, frequency, frequency_type, orden, destacado.

**`pagos`** — Registro manual: eleam_id, monto (CLP), plan, fecha_inicio, fecha_fin, metodo_pago, estado (pendiente, completado, fallido, reembolsado), registrado_por, mp_*.

**`mp_webhook_events`** — Auditoría de webhooks MercadoPago: mp_request_id (idempotencia), event_type, body, procesado_en.

#### Tablas de equipo

**`funcionario_invitaciones`** — Token + email + rol + residente_id (para familiar) + expiración (7 días).

**`familiar_residentes`** — PK (profile_id, residente_id): parentesco, creado_por, creado_en.

**`funcionario_permisos`** — Permisos granulares por funcionario. Columnas dinámicas: `crear_residente`, `editar_residente`, `eliminar_residente`, `crear_signos`, `eliminar_signos`, `crear_observacion`, `eliminar_observacion`, `subir_acreditacion`, `archivar_acreditacion`, etc. (todas bool).

**`visitas_familiar`** — Registro de visitas: residente_id, profile_id, fecha_hora, duracion_min, notas, registrado_por.

#### Tablas de blog y CRM

**`blog_posts`** — Slug único, titulo, resumen, contenido_md, cover_url, cover_alt, meta_title, meta_description, keywords[], estado (borrador|publicado|archivado), publicado_en, destacado, autor_nombre, tiempo_lectura_min, views.

**`crm_tasks`** — titulo, descripcion, tipo, estado, prioridad, fecha_vencimiento, creado_por, completado_por, eleam_id.

**`crm_interactions`** — tipo, canal, resumen, resultado, proxima_accion, creado_por, eleam_id, fecha.

**`demo_leads`** — Leads del formulario de landing: nombre, email, telefono, nombre_eleam, num_residentes, mensaje, estado (nuevo|contactado|demo_activo|convertido|descartado), demo_token (flujo legado), demo_user_id (uuid FK auth.users; vincula al usuario real cuando superadmin aprueba demo), demo_expires_at, creado_en.

### RLS (Row Level Security)

Todas las tablas usan RLS. Patrones clave:

```sql
-- Tabla con eleam_id directo (documentos, residentes):
(select eleam_id from public.profiles where id = (select auth.uid())) = eleam_id

-- Tabla con FK a residentes (signos, observaciones):
residente_id in (
  select id from public.residentes
  where eleam_id = (select eleam_id from public.profiles where id = (select auth.uid()))
)

-- Superadmin (función is_superadmin()):
public.is_superadmin()
```

Helpers `security definer`: `is_superadmin()`, `my_eleam_id()`, `my_rol()`.

### Storage

**Bucket**: `documentos-acreditacion` (privado, max 10 MB)

**MIME permitidos**: pdf, image/jpeg, image/png, image/webp, word, docx

**RLS**: `split_part(name, '/', 2) = my_eleam_id()`

URLs firmadas TTL 1 hora (se regeneran al click "Ver").

---

## Flujos por Rol

### admin_eleam (Dueño del ELEAM)

1. **Onboarding vía demo**: Prospecto llena formulario en landing → superadmin aprueba en LeadsPanel → Edge Function `create-demo-user` crea cuenta con contraseña temporal → email enviado + credenciales visibles en modal UI. Trigger `handle_new_user` crea el ELEAM automáticamente; suscripción activada con 30 días de prueba.
2. **Primer acceso**: `must_reset_password=true` → forzado a `/cambiar-clave` → establece contraseña personal o vincula Google (si Gmail, usando `linkIdentity`).
3. **Sin pago**: Redirige a `/pago?sinAcceso=1`. Solo ve "Activar ELEAM", "Demo", "Cerrar sesión".
4. **Con pago activo**: `/dashboard` + todas las operaciones clínicas + `/equipo` + `/accreditation`.
5. **Crear funcionarios**: Email + nombre + permisos → Edge Function `create-staff-user` crea cuenta con contraseña temporal + envía email de bienvenida con credenciales.
6. **Crear familiares**: Selecciona residente + email → Mismo flujo; `familiar_residentes` los vincula al residente asignado.

### funcionario (Personal clínico)

- Ruta home: `/dashboard` (sin `/equipo`, sin `/pago`).
- Creado por admin_eleam desde `/equipo`; recibe email con contraseña temporal.
- Primer acceso: forzado a `/cambiar-clave` (mismo flujo que admin).
- Puede: crear/editar residentes, signos, observaciones, acreditación (según `funcionario_permisos`).
- No puede: eliminar datos, administrar equipo, cambiar planes.

### familiar (Acceso de visitante)

- Ruta home: `/familiar`.
- Creado por admin_eleam desde `/equipo`; recibe email con contraseña temporal.
- Primer acceso: forzado a `/cambiar-clave` (mismo flujo).
- Ve: 1 residente asignado, últimos signos vitales (5), observaciones (5), visitas registradas.
- Puede: registrar visitas (duración, notas).
- Acceso: RLS verifica `profile_id` en `familiar_residentes`.

### superadmin (Operador de la plataforma)

- Sin ELEAM: `/superadmin` (CRM puro). Ve todos los ELEAMs, gestión de pagos, leads, blog, métricas.
- Aprobar demo desde LeadsPanel: invoca `create-demo-user`, muestra credenciales en modal.
- Con ELEAM demo: `/dashboard` (muestra la app como cliente de demostración).
- Acceso RLS: Funciones `is_superadmin()` le dan acceso universal.

---

## Rangos Clínicos (Signos Vitales)

`src/features/vitalSigns/vitalRanges.js` centraliza los rangos para adultos mayores. Cuatro estados:
- **normal** (verde): dentro del rango seguro.
- **warning** (ámbar): fuera del rango pero no crítico.
- **critical** (rojo): fuera del rango + riesgo elevado.
- **unknown** (gris): dato inválido o no presente.

Cada parámetro tiene un `*Status(valor)` que devuelve uno de los cuatro. `recordOverallStatus(record)` → peor estado del registro (usado para filtros y pills).

### Tabla de rangos

| Parámetro | Normal | Warning | Crítico |
|-----------|--------|---------|---------|
| Sistólica | 100–139 | 90–99, 140–179 | <90, ≥180 |
| Diastólica | 60–89 | 50–59, 90–109 | <50, ≥110 |
| FC (lpm) | 60–100 | 50–59, 101–120 | <50, >120 |
| FR (rpm) | 12–20 | 10–11, 21–24 | <10, >24 |
| Temperatura | 36–37.7 | 35–35.9, 37.8–38.9 | <35, ≥39 |
| SatO₂ (%) | ≥95 | 90–94 | <90 |
| Glucosa | 70–179 | 60–69, 180–249 | <60, ≥250 |
| Dolor (0–10) | 0–3 | 4–6 | ≥7 |

Componentes: `VitalCard.jsx` (tarjeta individual), `VitalSignsList.jsx` (lista/tabla filtrable), `VitalSignsForm.jsx` (feedback en vivo), `ResidentDetails.jsx` (snapshot + histórico).

---

## Acreditación (Carpeta SEREMI)

Modelo v9 con 14 ámbitos DS 14/2017, requisitos en catálogo maestro, estados, evidencias versionadas, observaciones de auditoría y trazabilidad completa.

### Estados de requisito

- `pendiente`: No gestionado.
- `cumple`: Satisface requisito.
- `no_cumple`: No cumple; requiere subsanación.
- `no_aplica`: No aplicable al ELEAM (motivo en BD).
- `vencido`: Documento expiró.
- `observado`: Fiscalización detectó incumplimiento.

### Evidencias

Versionadas en Storage + BD. Cambio de estado: nueva versión, `reemplazado_por_id` + `reemplazado_en`. Historial completo accesible.

### Observaciones

Internas (admin levanta) o de fiscalización (SEREMI detecta). Flujo: `abierta` → `en_proceso` (con acciones y fecha compromiso) → `cerrada` (por quién y cuándo).

### Componentes

- `AccreditationDashboard.jsx`: KPI global, alertas (vencidos, <30d, observaciones abiertas), grilla de 14 ámbitos con barra de cumplimiento.
- `AccreditationAmbito.jsx`: Lista requisitos filtrable por estado + búsqueda.
- `AccreditationRequisito.jsx`: Detalle 360: evidencias (versiones), observaciones, auditoría, cambio de estado, carga/reemplazo de archivos.
- `AccreditationObservaciones.jsx`: Observaciones globales con filtros.
- `AccreditationCarpeta.jsx`: Export PDF-friendly (Ctrl+P): portada, resumen, cumplimiento por ámbito, observaciones, detalle.

---

## Suscripción (MercadoPago)

### Flujo

1. Admin entra `/pago` → selecciona plan → llamada a Edge Function `mp-create-subscription`.
2. Función retorna `init_point` (URL de checkout MP).
3. Admin redirige a MP → paga → webhook `mp-webhook` actualiza `eleam.subscription_status` = `activo` y `fecha_vencimiento_suscripcion`.
4. Período de gracia: ELEAM cancelado pero todavía pagado → `pago_activo=true` hasta vencimiento.

### Edge Functions (Deno en `supabase/functions/`)

- `mp-create-subscription`: Crea preapproval; solo `admin_eleam` con suscripción inactiva.
- `mp-webhook`: Público; valida HMAC SHA-256; deduplica con `mp_request_id`; actualiza estado.
- `mp-cancel-subscription`: Cancela preapproval; solo `admin_eleam`.
- `invite-funcionario`: Crea invitation token; valida plan y límites (flujo legado).
- `create-staff-user`: Crea funcionario/familiar con contraseña temporal; envía email via Resend (si configurado). Retorna `{ ok, profile_id, email, temp_password, email_sent }`.
- `create-demo-user`: Crea admin_eleam para lead aprobado; activa ELEAM 30 días; envía email de bienvenida. Retorna `{ ok, profile_id, eleam_id, email, temp_password, email_sent }`.

### Email (Resend — opcional)

`supabase/functions/_shared/email.ts` centraliza el envío. Si `RESEND_API_KEY` no está configurado, `sendEmail()` retorna `false` (no-op) y el sistema sigue funcionando — las credenciales se muestran directamente en la UI al superadmin/admin.

### Env vars (server-only, Edge Function secrets)

- `MP_ACCESS_TOKEN` — Bearer MP.
- `MP_WEBHOOK_SECRET` — HMAC secret.
- `PUBLIC_APP_URL` — URL frontend (para back_url, invite links).
- `RESEND_API_KEY` — Opcional; si ausente, emails no se envían pero credenciales se retornan en respuesta.

NUNCA exponer como `VITE_*`.

---

## Demo

### Demo guiado (flujo principal)

Prospecto llena formulario en landing → row en `demo_leads` → superadmin aprueba en LeadsPanel (`/superadmin`) → Edge Function `create-demo-user` crea cuenta `admin_eleam` real con 30 días de prueba → email con credenciales (si Resend configurado) → superadmin ve temp_password en modal → prospecto inicia sesión y completa `/cambiar-clave`.

### Demo offline (exploración libre)

Ruta `/demo` abre selector: Admin / Funcionario / Familiar. Cada demo es **offline** con mock data en `localStorage`.

- **Admin** (`/demo/admin`): CRUD residentes, signos, observaciones, acreditación con upload (simulado).
- **Funcionario** (`/demo/funcionario`): Igual que admin pero sin botón de upload en acreditación.
- **Familiar** (`/demo/familiar`): 1 residente, últimos signos, observaciones recientes, registro de visitas en estado local.

`DemoBanner` permite cambiar perfil o limpiar localStorage.

---

## Blog Público

**Rutas**: `/blog` (lista), `/blog/:slug` (post).

**Editor superadmin**: `/superadmin/blog` (lista), `/superadmin/blog/new` (crear), `/superadmin/blog/:id/edit` (editar).

**SEO**: Meta tags (description, OG, Twitter), JSON-LD (Article, Organization, SoftwareApplication, FAQ, Breadcrumb), `robots.txt` (GPTBot, ClaudeBot, PerplexityBot, etc.), `sitemap.xml`.

**Hook**: `useSEO({title, description, path, image, type, keywords, jsonLd})` inyecta meta tags + JSON-LD sin librerías externas.

---

## CRM Superadmin

Ruta `/superadmin`. Solo operador (rol=superadmin sin ELEAM).

### Funcionalidades

- **Métricas**: ELEAMs totales, activos, demos, nuevos este mes, residentes, MRR (CLP).
- **Tabla de ELEAMs**: Búsqueda, filtro por estado, plan, vencimiento. Edición inline: activar/desactivar, cambiar plan, max_residentes, fecha_vencimiento, notas.
- **Registrar pago**: Monto, plan, método, fecha inicio/fin → RPC transaccional `registrar_pago_y_activar_eleam`.
- **Historial de pagos**: Últimos 20 con ELEAM, monto, plan, estado.
- **Pipeline CRM**: ELEAMs agrupados por `crm_estado` (lead → cliente_riesgo). Draggy de estado (future).
- **Ficha 360 del ELEAM**: Contacto, estado, suscripción, riesgo churn, tareas vencidas, interacciones recientes, salud cliente (healthy/warning/risk).
- **Tareas**: Crear, asignar, marcar completadas, vencimiento, prioridad.
- **Interacciones**: Registro de contactos (call, email, meeting, etc.); proxima acción; audit trail.
- **LeadsPanel**: Tabla de `demo_leads` con estado (nuevo/contactado/demo_activo/convertido/descartado). Botón "Dar acceso" invoca `create-demo-user`; muestra modal con email + contraseña temporal + estado de email enviado. Leads con `demo_token` (flujo legado) no muestran el botón de acceso real.

**Salud del cliente** (`utils/customerHealth.js`): Combina pago, vencimiento, último contacto, riesgo, tareas vencidas, estado CRM → `healthy | warning | risk | unknown`.

---

## Seguridad

### Validación cliente

- **Email**: Regex estricto en `validateEmail()`.
- **UUID**: `isValidUUID()` antes de usarlo en queries; rechazo silencioso de inválidos.
- **RUT**: `validateRut()` con módulo-11; campo opcional → true si vacío.
- **Archivos**: MIME whitelist + tamaño ≤10 MB en `AccreditationUpload.jsx`.
- **Nombres de archivo**: `sanitizeFilename()` → elimina `..`, `/`, `\`, especiales; whitelist de extensiones.

### Validación servidor (RLS)

- **Aislamiento multi-tenant**: `eleam_id` en tablas clínicas; RLS verifica vía `my_eleam_id()`.
- **getMyContext()**: Servicios extraen `eleam_id` del perfil, no del cliente.
- **Superadmin**: Función `is_superadmin()` en todas las RLS; bypass seguro.
- **Storage path scoped**: `acreditacion/{eleamId}/...`; RLS filtra por `split_part(name, '/', 2)`.
- **Permisos granulares**: `funcionario_permisos` con checks en UI + RLS.

### Headers (Vite)

`vite.config.js` inyecta: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=()`.

### ErrorBoundary

Stack trace solo si `import.meta.env.DEV`; producción muestra mensaje genérico.

---

## Permisos Granulares (Funcionario)

Tabla `funcionario_permisos` con columnas bool por acción. Verificación en UI + `can()` desde `useAuth()`.

| Permiso | Nota |
|---------|------|
| `crear_residente`, `editar_residente`, `eliminar_residente` | CRUD residentes |
| `crear_signos`, `eliminar_signos` | Signos vitales |
| `crear_observacion`, `eliminar_observacion` | Observaciones |
| `subir_acreditacion`, `archivar_acreditacion` | Acreditación |
| Otros | Expandibles según necesidad |

Default: Si no hay row en `funcionario_permisos`, `can()` retorna `true` para crear (NO eliminar), `false` para destructivas.

---

## Componentes Compartidos

### Toast
```javascript
const toast = useToast();
toast("Guardado", "success");  // auto-dismiss 4s
```

### Modal
```jsx
<Modal isOpen={open} onClose={handleClose} title="Título">
  {children}
</Modal>
```
Escape cierra; backdrop clickeable; accesible.

### Button, Input
Base consistente. Propagan className + rest para override.

### Loading
```jsx
<Loading message="Cargando..." />
```

---

## Inicialización

1. Crear proyecto en supabase.com.
2. SQL Editor → ejecutar `supabase_schema.sql`.
3. Storage Dashboard → crear bucket `documentos-acreditacion` (privado).
4. Project Settings → API → copiar URL + anon key.
5. `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
6. `npm install && npm run dev`.

**Primer superadmin**: SQL en Supabase SQL Editor:
```sql
update public.profiles set rol = 'superadmin' where email = 'tu-email@gmail.com';
```
(Alternativamente, ejecutar `supabase_schema.sql` con tu email ya será promocionado automáticamente.)

---

## Convenciones

- **Sin comentarios**: Código auto-documentado. Solo WHY si hay restricción/workaround no obvio.
- **Naming**: camelCase (variables, funciones), kebab-case (rutas, archivos), UPPER_CASE (constantes).
- **Imports**: Explícitos. Prefer `import X from...` over `import * as X`.
- **null vs undefined**: null = dato ausente deliberado; undefined = no existe.
- **Componentes**: Functional + hooks. Evitar props drilling: Context para estado compartido.
- **useCallback**: Para callbacks en listas grandes o dependencias externas.
- **Toast + Loading**: Centrales en App. Providers en main.jsx.

---

## Qué Hacer Ahora

1. **Revisar rutas reales** vs documentación — ya están sincronizadas en este archivo.
2. **Permisos granulares de funcionario**: Si necesitas más permisos o cambiar defaults, edita la lógica en `useAuth()` + `funcionario_permisos` tabla.
3. **Acreditación**: Si el modelo v9 requiere cambios (ámbitos, requisitos, estados), edita `supabase_schema.sql` + servicios.
4. **Blog/CRM**: Editable desde UI; no requiere cambios de código.
5. **MercadoPago**: Secrets en Edge Functions; pruebas con TEST token.
6. **SEO**: Valida sitemap + JSON-LD con Google Search Console.

---

## Archivos de Referencia

- `supabase_schema.sql` — Schema completo (21 tablas, RLS, funciones, triggers).
- `src/routes/AppRouter.jsx` — Definición de todas las rutas.
- `src/context/AuthContext.jsx` — useAuth(), helpers, derivados.
- `src/components/ProtectedRoute.jsx` — Guarding de sesión, pago, rol.
- `src/features/vitalSigns/vitalRanges.js` — Rangos clínicos.
