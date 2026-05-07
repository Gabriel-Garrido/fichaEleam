# FichaEleam

Plataforma SaaS para digitalizar fichas clínicas, registros operativos, carpeta SEREMI y gestión comercial de ELEAM en Chile.

Stack principal: React 19, Vite 6, Tailwind CSS 4, Supabase (Auth, PostgreSQL, Storage, Edge Functions) y MercadoPago.

---

## Inicio Rápido

```bash
git clone <url-del-repositorio>
cd fichaEleam
npm install
cp .env.example .env
npm run dev
```

La app queda disponible en `http://localhost:5173`.

---

## Comandos

```bash
npm run dev       # Desarrollo con HMR
npm run build     # Build de producción en /dist
npm run lint      # ESLint
npm run preview   # Preview local del build
```

La CLI de Supabase está instalada como dependencia de desarrollo. Usa siempre `npx` desde la raíz del proyecto:

```bash
npx supabase --version
npx supabase login
npx supabase link --project-ref <TU_PROJECT_REF>
npx supabase functions list
npx supabase functions deploy
```

---

## Variables de Entorno

Frontend (`.env`, basado en `.env.example`):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```

Secrets de Edge Functions (no van en `.env` del frontend):

```bash
npx supabase secrets set MP_ACCESS_TOKEN=TEST-...
npx supabase secrets set MP_WEBHOOK_SECRET=<secret-webhook-mp>
npx supabase secrets set PUBLIC_APP_URL=http://localhost:5173
npx supabase secrets set ALLOWED_ORIGINS="http://localhost:5173"
npx supabase secrets set RESEND_API_KEY=re_... # opcional
```

Supabase provee automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` dentro de las Edge Functions del proyecto enlazado.

---

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. Copia `Project URL` y `anon public key` a `.env`.
3. Ejecuta `supabase_schema.sql` completo en SQL Editor.
4. Crea el bucket privado `documentos-acreditacion` si la sección Storage falla por permisos.
5. Instala y enlaza CLI:

```bash
npx supabase login
npx supabase link --project-ref <TU_PROJECT_REF>
```

El schema es idempotente: puede re-ejecutarse. Incluye tablas base, RLS, triggers, seeds, permisos de funcionarios, leads de landing y analytics.

---

## Edge Functions

Funciones deployables en `supabase/functions/`:

| Function | JWT | Uso |
|----------|-----|-----|
| `mp-create-subscription` | sí | Crea preapproval de MercadoPago para admin ELEAM. |
| `mp-cancel-subscription` | sí | Cancela suscripción MercadoPago del ELEAM. |
| `mp-webhook` | no | Webhook público de MercadoPago; valida firma HMAC. |
| `create-demo-user` | sí | Superadmin aprueba lead y crea o reutiliza admin ELEAM demo. |
| `create-staff-user` | sí | Admin ELEAM crea funcionario/familiar con contraseña temporal. |
| `delete-staff-user` | sí | Admin ELEAM elimina usuario staff/familiar. |
| `invite-funcionario` | sí | Flujo legado de invitación por token. |

`supabase/config.toml` define `verify_jwt`; no uses `--no-verify-jwt` manualmente salvo que cambies la configuración.

Desplegar todas:

```bash
npx supabase functions deploy
```

Desplegar una:

```bash
npx supabase functions deploy create-demo-user
```

---

## MercadoPago

1. Crea aplicación en MercadoPago Developers.
2. Copia `Access Token` a `MP_ACCESS_TOKEN`.
3. Configura webhook:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/mp-webhook
```

Eventos recomendados:

- `preapproval`
- `subscription_authorized_payment`

4. Copia el secret del webhook a `MP_WEBHOOK_SECRET`.
5. Despliega funciones.

Prueba sandbox:

1. Inicia sesión como `admin_eleam`.
2. Ve a `/pago`.
3. Selecciona plan.
4. MercadoPago redirige a checkout.
5. El webhook actualiza `eleams.subscription_status` y `pago_activo`.

---

## Flujos de Acceso

### Superadmin

- Ruta: `/superadmin`.
- Gestiona ELEAMs, pagos, CRM, leads, analytics de landing y blog.
- Puede aprobar leads desde `LeadsPanel`.

### Demo Guiado

1. Prospecto llena formulario de landing.
2. Se inserta row en `demo_leads`.
3. Superadmin presiona `Dar acceso a demo`.
4. `create-demo-user`:
   - crea un usuario `admin_eleam` con contraseña temporal si el email no existe;
   - reutiliza una cuenta `admin_eleam` existente si el email ya tiene perfil compatible;
   - activa el ELEAM por 30 días;
   - marca el lead como `demo_activo`;
   - envía email vía Resend si `RESEND_API_KEY` existe.
5. El usuario entra y completa `/cambiar-clave`.
6. El demo guiado vive en `/demo/:token`.

### Admin ELEAM

- Administra residentes, signos vitales, observaciones, acreditación y equipo.
- Paga la suscripción del ELEAM.
- Crea funcionarios/familiares desde `/equipo`.

### Funcionario

- Acceso operativo a `/dashboard`, residentes, signos, observaciones y acreditación según `funcionario_permisos`.
- No paga ni gestiona equipo.

### Familiar

- Accede a `/familiar` y `/familiar/visitas`.
- Solo ve residentes vinculados por `familiar_residentes`.

---

## Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing pública con formulario de demo. |
| `/login` | Inicio de sesión. |
| `/register` | Registro solo para invitaciones legado. |
| `/recuperar-acceso` | Solicitar recuperación de contraseña. |
| `/reset-password` | Definir nueva contraseña desde link de Supabase. |
| `/demo/:token` | Demo guiado por token. |
| `/pago`, `/pago/return` | Suscripción MercadoPago. |
| `/dashboard` | Panel operativo staff. |
| `/residents*` | Residentes. |
| `/vital-signs*` | Signos vitales. |
| `/observations*` | Observaciones diarias. |
| `/accreditation*` | Carpeta SEREMI. |
| `/equipo` | Gestión de funcionarios/familiares. |
| `/familiar*` | Portal familiar. |
| `/superadmin*` | CRM, leads, métricas y blog. |
| `/blog*` | Blog público. |

---

## Base de Datos

`supabase_schema.sql` crea 23 tablas:

- Multi-tenant: `profiles`, `eleams`, `planes`.
- Clínica: `residentes`, `signos_vitales`, `observaciones_diarias`.
- Equipo: `funcionario_invitaciones`, `funcionario_permisos`, `familiar_residentes`, `visitas_familiar`.
- Pagos: `pagos`, `mp_webhook_events`.
- Acreditación: `acred_ambitos`, `acred_requisitos`, `acred_requisitos_eleam`, `acred_documentos`, `acred_observaciones`, `acred_audit`.
- CRM/blog: `crm_tasks`, `crm_interactions`, `blog_posts`.
- Landing/demo: `demo_leads`, `landing_events`.

Todas las tablas sensibles tienen RLS. `superadmin` accede vía `public.is_superadmin()`. Staff y familiar quedan aislados por `eleam_id` o vínculo de residente.

---

## Permisos de Funcionarios

Tabla: `funcionario_permisos`.

Permisos actuales:

- `crear_residentes`, `editar_residentes`, `eliminar_residentes`
- `crear_signos_vitales`, `editar_signos_vitales`, `eliminar_signos_vitales`
- `crear_observaciones`, `editar_observaciones`, `eliminar_observaciones`
- `subir_acreditacion`, `editar_acreditacion`, `archivar_acreditacion`
- `registrar_visitas`

Los permisos se aplican en UI con `useAuth().can()` y en RLS con `public.funcionario_can()`.

---

## Documentación

- [CLAUDE.md](./CLAUDE.md): documentación técnica extendida.
- [codex.md](./codex.md): guía rápida de desarrollo.
- [.env.example](./.env.example): variables locales y secrets esperados.
- [supabase/config.toml](./supabase/config.toml): configuración de JWT para Edge Functions.

---

## Validación Antes de Push

```bash
npm run lint
npm run build
npx supabase functions list
```

Warnings conocidos:

- `react-refresh/only-export-components` en algunos archivos que exportan helpers.
- `react-hooks/exhaustive-deps` en `LeadsPanel` por carga inicial controlada.
- Warning de tamaño de chunk en Vite.
