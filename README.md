# FichaEleam

Plataforma SaaS para la digitalización de fichas clínicas, registros de atención diaria y documentación de acreditación SEREMI de **ELEAM** (Establecimientos de Larga Estadía para Adultos Mayores) en Chile, conforme al DS 14/2017.

---

## Inicio rápido

```bash
git clone <url-del-repositorio>
cd fichaEleam
npm install
cp .env.example .env   # Completar con credenciales de Supabase
npm run dev            # http://localhost:5173
```

---

## Variables de entorno

Editar `.env` con las credenciales del proyecto Supabase:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Si las variables no están configuradas, la aplicación sigue funcionando en `/`, `/login` y `/demo`. Las rutas protegidas muestran un error controlado.

---

## Configurar Supabase paso a paso

### 1. Crear el proyecto

1. Entrar a [app.supabase.com](https://app.supabase.com) e iniciar sesión.
2. Hacer clic en **New project**.
3. Elegir nombre, contraseña de BD y región (South America — São Paulo recomendado).
4. Esperar ~2 minutos a que el proyecto se inicialice.

### 2. Ejecutar el schema

1. Ir a **SQL Editor** (ícono `<>` en el menú lateral).
2. Hacer clic en **New query**.
3. Pegar el contenido completo de `supabase_schema.sql` y hacer clic en **Run**.

Esto crea todas las tablas, políticas RLS, Storage buckets, las 10 categorías de acreditación y la tabla `eleams` para gestión de suscripciones.

### 3. Obtener las credenciales

1. Ir a **Project Settings → API**.
2. Copiar **Project URL** → `VITE_SUPABASE_URL`.
3. Copiar **anon public** → `VITE_SUPABASE_ANON_KEY`.

### 4. Configurar Google OAuth (opcional)

1. En Supabase, ir a **Authentication → Providers → Google**.
2. Habilitar y agregar las credenciales OAuth de Google Cloud Console.
3. En Google Cloud Console, agregar `http://localhost:5173` como origen autorizado.
4. En Supabase, confirmar que **Site URL** apunte a `http://localhost:5173` en desarrollo y que las redirect URLs incluyan `http://localhost:5173/**`.

### 5. Configurar MercadoPago

Ver la sección **[Integración con MercadoPago](#integración-con-mercadopago-suscripciones-recurrentes)** más abajo. Resumen rápido:

1. Crear aplicación en [MercadoPago Developers](https://www.mercadopago.cl/developers/panel) y habilitar **Suscripciones (Preapproval)**.
2. Configurar webhook → URL: `https://<TU_PROYECTO>.functions.supabase.co/mp-webhook`. Eventos: `preapproval` y `subscription_authorized_payment`. Guardar el **Secret**.
3. Setear secrets en Supabase:
   ```bash
   supabase secrets set MP_ACCESS_TOKEN=APP_USR-...
   supabase secrets set MP_WEBHOOK_SECRET=<secret-del-webhook>
   supabase secrets set PUBLIC_APP_URL=https://app.fichaeleam.cl
   supabase secrets set ALLOWED_ORIGINS="https://app.fichaeleam.cl,http://localhost:5173"
   ```
4. Desplegar Edge Functions:
   ```bash
   supabase functions deploy mp-create-subscription
   supabase functions deploy mp-cancel-subscription
   supabase functions deploy invite-funcionario
   supabase functions deploy mp-webhook --no-verify-jwt
   ```

---

## Comandos

```bash
npm run dev       # Servidor de desarrollo con HMR en localhost:5173
npm run build     # Build de producción en /dist
npm run preview   # Sirve el build de producción localmente
npm run lint      # Análisis de código con ESLint
```

---

## Cómo funciona cada sección

### Landing page (`/`)

Página de alta conversión orientada a ELEAM. No requiere Supabase.

Incluye:
- Hero con propuesta de valor directa
- Lista de dolores concretos del público objetivo
- Beneficios y cómo funciona
- Precios por tramo de residentes
- Testimonios
- CTA principal a `/pago` y secundario a `/demo`

La landing tiene su propio Navbar (no usa el Navbar global de la app).

### Login (`/login`)

Funciona sin Supabase (muestra pantalla informativa y redirige al demo).

Con Supabase configurado:
- Login con Google (OAuth 2.0, requiere configuración adicional)
- Login con email y contraseña
- Botón prominente "Explorar demo sin registrarme" → `/demo`
- Mensajes de error claros y accesibles

### Demo (`/demo`)

**No se conecta a Supabase.** Funciona completamente offline.

El demo está pensado para **clientes potenciales** y se divide en tres
perfiles, todos accesibles desde el selector en `/demo`:

| Ruta | Perfil | Pensado para |
|------|--------|--------------|
| `/demo/admin`       | Soy dueño/director del ELEAM | El que firma la suscripción: ve dashboard, residentes, signos, observaciones, acreditación SEREMI, etc. |
| `/demo/funcionario` | Trabajo en un ELEAM | Personal de turno: registra signos vitales y observaciones; consulta acreditación pero no la modifica. |
| `/demo/familiar`    | Tengo un familiar en un ELEAM | Familiar autorizado: ve a su residente, sus signos y observaciones recientes y registra visitas. |

> El rol `superadmin` **no** tiene demo público — es exclusivo del
> dueño/operador de la plataforma (tú).

Condiciones del demo:
- Cada perfil muestra solo lo que ese rol vería en la versión real,
  con un banner amarillo permanente indicando "Estás explorando como
  [perfil]".
- Datos de ejemplo precargados (5 residentes, signos vitales,
  observaciones, acreditación, visitas familiares).
- Lo que el usuario ingresa en el demo de admin/funcionario se guarda
  en `localStorage` (`fichaeleam_demo_v1`); las visitas del demo
  familiar viven solo en estado de la sesión (no persiste entre recargas).
- Cada banner ofrece "Cambiar perfil" para volver al selector y
  "Activar versión real" para ir a `/pago`.

### Pago (`/pago`)

Página preparada para integrar un medio de pago.

Por ahora muestra:
- Tabla de planes por tramo de residentes
- Lista de funcionalidades incluidas
- Aviso claro de que el sistema de pago está en preparación
- CTA directo por email a `contacto@fichaeleam.cl`
- Banner de alerta cuando el usuario llega desde una ruta protegida sin pago activo (`?sinAcceso=1`)

---

## Lógica de pago activo

El pago está asociado al **ELEAM**, no al usuario individual.

### Flujo de acceso

```
Usuario inicia sesión
    ↓
¿profile.eleam_id existe?
    → No: se crea ELEAM automáticamente con pago_activo=false
    → Sí: continúa
    ↓
¿eleams.pago_activo = true?
    → No: redirige a /pago?sinAcceso=1
    → Sí: accede al dashboard
```

### Excepción: superadmin

Un usuario con `rol = 'superadmin'` en su perfil siempre tiene `pagoActivo = true`, independientemente del estado del ELEAM. Se usa para el usuario de prueba.

### ProtectedRoute

Verifica en orden:
1. `authLoading || profileLoading` → muestra spinner
2. `supabaseError` → muestra pantalla de error controlada
3. `!user` → redirige a `/login`
4. `!profile` → redirige a `/pago?sinAcceso=1`
5. `requireActive && !pagoActivo` → redirige a `/pago?sinAcceso=1`
6. `allowedRoles` no coincide → redirige a `/dashboard` o `/pago`
7. Renderiza el componente hijo

El Navbar usa el mismo estado de autorización: una cuenta sin activación ve solo Demo, Activar ELEAM y Cerrar sesión. Las vistas operativas quedan ocultas y bloqueadas por ruta.

---

## Roles de usuario

| Rol | Quién es | Pago | Acceso principal |
|-----|---------|------|------------------|
| `superadmin` | Dueño/operador de FichaEleam (tú) | n/a | `/superadmin` — métricas, todos los ELEAMs, pagos. |
| `admin_eleam` | Dueño/responsable del ELEAM | **Paga** | Operación clínica + `/equipo` + `/pago`. |
| `funcionario` | Personal clínico del ELEAM (enfermeras, TENS, médicos) | Heredado del admin | Operación clínica de **su ELEAM**. Sin acciones administrativas. |
| `familiar` | Familiar de un residente | Heredado del admin | Solo `/familiar` (un portal limitado a SU residente). |

### Matriz de permisos

| Acción / Vista                                  | superadmin | admin_eleam | funcionario | familiar |
|-------------------------------------------------|:----------:|:-----------:|:-----------:|:--------:|
| `/superadmin` (métricas + ELEAMs + pagos)       |     ✅     |             |             |          |
| `/dashboard` (panel del ELEAM)                  |            |     ✅      |     ✅      |          |
| `/residents` listar / crear residentes          |            |     ✅      |     ✅      |          |
| Editar residente                                |            |     ✅      |     ✅      |          |
| Eliminar residente                              |            |     ✅      |             |          |
| Registrar signos vitales / observaciones        |            |     ✅      |     ✅      |          |
| Eliminar signos vitales / observaciones         |            |     ✅      |             |          |
| Subir / consultar acreditación                  |            |     ✅      |     ✅      |          |
| Eliminar documentos de acreditación             |            |     ✅      |             |          |
| `/equipo` invitar funcionarios y familiares     |            |     ✅      |             |          |
| `/pago` contratar / cancelar suscripción        |            |     ✅      |             |          |
| Ver historial de pagos del ELEAM                |     ✅     |     ✅      |             |          |
| `/familiar` portal de su residente              |            |             |             |    ✅    |
| `/familiar/visitas` registrar visitas familiares|            |             |             |    ✅    |

### Cómo se crean

- **`superadmin`** se crea manualmente con SQL (ver más abajo).
- **`admin_eleam`** se crea solo: cualquier persona que se registra desde
  `/register` sin token de invitación queda como admin de un nuevo ELEAM.
- **`funcionario`** SOLO se crea por invitación desde `/equipo` (admin
  pulsa "Invitar funcionario", se genera un link de un solo uso que el
  funcionario abre y completa el registro).
- **`familiar`** igual que el funcionario, pero el admin elige
  obligatoriamente un **residente** del ELEAM al que se vinculará el
  familiar. El familiar solo verá ese residente.

### Cómo se garantiza esto en la BD

- RLS de `profiles_admin_eleam_select` permite al admin ver miembros de su ELEAM.
- Trigger `prevent_role_eleam_escalation` impide que un usuario
  cambie su `rol` o `eleam_id` por sí mismo.
- Trigger `handle_new_user` solo asigna `rol` distinto de `admin_eleam`
  si el signup trae un `invite_token` válido (token + email + no usado +
  no expirado), validado contra `funcionario_invitaciones`.
- `familiar_can_view_residente()` (security definer) restringe RLS de
  `residentes`, `signos_vitales`, `observaciones_diarias` y
  `visitas_familiar` para que el familiar solo vea SU residente.
- `documentos_acreditacion` y `pagos` no son visibles para `familiar`.

El pago activo se verifica así:

```js
const pagoActivo = profile?.rol === "superadmin"
  || ["activo", "en_gracia"].includes(eleam?.subscription_status)
  || eleam?.pago_activo === true;
```

> Tanto el `funcionario` como el `familiar` heredan el acceso del
> `admin_eleam`: si el admin deja de pagar, todos los del mismo ELEAM
> pierden acceso.

---

## Flujo end-to-end por rol

### 🟣 Superadmin (dueño de la plataforma)

1. Te creas una cuenta normal por `/register`.
2. En **Supabase SQL Editor** ejecutas
   `update public.profiles set rol = 'superadmin' where email = 'tu@email.cl';`
3. Cierras sesión y vuelves a entrar.
4. `homePath = /superadmin`. El Navbar solo muestra **Superadmin**, **Demo** y **Cerrar sesión**.
5. Desde `/superadmin` ves todos los ELEAMs, métricas, pagos.
6. RLS te permite leer todo (`is_superadmin()`); las escrituras solo
   sobre `eleams`, `pagos`, `planes`. Las tablas clínicas no son
   modificables por ti — eso queda dentro de cada ELEAM.

### 🟢 Admin del ELEAM (paga la suscripción)

1. `/register` sin token de invitación.
2. El trigger `handle_new_user` crea **un ELEAM nuevo** (`subscription_status='inactivo'`)
   y un profile `rol='admin_eleam'` vinculado.
3. Login → `homePath = /pago?sinAcceso=1`.
4. En `/pago` elige plan → Edge Function `mp-create-subscription` →
   redirección a MercadoPago → checkout → webhook `preapproval` →
   `subscription_status='activo'` → `pago_activo=true`.
5. Ya con pago: `homePath = /dashboard`. Navbar incluye **Equipo** y **Suscripción**.
6. En `/equipo` invita funcionarios y familiares. La invitación
   genera un link `/register?invite=<token>&email=<correo>` para
   compartir. Los funcionarios ocupan cupo del plan; los familiares no.
7. En `/pago` puede cancelar. Tras cancelar, mantiene acceso hasta
   `fecha_vencimiento_suscripcion` (período de gracia).

### 🟦 Funcionario (creado por admin)

1. El admin escribe su email en `/equipo` → tab Funcionarios → genera link.
2. El admin envía el link al funcionario.
3. El funcionario abre `/register?invite=...&email=...`. El email
   queda **read-only**.
4. signUp envía `user_metadata.invite_token`. El trigger
   `handle_new_user` valida el token (email + no usado + no expirado),
   asigna `rol='funcionario'` + `eleam_id` y marca la invitación como usada.
5. Login → `homePath = /dashboard`.
6. Navbar: Dashboard, Residentes, Signos Vitales, Observaciones, Acreditación.
   **NO** ve Equipo ni Suscripción ni Superadmin.
7. Puede crear y editar residentes, signos y observaciones. **NO**
   puede borrarlos (botón ausente + RLS lo bloquea). **NO** puede
   gestionar acreditación ni ver historial de pagos.

### 🟡 Familiar (creado por admin, ligado a un residente)

1. El admin abre `/equipo` → tab **Familiares** → escoge el residente
   del ELEAM y escribe el email del familiar.
2. La Edge Function valida que el residente pertenezca al ELEAM y
   crea la invitación (`rol='familiar'`, `residente_id=...`).
3. El familiar abre el link y se registra. El trigger crea profile
   `rol='familiar'` + `eleam_id` + **fila en `familiar_residentes`**
   con el `residente_id` de la invitación.
4. Login → `homePath = /familiar`.
5. Navbar: **Mi residente**, **Visitas**, **Cerrar sesión**.
6. `/familiar`: ve datos del residente, últimos signos vitales con
   código de color, observaciones recientes, sus visitas.
7. `/familiar/visitas`: registra visitas (fecha + duración + notas).
8. **No** ve otros residentes, **no** ve documentos de acreditación,
   **no** ve pagos. RLS lo enforza con
   `familiar_can_view_residente()` y `my_familiar_residente_ids()`.

---

## Panel Superadmin (`/superadmin`)

Ruta exclusiva para usuarios con `rol = 'superadmin'`. Protegida por `SuperAdminRoute` que redirige a `/dashboard` si el rol no coincide.

### Funcionalidades

| Sección | Descripción |
|---------|-------------|
| Métricas | ELEAMs totales, suscripciones activas, demos, nuevos registros del mes, residentes totales, ingresos del mes (suma de pagos CLP) |
| Tabla de ELEAMs | Lista completa con búsqueda, plan, estado (activo/inactivo), fecha de vencimiento, fecha de registro |
| Editar ELEAM | Activar/desactivar suscripción, cambiar plan, ajustar máx. de residentes, establecer fecha de vencimiento, notas internas |
| Registrar Pago | Asignar pago a ELEAM (monto CLP, plan, método, notas) — activa automáticamente la suscripción |
| Últimos Pagos | Historial de los 20 pagos más recientes con ELEAM, monto, plan y estado |

### Cómo crear el primer superadmin

1. Registrar una cuenta normal en la aplicación.
2. Ir a **Supabase Dashboard → SQL Editor** y ejecutar:

```sql
UPDATE public.profiles
SET rol = 'superadmin'
WHERE email = 'tu@email.com';
```

3. Cerrar sesión y volver a iniciar sesión.
4. Navegar a `/superadmin` — la ruta aparece automáticamente en el Navbar.

> El superadmin **no necesita** un ELEAM asociado. Las políticas RLS (`is_superadmin()`) le dan acceso de lectura global y acceso de escritura a `eleams` y `pagos`.

### Tabla `pagos`

Registra cada pago recibido de un ELEAM. No es una integración con pasarela de pago (eso es futuro), sino un registro manual hecho por el superadmin.

| Columna | Descripción |
|---------|-------------|
| `eleam_id` | FK → eleams |
| `monto` | Monto en CLP (entero, > 0) |
| `plan` | `mensual` o `anual` |
| `fecha_inicio` / `fecha_fin` | Período de vigencia del pago |
| `metodo_pago` | Transferencia, tarjeta, etc. (texto libre) |
| `estado` | `pendiente`, `completado`, `fallido`, `reembolsado` |
| `registrado_por` | UUID del superadmin que registró el pago |

---

## Usuario de prueba

> **Solo para desarrollo y demostración. Eliminar o deshabilitar al integrar el pago real.**

### Datos

| Campo    | Valor |
|----------|-------|
| Email    | `demo@fichaeleam.cl` |
| Password | `FichaEleam2025!` |
| Rol      | `superadmin` |
| Estado pago | Siempre activo |

### Configuración manual

1. Crear el usuario en **Supabase Dashboard → Authentication → Users**:
   - Email: `demo@fichaeleam.cl`
   - Password: `FichaEleam2025!`
   - Confirmar email directamente desde el panel (sin esperar correo)

2. El trigger `on_auth_user_created` lo asocia automáticamente al ELEAM de prueba con `rol='superadmin'`.

3. Si el usuario ya existía antes de ejecutar el schema v2, ejecutar en SQL Editor:
   ```sql
   UPDATE public.profiles
   SET rol = 'superadmin',
       eleam_id = 'a0000000-0000-0000-0000-000000000001'
   WHERE email = 'demo@fichaeleam.cl';
   ```

### Por qué funciona sin pago

En `AuthContext`, la variable `pagoActivo` es `true` si `profile.rol === 'superadmin'`, sin importar el estado del ELEAM. El ELEAM de prueba también tiene `pago_activo = true` en la base de datos por redundancia.

---

## Rutas sin Supabase

| Ruta | Supabase requerido | Comportamiento sin Supabase |
|------|--------------------|-----------------------------|
| `/` | No | Funciona normalmente |
| `/login` | No* | Muestra pantalla informativa + botón al demo |
| `/demo`, `/demo/admin`, `/demo/funcionario`, `/demo/familiar` | No | Selector + 3 demos por perfil, mock data |
| `/pago` | No | Funciona normalmente |
| `/dashboard` | Sí | Muestra pantalla de error controlada |
| `/residents/*` | Sí | Muestra pantalla de error controlada |
| `/vital-signs/*` | Sí | Muestra pantalla de error controlada |
| `/observations/*` | Sí | Muestra pantalla de error controlada |
| `/accreditation/*` | Sí | Muestra pantalla de error controlada |

*El login detecta si Supabase está disponible y adapta la UI.

---

## Integración con MercadoPago (suscripciones recurrentes)

FichaEleam cobra **una suscripción mensual por ELEAM**. El admin del ELEAM
paga; los funcionarios del mismo ELEAM acceden gratis mientras la
suscripción del admin esté activa. Cada plan define el máximo de
residentes activos y de funcionarios; los triggers de la BD bloquean los
inserts si el plan se llena.

### Modelo

- Tabla `planes` — catálogo de planes (`plan-14`, `plan-24`, `plan-34`).
- Columnas nuevas en `eleams`: `plan_id`, `mp_preapproval_id`,
  `mp_payer_email`, `subscription_status`, `proximo_cobro_en`,
  `cancelado_en`, `max_funcionarios`.
- Tabla `mp_webhook_events` — auditoría e idempotencia de webhooks.
- Tabla `funcionario_invitaciones` — admin invita funcionarios con
  un token de un solo uso (validado por trigger en signup).
- Edge Functions:
  - `mp-create-subscription` — crea preapproval, devuelve `init_point`.
  - `mp-webhook` — público (sin JWT), valida firma HMAC, refresca DB.
  - `mp-cancel-subscription` — admin cancela preapproval.
  - `invite-funcionario` — admin invita funcionario al ELEAM.

### Estados de la suscripción

| `subscription_status` | Significado | Acceso (`pago_activo`) |
|-----------------------|-------------|------------------------|
| `inactivo`            | No ha contratado nunca | ❌ |
| `pendiente`           | Preapproval creado, esperando autorización en MP | ❌ |
| `activo`              | Pago vigente | ✅ |
| `en_gracia`           | MP está reintentando un cobro fallido | ✅ |
| `pausado`             | Pausa manual desde MP | ❌ |
| `cancelado`           | Admin canceló | ❌ |
| `vencido`             | Sin pago tras período de gracia | ❌ |

`pago_activo` se sincroniza automáticamente via trigger
`sync_pago_activo` en cada cambio de `subscription_status`.

### Variables de entorno (server-side)

Se setean como **secrets de Supabase** (no van en `.env` del frontend):

```bash
# Token de acceso de MP (PROD: APP_USR-... · TEST: TEST-...)
supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxx

# Secreto del webhook (Dashboard MP → Webhooks → "Secret")
supabase secrets set MP_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx

# URL pública de tu app (para back_url y links de invitación)
supabase secrets set PUBLIC_APP_URL=https://app.fichaeleam.cl

# Orígenes permitidos en CORS (CSV)
supabase secrets set ALLOWED_ORIGINS="https://app.fichaeleam.cl,http://localhost:5173"
```

### Pasos en la cuenta de MercadoPago

> Hazlo dos veces: una con credenciales **sandbox** para testing y otra con
> credenciales **producción** cuando vayas a operar.

1. **Crear cuenta de empresa en MercadoPago Chile** ([www.mercadopago.cl](https://www.mercadopago.cl)).
   - Verifica la cuenta (RUT, datos bancarios, email).

2. **Crear una "Aplicación"** en
   [Dashboard → Tus integraciones → Crear aplicación](https://www.mercadopago.cl/developers/panel).
   - Modelo: **Pagos online**.
   - Producto: **Suscripciones (Preapproval)**.
   - Marca como **Producción** cuando termines QA.

3. **Copiar credenciales** desde la aplicación recién creada:
   - **Production Access Token** → `MP_ACCESS_TOKEN` (en producción).
   - **Test Access Token** → `MP_ACCESS_TOKEN` (en sandbox).
   - *(La Public Key NO es necesaria con el flujo de redirect que usamos.)*

4. **Configurar el Webhook** en
   *Dashboard → Tu aplicación → Webhooks*:
   - **URL de notificación**:
     `https://<TU_PROYECTO_SUPABASE>.functions.supabase.co/mp-webhook`
   - **Eventos a escuchar**:
     - ✅ `Suscripciones (preapproval)`
     - ✅ `Pagos autorizados (subscription_authorized_payment)`
     - *(Opcional: `Pagos`)*
   - Copia el **Secret** generado y guárdalo en `MP_WEBHOOK_SECRET`.

5. **Activar el dominio** del frontend en
   *Dashboard → Aplicación → Configuración → URLs permitidas*
   (origin en `back_url`, ej. `https://app.fichaeleam.cl`).

6. **Verificar los planes en la BD** — el seed inserta tres planes en CLP.
   Si quieres cambiar precios, edita la tabla `planes` o pídele al
   superadmin que lo haga vía panel.

### Desplegar las Edge Functions

```bash
# Instalar la CLI si aún no la tienes
npm install -g supabase

# Login y vincula tu proyecto
supabase login
supabase link --project-ref <TU_PROJECT_REF>

# Desplegar las cuatro funciones
supabase functions deploy mp-create-subscription
supabase functions deploy mp-cancel-subscription
supabase functions deploy invite-funcionario

# El webhook NO requiere JWT (lo declara supabase/config.toml)
supabase functions deploy mp-webhook --no-verify-jwt
```

> Las primeras tres funciones validan el JWT del usuario autenticado
> (`verify_jwt = true`). El webhook usa firma HMAC en su lugar.

### Probar la integración

1. Crear un comprador y vendedor de prueba en
   [Dashboard MP → Cuentas de prueba](https://www.mercadopago.cl/developers/panel/test-users).
2. Inicia sesión en FichaEleam con el admin del ELEAM.
3. En `/pago`, elige un plan → te redirige al `init_point` de MP.
4. Paga con la tarjeta de prueba `5031 7557 3453 0604` (Mastercard sandbox)
   — código de seguridad `123` y RUT `12.345.678-5`.
5. Después del pago, MP te trae a `/pago/return`. El backend recibe el
   webhook `preapproval` con `status=authorized` y marca el ELEAM como
   activo. El frontend hace polling al perfil hasta verlo activo.
6. Comprueba que `eleams.subscription_status = 'activo'` y que se creó
   un row en `mp_webhook_events` con `signature_ok = true`.

### Seguridad implementada

- **Tokens server-side**: `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` viven
  solo como Edge Function secrets. El frontend nunca los ve.
- **Firma HMAC**: cada webhook se valida contra el manifest oficial
  `id:<dataId>;request-id:<requestId>;ts:<ts>;` con HMAC-SHA-256 y
  comparación constant-time. Tolerancia de 600 s sobre el `ts` para
  mitigar replays.
- **Idempotencia**: `mp_webhook_events.mp_request_id` es UNIQUE; un
  retry de MP se descarta sin reprocesar.
- **`X-Idempotency-Key`** se envía en cada `POST /preapproval`.
- **`external_reference` validado**: el handler busca el ELEAM por
  `external_reference` y rechaza si no existe.
- **RLS multi-tenant**: las tablas `pagos`, `funcionario_invitaciones`,
  `eleams` solo se ven con `eleam_id` del usuario o vía `is_superadmin()`.
- **Triggers anti-escalada**: `prevent_role_eleam_escalation` impide
  que un funcionario se cambie su `rol` o su `eleam_id`.
- **Triggers de límite**: `check_residentes_limit` y
  `check_funcionarios_limit` aplican el cupo del plan en la BD.
- **Trigger de invitaciones**: `handle_new_user` valida el
  `invite_token` contra `funcionario_invitaciones` (token + email +
  no usado + no expirado) y lo marca consumido.

### Reglas de negocio enforzadas

| Regla | Cómo se aplica |
|-------|---------------|
| Admin paga, funcionarios no | Edge `mp-create-subscription` rechaza si `rol ≠ admin_eleam`. |
| Funcionarios acceden con suscripción del admin | `pago_activo` se calcula sobre `subscription_status` del ELEAM, no por usuario. |
| Cupo de residentes | Trigger `check_residentes_limit` en `residentes`. |
| Cupo de funcionarios | Trigger `check_funcionarios_limit` en `profiles` + check proactivo en `invite-funcionario`. |
| Solo admin invita funcionarios | RLS en `funcionario_invitaciones` + Edge function. |
| Funcionario no puede cambiar de ELEAM | Trigger `prevent_role_eleam_escalation`. |
| Suscripción ya activa no se duplica | `mp-create-subscription` rechaza si `subscription_status in ('activo','en_gracia')`. |
| Invitaciones expiran | Token con TTL de 7 días + `usado` único uso. |

### Cancelación

El admin pulsa "Cancelar suscripción" en `/pago`:
1. Frontend llama a `mp-cancel-subscription`.
2. Edge function hace `PUT /preapproval/{id}` con `{status: "cancelled"}`.
3. Marca el ELEAM como `cancelado` en la BD.
4. MercadoPago no vuelve a cobrar; el acceso se mantiene hasta
   `proximo_cobro_en` (manejado por el webhook al cierre del ciclo).

### Qué queda pendiente (futuro)

- **Recordatorios de vencimiento**: cron / `pg_cron` que avisa por email
  cuando `proximo_cobro_en < now() + 3d`.
- **Job de marcado vencido**: si pasan N días en `en_gracia` sin
  reintento exitoso, marcar `vencido` y suspender acceso.
- **Cambio de plan**: hoy hay que cancelar y volver a contratar.
  Implementar `PUT /preapproval/{id}` actualizando `transaction_amount`.
- **Reportes financieros**: vista Superadmin con MRR, churn, conversion.

---

## Qué tener listo para producción

1. Asegurarte de cambiar `MP_ACCESS_TOKEN` de Test a Producción.
2. Desplegar las Edge Functions en el proyecto Supabase de producción.
3. Configurar el webhook con la URL de producción y guardar el
   `MP_WEBHOOK_SECRET` correspondiente.
4. Eliminar (opcional) la lógica del usuario de prueba
   `demo@fichaeleam.cl` en el trigger `handle_new_user` y la
   inserción del ELEAM demo, si no quieres exponer la cuenta demo
   en producción.

---

## Estructura del proyecto

```
src/
├── components/
│   ├── Button.jsx, Input.jsx, Loading.jsx   # UI base
│   ├── ErrorBoundary.jsx                    # Captura errores no manejados
│   ├── Modal.jsx                            # Modal accesible (Escape, backdrop, aria)
│   ├── Navbar.jsx                           # Nav global (lee useAuth, sin props)
│   ├── ProtectedRoute.jsx                   # Guarda sesión, cuenta activa y roles
│   ├── SuperAdminRoute.jsx                  # Guarda exclusiva rol superadmin
│   ├── SupabaseError.jsx                    # Error cuando Supabase no responde
│   └── Toast.jsx                            # Sistema de notificaciones
├── context/
│   └── AuthContext.jsx    # user, profile, eleam, pagoActivo, profileLoading
├── features/
│   ├── accreditation/     # Documentación SEREMI DS 14/2017
│   ├── auth/              # Login (email/password), Register, authService
│   ├── dashboard/         # AdminDashboard + dashboardService (loadDashboard)
│   ├── demo/              # DemoSelector + DemoPage(role) + FamiliarDemoPage, mockData, demoService
│   ├── landing/           # LandingPage de alta conversión
│   ├── observations/      # Observaciones diarias (filtros fecha + tipo)
│   ├── payment/           # PaymentPage (placeholder integración pago)
│   ├── residents/         # CRUD residentes (escala Katz, egreso, tabs lazy)
│   ├── superadmin/        # SuperAdminDashboard + superadminService
│   └── vitalSigns/        # Registro de signos vitales, rangos clínicos y tarjetas visuales
├── routes/
│   └── AppRouter.jsx      # Rutas + /superadmin + ocultamiento de Navbar
├── services/
│   └── supabaseConfig.js  # Cliente Supabase (null si no configurado)
└── utils/
    └── validators.js      # validateEmail, validateRut (mod-11), isValidUUID, validatePhone
```

---

## Despliegue en producción

1. Configurar variables de entorno en la plataforma de hosting.
2. `npm run build` genera `/dist` listo para servir.
3. Configurar redirect SPA: todas las rutas → `/index.html` (necesario en Netlify, Vercel, Nginx).

**Netlify**: crear `public/_redirects` con `/* /index.html 200`.
**Vercel**: automático con framework React/Vite.
**Nginx**: `try_files $uri $uri/ /index.html;`

---

## UX operativa

La interfaz está pensada para equipos ELEAM que trabajan por turnos:

- Dashboard con prioridades del turno, alertas clínicas, acreditación, ocupación y seguimiento pendiente.
- Signos vitales con rangos visuales por parámetro: normal, atención y crítico.
- Formularios que advierten cuando no hay residentes activos antes de intentar guardar.
- Listas con filtros rápidos, tarjetas legibles y tablas compactas para uso repetido.
- Navegación protegida según sesión, pago activo y rol del usuario.
