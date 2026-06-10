# FichaEleam

Plataforma SaaS para digitalizar fichas clínicas, gestión de camas, registros operativos, carpeta SEREMI y gestión comercial de ELEAM en Chile.

Stack principal: React 19, Vite 6, Tailwind CSS 4, Zod, Supabase (Auth, PostgreSQL, Storage, Edge Functions) y MercadoPago.

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
npm run build     # Build de producción en /dist + SEO/LLM prerender para cPanel
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

## Sitio Público Y Rendimiento

Las rutas públicas SEO (`/`, `/software-eleam`, `/acreditacion-seremi`, `/calculadora-dotacion-eleam`, `/blog`, `/blog/:slug`, `/preguntas-frecuentes`, `/contacto`) se cargan desde `src/routes/AppRouter.jsx` sin montar `AuthProvider`. El árbol autenticado vive en `src/routes/AuthenticatedApp.jsx` y se carga de forma lazy solo al entrar a `/login`, `/pago`, `/dashboard`, `/superadmin`, `/familiar` u otra ruta interna.

Las rutas SEO se montan bajo `PublicLayout` (`<Route element={<PublicLayout/>}>`), que renderiza `PublicShell` una sola vez con un `<Outlet/>`. Al navegar entre páginas públicas el navbar/footer/FAB **no se remontan** (sin parpadeo): solo cambia el cuerpo dentro de un `<Suspense>` contenido con `PublicRouteFallback`. Cada página obtiene `{openDemo, openWhatsApp}` con `useOutletContext()` y devuelve su contenido directamente; `PaymentPage` vive en `AuthenticatedApp` y mantiene su propio `PublicShell`.

`PublicShell` centraliza la navegación pública. El navbar incluye `Recursos gratuitos` con Blog, Calculadora y Guía acreditación SEREMI; el footer replica esos enlaces. Los links precargan su chunk al hover/focus (`prefetchPublicRoute` desde `src/routes/publicRoutes.js`) para que la navegación sea instantánea. Los modales de demo/WhatsApp, el FAB y Supabase Analytics se cargan bajo demanda para que la primera vista pública no precargue Supabase ni formularios pesados.

Checklist al cambiar páginas públicas:

- Mantener links públicos en `PublicShell` y en `scripts/generate-public-seo.mjs` cuando corresponda; registrar nuevas rutas públicas en `src/routes/publicRoutes.js` para que el prefetch las cubra.
- Usar `ScrollToTop`/anchors con `scroll-mt-public` para navegación interna y links desde footer.
- Envolver tablas en `overflow-x-auto` con `min-w-*`.
- Definir `width`, `height`, `decoding`, `fetchPriority` y `sizes` en imágenes públicas.
- Ejecutar `npm run build` y confirmar que `dist/index.html` no precarga `vendor-supabase` para la home pública.

---

## Estándar De Formularios

Los formularios nuevos o modificados deben usar la infraestructura compartida de `src/components/forms/FormKit.jsx`:

- `FormPage`, `FormHeader`, `FormSection` y `FormGrid` para layouts mobile-first.
- `TextField`, `TextareaField`, `SelectField`, `CheckboxField` o `ToggleField` para controles con labels, hints, errores y accesibilidad consistentes.
- `ErrorSummary` al inicio del `<form>` y `SubmitBar` para acciones sticky en mobile.
- `Notice` para estados recuperables: sin residentes activos, conexión fallida, permisos insuficientes o warnings operativos.

Las validaciones deben vivir en helpers o schemas testeables, no embebidas en JSX cuando el flujo tenga reglas de negocio. Usa `src/utils/formValidation.js` para normalizar texto, números, fechas, selects, errores Zod y mensajes backend orientados al usuario. Antes de enviar a Supabase/RPC, normaliza vacíos a `null`, aplica límites de longitud y conserva los nombres de payload esperados por el schema SQL.

Criterios mínimos antes de mergear cambios de formularios:

- Mobile: 1 columna por defecto, controles táctiles de altura estable y sin texto superpuesto.
- Errores: resumen superior, mensaje junto al campo, foco/scroll al primer error y textos accionables.
- Estados: submit deshabilitado durante guardado, feedback de éxito/fallo y recuperación clara.
- Producción: ejecutar `npm run lint`, `npm run test:run`, `npm run test:contracts` y `npm run build`.

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

## Seeds Públicos

`supabase_schema.sql` incluye el catálogo base de planes, requisitos, permisos y estructura operativa. Los 15 posts iniciales del blog están en `supabase_blog_seed.sql`; ejecútalo después del schema si necesitas poblar el blog público. Es idempotente (usa `on conflict (slug) do update`), así que puedes correrlo cuantas veces necesites.

```bash
# SQL Editor de Supabase o psql conectado al proyecto
\i supabase_blog_seed.sql
```

El seed QA completo con credenciales de prueba no está versionado en este repositorio. Si lo usas localmente, mantenlo fuera de git porque contiene usuarios y contraseñas operativas.

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

- `payment` / Pagos
- `preapproval` / Planes y suscripciones
- `subscription_authorized_payment` / Planes y suscripciones

4. Copia el secret del webhook a `MP_WEBHOOK_SECRET`. Debe coincidir exactamente con el secret vigente del webhook en MercadoPago; si se expone en una captura o chat, rota el secret en MercadoPago y vuelve a setearlo en Supabase.
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
- Es familiar creado por admin ELEAM o funcionario, siempre vinculado a un residente activo u hospitalizado.

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

El mismo modal sirve para múltiples puntos de entrada vía la prop `source`:

- `floating` (default): "Me gustaría conocer más sobre FichaEleam."
- `institutional`: "Tenemos más de 35 residentes y quisiera una cotización personalizada." (CTA del tier Institucional en la sección de precios)
- `pricing`: "Quisiera más información sobre los planes de FichaEleam."

### Estrategia de precios

Precios públicos en la landing (sección `#precios`). Cuatro tiers:

| Plan | Precio mensual | Residentes | Funcionarios |
|------|----------------|-----------:|-------------:|
| `plan-14` | $50.000 + IVA | 14 | 10 |
| `plan-24` | $80.000 + IVA | 24 | 20 |
| `plan-34` | $120.000 + IVA | 34 | 30 |
| Institucional (35+) | Cotización personalizada | A medida | A medida |

Precios netos (B2B Chile). JSON-LD del `SoftwareApplication` usa `AggregateOffer` con `UnitPriceSpecification.valueAddedTaxIncluded: false` para que motores y LLMs lean los precios correctamente.

Si cambias los precios:

1. Edita `PUBLIC_PLAN_CATALOG` en `src/features/payment/planCatalog.js`.
2. Edita el seed `public.planes` en `supabase_schema.sql` (`precio_clp`).
3. Actualiza el bloque `offers` del `SoftwareApplication` en `index.html`.

Reglas de cupo: residentes `activo` + `hospitalizado` consumen cupo; `egresado` y `fallecido` no. Funcionarios creados e invitaciones Gmail pendientes consumen cupo; familiares no consumen cupo de funcionarios. La UI bloquea altas/importaciones incompatibles y Supabase vuelve a validar con triggers/RPC.

Para cambiar el número de contacto institucional, edita `WHATSAPP_PHONE` en `whatsAppLeadUtils.js`.

### Admin ELEAM

- Administra residentes, camas, signos vitales, observaciones, acreditación y equipo.
- Paga la suscripción del ELEAM.
- Crea funcionarios/familiares desde `/equipo`.
- Al crear residentes, registra obligatoriamente un familiar vinculado con nombre, parentesco, email y teléfono; ese familiar es el contacto operativo único.
- Crea habitaciones/camas desde `/camas` y gestiona ocupación, disponibilidad, traslados y liberaciones.
- Puede cargar residentes y funcionarios desde planillas Excel `.xlsx`; la importación está restringida a `admin_eleam`.
- Ajusta features visibles para funcionarios y familiares solo dentro de lo habilitado por superadmin.
- Usa un `AppShell` operacional: sidebar desktop abierto por defecto, colapsable a icon rail con preview por hover/focus en 0,3 segundos, y bottom nav en mobile.
- Las pantallas admin deben usar `PageLayout`/`PageHeader`, una acción primaria visible, filtros compactos y detalles secundarios en `details`, drawers o secciones avanzadas.

### Funcionario

- Acceso operativo a `/dashboard`, turnos, camas, residentes, signos, observaciones y acreditación según permisos por feature y `funcionario_permisos`.
- No paga ni gestiona equipo.
- Puede crear cuentas familiares vinculadas a residentes activos u hospitalizados desde flujos operativos autorizados.
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
| `/software-eleam` | Página pública de producto. |
| `/acreditacion-seremi` | Guía pública de acreditación SEREMI / Decreto N°20. |
| `/calculadora-dotacion-eleam` | Calculadora pública de dotación DS20 con navegación interna. |
| `/preguntas-frecuentes` | FAQ pública. |
| `/contacto` | Contacto comercial público. |
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
| `/blog*` | Blog público dentro de Recursos gratuitos. |

---

## UX Autenticada

- `AppShell` centraliza navegación autenticada para admin ELEAM, funcionario, familiar y superadmin.
- `DesktopSidebar` inicia abierto en desktop para reducir fricción diaria; si se contrae, queda como icon rail y se abre temporalmente al posar el mouse o enfocar por teclado durante 0,3 segundos.
- El botón del sidebar solo se muestra cuando el menú está abierto y sirve para contraerlo. No hay botón de expandir en el rail; la apertura temporal ocurre por hover/focus.
- `MobileBottomNav` mantiene los accesos frecuentes y el menú "Más" agrupa módulos secundarios, cuenta y cierre de sesión.
- Las vistas admin ELEAM priorizan foco operacional: siguiente acción, alertas, métricas mínimas y filtros compactos. La información secundaria debe quedar plegada o en secciones de apoyo para evitar sobrecarga.
- `/pago` se renderiza como página pública cuando no hay sesión y como pantalla interna cuando el usuario está dentro del shell.

### Importación desde Excel

- Residentes: en `/residents`, solo `admin_eleam` ve `Cargar residentes desde Excel`. La planilla oficial incluye `Nombres *`, `Apellidos *`, `RUT`, `Fecha ingreso *`, estado clínico, dependencia, alergias y familiar obligatorio (`Familiar nombre *`, `Familiar parentesco *`, `Familiar email *`, `Familiar teléfono *`). No incluye contacto separado, Barthel/Katz ni habitación/cama: el familiar se crea como acceso vinculado y la ubicación se asigna desde `/camas`.
- Funcionarios: en `/equipo`, solo `admin_eleam` puede usar `Cargar funcionarios desde Excel`. La planilla exige `Nombre completo *`, `Correo electrónico *` y `Cargo / plantilla de permisos *`.
- El modal descarga una plantilla `.xlsx` generada en el navegador con validaciones nativas de Excel para listas, fechas, rangos numéricos, email y campos obligatorios; al subirla igualmente normaliza fechas/RUT/enums y bloquea la importación si hay filas con errores.
- Residentes se crean fila a fila y una fila solo cuenta como exitosa si quedan creados el residente y su familiar vinculado. Funcionarios se crean mediante `create-staff-user`, por lo que se mantienen límites de plan, creación Auth, flujo Gmail/Google y correos de bienvenida.
- `read-excel-file` y `write-excel-file` se cargan dinámicamente solo al descargar o leer planillas; no forman parte del bundle inicial.

---

## Formularios y Validación

- Los formularios nuevos o migrados usan Zod y el kit compartido en `src/components/forms/FormKit.jsx`.
- Los schemas reutilizables viven cerca del dominio; por ejemplo `src/features/residents/residentFormSchema.js` valida residente y familiar vinculado.
- Los errores se muestran inline, con resumen superior y foco/scroll al primer campo inválido. Los mensajes server-side se normalizan con `friendlyError`.
- Teléfonos familiares son obligatorios y se normalizan para Chile; RUT es opcional pero se valida si se informa.
- Barthel y Katz no se capturan en alta ni importación de residentes. Solo se guardan como cache en `residentes.indice_barthel` y `residentes.escala_katz`, sincronizado desde `evaluaciones_clinicas`.

---

## Base de Datos

`supabase_schema.sql` crea 44 tablas:

- Multi-tenant: `profiles`, `eleams`, `planes`.
- Clínica: `residentes`, `signos_vitales`, `observaciones_diarias`, `turno_entregas`.
- Camas/ocupación: `habitaciones`, `camas`, `cama_asignaciones`, `camas_audit`.
- Plan de cuidado: `planes_cuidado`, `plan_cuidado_actividades`, `plan_cuidado_horarios`, `tareas_cuidado`, `plan_cuidado_audit`.
- eMAR: `medicamentos_indicaciones`, `medicamentos_horarios`, `medicamentos_administraciones`, `medicamentos_stock_lotes`, `medicamentos_stock_movimientos`, `medicamentos_conciliaciones`, `medicamentos_audit`.
- Equipo: `funcionario_invitaciones` (accesos Google pendientes con nombre, teléfono y parentesco cuando aplica), `funcionario_permisos`, `eleam_feature_permissions`, `profile_feature_permissions`, `familiar_residentes`, `visitas_familiar`.
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
- `aplicar_evaluaciones_clinicas`

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

## Despliegue cPanel / HostGator

Para producción en `https://fichaeleam.cl`:

```bash
npm run build
```

Sube el contenido completo de `dist` al `public_html` del dominio en cPanel, incluyendo `.htaccess`, `robots.txt`, `sitemap.xml`, `llms.txt` y `og-image.png`.

El build ejecuta `vite build && node scripts/generate-public-seo.mjs`. El postbuild genera fallback SPA compatible con Apache, HTML prerenderizado para `/`, `/blog`, `/pago` y cada post publicado del blog, además de `robots`, `sitemap`, `llms`, JSON-LD y metadatos OG/Twitter con dominio canónico `https://fichaeleam.cl`.

Secrets productivos de Supabase:

```bash
npx supabase secrets set PUBLIC_APP_URL=https://fichaeleam.cl
npx supabase secrets set ALLOWED_ORIGINS="https://fichaeleam.cl"
```

Después de cambios en SQL o Edge Functions, re-ejecuta `supabase_schema.sql` y despliega `npx supabase functions deploy`.

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

Para cambios de rendimiento público, además revisa `dist/index.html`: la home no debe incluir `vendor-supabase` como `modulepreload`; Supabase debe cargarse por interacción, analítica o rutas autenticadas.
