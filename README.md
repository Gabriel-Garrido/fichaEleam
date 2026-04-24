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
3. Agregar `http://localhost:5173` como URL de redireccionamiento autorizado en Google.

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

Condiciones:
- Datos de ejemplo precargados (3 residentes, signos vitales, observaciones)
- El usuario puede agregar registros — se guardan solo en `localStorage` del navegador
- Banner amarillo permanente: "Datos ficticios — solo en este navegador"
- Mensajes de conversión integrados en cada pestaña
- CTA a `/pago` en múltiples puntos
- Botón "Borrar datos" limpia el localStorage del demo
- Pestañas: Dashboard, Residentes, Signos Vitales, Observaciones

Los datos del demo se almacenan en `localStorage` bajo la clave `fichaeleam_demo_v1`.

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
4. `!pagoActivo` → redirige a `/pago?sinAcceso=1`
5. Renderiza el componente hijo

---

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| `admin_eleam` | Administrador del ELEAM. Crea la cuenta, es responsable del pago, puede gestionar usuarios. |
| `funcionario` | Personal del ELEAM. Accede si el ELEAM tiene pago activo. No gestiona pagos. |
| `superadmin` | Rol especial para pruebas. Siempre tiene pago activo independientemente del ELEAM. |

El pago activo se verifica así:

```js
const pagoActivo = profile?.rol === "superadmin" || eleam?.pago_activo === true;
```

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
| `/demo` | No | Funciona completamente con mock data |
| `/pago` | No | Funciona normalmente |
| `/dashboard` | Sí | Muestra pantalla de error controlada |
| `/residents/*` | Sí | Muestra pantalla de error controlada |
| `/vital-signs/*` | Sí | Muestra pantalla de error controlada |
| `/observations/*` | Sí | Muestra pantalla de error controlada |
| `/accreditation/*` | Sí | Muestra pantalla de error controlada |

*El login detecta si Supabase está disponible y adapta la UI.

---

## Qué debe reemplazarse al integrar el pago real

1. **`PaymentPage.jsx`**: reemplazar el CTA de email por integración con pasarela de pago (Transbank, Stripe, Mercado Pago, etc.).

2. **Webhook de pago**: crear un endpoint (Supabase Edge Function o backend externo) que actualice `eleams.pago_activo = true` y `eleams.fecha_pago` al recibir confirmación de pago.

3. **Usuario de prueba**: eliminar la lógica especial para `demo@fichaeleam.cl` del trigger `handle_new_user` y del check `rol === 'superadmin'` en `AuthContext`.

4. **ELEAM de prueba**: eliminar el insert del ELEAM con id `a0000000-...` del schema.

5. **Lógica de vencimiento**: agregar verificación de `eleams.fecha_pago` para desactivar automáticamente cuentas con más de 30 días sin pago.

---

## Estructura del proyecto

```
src/
├── components/
│   ├── Button.jsx, Input.jsx, Loading.jsx   # UI base
│   ├── ErrorBoundary.jsx                    # Captura errores no manejados
│   ├── Navbar.jsx                           # Nav de la app autenticada
│   ├── ProtectedRoute.jsx                   # Guarda sesión + pago activo
│   ├── SupabaseError.jsx                    # Error cuando Supabase no responde
│   └── Toast.jsx                            # Sistema de notificaciones
├── context/
│   └── AuthContext.jsx    # user, profile, eleam, pagoActivo, profileLoading
├── features/
│   ├── accreditation/     # Documentación SEREMI DS 14/2017
│   ├── auth/              # Login (Google + email), Register, authService
│   ├── dashboard/         # Panel principal con stats
│   ├── demo/              # DemoPage, mockData, demoService (localStorage)
│   ├── landing/           # LandingPage de alta conversión
│   ├── observations/      # Observaciones diarias
│   ├── payment/           # PaymentPage (placeholder)
│   ├── residents/         # CRUD de residentes
│   └── vitalSigns/        # Registro de signos vitales
├── routes/
│   └── AppRouter.jsx      # Rutas + ocultamiento de Navbar en páginas públicas
├── services/
│   └── supabaseConfig.js  # Cliente Supabase (null si no configurado) + isSupabaseConfigured
└── utils/
    └── validators.js      # validateEmail, validateRut (mod-11), formatRut
```

---

## Despliegue en producción

1. Configurar variables de entorno en la plataforma de hosting.
2. `npm run build` genera `/dist` listo para servir.
3. Configurar redirect SPA: todas las rutas → `/index.html` (necesario en Netlify, Vercel, Nginx).

**Netlify**: crear `public/_redirects` con `/* /index.html 200`.
**Vercel**: automático con framework React/Vite.
**Nginx**: `try_files $uri $uri/ /index.html;`
