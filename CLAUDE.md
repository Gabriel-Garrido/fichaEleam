# FichaEleam — Documentación Técnica

## Propósito

Aplicación web SPA para digitalización de registros clínicos, administrativos y documentales de **ELEAM** (Establecimientos de Larga Estadía para Adultos Mayores) en Chile. Incluye suscripción vía MercadoPago, carpeta SEREMI (acreditación v9), blog público y panel CRM para operador.

---

## Stack Tecnológico

- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + React Router 7
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Tooling**: ESLint 9, Vite, Supabase CLI local vía `npx supabase`

**Comandos**:
```bash
npm run dev       # localhost:5173
npm run build     # /dist
npm run lint      # ESLint
npm run preview   # preview del build
npx supabase functions deploy  # despliega todas las Edge Functions
```

**Env**: Copiar `.env.example` → `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## Estructura del Proyecto

```
src/
├── components/
│   ├── ProtectedRoute.jsx      # Guard: sesión, pago activo, rol, cambio de clave
│   ├── SuperAdminRoute.jsx     # Guard: solo superadmin
│   ├── Button.jsx, Input.jsx   # Base UI consistente
│   ├── Modal.jsx               # Accesible: Escape, backdrop, role=dialog
│   ├── Toast.jsx, Loading.jsx  # Notificaciones y spinners
│   ├── NavIcon.jsx             # Mapa de SVGs para nav (Heroicons outline). IDs usados en navigationConfig.js
│   ├── HelpTooltip.jsx         # Tooltip de ayuda con ? botón
│   ├── ErrorBoundary.jsx       # Stack trace solo en DEV
│   └── SupabaseError.jsx       # Manejo de error de conexión
├── context/
│   └── AuthContext.jsx         # useAuth() + useLoading()
├── features/
│   ├── auth/                   # Login, Register, RecuperarAcceso, ResetPassword, authService
│   ├── landing/                # LandingPage (calm-inspired, CTA demo, sin auto-registro público); DemoRequestModal, landingAnalytics
│   ├── blog/                   # PublicBlogList, PublicBlogPost, blogService (diseño consistente con landing: nav/footer dark slate-950)
│   ├── dashboard/              # AdminDashboard (rol-aware: admin_eleam muestra gestión, funcionario muestra clínica)
│   ├── residents/              # CRUD residentes + detalles; residentUtils.js exporta ESTADO_CONFIG, ESTADO_BADGE, DEPENDENCIA_TONE, TIPO_LABEL, TIPO_BADGE, initials(), calcAge()
│   ├── vitalSigns/             # Formulario + lista + rangos clínicos
│   ├── observations/           # 12 tipos de observaciones diarias
│   ├── accreditation/          # Modelo v9: ámbitos, requisitos, evidencias, observaciones, auditoría
│   ├── carePlans/              # Plan de cuidado: CarePlanTab (gestión de actividades + horarios), CareTasksPage (ejecución diaria por turno), carePlansService
│   │   └── carePlansService.js # Funciones compartidas: getSessionProfile(), todayIso(), currentTurno(), normalizeSchedule(), previousTurnos()
│   ├── emar/                   # Kardex electrónico: EmarTurnPage (administración por turno), EmarResidentTab (historial por residente), emarService
│   ├── turnos/                 # Entrega de turno: TurnoEntregaPage, TurnoHistoryPage, turnosService; integra datos de eMAR + plan de cuidado + signos + acreditación
│   ├── permissions/            # Gestión de features por ELEAM: featureCatalog.js (12 features), FeaturePermissionsPage (admin)
│   ├── payment/                # PaymentPage, PaymentReturn (MercadoPago)
│   ├── team/                   # TeamManagement (crear funcionarios/familiares), teamConstants.js (PERM_GROUPS, PLANTILLAS_CARGO, DEFAULT_PERMS) + ChangePasswordPage
│   ├── familiar/               # Portal restringido + registro de visitas
│   ├── demo/                   # Demo guiado por token, datos mock y guía interactiva
│   ├── onboarding/             # Sistema de onboarding adaptativo por rol/permisos
│   │   ├── onboardingConfig.js # ROLE_CONFIG por rol + COLOR_CLASSES (Tailwind estático)
│   │   ├── OnboardingContext.jsx  # Provider: estado localStorage, auto-complete, detección nuevos permisos
│   │   ├── OnboardingWelcomeModal.jsx  # Modal primer ingreso con highlights filtrados por permiso
│   │   ├── OnboardingChecklist.jsx    # Widget flotante con progress ring y lista de pasos
│   │   ├── OnboardingBanner.jsx       # Barra contextual en la ruta del paso activo
│   │   └── index.js            # Barrel exports
│   ├── superadmin/             # Dashboard CRM + blog editor + gestión de pagos + LeadsPanel
│   │   └── blog/               # BlogManagement, BlogEditor (solo para superadmin)
│   └── utils/                  # Markdown renderer, customer health, etc.
├── navigation/
│   └── navigationConfig.js     # itemAllowed(): filtra nav por rol, featurePermissions y permisos granulares
├── routes/
│   └── AppRouter.jsx           # Rutas con guards
├── services/
│   └── supabaseConfig.js       # Cliente Supabase singleton
└── utils/
    ├── dateUtils.js            # formatDate(iso), formatDateTime(iso), formatDateOnly(dateStr) — fuente canónica para toda la app
    ├── passwordValidation.js   # validatePassword(password, confirm) — compartido por Register, ResetPassword, ChangePasswordPage
    ├── validators.js           # Email, UUID, RUT, phone
    └── seo.js                  # Hook useSEO + JSON-LD builders

supabase/functions/
├── _shared/
│   └── email.ts                # Resend API helper; sendEmail(), staffWelcomeEmail(), demoWelcomeEmail()
├── create-demo-user/           # Crea usuario real cuando superadmin aprueba demo lead
├── create-staff-user/          # Crea funcionario/familiar con contraseña temporal
├── delete-staff-user/          # Elimina staff/familiar desde Auth + cascadas
├── invite-funcionario/         # Legacy: invitación por token. Edge Function activa para tokens existentes; teamService.js ya no lo llama (usa create-staff-user)
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
| `funcionario` | Personal clínico del ELEAM | ✗ | `/dashboard` si ELEAM vigente |
| `familiar` | Familiar de residente | ✗ | `/familiar` si ELEAM vigente |

### Flujos de acceso

**No existe auto-registro público.** La landing solo muestra "Iniciar sesión" y CTA de demo. Los nuevos admins entran vía el flujo de aprobación de demo:

1. **Demo → Admin**: Prospecto llena formulario en landing → row en `demo_leads` → superadmin aprueba desde `/superadmin` → Edge Function `create-demo-user` crea ELEAM demo + cuenta `admin_eleam` con `app_metadata` server-side, reutiliza cuenta compatible o repara Auth huérfano → activa demo por 30 días → email con credenciales si aplica (vía Resend) + superadmin ve el resultado en modal UI.
2. **Funcionario/Familiar creado por ELEAM**: Admin crea funcionarios/familiares desde `/equipo`; funcionarios pueden crear familiares vinculados a residentes activos desde flujos operativos. Edge Function `create-staff-user` crea o repara cuenta con contraseña temporal + email de bienvenida.
3. **Primer acceso (cualquier rol)**: Si `must_reset_password=true`, `ProtectedRoute` fuerza redirect a `/cambiar-clave`. Allí puede establecer nueva contraseña o, si tiene Gmail, vincular Google con `supabase.auth.linkIdentity` (no crea cuenta duplicada). La bandera solo se limpia después del callback exitoso `/cambiar-clave?linked=google`.
4. **Recuperación de contraseña**: `/recuperar-acceso` → `supabase.auth.resetPasswordForEmail` → email con link → `/reset-password` → nueva contraseña vía `supabase.auth.updateUser`; al guardar se limpia `must_reset_password`.
5. **Google OAuth**: `supabase.auth.signInWithOAuth` en login normal solo para correos ya habilitados; `supabase.auth.linkIdentity` cuando se quiere vincular desde `/cambiar-clave` (evita cuentas duplicadas). Si el correo no tiene cuenta autorizada, el trigger rechaza el alta y la UI vuelve a `/login` con aviso.
6. **Registro por invitación (legado)**: `/register?invite=TOKEN&email=EMAIL` — sigue funcionando para compatibilidad. La UI valida primero con `validate_invitation_token`; el trigger vuelve a validar token, acceso activo del ELEAM y residente activo para familiares. Sin token, la página muestra pantalla de bloqueo.

**Regla central**: no existe auto-registro público. `handle_new_user` solo acepta superadmin plataforma, demo aprobada por superadmin, usuario creado por Edge Function con `app_metadata` de Admin API, o invitación legacy válida. `raw_user_meta_data` nunca se usa para autorizar `rol` ni `eleam_id`.

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
<ProtectedRoute requireActive={false}>...</ProtectedRoute>  // solo pago/cambio clave
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
| `/demo/:token` | GuidedDemoPage | — | Demo guiado para lead aprobado; token en `demo_leads` |
| `/pago` | PaymentPage | `requireActive=false` | Planes MercadoPago |
| `/pago/return` | PaymentReturn | — | Post-checkout; polling |
| `/blog` | PublicBlogList | — | Blog público |
| `/blog/:slug` | PublicBlogPost | — | Post público |
| `/cambiar-clave` | ChangePasswordPage | `requireActive=false` | Forzado si `mustResetPassword=true`; opción Google para Gmail |
| `/dashboard` | AdminDashboard | `allowedRoles=[admin_eleam, funcionario]` | Índice operativo. KPIs reordenados por rol: funcionario ve alertas clínicas primero, admin_eleam ve gestión |
| `/residents`, `/residents/new`, `/residents/:id`, `/residents/:id/edit` | Resident* | STAFF | CRUD residentes |
| `/vital-signs`, `/vital-signs/new` | VitalSigns* | STAFF | CRUD + rangos visuales |
| `/observations`, `/observations/new` | Observation* | STAFF | 12 tipos de observaciones |
| `/accreditation` | AccreditationDashboard | STAFF | Resumen global: cumplimiento, alertas, ámbitos |
| `/accreditation/ambito/:codigo` | AccreditationAmbito | STAFF | Lista requisitos filtrable por estado |
| `/accreditation/requisito/:id` | AccreditationRequisito | STAFF | Detalle: evidencias, observaciones, auditoría, cambio de estado |
| `/accreditation/observaciones` | AccreditationObservaciones | STAFF | Observaciones internas/fiscalización |
| `/accreditation/carpeta` | AccreditationCarpeta | STAFF | Export imprimible (Ctrl+P) |
| `/equipo` | TeamManagement | `allowedRoles=[admin_eleam]` | Crear funcionarios/familiares con contraseña temporal |
| `/equipo/permisos/:profileId` | FuncionarioPermisosPage | `allowedRoles=[admin_eleam]` | Editar permisos granulares de un funcionario |
| `/familiar` | FamiliarPortal | `allowedRoles=[familiar]` + ELEAM vigente | Residente asignado + últimos signos + observaciones |
| `/familiar/visitas` | FamiliarVisitas | `allowedRoles=[familiar]` + ELEAM vigente | Historial + registro de visitas |
| `/turnos` | TurnoEntregaPage | STAFF | Entrega de turno: resumen clínico + cuidado + eMAR |
| `/turnos/nueva` | TurnoEntregaPage | STAFF | Nueva entrega de turno |
| `/turnos/tareas` | CareTasksPage | STAFF | Tareas diarias del plan de cuidado por turno |
| `/turnos/emar` | EmarTurnPage | STAFF | Kardex electrónico: administración de medicamentos por turno |
| `/turnos/:id` | TurnoHistoryPage | STAFF | Detalle histórico de una entrega de turno |
| `/permisos` | FeaturePermissionsPage | `allowedRoles=[admin_eleam]` | Activar/desactivar features del ELEAM |
| `/superadmin` | SuperAdminDashboard | SuperAdminRoute | CRM: métricas, tabla ELEAMs, leads, edición, pagos |
| `/superadmin/blog` | BlogManagement | SuperAdminRoute | Lista de posts |
| `/superadmin/blog/new`, `/superadmin/blog/:id/edit` | BlogEditor | SuperAdminRoute | Editor de posts |
| `*` | Fallback | — | Redirige a `homePath` |

**Query params**:
- `/vital-signs/new?residenteId=UUID` — preselecciona residente
- `/observations/new?residenteId=UUID` — preselecciona residente

---

## Base de Datos

23 tablas en Supabase. Ver `supabase_schema.sql` para SQL completo.

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

**`funcionario_permisos`** — Permisos granulares por funcionario. 21 columnas bool: las 13 originales (`crear/editar/eliminar_residentes`, `crear/editar/eliminar_signos_vitales`, `crear/editar/eliminar_observaciones`, `subir/editar/archivar_acreditacion`, `registrar_visitas`) más 8 nuevas (`crear_indicaciones_medicamentos`, `editar_indicaciones_medicamentos`, `validar_medicamentos_controlados`, `ajustar_stock_medicamentos`, `completar_tareas_cuidado`, `editar_indicaciones_cuidado`, `ver_costos_medicamentos`, `exportar_reportes`). Ver sección "Permisos Granulares" para defaults.

**`visitas_familiar`** — Registro de visitas: residente_id, profile_id, fecha_hora, duracion_min, notas, registrado_por.

#### Tablas de blog y CRM

**`blog_posts`** — Slug único, titulo, resumen, contenido_md, cover_url, cover_alt, meta_title, meta_description, keywords[], estado (borrador|publicado|archivado), publicado_en, destacado, autor_nombre, tiempo_lectura_min, views.

**`crm_tasks`** — titulo, descripcion, tipo, estado, prioridad, fecha_vencimiento, creado_por, completado_por, eleam_id.

**`crm_interactions`** — tipo, canal, resumen, resultado, proxima_accion, creado_por, eleam_id, fecha.

**`demo_leads`** — Leads del formulario de landing: nombre, cargo, eleam_nombre, email, telefono, num_residentes, UTM/referrer, estado (nuevo|contactado|demo_activo|demo_completado|descartado|convertido), demo_token, demo_user_id (uuid FK auth.users; vincula al usuario real cuando superadmin aprueba demo), demo_progreso, solicitudes de contacto y vencimiento.

**`landing_events`** — Eventos anónimos de landing: tipo, página, elemento, valor, session_id, UTM/referrer, creado_en. Solo anon/authenticated insertan; superadmin lee.

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

1. **Onboarding vía demo**: Prospecto llena formulario en landing → superadmin aprueba en LeadsPanel → Edge Function `create-demo-user` crea el ELEAM demo, luego crea cuenta con contraseña temporal usando `app_metadata` server-side, reutiliza una cuenta `admin_eleam` existente o repara Auth huérfano → email enviado si aplica + resultado visible en modal UI. Suscripción activada con 30 días de prueba.
2. **Primer acceso**: `must_reset_password=true` → forzado a `/cambiar-clave` → establece contraseña personal o vincula Google (si Gmail, usando `linkIdentity`).
3. **Sin pago**: Redirige a `/pago?sinAcceso=1`. Solo ve "Activar ELEAM", "Demo", "Cerrar sesión".
4. **Con pago activo**: `/dashboard` + todas las operaciones clínicas + `/equipo` + `/accreditation`.
5. **Crear funcionarios**: Email + nombre + permisos → Edge Function `create-staff-user` crea o repara cuenta con contraseña temporal + envía email de bienvenida con credenciales.
6. **Crear familiares**: Selecciona residente activo + email → mismo flujo; `familiar_residentes` vincula al residente asignado. También puede hacerlo un funcionario desde flujos operativos autorizados.

### funcionario (Personal clínico)

- Ruta home: `/dashboard` si el ELEAM tiene acceso vigente (sin `/equipo`, sin `/pago`).
- Creado por admin_eleam desde `/equipo`; recibe email con contraseña temporal.
- Primer acceso: forzado a `/cambiar-clave` (mismo flujo que admin).
- Puede: crear/editar residentes, signos, observaciones, acreditación (según `funcionario_permisos`).
- Puede crear cuentas familiares vinculadas a residentes activos.
- No puede: administrar planes ni crear funcionarios.

### familiar (Acceso de visitante)

- Ruta home: `/familiar` si el ELEAM tiene acceso vigente.
- Creado por admin_eleam desde `/equipo`; recibe email con contraseña temporal.
- Primer acceso: forzado a `/cambiar-clave` (mismo flujo).
- Ve: 1 residente asignado, últimos signos vitales (5), observaciones (5), visitas registradas.
- Puede: registrar visitas (duración, notas).
- Acceso: RLS verifica `profile_id` en `familiar_residentes` y `eleam_has_access()`.

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
- `invite-funcionario`: Crea invitation token; valida plan y límites (flujo legado). Admin invita funcionarios/familiares; funcionario solo familiares.
- `create-staff-user`: Crea funcionario/familiar con contraseña temporal usando `app_metadata` server-side; admin crea staff/familiares y funcionario solo familiar vinculado. Si el email existe en Auth pero no tiene `profiles`, repara/adopta esa cuenta para el ELEAM autorizado y asigna contraseña temporal nueva. Envía email via Resend (si configurado). Retorna `{ ok, profile_id, email, temp_password, email_sent, email_error?, repaired_existing_auth_user? }`.
- `delete-staff-user`: Elimina usuario de Auth; cascadas limpian `profiles`, `familiar_residentes` y `funcionario_permisos`.
- `create-demo-user`: Crea ELEAM demo + admin_eleam para lead aprobado usando `app_metadata` server-side, reutiliza admin compatible o repara un usuario Auth huérfano del mismo email; activa ELEAM 30 días; envía email de bienvenida cuando genera contraseña. Retorna `{ ok, profile_id, eleam_id, email, temp_password?, email_sent, email_error?, reused_existing_user?, repaired_existing_auth_user?, already_active? }`.

### Email (Resend — opcional)

`supabase/functions/_shared/email.ts` centraliza el envío. Si `RESEND_API_KEY` no está configurado o Resend falla, `sendEmail()` retorna `{ sent: false, error }` y el sistema sigue funcionando — las credenciales se muestran directamente en la UI al superadmin/admin.

### Env vars (server-only, Edge Function secrets)

- `MP_ACCESS_TOKEN` — Bearer MP.
- `MP_WEBHOOK_SECRET` — HMAC secret.
- `PUBLIC_APP_URL` — URL frontend (para back_url, invite links).
- `ALLOWED_ORIGINS` — CSV de orígenes permitidos por CORS.
- `RESEND_API_KEY` — Opcional; si ausente, emails no se envían pero credenciales se retornan en respuesta.

NUNCA exponer como `VITE_*`.

Setear con `npx supabase secrets set NOMBRE=valor`.

---

## Demo

### Demo guiado (flujo principal)

Prospecto llena formulario en landing → row en `demo_leads` → superadmin aprueba en LeadsPanel (`/superadmin`) → Edge Function `create-demo-user` crea ELEAM demo y cuenta `admin_eleam` real con 30 días de prueba mediante `app_metadata` de Admin API, reutiliza una cuenta compatible o repara un usuario Auth huérfano del mismo correo → email con credenciales si se generó contraseña y Resend está configurado → superadmin ve temp_password solo cuando existe → prospecto inicia sesión y completa `/cambiar-clave`.

Ruta pública: `/demo/:token`. Guarda progreso en `demo_leads.demo_progreso`, actualiza `demo_ultimo_ping` y permite solicitar contacto desde el demo.

Los datos clínicos del demo viven en `src/features/demo/demoData.js`; no escriben tablas clínicas reales.

### Detección de plan demo en el frontend

**Patrón canónico**: `eleam.plan === "demo"` (NO `!pago_activo` — un demo puede tener `pago_activo=true` mientras no haya vencido).

**Superadmin (EleamTable)**: Filas demo reciben fondo `bg-amber-50/40`, badge "Demo" junto al nombre, celda Pago muestra "Demo" en amber (no "Inactivo"), VencimientoCell muestra días restantes `({d}d)` y título contextual "Demo vence en X días".

**Superadmin (EleamCustomerDrawer)**: Banner amber/rose encima de la sección de suscripción mostrando días restantes o estado vencido; sección de suscripción toma fondo amber; oculta fila "Próximo cobro MP" para demos.

**Superadmin (SuperAdminMetrics)**: Métrica "En demo" cuenta `plan = 'demo'` (no `!pago_activo`). Tono amber, diferenciada de "Activos" (emerald) y "En riesgo" (rose).

**PaymentPage (admin_eleam)**: Cuando `isAdminEleam && eleam.plan === "demo"`, muestra banner prominente con días restantes y fecha de vencimiento en lugar de la tarjeta de suscripción normal. Botón de plan dice "Activar plan" en lugar de "Suscribirme". Funcionarios y familiares **no ven** información de demo (solo el banner genérico de acceso limitado que ya existía).

---

## Blog Público

**Rutas**: `/blog` (lista), `/blog/:slug` (post).

**Editor superadmin**: `/superadmin/blog` (lista), `/superadmin/blog/new` (crear), `/superadmin/blog/:id/edit` (editar).

**SEO / LLM**: Meta tags (description, OG, Twitter), JSON-LD (Article, Organization, SoftwareApplication, FAQPage, Breadcrumb, Blog schema con publisher), `robots.txt` (GPTBot, ClaudeBot, PerplexityBot, etc.), `sitemap.xml`. La landing incluye JSON-LD SoftwareApplication + Organization además de FAQPage para maximizar visibilidad en LLMs.

**Hook**: `useSEO({title, description, path, image, type, keywords, jsonLd})` inyecta meta tags + JSON-LD sin librerías externas.

---

## CRM Superadmin

Ruta `/superadmin`. Solo operador (rol=superadmin sin ELEAM).

### Funcionalidades

- **Métricas**: ELEAMs totales, activos, demos (`plan='demo'`), nuevos este mes, residentes, MRR (CLP), leads últimos 7 días, sesiones demo activas.
- **Tabla de ELEAMs**: Búsqueda, filtro por estado, plan, vencimiento. Edición inline: activar/desactivar, cambiar plan, max_residentes, fecha_vencimiento, notas.
- **Registrar pago**: Monto, plan, método, fecha inicio/fin → RPC transaccional `registrar_pago_y_activar_eleam`.
- **Historial de pagos**: Últimos 20 con ELEAM, monto, plan, estado.
- **Pipeline CRM**: ELEAMs agrupados por `crm_estado` (lead → cliente_riesgo). Draggy de estado (future).
- **Ficha 360 del ELEAM**: Contacto, estado, suscripción, riesgo churn, tareas vencidas, interacciones recientes, salud cliente (healthy/warning/risk).
- **Tareas**: Crear, asignar, marcar completadas, vencimiento, prioridad.
- **Interacciones**: Registro de contactos (call, email, meeting, etc.); proxima acción; audit trail.
- **LeadsPanel**: Tabla de `demo_leads` con estado (nuevo/contactado/demo_activo/demo_completado/descartado/convertido). Botón "Dar acceso" invoca `create-demo-user`; muestra modal con email + contraseña temporal si se creó/reparó cuenta, o aviso de cuenta existente si se reutilizó. Leads ya vinculados no muestran el botón.

**Salud del cliente** (`utils/customerHealth.js`): Combina pago, vencimiento, último contacto, riesgo, tareas vencidas, estado CRM → `healthy | warning | risk | unknown`.

---

## Seguridad

### Validación cliente

- **Email**: Regex estricto en `validateEmail()`.
- **UUID**: `isValidUUID()` antes de usarlo en queries; rechazo silencioso de inválidos.
- **RUT**: `validateRut()` con módulo-11; campo opcional → true si vacío.
- **Archivos**: Extensión + MIME type whitelist + tamaño ≤10 MB en `accreditationService.js` (`validateFile()`). `ALLOWED_EXTENSIONS` y `ALLOWED_MIME` se validan juntos; extensión primero, luego `file.type` si está presente.
- **Nombres de archivo**: `sanitizeFilename()` → elimina `..`, `/`, `\`, especiales; whitelist de extensiones.

### Validación servidor (RLS)

- **Aislamiento multi-tenant**: `eleam_id` en tablas clínicas; RLS verifica vía `my_eleam_id()`.
- **Acceso vigente**: `eleam_has_access(eleam_id)` bloquea lecturas/escrituras operativas si el ELEAM no está `activo`, `en_gracia`, con `pago_activo=true` o dentro del período pagado tras cancelación.
- **Alta controlada**: `handle_new_user` rechaza OAuth/signUp sin invitación válida o `app_metadata` de Admin API. `raw_user_meta_data` solo sirve para nombre/flags no privilegiados.
- **getMyContext()**: Servicios extraen `eleam_id` del perfil, no del cliente.
- **Superadmin**: Función `is_superadmin()` en todas las RLS; bypass seguro.
- **Storage path scoped**: `acreditacion/{eleamId}/...`; RLS filtra por `split_part(name, '/', 2)`.
- **Permisos granulares**: `funcionario_permisos` con checks en UI + RLS.
- **Defense-in-depth en accreditationService**: `setRequisitoEstado`, `archiveDocumento` y el reemplazo de documentos incluyen `.eq("eleam_id", eleamId)` además de la protección RLS.

### Headers

`vite.config.js` inyecta los headers en el servidor de desarrollo. En **producción** los headers se configuran en `public/_headers` (Netlify / Cloudflare Pages) y deben también configurarse en el servidor web / CDN del host: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-XSS-Protection: 1; mode=block`.

### ErrorBoundary

Stack trace solo si `import.meta.env.DEV`; producción muestra mensaje genérico.

---

## Permisos Granulares (Funcionario)

Tabla `funcionario_permisos` con columnas bool por acción. Verificación en UI + `can()` desde `useAuth()`.

| Permiso | Nota | Default |
|---------|------|---------|
| `crear_residentes`, `editar_residentes`, `eliminar_residentes` | CRUD residentes | true / true / **false** |
| `crear_signos_vitales`, `editar_signos_vitales`, `eliminar_signos_vitales` | Signos vitales | true / true / **false** |
| `crear_observaciones`, `editar_observaciones`, `eliminar_observaciones` | Observaciones | true / true / **false** |
| `subir_acreditacion`, `editar_acreditacion`, `archivar_acreditacion` | Acreditación | true / true / **false** |
| `registrar_visitas` | Visitas familiares | true |
| `crear_indicaciones_medicamentos`, `editar_indicaciones_medicamentos` | Indicaciones eMAR | **false** / **false** |
| `validar_medicamentos_controlados` | Validar controlados en eMAR | **false** |
| `ajustar_stock_medicamentos` | Ajuste manual de stock | **false** |
| `completar_tareas_cuidado` | Registrar cumplimiento de tareas del plan de cuidado | **false** |
| `editar_indicaciones_cuidado` | Editar plan de cuidado del residente | **false** |
| `ver_costos_medicamentos` | Ver costos en módulo eMAR | true |
| `exportar_reportes` | Exportar reportes clínicos | true |

`can()` en AuthContext: fail-closed para permisos marcados **false** — cuando no hay row en `funcionario_permisos`, esos permisos se deniegan explícitamente (set `FAIL_CLOSED_PERMS` en AuthContext.jsx). El schema crea filas para funcionarios nuevos y existentes.

`teamConstants.js` exporta `PERM_GROUPS` (agrupa permisos por sección para la UI), `DEFAULT_PERMS` (valores para nuevos funcionarios) y `PLANTILLAS_CARGO` (presets por rol: Enfermero/a, Kinesiólogo/a, Médico/a, Auxiliar ATD, Administrativo/a).

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
7. `npx supabase login && npx supabase link --project-ref <project-ref>`.
8. `npx supabase functions deploy`.

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

## Sistema de Diseño (Design System)

El proyecto usa **Tailwind CSS 4 puro** sin CSS variables de colores. No hay `var(--color-*)` en el código; todo usa clases Tailwind directas.

### Paleta de colores

| Propósito | Tailwind |
|-----------|---------|
| Primario (acciones, CTA) | `teal-700` / `hover:teal-800` |
| Primario fondo suave | `teal-50`, `teal-100` |
| Primario texto suave | `teal-600`, `teal-700` |
| Superficies / texto neutro | `slate-*` (NO `gray-*`) |
| Fondo página | `slate-50` o `white` |
| Éxito | `emerald-*` |
| Alerta | `amber-*` |
| Error / urgente | `rose-*` |
| Info | `sky-*` |

### Bordes y formas

- Cards: `rounded-2xl` con `border border-slate-100 shadow-sm`
- Modales: `rounded-2xl` (mobile: `rounded-t-2xl`) — manejado por `Modal.jsx`
- Botones: `rounded-xl`
- Inputs/selects: `rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100`
- Badges / pills: `rounded-full`
- Badges internos pequeños: `rounded-xl`

### Iconografía

- **Heroicons outline** (SVG inline). NO emojis en UI de la aplicación (excepción: íconos médicos en `VITAL_DEFS.icon` con `aria-hidden`).
- Patrón de icono en empty states: caja teal-50 + icono teal-600, 12×12px, `rounded-xl`.
- Iconos de navegación: centralizados en `NavIcon.jsx`.

### Accesibilidad

- Todos los `<button>` con `onClick` tienen `type="button"` explícito (o `type="submit"` en formularios).
- Elementos clickeables no-button (artículos, divs) tienen `role="button"`, `tabIndex={0}` y `onKeyDown` con Enter/Space.
- Labels de formulario usan `htmlFor` + `id` para asociación semántica (screen readers).
- Tooltips sobre texto truncado vía `title` attribute.

### Componentes base

| Componente | Notas |
|-----------|-------|
| `Button.jsx` | Acepta `className` para override de color. Base: `rounded-xl`. |
| `Input.jsx` | Base: `rounded-xl border-slate-300 focus:border-teal-500`. |
| `Modal.jsx` | Accesible: Escape, backdrop click, `role=dialog`. |
| `Loading.jsx` | Spinner teal-700. |
| `ErrorBoundary.jsx` | Clase. Stack trace solo en DEV. |
| `SupabaseError.jsx` | Pantalla de error si Supabase no configurado. |
| `Toast.jsx` | `useToast()` hook. 4s auto-dismiss. |
| `HelpTooltip.jsx` | Botón `?` con tooltip de ayuda. |
| `PageLayout.jsx` | Wrapper con `PageHeader` + slot `actions`. |

### dashboardUtils.js — claves de tono

`KPI_TONE`, `FILTER_TONE`, `CARD_TONE` usan claves: `primary`, `emerald`, `amber`, `rose`, `slate` (no `gray`).

---

## Onboarding Adaptativo

Sistema de guía de primeros pasos en `src/features/onboarding/`. Montado en `AppShell.jsx` via `<OnboardingProvider>`.

### Tres capas

| Componente | Cuándo se muestra |
|-----------|-------------------|
| `OnboardingWelcomeModal` | Primer ingreso: `!seenWelcome && availableSteps.length > 0` |
| `OnboardingChecklist` | Siempre visible (widget flotante) mientras `isActive && !dismissed` |
| `OnboardingBanner` | Solo en la ruta que corresponde al paso pendiente actual |

### Adaptación por rol y permisos

- Los pasos de funcionario tienen `requiredPermission` (e.g. `crear_signos_vitales`).
- `availableSteps` se computa en `OnboardingContext` filtrando con `can()` + `canFeature()`, esperando a que `profileLoading = false`.
- Si a un usuario se le otorgan nuevos permisos en una sesión posterior, el sistema detecta los pasos "recién visibles" mediante `knownAvailableIds` en localStorage y reactiva el onboarding (`dismissed: false`).

### Estado

Persistido en localStorage con clave `fichaeleam_onboarding_v2_{userId}`. Campos: `role`, `seenWelcome`, `steps: { [stepId]: bool }`, `knownAvailableIds`, `dismissed`, `completedAt`.

### Colores (por rol)

`COLOR_CLASSES` en `onboardingConfig.js` mapea nombre de color a clases Tailwind **estáticas** (no dinámicas) para que Tailwind las incluya en el bundle. Roles: `teal` (admin_eleam), `violet` (funcionario), `rose` (familiar), `slate` (superadmin).

---

## Qué Hacer Ahora

1. **Permisos granulares de funcionario**: Si necesitas más permisos o cambiar defaults, edita `FAIL_CLOSED_PERMS` en `AuthContext.jsx`, `PERM_GROUPS`/`DEFAULT_PERMS` en `teamConstants.js` y el ALTER TABLE en `supabase_schema.sql`.
2. **Onboarding**: Para agregar pasos, edita `ROLE_CONFIG` en `onboardingConfig.js` (sin cambiar los componentes). Las clases Tailwind del color deben ser estáticas en `COLOR_CLASSES`.
3. **Acreditación**: Si el modelo v9 requiere cambios (ámbitos, requisitos, estados), edita `supabase_schema.sql` + servicios.
4. **Blog/CRM**: Editable desde UI; no requiere cambios de código.
5. **MercadoPago**: Secrets en Edge Functions; pruebas con TEST token.
6. **SEO**: Valida sitemap + JSON-LD con Google Search Console.
7. **Headers en producción**: Configurar los security headers en el servidor / CDN que sirve `/dist`. El archivo `public/_headers` cubre Netlify y Cloudflare Pages.
8. **eMAR / Plan de cuidado**: Nuevos permisos (`completar_tareas_cuidado`, `editar_indicaciones_cuidado`, etc.) están en `FAIL_CLOSED_PERMS` — deniegan acceso hasta que admin los otorgue explícitamente.

---

## Archivos de Referencia

- `supabase_schema.sql` — Schema completo (tablas, RLS, funciones, triggers, ALTER TABLE permisos).
- `src/routes/AppRouter.jsx` — Definición de todas las rutas.
- `src/context/AuthContext.jsx` — useAuth(), FAIL_CLOSED_PERMS, helpers, derivados.
- `src/components/ProtectedRoute.jsx` — Guarding de sesión, pago, rol.
- `src/features/vitalSigns/vitalRanges.js` — Rangos clínicos.
- `src/features/carePlans/carePlansService.js` — Helpers compartidos: `getSessionProfile()`, `todayIso()`, `currentTurno()`, `normalizeSchedule()`, `previousTurnos()`.
- `src/features/team/teamConstants.js` — `PERM_GROUPS`, `DEFAULT_PERMS`, `PLANTILLAS_CARGO`.
- `src/features/permissions/featureCatalog.js` — Catálogo de 12 features con IDs, labels y defaults.
- `src/features/onboarding/onboardingConfig.js` — Pasos y colores del onboarding por rol.
- `src/features/onboarding/OnboardingContext.jsx` — Lógica de estado, permisos y auto-complete.
- `public/_headers` — Security headers para Netlify / Cloudflare Pages.
