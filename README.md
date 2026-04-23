# FichaEleam

Aplicación web SPA para la digitalización de fichas clínicas, registros de atención y documentación de acreditación SEREMI de **ELEAM** (Establecimientos de Larga Estadía para Adultos Mayores) en Chile, conforme al DS 14/2017.

---

## Requisitos previos

- **Node.js** 18 o superior
- **npm** 9 o superior
- Una cuenta gratuita en [supabase.com](https://supabase.com)

---

## Configuración inicial paso a paso

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd fichaEleam
npm install
```

### 2. Crear el proyecto Supabase

1. Entra a [app.supabase.com](https://app.supabase.com) e inicia sesión (o crea una cuenta gratis).
2. Haz clic en **New project**.
3. Elige un nombre, contraseña de base de datos y región (preferiblemente `South America (São Paulo)`).
4. Espera a que el proyecto termine de inicializarse (~1-2 minutos).

### 3. Ejecutar el schema de base de datos

1. En el panel de Supabase, ve a **SQL Editor** (ícono `<>` en el menú lateral).
2. Haz clic en **New query**.
3. Copia y pega el contenido completo del archivo `supabase_schema.sql` de este repositorio.
4. Haz clic en **Run** (▶).

Esto crea todas las tablas, políticas RLS, buckets de Storage y siembra las 10 categorías de acreditación.

### 4. Obtener las credenciales de API

1. En Supabase, ve a **Project Settings** → **API** (ícono ⚙️ en el menú lateral).
2. Copia los siguientes valores:
   - **Project URL** → es tu `VITE_SUPABASE_URL`
   - **anon public** (bajo "Project API keys") → es tu `VITE_SUPABASE_ANON_KEY`

> La `anon key` es segura para exponer en el cliente porque toda la seguridad se gestiona con Row Level Security (RLS) en la base de datos.

### 5. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y reemplaza los valores de ejemplo:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173).

### 7. Crear el primer usuario

Ve a `/register` en la app y crea una cuenta. Supabase enviará un correo de confirmación si tienes habilitada la verificación de email (puedes desactivarla en **Authentication → Providers → Email** del panel de Supabase para desarrollo local).

---

## Comandos disponibles

```bash
npm run dev       # Servidor de desarrollo con HMR en localhost:5173
npm run build     # Build de producción optimizado en /dist
npm run preview   # Sirve el build de producción localmente
npm run lint      # Analiza el código con ESLint
```

---

## Estructura del proyecto

```
fichaEleam/
├── public/
├── src/
│   ├── components/          # UI reutilizable: Button, Input, Loading, Navbar, Toast, ErrorBoundary
│   ├── context/
│   │   └── AuthContext.jsx  # useAuth() + useLoading()
│   ├── features/
│   │   ├── accreditation/   # Dashboard, categoría, subida de documentos SEREMI
│   │   ├── auth/            # Login, Register, authService
│   │   ├── dashboard/       # AdminDashboard con stats y acciones rápidas
│   │   ├── landing/         # Página pública
│   │   ├── observations/    # Observaciones diarias por turno
│   │   ├── residents/       # CRUD de residentes con ficha clínica
│   │   └── vitalSigns/      # Registro de signos vitales por turno
│   ├── routes/
│   │   └── AppRouter.jsx    # Definición de rutas y ProtectedRoute
│   ├── services/
│   │   └── supabaseConfig.js  # Cliente Supabase singleton
│   └── utils/
│       └── validators.js    # validateEmail, validateRut, formatRut
├── supabase_schema.sql      # Schema completo de la base de datos
├── .env.example
└── vite.config.js
```

---

## Módulos de la aplicación

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | Stats de residentes + progreso de acreditación |
| Residentes | `/residents` | Lista, búsqueda y filtro por estado |
| Ficha residente | `/residents/:id` | Datos completos + historial vinculado |
| Signos vitales | `/vital-signs` | Tabla con alertas de valores críticos |
| Observaciones | `/observations` | Notas de turno por tipo y residente |
| Acreditación | `/accreditation` | Progreso por categoría DS 14/2017 |

---

## Seguridad

- **RLS habilitado** en todas las tablas: solo usuarios autenticados pueden leer/escribir.
- **Storage privado**: los archivos no tienen URL pública; el acceso se genera mediante URLs firmadas de 1 hora de duración.
- **Validación de archivos**: solo se aceptan PDF, imágenes y documentos Office de hasta 10 MB.
- **RUT chileno**: validado con algoritmo módulo-11 en el cliente antes de enviar al servidor.
- La `anon key` de Supabase es pública por diseño; la seguridad real reside en las políticas RLS del servidor.

---

## Despliegue en producción

El proyecto genera un build estático con `npm run build`. Puedes desplegarlo en cualquier CDN/hosting estático:

- **Vercel**: conecta el repositorio y configura las variables de entorno en el dashboard.
- **Netlify**: igual que Vercel; asegúrate de configurar el redirect para SPA (`/*` → `/index.html`).
- **Supabase Storage / S3**: sube el contenido de `/dist`.

Recuerda configurar las mismas variables de entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`) en la plataforma de despliegue.
