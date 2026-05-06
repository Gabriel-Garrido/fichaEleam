# FichaEleam

Plataforma SaaS para digitalización de fichas clínicas, registros de atención diaria y documentación de acreditación SEREMI de **ELEAM** (Establecimientos de Larga Estadía para Adultos Mayores) en Chile, según DS 14/2017.

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

Esto crea todas las tablas (21 en total), políticas RLS, Storage buckets, los **14 ámbitos** de acreditación SEREMI y los **~70 requisitos** del catálogo.

### 3. Obtener las credenciales

1. Ir a **Project Settings → API**.
2. Copiar **Project URL** → `VITE_SUPABASE_URL`.
3. Copiar **anon public** → `VITE_SUPABASE_ANON_KEY`.
4. Agregar a `.env`.

### 4. Crear Storage bucket

1. Ir a **Storage** en el menú lateral.
2. Hacer clic en **New bucket**.
3. Nombre: `documentos-acreditacion` (privado).

### 5. Promover el primer superadmin

Ejecuta en **SQL Editor**:
```sql
UPDATE public.profiles
SET rol = 'superadmin'
WHERE email = 'tu@email.com';
```

Luego cierra sesión y vuelve a ingresar. Acceso garantizado a `/superadmin`.

---

## Variables de entorno

Copiar `.env.example` → `.env`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Si las variables no están configuradas, la aplicación funciona en `/`, `/login` y `/demo`. Las rutas protegidas muestran error controlado.

---

## Comandos

```bash
npm run dev       # Servidor en localhost:5173 con HMR
npm run build     # Build en /dist
npm run lint      # ESLint check
npm run preview   # Sirve /dist localmente
```

---

## Documentación

- **[CLAUDE.md](./CLAUDE.md)** — Documentación técnica completa: arquitectura, rutas, base de datos, flujos por rol, seguridad.
- **[codex.md](./codex.md)** — Guía de desarrollo (resumen + links a CLAUDE.md).

---

## Integración MercadoPago (Suscripciones)

FichaEleam cobra una suscripción mensual por ELEAM. El admin paga; el staff accede gratis mientras esté activa.

### Setup (Sandbox primero, luego Producción)

1. **Crear cuenta de empresa en [www.mercadopago.cl](https://www.mercadopago.cl)**.
   - Verificar RUT, datos bancarios, email.

2. **Crear "Aplicación"** en [Dashboard → Tus integraciones → Crear aplicación](https://www.mercadopago.cl/developers/panel).
   - Modelo: Pagos online
   - Producto: Suscripciones (Preapproval)

3. **Copiar credenciales** de la aplicación:
   - **Test/Production Access Token** → `MP_ACCESS_TOKEN`
   - *(La Public Key no es necesaria.)*

4. **Configurar Webhook** en *Dashboard → Tu aplicación → Webhooks*:
   - **URL**: `https://<TU_PROYECTO>.functions.supabase.co/mp-webhook`
   - **Eventos**: Suscripciones (preapproval) + Pagos autorizados (subscription_authorized_payment)
   - **Secret** → `MP_WEBHOOK_SECRET`

5. **Setear secrets en Supabase**:
   ```bash
   supabase login
   supabase link --project-ref <TU_PROJECT_REF>
   
   supabase secrets set MP_ACCESS_TOKEN=TEST-...
   supabase secrets set MP_WEBHOOK_SECRET=<secret>
   supabase secrets set PUBLIC_APP_URL=http://localhost:5173
   supabase secrets set ALLOWED_ORIGINS="http://localhost:5173"
   ```

6. **Desplegar Edge Functions**:
   ```bash
   supabase functions deploy mp-create-subscription
   supabase functions deploy mp-cancel-subscription
   supabase functions deploy invite-funcionario
   supabase functions deploy mp-webhook --no-verify-jwt
   ```

### Probar la integración

1. Crea comprador/vendedor de prueba en [Cuentas de prueba MP](https://www.mercadopago.cl/developers/panel/test-users).
2. Inicia sesión en FichaEleam con un admin.
3. Ve a `/pago` → elige plan → redirige a MP.
4. Paga con tarjeta sandbox `5031 7557 3453 0604` (Mastercard), CVV `123`, RUT `12.345.678-5`.
5. Después del pago, FichaEleam recibe el webhook y marca ELEAM como `activo`.

---

## Despliegue en producción

1. Cambiar `MP_ACCESS_TOKEN` a Token de Producción.
2. Desplegar Edge Functions en proyecto Supabase de producción.
3. Configurar webhook con URL de producción.
4. Configurar redirect SPA:
   - **Netlify**: crear `public/_redirects` con `/* /index.html 200`.
   - **Vercel**: automático con Vite.
   - **Nginx**: `try_files $uri $uri/ /index.html;`

---

## Flujos por rol

### Admin del ELEAM

1. `/register` sin token de invitación → crea ELEAM nuevo con `pago_activo=false`.
2. Redirige a `/pago?sinAcceso=1`.
3. Elige plan → checkout MercadoPago → webhook activa suscripción.
4. Acceso a `/dashboard`, `/equipo` (invitar staff), `/accreditation` (carpeta SEREMI).

### Funcionario

1. Admin invita vía email desde `/equipo`.
2. Funcionario abre link `/register?invite=TOKEN&email=...`.
3. Signup valida token → se asigna al ELEAM.
4. Acceso a `/dashboard`, crear signos/observaciones (sin eliminar, sin admin).

### Familiar

1. Admin invita vía `/equipo` → selecciona residente específico.
2. Familiar se registra → acceso a `/familiar` (solo ese residente).
3. Puede registrar visitas en `/familiar/visitas`.

### Superadmin

1. Correo promocionado a `superadmin` vía SQL o automáticamente en signup.
2. Acceso a `/superadmin` — CRM, métricas, gestión de ELEAMs, pagos, blog.

---

## Panel Superadmin (`/superadmin`)

CRM interno de la plataforma. Solo para `rol=superadmin`.

### Funcionalidades

| Sección | Descripción |
|---------|-------------|
| **Métricas (KPIs)** | ELEAMs totales, activos, leads, en riesgo, residentes, MRR. |
| **Tabla de ELEAMs** | Búsqueda, filtro por estado/plan/pago/riesgo. Edición inline. |
| **Salud del cliente** | Combina pago, vencimiento, contacto, riesgo, tareas → healthy/warning/risk. |
| **Registrar pago** | Monto, plan, método, período → activa suscripción + interacción CRM. |
| **Tareas CRM** | Crear, completar, vencimiento, prioridad. |
| **Interacciones** | Historial de contactos (call, email, meeting, etc.). |
| **Blog editor** | Crear/editar posts con SEO (meta_title, keywords, JSON-LD Article). |

Ver [CLAUDE.md — CRM Superadmin](./CLAUDE.md#crm-superadmin) para detalles completos.

---

## Demo

Ruta `/demo` — selector offline con localStorage, sin Supabase.

| Perfil | Ruta | Permite |
|--------|------|---------|
| Admin | `/demo/admin` | CRUD residentes, signos, observaciones, acreditación (upload simulado). |
| Funcionario | `/demo/funcionario` | Igual que admin sin botón de upload. |
| Familiar | `/demo/familiar` | Ver residente asignado, últimos signos, visitas. |

Datos precargados en localStorage. Banner amarillo permanente indica modo demo.

---

## Blog público y SEO

### Blog

- `/blog` — listado público.
- `/blog/:slug` — post individual con JSON-LD Article + Breadcrumb.
- Markdown renderer propio (sin deps), soporta tablas, código, listas, blockquotes.
- Meta tags: Open Graph, Twitter cards, canonical.

### Gestión

- `/superadmin/blog` — listado.
- `/superadmin/blog/new` y `/superadmin/blog/:id/edit` — editor con preview.
- RLS: solo `superadmin` crea/publica. Público ve `estado=publicado`.

### SEO global

- `robots.txt` permite explícitamente GPTBot, ClaudeBot, PerplexityBot.
- `sitemap.xml` con URLs públicas.
- `useSEO()` hook inyecta meta tags + JSON-LD por ruta (sin react-helmet).
- `FAQPage` JSON-LD en landing + demo selector.

---

## Estructura del proyecto

```
src/
├── components/           # UI base: Button, Input, Modal, Toast, Loading, etc.
├── context/AuthContext   # useAuth(), useLoading() — estado global
├── features/
│   ├── auth/             # Login, Register
│   ├── landing/          # LandingPage (público)
│   ├── blog/             # Blog público + utilidades
│   ├── dashboard/        # AdminDashboard (índice operativo)
│   ├── residents/        # CRUD residentes + detalles
│   ├── vitalSigns/       # Signos vitales + rangos clínicos
│   ├── observations/     # Observaciones diarias (12 tipos)
│   ├── accreditation/    # Carpeta SEREMI DS 14/2017
│   ├── payment/          # MercadoPago integration
│   ├── team/             # Invitar staff + cambio de clave
│   ├── familiar/         # Portal de familiar + visitas
│   ├── demo/             # Demo offline
│   └── superadmin/       # CRM, blog editor, pagos
├── routes/AppRouter      # Rutas con guards
├── services/             # Supabase client + servicios
└── utils/                # Validators, dateUtils, SEO
```

---

## Seguridad

- **RLS multi-tenant**: Cada ELEAM aislado. `eleam_id` en BD enforza acceso.
- **Permisos granulares**: Funcionarios con permisos específicos vía `funcionario_permisos`.
- **Storage scoped**: Documentos en `acreditacion/{eleamId}/...`, RLS filtra por tenant.
- **HMAC webhook**: MercadoPago webhook validado con firma HMAC SHA-256.
- **Invitaciones**: Token de 7 días, un solo uso, email validado.
- **Triggers anti-escalada**: No se puede cambiar `rol` ni `eleam_id` por sí mismo.

---

## Archivos clave

- **`supabase_schema.sql`** — Schema completo (21 tablas, RLS, triggers, funciones).
- **`CLAUDE.md`** — Documentación técnica detallada.
- **`src/context/AuthContext.jsx`** — `useAuth()` con helpers de rol/permisos.
- **`src/components/ProtectedRoute.jsx`** — Guard de sesión, pago, rol.
- **`src/features/vitalSigns/vitalRanges.js`** — Rangos clínicos para adultos mayores.
- **`src/utils/seo.js`** — Hook SEO + builders JSON-LD.

---

## Support

Consulta **[CLAUDE.md](./CLAUDE.md)** para documentación completa (rutas, BD, flujos, RLS, componentes).
