# FichaEleam — Guía de Desarrollo

> **Ver [CLAUDE.md](./CLAUDE.md) para documentación técnica completa.**

Esta es una guía rápida de referencias. Para arquitectura, BD, seguridad y flujos detallados, consulta CLAUDE.md.

---

## Resumen ejecutivo

**FichaEleam** es SPA para digitalización de fichas clínicas, registros de atención y acreditación SEREMI de ELEAM en Chile. Stack: **React 19 + Vite 6 + Tailwind CSS 4 + Supabase (PostgreSQL + Auth + Storage + Edge Functions)**.

**Roles**: superadmin (operador), admin_eleam (paga), funcionario (staff), familiar (visitante).

**Features principales**:
- CRUD residentes + signos vitales + observaciones
- Acreditación v9 (14 ámbitos, ~70 requisitos, evidencias versionadas)
- Suscripción MercadoPago
- Blog público + CRM superadmin
- Permisos granulares funcionario

---

## Inicio rápido

```bash
npm install
cp .env.example .env          # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev                   # localhost:5173
npx supabase functions deploy # Edge Functions
```

Ver **[README.md](./README.md)** para setup completo de Supabase.

---

## Estructura

```
src/
├── components/      # UI: Button, Input, Modal, Toast, Loading, ProtectedRoute, etc.
├── context/         # AuthContext → useAuth(), useLoading()
├── features/
│   ├── auth/       # Login, recuperación y cambio de contraseña
│   ├── landing/    # LandingPage
│   ├── blog/       # Blog público
│   ├── dashboard/  # AdminDashboard
│   ├── residents/  # CRUD residentes
│   ├── vitalSigns/ # Signos vitales + rangos
│   ├── observations/ # Observaciones (12 tipos)
│   ├── accreditation/ # Carpeta SEREMI
│   ├── payment/    # MercadoPago
│   ├── team/       # Invitar staff
│   ├── familiar/   # Portal familiar
│   └── superadmin/ # CRM, blog editor
├── routes/         # AppRouter
├── services/       # Supabase client
└── utils/          # Validators, dateUtils, SEO
```

---

## Comandos

```bash
npm run dev      # Desarrollo
npm run build    # Build producción (/dist)
npm run lint     # ESLint
npm run test:run # Tests unitarios Vitest
npm run preview  # Preview build
npx supabase functions deploy  # Deploy Edge Functions
```

---

## Rutas

| Ruta | Guard | Componente |
|------|-------|-----------|
| `/` | — | LandingPage |
| `/login` | — | Auth (público) |
| `/pago`, `/pago/return` | — | MercadoPago |
| `/blog`, `/blog/:slug` | — | Blog público |
| `/dashboard` | STAFF | AdminDashboard |
| `/residents*` | STAFF | Residents CRUD |
| `/vital-signs*` | STAFF | Vital signs |
| `/observations*` | STAFF | Observations |
| `/accreditation*` | STAFF | Accreditation |
| `/cambiar-clave` | requireActive=false | Change password (forzado primer acceso) |
| `/equipo` | admin_eleam | Team management |
| `/familiar*` | familiar + ELEAM vigente | Familiar portal |
| `/superadmin*` | superadmin | CRM + Blog editor |

Ver **[CLAUDE.md — Rutas](./CLAUDE.md#rutas)** para detalles completos.

---

## Autenticación y Roles

### useAuth()

```javascript
const {
  user,                  // auth.users
  profile,              // profiles + eleams
  eleam,                // ELEAM data
  pagoActivo,           // bool
  rol, isAdminEleam, isFuncionario, isFamiliar, isSuperadmin, isStaff,
  can(permiso),         // Verifica permiso granular
  mustResetPassword,    // Primer acceso
  homePath,             // Ruta inicial
  ...
} = useAuth();
```

### Roles

| Rol | Paga | Ruta home | Notas |
|-----|------|-----------|-------|
| `superadmin` | n/a | `/superadmin` o `/dashboard` (demo) | Operador plataforma |
| `admin_eleam` | ✓ | `/pago?sinAcceso=1` (sin pago) o `/dashboard` | Dueño ELEAM |
| `funcionario` | Heredado | `/dashboard` | Staff clínico |
| `familiar` | Heredado | `/familiar` | Visitante de residente |

### Alta de cuentas

No hay auto-registro público. `handle_new_user` solo acepta superadmin plataforma, demo aprobada por superadmin, usuarios creados por Edge Functions con `app_metadata` de Admin API o accesos pendientes Gmail creados por `create-staff-user`. Google OAuth no autoriza cuentas públicas nuevas.

### ProtectedRoute

```jsx
<ProtectedRoute>...</ProtectedRoute>                  // Sesión + pago activo
<ProtectedRoute requireActive={false}>...</ProtectedRoute>  // Solo pago/cambio clave
<ProtectedRoute allowedRoles={["admin_eleam"]}>...</ProtectedRoute>  // Rol restringido
```

Ver **[CLAUDE.md — Autenticación](./CLAUDE.md#autenticación-y-autorización)** para flujos detallados.

---

## Base de Datos (Supabase)

42 tablas. Schema canónico en `supabase_schema.sql`.

### Principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios (roles, ELEAM) |
| `eleams` | Tenants (suscripción, CRM) |
| `residentes` | Fichas de pacientes |
| `signos_vitales` | Parámetros clínicos |
| `observaciones_diarias` | Observaciones (12 tipos) |
| `acred_*` | Acreditación (ámbitos, requisitos, documentos, observaciones, audit) |
| `funcionario_permisos` | Permisos granulares |
| `blog_posts` | Blog público |
| `crm_*` | CRM (tareas, interacciones) |
| `demo_leads` | Leads de landing + demo guiado |
| `landing_events` | Analytics anónimos de landing |

Todas con **RLS** multi-tenant. Ver **[CLAUDE.md — Base de Datos](./CLAUDE.md#base-de-datos)** para schema completo.

---

## Signos Vitales

Rangos clínicos en `src/features/vitalSigns/vitalRanges.js`:

| Parámetro | Normal | Warning | Critical |
|-----------|--------|---------|----------|
| Sistólica | 100–139 | 90–99, 140–179 | <90, ≥180 |
| Diastólica | 60–89 | 50–59, 90–109 | <50, ≥110 |
| FC | 60–100 | 50–59, 101–120 | <50, >120 |
| Temperatura | 36–37.7 | 35–35.9, 37.8–38.9 | <35, ≥39 |
| SatO₂ | ≥95 | 90–94 | <90 |
| Glucosa | 70–179 | 60–69, 180–249 | <60, ≥250 |

Cada parámetro devuelve estado: `normal`, `warning`, `critical`, `unknown`.

---

## Acreditación (SEREMI)

Modelo v9 con 14 ámbitos DS 14/2017. Requisitos en catálogo maestro, estados por ELEAM, evidencias versionadas, observaciones de auditoría.

### Estados

- `pendiente` — Sin gestionar
- `cumple` — Al día
- `no_cumple` — Requiere subsanación
- `no_aplica` — No aplicable
- `vencido` — Expiró
- `observado` — Observación abierta

### Componentes

- `AccreditationDashboard` — KPI global + alertas + grilla de ámbitos
- `AccreditationAmbito` — Requisitos por ámbito (filtrable)
- `AccreditationRequisito` — Detalle: evidencias, observaciones, auditoría, cambio de estado
- `AccreditationObservaciones` — Observaciones globales
- `AccreditationCarpeta` — Exportable PDF (Ctrl+P)

Ver **[CLAUDE.md — Acreditación](./CLAUDE.md#acreditación-carpeta-seremi)** para flujo completo.

---

## Suscripción MercadoPago

Admin contrata en `/pago` → Edge Function crea preapproval → checkout MP → webhook activa suscripción.

### Edge Functions (Deno)

- `mp-create-subscription` — Crea preapproval
- `mp-webhook` — Valida HMAC, actualiza BD
- `mp-cancel-subscription` — Cancela
- `create-demo-user` — Superadmin aprueba lead y crea/reutiliza/repara admin ELEAM demo con respuesta `{ ok, code, message, ... }`
- `create-staff-user` — Admin crea o repara funcionario/familiar; funcionario crea familiar vinculado
- `delete-staff-user` — Admin elimina staff/familiar

### Secrets (server-only, no VITE_)

```bash
npx supabase secrets set MP_ACCESS_TOKEN=TEST-...
npx supabase secrets set MP_WEBHOOK_SECRET=...
npx supabase secrets set PUBLIC_APP_URL=http://localhost:5173
npx supabase secrets set ALLOWED_ORIGINS="http://localhost:5173"
npx supabase secrets set RESEND_API_KEY=re_... # opcional
npx supabase secrets set RESEND_FROM_EMAIL="FichaEleam <no-reply@fichaeleam.cl>" # opcional
```

Ver **[README.md — MercadoPago](./README.md#integración-mercadopago-suscripciones)** para setup completo.

---

## Panel Superadmin

Ruta `/superadmin`. Solo `rol=superadmin`.

### Funcionalidades

- **Métricas**: ELEAMs, activos, MRR, residentes
- **Tabla**: Búsqueda, filtro, edición inline
- **Salud del cliente**: healthy/warning/risk (combina pago, vencimiento, contacto, riesgo, tareas)
- **Registrar pago**: Monto, plan, método → activa suscripción
- **CRM**: Tareas, interacciones, pipeline
- **Blog editor**: Crear/editar posts con SEO

Ver **[README.md — Panel Superadmin](./README.md#panel-superadmin-superadmin)** para detalles.

---

## Demo

No existe ruta `/demo`. El acceso demo ES la cuenta real del ELEAM en modo prueba (30 días).

- El lead llena el formulario en landing → row en `demo_leads` (estado `nuevo`).
- Superadmin aprueba desde `LeadsPanel`: `create-demo-user` crea ELEAM demo + cuenta `admin_eleam` y envía enlace de acceso por correo.
- `LeadsPanel` distingue `pending_request` (sin `demo_user_id`), `account_demo` (con `demo_user_id`) y `blocked_state` (`descartado`/`convertido`).
- Google login con correo de lead pendiente retorna `DEMO_PENDING`; la UI muestra aviso, no error rojo.

### Captura WhatsApp

Botón flotante en la landing → modal de 4 campos (nombre, ELEAM, correo, teléfono) → guarda lead en `demo_leads` (`cargo='Contacto WhatsApp'`, `utm_source='whatsapp'`) y abre `wa.me/<WHATSAPP_PHONE>` con mensaje pre-cargado. `LeadsPanel` muestra badge WhatsApp distintivo y CTA "Continuar WhatsApp" con el teléfono del lead. Archivos: `src/features/landing/WhatsApp*.jsx`, `whatsAppLeadUtils.js`.

El mismo modal cubre múltiples puntos de entrada con la prop `source`: `floating` (FAB), `institutional` (tier 35+ residentes en la sección de precios), `pricing`. Cada source genera una línea de intención distinta en el mensaje WhatsApp.

## Precios

Cuatro tiers públicos en la landing: $50.000 / $80.000 / $120.000 + IVA (planes mensuales) + tier Institucional (35+ residentes) con CTA WhatsApp. Schema seed en `public.planes`; UI hard-coded en `LandingPage.jsx` (`PLANS`). JSON-LD usa `AggregateOffer` con `UnitPriceSpecification.valueAddedTaxIncluded: false`.

---

## Blog y SEO

### Blog

- `/blog` — Listado público
- `/blog/:slug` — Post individual
- Markdown renderer propio (tablas, código, blockquotes, listas)
- JSON-LD Article + Breadcrumb

### Gestión

- `/superadmin/blog` — Listado, búsqueda, filtros
- `/superadmin/blog/new` — Crear post
- `/superadmin/blog/:id/edit` — Editar post
- Solo `superadmin` publica. Público ve `estado=publicado`.

### SEO global

- `robots.txt` — Permite GPTBot, ClaudeBot, PerplexityBot
- `sitemap.xml` — URLs públicas
- `useSEO()` hook — Meta tags + JSON-LD por ruta
- Open Graph + Twitter cards

---

## Permisos Granulares (Funcionario)

Tabla `funcionario_permisos` con columnas bool:

| Permiso | Notas |
|---------|-------|
| `crear_residentes`, `editar_residentes`, `eliminar_residentes` | CRUD residentes |
| `crear_signos_vitales`, `editar_signos_vitales`, `eliminar_signos_vitales` | Signos vitales |
| `crear_observaciones`, `editar_observaciones`, `eliminar_observaciones` | Observaciones |
| `crear_planes_cuidado`, `editar_planes_cuidado`, `completar_tareas_cuidado`, `editar_indicaciones_cuidado` | Plan de cuidado |
| `crear_indicaciones_medicamentos`, `editar_indicaciones_medicamentos`, `administrar_medicamentos` | eMAR |
| `validar_medicamentos_controlados`, `ajustar_stock_medicamentos` | eMAR controlados y stock |
| `subir_acreditacion`, `editar_acreditacion`, `archivar_acreditacion` | Acreditación |
| `registrar_visitas` | Visitas familiares |

### Portal familiar

`/familiar` usa `get_familiar_resident_snapshot(residente_id)` para leer un resumen seguro. Solo se publican observaciones, actividades de cuidado e indicaciones eMAR con `visible_familiar=true`; `resumen_familiar` permite mostrar una versión apropiada para familia.

Default: el schema crea fila para funcionarios nuevos y existentes. Sin fila, `public.funcionario_can()` deniega en backend.

Verificación en UI + `can()` desde `useAuth()`:

```javascript
if (!auth.can('eliminar_residentes')) {
  // Botón eliminar oculto/deshabilitado
}
```

---

## Seguridad

### RLS Multi-tenant

Toda tabla con `eleam_id` aislada:
```sql
(select eleam_id from profiles where id = auth.uid()) = eleam_id
```

Tablas con FK a residentes filtrables vía `my_eleam_id()`:
```sql
residente_id in (
  select id from residentes
  where eleam_id = my_eleam_id()
)
```

Superadmin acceso universal vía `is_superadmin()`.

El acceso operativo requiere además `eleam_has_access(eleam_id)`: si el ELEAM no tiene demo/suscripción vigente o período pagado posterior a cancelación, staff y familiares no leen ni escriben datos clínicos, acreditación o Storage.

### Validación cliente

- Email: Regex estricto
- UUID: `isValidUUID()` antes de usar en queries
- RUT: `validateRut()` con módulo-11
- Archivos: MIME whitelist + ≤10 MB

### Storage

- Bucket: `documentos-acreditacion` (privado)
- Path: `acreditacion/{eleamId}/req/{requisitoEleamId}/{ts}_v{n}_{filename}`
- URLs firmadas TTL 1 hora

### Triggers

- `prevent_role_eleam_escalation` — No cambiar rol/eleam_id
- `handle_new_user` — Rechaza registros/OAuth sin invitación válida o `app_metadata` server-side
- `check_residentes_limit` — Cupo de residentes
- `check_funcionarios_limit` — Cupo de funcionarios

---

## Componentes compartidos

### Toast

```javascript
const toast = useToast();
toast("Guardado", "success");  // Auto-dismiss 4s
toast("Error", "error");
```

### Modal

```jsx
<Modal isOpen={open} onClose={handleClose} title="Título">
  {children}
</Modal>
```

Escape cierra, backdrop clickeable, accesible.

### Button, Input

Base consistente. Propagan `className` + rest props.

### Loading

```jsx
<Loading message="Cargando..." />
```

---

## Convenciones

- **Sin comentarios**: Código auto-documentado. Solo WHY si hay restricción.
- **Naming**: camelCase (vars/funciones), kebab-case (rutas/archivos), UPPER_CASE (constantes).
- **Imports**: Explícitos, prefer `import X from...`
- **null vs undefined**: null = dato ausente; undefined = no existe.
- **Componentes**: Functional + hooks. Context para estado compartido.
- **useCallback**: Para callbacks en listas o dependencias externas.
- **Toast + Loading**: Centrales en App. Providers en main.jsx.

---

## Referencias clave

- **[CLAUDE.md](./CLAUDE.md)** — Documentación técnica completa
- **[README.md](./README.md)** — Setup, MercadoPago, despliegue
- **`supabase_schema.sql`** — Schema canónico completo (38 tablas, RLS, funciones, triggers, seeds y grants)
- **`src/context/AuthContext.jsx`** — useAuth(), derivados
- **`src/components/ProtectedRoute.jsx`** — Guards
- **`src/features/vitalSigns/vitalRanges.js`** — Rangos clínicos
- **`src/utils/seo.js`** — Hook SEO + JSON-LD builders

---

## Próximos pasos

1. **Revisar rutas** — `src/routes/AppRouter.jsx` sincroniza con CLAUDE.md
2. **Permisos granulares** — Editar `useAuth()` + tabla `funcionario_permisos`
3. **Acreditación** — Cambios en schema → editar `supabase_schema.sql` + servicios
4. **Blog/CRM** — Editable desde UI, no requiere cambios de código
5. **MercadoPago** — Secrets en Edge Functions, prueba con token TEST
6. **SEO** — Valida sitemap + JSON-LD en Google Search Console
