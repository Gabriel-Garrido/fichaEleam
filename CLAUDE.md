# FichaEleam — Documentación del Proyecto

## Resumen

**FichaEleam** es una aplicación web SPA para la digitalización de registros clínicos, administrativos y documentales de **ELEAM** (Establecimientos de Larga Estadía para Adultos Mayores) en Chile. Diseñada para apoyar la gestión diaria del personal y facilitar la preparación para fiscalizaciones de la **SEREMI de Salud** según el **DS 14/2017**.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite 6 |
| Estilos | Tailwind CSS 4 |
| Routing | React Router DOM 7 |
| Backend / Auth | Supabase (PostgreSQL + Auth + Storage) |
| Build | Vite |
| Linting | ESLint 9 |

---

## Comandos de Desarrollo

```bash
npm run dev       # Servidor de desarrollo en localhost:5173
npm run build     # Build de producción en /dist
npm run lint      # Análisis de código con ESLint
npm run preview   # Preview del build de producción
```

---

## Configuración de Variables de Entorno

Copiar `.env.example` a `.env` y rellenar con las credenciales del proyecto Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Las variables con prefijo `VITE_` son expuestas al cliente (comportamiento estándar de Vite). Las anon keys de Supabase son seguras para exponer en el cliente porque la seguridad se gestiona con Row Level Security (RLS).

---

## Estructura del Proyecto

```
src/
├── components/          # Componentes UI reutilizables
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Loading.jsx
│   ├── Modal.jsx
│   ├── Navbar.jsx
│   └── ProtectedRoute.jsx
├── context/
│   ├── AuthContext.jsx       # Auth + Loading contexts, useAuth(), useLoading()
│   └── ResidentContext.jsx   # Context de residentes (legacy, no en uso activo)
├── features/
│   ├── accreditation/        # Sistema de acreditación SEREMI
│   │   ├── AccreditationDashboard.jsx
│   │   ├── AccreditationCategory.jsx
│   │   ├── AccreditationUpload.jsx
│   │   └── accreditationService.js
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── authService.js    # login(), register(), logout()
│   │   └── useAuth.js        # Re-exporta useAuth desde AuthContext
│   ├── dashboard/
│   │   └── AdminDashboard.jsx  # Dashboard principal con stats y acciones rápidas
│   ├── landing/
│   │   └── LandingPage.jsx
│   ├── observations/          # Observaciones diarias
│   │   ├── ObservationForm.jsx
│   │   ├── ObservationList.jsx
│   │   └── observationsService.js
│   ├── residents/             # Gestión de residentes
│   │   ├── ResidentDetails.jsx
│   │   ├── ResidentForm.jsx
│   │   ├── ResidentList.jsx
│   │   └── residentService.js
│   └── vitalSigns/            # Signos vitales
│       ├── VitalSignsForm.jsx
│       ├── VitalSignsList.jsx
│       └── vitalSignsService.js
├── routes/
│   └── AppRouter.jsx          # Todas las rutas de la app
├── services/
│   └── supabaseConfig.js      # Cliente Supabase singleton
└── utils/
    ├── constants.js
    ├── dateUtils.js
    └── validators.js
```

---

## Base de Datos (Supabase / PostgreSQL)

El schema completo está en `supabase_schema.sql`. Ejecutarlo en **Supabase Dashboard → SQL Editor**.

### Tablas

#### `profiles`
Extiende `auth.users`. Se crea automáticamente vía trigger `on_auth_user_created`.
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid (FK → auth.users) | PK |
| nombre | text | Nombre del usuario |
| email | text | Correo |
| rol | text | `admin`, `usuario`, `enfermera`, `medico` |
| creado_en | timestamptz | Fecha de creación |

#### `residentes`
Ficha maestra de cada residente del ELEAM.
| Columna | Descripción |
|---------|-------------|
| id | UUID PK |
| nombre, apellido | Nombre completo |
| rut | RUT chileno (único) |
| fecha_nacimiento, sexo, estado_civil | Datos personales |
| diagnostico_principal | Diagnóstico base |
| alergias | Array de texto |
| indice_barthel | Entero 0-100 |
| nivel_dependencia | leve/moderado/severo/total |
| fecha_ingreso, fecha_egreso | Fechas de estadía |
| estado | activo/hospitalizado/egresado/fallecido |
| habitacion, cama | Ubicación física |

#### `signos_vitales`
Registro diario por turno de signos vitales.
| Columna | Descripción |
|---------|-------------|
| residente_id | FK → residentes |
| fecha_hora | Timestamp del registro |
| turno | mañana/tarde/noche |
| presion_sistolica, presion_diastolica | mmHg |
| frecuencia_cardiaca | lpm |
| frecuencia_respiratoria | rpm |
| temperatura | °C |
| saturacion_oxigeno | % (0-100) |
| glucosa | mg/dL |
| peso | kg |
| dolor_escala | 0-10 |
| estado_conciencia | alerta/somnoliento/estuporoso/coma |

#### `observaciones_diarias`
Notas de turno, incidentes, procedimientos.
| Columna | Descripción |
|---------|-------------|
| residente_id | FK → residentes |
| turno | mañana/tarde/noche |
| tipo | observacion_general, caida, incidente, curacion, visita_medica, administracion_medicamento, cambio_posicion, higiene, alimentacion, eliminacion, actividad, otro |
| descripcion | Texto libre obligatorio |
| acciones_tomadas | Texto libre |
| requiere_seguimiento | Boolean |

#### `categorias_acreditacion`
10 categorías fijas según DS 14/2017. Se insertan via SQL seed.

#### `documentos_acreditacion`
Documentos subidos para cada categoría de acreditación.
| Columna | Descripción |
|---------|-------------|
| categoria_id | FK → categorias_acreditacion |
| nombre | Nombre descriptivo del documento |
| archivo_url | URL en Supabase Storage |
| estado | pendiente/subido/aprobado/rechazado/vencido |
| fecha_vencimiento | Para certificados con vencimiento |

---

## Categorías de Acreditación SEREMI (DS 14/2017)

| Código | Categoría |
|--------|-----------|
| CAT-01 | Autorización de Funcionamiento |
| CAT-02 | Planta Física e Infraestructura |
| CAT-03 | Recursos Humanos |
| CAT-04 | Fichas Clínicas y Registros Médicos |
| CAT-05 | Medicamentos y Farmacia |
| CAT-06 | Alimentación y Nutrición |
| CAT-07 | Prevención y Control de Infecciones (PCI) |
| CAT-08 | Seguridad y Plan de Emergencias |
| CAT-09 | Registros de Atención Diaria |
| CAT-10 | Actividades y Rehabilitación |

Cada categoría tiene un listado de `documentos_requeridos` (array JSON) que se muestra como checklist en la UI.

---

## Rutas de la Aplicación

| Ruta | Componente | Auth |
|------|-----------|------|
| `/` | LandingPage | Pública |
| `/login` | Login | Pública |
| `/register` | Register | Pública |
| `/dashboard` | AdminDashboard | ✓ |
| `/residents` | ResidentList | ✓ |
| `/residents/new` | ResidentForm | ✓ |
| `/residents/:id` | ResidentDetails | ✓ |
| `/residents/:id/edit` | ResidentForm | ✓ |
| `/vital-signs` | VitalSignsList | ✓ |
| `/vital-signs/new` | VitalSignsForm | ✓ |
| `/observations` | ObservationList | ✓ |
| `/observations/new` | ObservationForm | ✓ |
| `/accreditation` | AccreditationDashboard | ✓ |
| `/accreditation/category/:id` | AccreditationCategory | ✓ |
| `/accreditation/upload` | AccreditationUpload | ✓ |

Query params soportados:
- `/vital-signs/new?residenteId=UUID` — preselecciona residente
- `/observations/new?residenteId=UUID` — preselecciona residente
- `/accreditation/upload?categoriaId=UUID` — preselecciona categoría

---

## Autenticación

Supabase Auth con email/password. El flujo:

1. `register()` → `supabase.auth.signUp()` + upsert en `profiles`
2. Trigger de Supabase crea el perfil automáticamente (fallback)
3. `login()` → `supabase.auth.signInWithPassword()`
4. `AuthContext` mantiene la sesión activa y provee `user` y `profile`
5. `ProtectedRoute` redirige a `/login` si no hay sesión

---

## Supabase Storage

**Buckets:**
- `documentos-acreditacion` — Archivos de acreditación (privado)
- `residentes-archivos` — Archivos de residentes (privado)

Los archivos se almacenan con path `acreditacion/{categoriaId}/{timestamp}_{nombre}`.

Para acceder a archivos privados se debe generar una URL firmada con `supabase.storage.createSignedUrl()` (mejora futura).

---

## Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. La política base es:
- Cualquier usuario **autenticado** (`auth.role() = 'authenticated'`) puede leer, insertar y actualizar.
- Los usuarios solo ven su propio perfil en `profiles`.

Para entornos multi-establecimiento, extender con una columna `establecimiento_id` y políticas por establecimiento.

---

## Migración desde Firebase

El proyecto fue migrado de Firebase a Supabase. Cambios principales:

| Antes (Firebase) | Después (Supabase) |
|-----------------|-------------------|
| `firebaseConfig.js` | `supabaseConfig.js` |
| `getAuth()` + `onAuthStateChanged` | `supabase.auth.getSession()` + `onAuthStateChange` |
| `createUserWithEmailAndPassword` | `supabase.auth.signUp()` |
| `signInWithEmailAndPassword` | `supabase.auth.signInWithPassword()` |
| `auth.signOut()` | `supabase.auth.signOut()` |
| Firestore `doc/setDoc` | `supabase.from().insert/update/select` |
| Firebase Storage | `supabase.storage.from().upload()` |
| `serviceAccountKey.json` (Admin SDK) | No necesario (RLS reemplaza al Admin SDK) |

---

## Configuración Inicial de Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `supabase_schema.sql`
3. Ir a **Storage** y crear los buckets `documentos-acreditacion` y `residentes-archivos` (si el SQL no los crea automáticamente)
4. Ir a **Project Settings → API** y copiar `Project URL` y `anon public` key
5. Crear `.env` con esas credenciales

---

## Posibles Mejoras Futuras

- Autenticación por roles (admin vs. enfermera vs. médico) con acceso diferenciado
- Exportación PDF de fichas clínicas y listas de signos vitales
- URLs firmadas para descarga segura de documentos privados
- Soporte multi-establecimiento (columna `establecimiento_id`)
- Módulo de medicamentos con kardex digital
- Notificaciones de documentos próximos a vencer
- Módulo de agenda/citas médicas
- Dashboard de analytics con gráficos de signos vitales históricos
