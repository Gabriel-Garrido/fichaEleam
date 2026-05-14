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
npx supabase secrets set RESEND_FROM_EMAIL="FichaEleam <no-reply@fichaeleam.cl>" # opcional
```

Supabase provee automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` dentro de las Edge Functions del proyecto enlazado.

---

## Correos Automáticos

El sistema no envía correos desde SQL ni desde triggers de base de datos. Los correos automáticos salen desde Edge Functions usando Resend:

- `create-demo-user`: cuando el superadmin activa un demo y se genera una contraseña temporal.
- `create-staff-user`: cuando un admin ELEAM crea o repara un funcionario/familiar y se genera una contraseña temporal.
- `invite-funcionario`: flujo legado; genera link de invitación, pero no envía email automático.

Para habilitarlos en producción:

1. Crea una cuenta en Resend y genera una API key.
2. Verifica el dominio remitente en Resend, por ejemplo `fichaeleam.cl`.
3. Agrega en tu proveedor DNS los registros que Resend solicite para SPF/DKIM/DMARC.
4. Configura los secrets del proyecto Supabase:

```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
npx supabase secrets set RESEND_FROM_EMAIL="FichaEleam <no-reply@fichaeleam.cl>"
npx supabase secrets set PUBLIC_APP_URL=https://fichaeleam.cl
```

5. Despliega las funciones que envían correos:

```bash
npx supabase functions deploy create-demo-user
npx supabase functions deploy create-staff-user
```

6. Verifica la configuración:

```bash
npx supabase secrets list
```

Después crea un demo o un usuario de equipo desde la UI. La respuesta de la función debe traer `email_sent: true`. Si viene `email_sent: false`, la UI muestra `email_error`; revisa ese mensaje y los logs de la Edge Function. Si falta `RESEND_API_KEY`, el sistema sigue creando el usuario y muestra la contraseña temporal para compartirla manualmente.

Los correos de recuperación de contraseña, confirmación de email o magic links pertenecen a Supabase Auth. Si quieres que también salgan con dominio propio, configúralos aparte en Supabase Dashboard > Authentication > SMTP y Templates.

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

El schema es idempotente: puede re-ejecutarse. Incluye tablas base, RLS, triggers, seeds, permisos de funcionarios, permisos por feature, leads de landing y analytics.

Cuando cambie el flujo de autenticación, re-ejecuta el schema antes de desplegar las Edge Functions. `handle_new_user` depende de `app_metadata` server-side y rechazará registros/OAuth sin invitación válida.

---

## Edge Functions

Funciones deployables en `supabase/functions/`:

| Function | JWT | Uso |
|----------|-----|-----|
| `mp-create-subscription` | sí | Crea preapproval de MercadoPago para admin ELEAM. |
| `mp-cancel-subscription` | sí | Cancela suscripción MercadoPago del ELEAM. |
| `mp-webhook` | no | Webhook público de MercadoPago; valida firma HMAC. |
| `create-demo-user` | sí | Superadmin aprueba lead y crea, reutiliza o repara admin ELEAM demo. |
| `create-staff-user` | sí | Admin ELEAM crea/repara funcionarios/familiares; funcionario crea/repara familiares vinculados. |
| `delete-staff-user` | sí | Admin ELEAM elimina usuario staff/familiar. |
| `invite-funcionario` | sí | Flujo legado de invitación por token; admin invita staff/familiares y funcionario solo familiares. |

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

### Regla de cuenta autorizada

No existe auto-registro público. Una sesión solo debe quedar operativa si el usuario cumple una de estas condiciones:

- Superadmin aprobó un lead y `create-demo-user` creó, reutilizó o reparó su cuenta demo.
- El ELEAM tiene demo o suscripción vigente (`pago_activo`, `activo`, `en_gracia` o cancelado dentro del período pagado).
- Es funcionario creado por un admin ELEAM activo.
- Es familiar creado por admin ELEAM o funcionario, siempre vinculado a un residente activo.

Google OAuth no crea cuentas nuevas en FichaEleam. Si alguien intenta entrar con Google sin cuenta habilitada, el trigger `handle_new_user` rechaza el alta y la UI muestra un mensaje de acceso no autorizado.

El registro legacy por invitación (`/register?invite=TOKEN`) valida primero la invitación con la RPC `validate_invitation_token`. El servidor vuelve a validar en `handle_new_user`: la invitación no puede estar vencida/usada, el ELEAM debe mantener acceso activo y, si es familiar, el residente vinculado debe seguir activo.

### Superadmin

- Ruta base: `/superadmin`.
- Secciones: resumen, clientes, leads, pagos, tareas, permisos por feature y blog.
- Gestiona ELEAMs, pagos, CRM, leads, analytics de landing, habilitación de módulos y blog.
- Puede aprobar leads desde `LeadsPanel`.

### Demo Guiado

1. Prospecto llena formulario de landing.
2. Se inserta row en `demo_leads`.
3. Superadmin presiona `Dar acceso a demo`.
4. `create-demo-user`:
   - crea el ELEAM demo antes de crear el usuario Auth;
   - envía `eleam_id_direct` y `rol_direct=admin_eleam` por `app_metadata` de Admin API;
   - crea un usuario `admin_eleam` con contraseña temporal si el email no existe;
   - reutiliza una cuenta `admin_eleam` existente si el email ya tiene perfil compatible;
   - repara usuarios huérfanos de Auth creados por intentos OAuth/signUp previos, creando el perfil autorizado y asignando una contraseña temporal nueva;
   - activa el ELEAM por 30 días;
   - marca el lead como `demo_activo`;
   - envía email vía Resend si `RESEND_API_KEY` existe.
5. El usuario entra y completa `/cambiar-clave`.
6. El demo guiado vive en `/demo/:token`.

### Admin ELEAM

- Administra residentes, signos vitales, observaciones, acreditación y equipo.
- Paga la suscripción del ELEAM.
- Crea funcionarios/familiares desde `/equipo`.
- Puede cargar residentes y funcionarios desde planillas Excel `.xlsx`; la importación está restringida a `admin_eleam`.
- Ajusta features visibles para funcionarios y familiares solo dentro de lo habilitado por superadmin.
- Usa un `AppShell` operacional: sidebar desktop abierto por defecto, colapsable a icon rail con preview por hover/focus en 0,3 segundos, y bottom nav en mobile.
- Las pantallas admin deben usar `PageLayout`/`PageHeader`, una acción primaria visible, filtros compactos y detalles secundarios en `details`, drawers o secciones avanzadas.

### Funcionario

- Acceso operativo a `/dashboard`, turnos, residentes, signos, observaciones y acreditación según permisos por feature y `funcionario_permisos`.
- No paga ni gestiona equipo.
- Puede crear cuentas familiares vinculadas a residentes activos desde flujos operativos autorizados.
- Si el ELEAM pierde acceso vigente, queda bloqueado y debe contactar al admin ELEAM.

### Familiar

- Accede a `/familiar` y `/familiar/visitas`.
- Solo ve residentes vinculados por `familiar_residentes`.
- Requiere que el ELEAM tenga demo o suscripción vigente.
- Sus features visibles también pueden restringirse por superadmin/admin ELEAM.

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
| `/turnos*` | Entrega de turno, tareas diarias de cuidado y eMAR por turno. |
| `/residents*` | Residentes, incluida carga masiva desde Excel para admin ELEAM. |
| `/vital-signs*` | Signos vitales. |
| `/observations*` | Observaciones diarias. |
| `/accreditation*` | Carpeta SEREMI. |
| `/equipo` | Gestión de funcionarios/familiares, incluida carga masiva de funcionarios desde Excel. |
| `/familiar*` | Portal familiar. |
| `/superadmin` | Resumen ejecutivo plataforma. |
| `/superadmin/clientes` | Cartera ELEAM y salud comercial. |
| `/superadmin/leads` | Leads, demo guiado y métricas landing. |
| `/superadmin/pagos` | Pagos y activaciones. |
| `/superadmin/tareas` | Tareas CRM. |
| `/superadmin/permisos` | Features por ELEAM y rol. |
| `/superadmin/blog*` | Gestión de blog. |
| `/blog*` | Blog público. |

---

## UX Autenticada

- `AppShell` centraliza navegación autenticada para admin ELEAM, funcionario, familiar y superadmin.
- `DesktopSidebar` inicia abierto en desktop para reducir fricción diaria; si se contrae, queda como icon rail y se abre temporalmente al posar el mouse o enfocar por teclado durante 0,3 segundos.
- El botón del sidebar solo se muestra cuando el menú está abierto y sirve para contraerlo. No hay botón de expandir en el rail; la apertura temporal ocurre por hover/focus.
- `MobileBottomNav` mantiene los accesos frecuentes y el menú "Más" agrupa módulos secundarios, cuenta y cierre de sesión.
- Las vistas admin ELEAM priorizan foco operacional: siguiente acción, alertas, métricas mínimas y filtros compactos. La información secundaria debe quedar plegada o en secciones de apoyo para evitar sobrecarga.
- `/pago` se renderiza como página pública cuando no hay sesión y como pantalla interna cuando el usuario está dentro del shell.

### Importación desde Excel

- Residentes: en `/residents`, solo `admin_eleam` ve `Cargar residentes desde Excel`. La planilla oficial incluye columnas claras como `Nombres *`, `Apellidos *`, `RUT`, `Fecha ingreso *`, estado clínico, dependencia, contacto y alergias.
- Funcionarios: en `/equipo`, solo `admin_eleam` puede usar `Cargar funcionarios desde Excel`. La planilla exige `Nombre completo *`, `Correo electrónico *` y `Cargo / plantilla de permisos *`.
- El modal descarga una plantilla `.xlsx` generada en el navegador con validaciones nativas de Excel para listas, fechas, rangos numéricos, email y campos obligatorios; al subirla igualmente normaliza fechas/RUT/enums y bloquea la importación si hay filas con errores.
- Residentes se crean fila a fila para reportar errores específicos sin perder los registros válidos ya creados. Funcionarios se crean mediante `create-staff-user`, por lo que se mantienen límites de plan, creación Auth, flujo Gmail/Google y correos de bienvenida.
- `read-excel-file` y `write-excel-file` se cargan dinámicamente solo al descargar o leer planillas; no forman parte del bundle inicial.

---

## Base de Datos

`supabase_schema.sql` crea 26 tablas:

- Multi-tenant: `profiles`, `eleams`, `planes`.
- Clínica: `residentes`, `signos_vitales`, `observaciones_diarias`, `turno_entregas`.
- Equipo: `funcionario_invitaciones`, `funcionario_permisos`, `eleam_feature_permissions`, `profile_feature_permissions`, `familiar_residentes`, `visitas_familiar`.
- Pagos: `pagos`, `mp_webhook_events`.
- Acreditación: `acred_ambitos`, `acred_requisitos`, `acred_requisitos_eleam`, `acred_documentos`, `acred_observaciones`, `acred_audit`.
- CRM/blog: `crm_tasks`, `crm_interactions`, `blog_posts`.
- Landing/demo: `demo_leads`, `landing_events`.

Todas las tablas sensibles tienen RLS. `superadmin` accede vía `public.is_superadmin()`. Staff y familiar quedan aislados por `eleam_id` o vínculo de residente.

El acceso operativo también se filtra con `public.eleam_has_access(eleam_id)`: si el ELEAM no tiene demo/suscripción vigente, staff y familiares no pueden leer ni modificar fichas, registros, acreditación o documentos aunque conserven sesión de Supabase.

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

## Permisos por Feature

Tablas:

- `eleam_feature_permissions`: superadmin habilita o bloquea features por ELEAM + rol.
- `profile_feature_permissions`: admin ELEAM ajusta features por usuario para funcionarios y familiares.

Reglas:

- Si no existe una fila, la feature queda habilitada por defecto para conservar compatibilidad.
- Si superadmin bloquea una feature para un rol del ELEAM, el admin ELEAM no puede habilitarla en usuarios.
- La navegación usa `useAuth().canFeature(featureId)` y las rutas usan `ProtectedRoute requiredFeature`.
- La función SQL `public.can_access_feature(feature_id)` queda disponible para políticas RLS específicas cuando una feature requiera validación server-side adicional.

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

Después de cambios en autenticación/autorización:

1. Re-ejecuta `supabase_schema.sql` completo en SQL Editor.
2. Despliega Edge Functions actualizadas:

```bash
npx supabase functions deploy create-demo-user
npx supabase functions deploy create-staff-user
npx supabase functions deploy invite-funcionario
```

Warnings conocidos:

- `react-refresh/only-export-components` en algunos archivos que exportan helpers.
- `react-hooks/exhaustive-deps` en `LeadsPanel` por carga inicial controlada.
- Warning de tamaño de chunk en Vite.
