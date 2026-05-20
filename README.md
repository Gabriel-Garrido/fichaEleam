# FichaEleam

Plataforma SaaS para digitalizar fichas clínicas, gestión de camas, registros operativos, carpeta SEREMI y gestión comercial de ELEAM en Chile.

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
npm run test:run  # Tests unitarios Vitest
npm run test:contracts # Auditoría frontend-backend Supabase
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
# Producción — dominio canónico https://fichaeleam.cl:
npx supabase secrets set MP_ACCESS_TOKEN=APP_USR-...
npx supabase secrets set MP_WEBHOOK_SECRET=<secret-webhook-mp>
npx supabase secrets set PUBLIC_APP_URL=https://fichaeleam.cl
npx supabase secrets set ALLOWED_ORIGINS=https://fichaeleam.cl
npx supabase secrets set RESEND_API_KEY=re_...          # obligatorio: el acceso se entrega por correo
npx supabase secrets set RESEND_FROM_EMAIL="FichaEleam <no-reply@fichaeleam.cl>"

# APP_ENV: déjalo "production" (o sin definir) en producción. En dev/staging
# usa otro valor para que CORS permita además localhost.
npx supabase secrets set APP_ENV=production
```

Supabase provee automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` dentro de las Edge Functions del proyecto enlazado.

---

## Correos Automáticos

El sistema no envía correos desde SQL ni desde triggers de base de datos. Los correos automáticos salen desde Edge Functions usando Resend:

- `create-demo-user`: cuando el superadmin aprueba un demo; envía al nuevo admin un enlace para definir su contraseña.
- `create-staff-user`: cuando se crea o repara un funcionario/familiar; envía un enlace para definir su contraseña.

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

Después crea un demo o un usuario de equipo desde la UI. La respuesta de la función debe traer `email_sent: true`. Si viene `email_sent: false`, la UI muestra `email_error`; revisa ese mensaje y los logs de la Edge Function. El acceso se entrega siempre por enlace al correo: si el envío falla, el usuario puede pedirlo desde "¿Olvidaste tu contraseña?" en el inicio de sesión.

Los correos de recuperación de contraseña, confirmación de email o magic links pertenecen a Supabase Auth. Si quieres que también salgan con dominio propio, configúralos aparte en Supabase Dashboard > Authentication > SMTP y Templates.

---

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. Copia `Project URL` y `anon public key` a `.env`.
3. Ejecuta `supabase_schema.sql` completo en SQL Editor. Es la única fuente SQL canónica del proyecto.
4. Crea el bucket privado `documentos-acreditacion` si la sección Storage falla por permisos.
5. Instala y enlaza CLI:

```bash
npx supabase login
npx supabase link --project-ref <TU_PROJECT_REF>
```

El schema es idempotente: puede re-ejecutarse. Incluye tablas base, gestión de camas, RLS, triggers, seeds, permisos de funcionarios, permisos por feature, leads de landing y analytics. `supabase_schema.sql` completo es la única fuente SQL operativa del proyecto.

Cuando cambie el flujo de autenticación, re-ejecuta el schema antes de desplegar las Edge Functions. `handle_new_user` depende de `app_metadata` server-side y rechazará registros/OAuth sin invitación válida.

---

## Seed de Prueba

`supabase_test_seed.sql` crea datos QA completos e idempotentes: usuarios Auth para todos los roles, ELEAM activo/demo/vencido, residentes, portal familiar, signos, observaciones, planes de cuidado, eMAR, stock, acreditación, pagos, CRM, blog, leads de demo y analytics.

Ejecutar después de `supabase_schema.sql`:

```bash
# SQL Editor de Supabase o psql conectado al proyecto
\i supabase_test_seed.sql
```

Credenciales incluidas:

- `superadmin.qa@fichaeleam.test` / `FichaEleam123!`
- `admin.qa@fichaeleam.test` / `FichaEleam123!`
- `funcionario.qa@fichaeleam.test` / `FichaEleam123!`
- `familiar.qa@fichaeleam.test` / `FichaEleam123!`
- `demo.admin.qa@fichaeleam.test` / `FichaEleam123!`

El seed usa UUIDs fijos y secciones por dominio para que sea simple actualizarlo cuando cambie el modelo. No borra datos existentes.

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

Google OAuth no crea cuentas públicas nuevas en FichaEleam. Solo se acepta si el correo ya tiene perfil habilitado, fue vinculado desde `/cambiar-clave` o tiene un acceso pendiente generado por `create-staff-user` para Gmail. El registro público por token fue retirado; `/register` redirige a `/login`.

Si un correo ya tiene un lead abierto en `demo_leads` pero todavía no tiene `demo_user_id`, Google OAuth vuelve a `/login` con aviso informativo `DEMO_PENDING`: el demo está registrado, pero el login solo se habilita cuando el superadmin aprueba una cuenta demo.

### Superadmin

- Ruta base: `/superadmin`.
- Secciones: resumen, clientes, leads, pagos, tareas, permisos por feature y blog.
- Gestiona ELEAMs, pagos, CRM, leads, analytics de landing, habilitación de módulos y blog.
- Puede aprobar leads desde `LeadsPanel`.

### Demo Guiado

1. Prospecto llena formulario de landing.
2. Se inserta row en `demo_leads` (estado `nuevo`).
3. Superadmin aprueba desde `LeadsPanel` con el botón contextual.
4. `create-demo-user`:
   - crea el ELEAM demo antes de crear el usuario Auth;
   - envía `eleam_id_direct` y `rol_direct=admin_eleam` por `app_metadata` de Admin API;
   - crea un nuevo `admin_eleam` si el email no existe en Auth;
   - reutiliza una cuenta `admin_eleam` existente si el email ya tiene perfil compatible;
   - repara usuarios huérfanos de Auth del mismo email;
   - activa el ELEAM por 30 días;
   - marca el lead como `demo_activo`;
   - envía enlace de acceso vía Resend si `RESEND_API_KEY` existe;
   - retorna `{ ok, code, message, profile_id?, eleam_id?, email, email_sent, email_error?, email_skipped? }`.
5. El usuario recibe un enlace por correo para definir su contraseña.
6. Al entrar por primera vez completa `/cambiar-clave`.

Estados derivados en UI:

- `pending_request`: sin `demo_user_id`, estado no terminal.
- `account_demo`: con `demo_user_id`.
- `blocked_state`: estado `descartado` o `convertido`.

### Captura por WhatsApp

La landing incluye un botón flotante (FAB) de WhatsApp. Al hacer click abre un modal compacto con cuatro campos (nombre, ELEAM, correo, teléfono). Al enviar:

1. Guarda el lead en `demo_leads` usando la misma RPC `request_demo_lead` con `cargo='Contacto WhatsApp'`, `utm_source='whatsapp'`, `utm_medium='floating_button'`.
2. Abre `https://wa.me/<WHATSAPP_PHONE>` en nueva pestaña con un mensaje pre-cargado que contiene los datos del contacto.

Estos leads aparecen en `LeadsPanel` con un badge WhatsApp distintivo y un botón "Continuar WhatsApp" que reabre el chat con el teléfono registrado. Para cambiar el número destino, edita `WHATSAPP_PHONE` en `src/features/landing/whatsAppLeadUtils.js`.

### Admin ELEAM

- Administra residentes, camas, signos vitales, observaciones, acreditación y equipo.
- Paga la suscripción del ELEAM.
- Crea funcionarios/familiares desde `/equipo`.
- Crea habitaciones/camas desde `/camas` y gestiona ocupación, disponibilidad, traslados y liberaciones.
- Puede cargar residentes y funcionarios desde planillas Excel `.xlsx`; la importación está restringida a `admin_eleam`.
- Ajusta features visibles para funcionarios y familiares solo dentro de lo habilitado por superadmin.
- Usa un `AppShell` operacional: sidebar desktop abierto por defecto, colapsable a icon rail con preview por hover/focus en 0,3 segundos, y bottom nav en mobile.
- Las pantallas admin deben usar `PageLayout`/`PageHeader`, una acción primaria visible, filtros compactos y detalles secundarios en `details`, drawers o secciones avanzadas.

### Funcionario

- Acceso operativo a `/dashboard`, turnos, camas, residentes, signos, observaciones y acreditación según permisos por feature y `funcionario_permisos`.
- No paga ni gestiona equipo.
- Puede crear cuentas familiares vinculadas a residentes activos desde flujos operativos autorizados.
- Si el ELEAM pierde acceso vigente, queda bloqueado y debe contactar al admin ELEAM.

### Familiar

- Accede a `/familiar` y `/familiar/visitas`.
- Solo ve residentes vinculados por `familiar_residentes`.
- El portal consume `get_familiar_resident_snapshot(residente_id)`: residente, signos recientes, visitas propias, cuidados y medicación del día marcados como visibles.
- Observaciones, actividades de cuidado e indicaciones eMAR aparecen solo con `visible_familiar=true`; si existe `resumen_familiar`, ese texto reemplaza el detalle interno.
- Requiere que el ELEAM tenga demo o suscripción vigente.
- Sus features visibles también pueden restringirse por superadmin/admin ELEAM.

---

## Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing pública con formulario de demo. |
| `/login` | Inicio de sesión. |
| `/recuperar-acceso` | Solicitar recuperación de contraseña. |
| `/reset-password` | Definir nueva contraseña desde link de Supabase. |
| `/pago`, `/pago/return` | Suscripción MercadoPago. |
| `/dashboard` | Panel operativo staff. |
| `/turnos*` | Entrega de turno, tareas diarias de cuidado y eMAR por turno. |
| `/camas` | Inventario de habitaciones/camas, ocupación, asignación, transferencia y liberación. |
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

- Residentes: en `/residents`, solo `admin_eleam` ve `Cargar residentes desde Excel`. La planilla oficial incluye columnas claras como `Nombres *`, `Apellidos *`, `RUT`, `Fecha ingreso *`, estado clínico, dependencia, contacto y alergias. No incluye habitación/cama: la ubicación se asigna desde `/camas`.
- Funcionarios: en `/equipo`, solo `admin_eleam` puede usar `Cargar funcionarios desde Excel`. La planilla exige `Nombre completo *`, `Correo electrónico *` y `Cargo / plantilla de permisos *`.
- El modal descarga una plantilla `.xlsx` generada en el navegador con validaciones nativas de Excel para listas, fechas, rangos numéricos, email y campos obligatorios; al subirla igualmente normaliza fechas/RUT/enums y bloquea la importación si hay filas con errores.
- Residentes se crean fila a fila para reportar errores específicos sin perder los registros válidos ya creados. Funcionarios se crean mediante `create-staff-user`, por lo que se mantienen límites de plan, creación Auth, flujo Gmail/Google y correos de bienvenida.
- `read-excel-file` y `write-excel-file` se cargan dinámicamente solo al descargar o leer planillas; no forman parte del bundle inicial.

---

## Base de Datos

`supabase_schema.sql` crea 42 tablas:

- Multi-tenant: `profiles`, `eleams`, `planes`.
- Clínica: `residentes`, `signos_vitales`, `observaciones_diarias`, `turno_entregas`.
- Camas/ocupación: `habitaciones`, `camas`, `cama_asignaciones`, `camas_audit`.
- Plan de cuidado: `planes_cuidado`, `plan_cuidado_actividades`, `plan_cuidado_horarios`, `tareas_cuidado`, `plan_cuidado_audit`.
- eMAR: `medicamentos_indicaciones`, `medicamentos_horarios`, `medicamentos_administraciones`, `medicamentos_stock_lotes`, `medicamentos_stock_movimientos`, `medicamentos_conciliaciones`, `medicamentos_audit`.
- Equipo: `funcionario_invitaciones` (accesos Google pendientes), `funcionario_permisos`, `eleam_feature_permissions`, `profile_feature_permissions`, `familiar_residentes`, `visitas_familiar`.
- Pagos: `pagos`, `mp_webhook_events`.
- Acreditación: `acred_ambitos`, `acred_requisitos`, `acred_requisitos_eleam`, `acred_documentos`, `acred_observaciones`, `acred_audit`.
- CRM/blog: `crm_tasks`, `crm_interactions`, `blog_posts`.
- Landing/demo: `demo_leads`, `landing_events`.

Todas las tablas sensibles tienen RLS. `superadmin` accede vía `public.is_superadmin()`. Staff y familiar quedan aislados por `eleam_id` o vínculo de residente.

El acceso operativo también se filtra con `public.eleam_has_access(eleam_id)`: si el ELEAM no tiene demo/suscripción vigente, staff y familiares no pueden leer ni modificar fichas, registros, acreditación o documentos aunque conserven sesión de Supabase.

La ubicación del residente no se escribe como texto libre en la ficha. `residentes.cama_actual_id` apunta a `camas`, y la habitación se obtiene por `camas.habitacion_id -> habitaciones`. Las asignaciones, reservas por hospitalización, traslados y liberaciones se gestionan mediante `cama_asignaciones` y RPCs transaccionales para mantener historial y evitar doble ocupación.

---

## Permisos de Funcionarios

Tabla: `funcionario_permisos`.

Permisos actuales:

- `crear_residentes`, `editar_residentes`, `eliminar_residentes`
- `crear_signos_vitales`, `editar_signos_vitales`, `eliminar_signos_vitales`
- `crear_observaciones`, `editar_observaciones`, `eliminar_observaciones`
- `crear_planes_cuidado`, `editar_planes_cuidado`, `completar_tareas_cuidado`, `editar_indicaciones_cuidado`
- `crear_indicaciones_medicamentos`, `editar_indicaciones_medicamentos`, `administrar_medicamentos`
- `validar_medicamentos_controlados`, `ajustar_stock_medicamentos`
- `asignar_camas`
- `subir_acreditacion`, `editar_acreditacion`, `archivar_acreditacion`
- `registrar_visitas`

Los permisos se aplican en UI con `useAuth().can()` y en RLS con `public.funcionario_can()`.

## Permisos por Feature

Tablas:

- `eleam_feature_permissions`: superadmin habilita o bloquea features por ELEAM + rol.
- `profile_feature_permissions`: admin ELEAM ajusta features por usuario para funcionarios y familiares.

Reglas:

- Si no existe una fila, la feature queda habilitada por defecto.
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
npm run test:run
npm run test:contracts
npm run build
npx supabase functions list
```

Después de cambios en autenticación/autorización:

1. Re-ejecuta `supabase_schema.sql` completo en SQL Editor.
2. Despliega Edge Functions actualizadas:

```bash
npx supabase functions deploy
```

Smoke manual recomendado para demo/login:

1. Solicitar demo desde landing y verificar que el mensaje diga que la aprobación es manual.
2. Intentar Google login con correo de lead pendiente: debe mostrar aviso `DEMO_PENDING`, no error rojo.
3. Aprobar un lead pendiente desde `LeadsPanel`; repetir la aprobación y confirmar que responde "ya aprobado".
4. Simular fallo de email y verificar que el modal muestra aviso de que el usuario puede recuperar acceso desde el login.
5. Iniciar sesión desde enlace de acceso recibido y confirmar redirect a `/cambiar-clave`.
6. Entrar con demo vencido o ELEAM sin acceso y verificar mensaje diferenciado en `/pago?sinAcceso=1`.

Si `npm run build` vuelve a mostrar un chunk grande, revisa primero `src/routes/AppRouter.jsx`: las pantallas pesadas deben seguir cargándose con `React.lazy`.
