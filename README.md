# FichaEleam

FichaEleam es una aplicación web para la gestión clínica, operativa y documental de Establecimientos de Larga Estadía para Adultos Mayores (ELEAM) en Chile. El producto organiza el trabajo alrededor de cinco áreas y genera trazabilidad útil para la operación diaria y la fiscalización SEREMI bajo el Decreto N.° 20.

## Estado actual del producto

Esta versión está diseñada para una instalación nueva. No requiere preservar cuentas demo, datos ni contratos de interfaz anteriores.

La navegación principal contiene solamente:

1. **Inicio**: prioridades, alertas y avance.
2. **Establecimiento**: capacidad, habitaciones y camas.
3. **Residentes**: ficha, cuidados, salud, medicamentos y registros diarios.
4. **Personal**: equipo, competencias, capacitación, turnos y dotación.
5. **Cumplimiento SEREMI**: requisitos, evidencias, protocolos, emergencias, reclamos y carpeta exportable.

El portal familiar, el registro de visitas y el onboarding modal anterior no forman parte de la experiencia vigente. La comunicación con familiares o persona significativa se conserva únicamente donde representa un antecedente clínico o reglamentario, por ejemplo en consentimientos, reclamos y eventos adversos.

## Tecnologías

- React 19 y React Router 7.
- Vite 6.
- Tailwind CSS 4.
- Supabase Auth, PostgreSQL, Storage y Edge Functions.
- Zod para validación de formularios.
- Vitest para pruebas.
- MercadoPago para suscripciones.
- Resend para entrega de accesos y campañas autorizadas.
- `pdf-lib`, `read-excel-file` y `write-excel-file` para exportaciones e importaciones.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Un proyecto Supabase nuevo.
- Supabase CLI para desplegar Edge Functions y secretos.
- Credenciales de MercadoPago si se habilitarán pagos.
- Una cuenta y dominio verificado en Resend si se enviarán correos.

## Instalación local

```bash
npm install
cp .env.example .env
npm run dev
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm run dev
```

Configura en `.env` solamente las claves públicas:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```

Nunca expongas `SUPABASE_SERVICE_ROLE_KEY`, secretos de MercadoPago o claves de Resend en variables `VITE_*`.

## Creación de la base de datos

La fuente canónica es [`supabase_schema.sql`](./supabase_schema.sql). Para esta versión se recomienda ejecutarla sobre un proyecto Supabase vacío.

1. Crea un proyecto Supabase nuevo.
2. Abre **SQL Editor**.
3. Ejecuta todo `supabase_schema.sql`.
4. Si la sección de Storage falla por permisos, crea manualmente el bucket privado `documentos-acreditacion` y vuelve a ejecutar esa sección.
5. Verifica que RLS esté habilitado y que los triggers se hayan creado.
6. Configura los proveedores de autenticación y URLs permitidas.

No se incluye una migración de datos heredados porque el producto se está reiniciando desde cero.

## Roles

| Rol | Propósito | Inicio |
|---|---|---|
| `admin_eleam` | Administra el establecimiento, suscripción, usuarios y operación | `/dashboard` |
| `funcionario` | Ejecuta tareas clínicas u operativas según sus permisos | `/dashboard` |
| `superadmin` | Opera clientes, demos, pagos, CRM y blog de la plataforma | `/superadmin` |

No existe alta de cuentas familiares en la experiencia vigente.

## Acceso y suscripción

El acceso operativo requiere:

- sesión autenticada;
- perfil válido;
- ELEAM asociado para administrador o funcionario;
- suscripción activa, período de gracia o demo vigente;
- permiso de área y, cuando corresponda, permiso clínico específico.

`public.eleam_has_access(eleam_id)` es la fuente de verdad del acceso por suscripción. La interfaz oculta acciones no autorizadas, pero PostgreSQL vuelve a validar mediante RLS, funciones y triggers.

## Rutas principales

### Producto ELEAM

| Ruta | Contenido |
|---|---|
| `/dashboard` | Inicio y prioridades |
| `/establecimiento` | Centro del establecimiento |
| `/establecimiento/camas` | Habitaciones, camas y asignaciones |
| `/residents` | Lista e importación de residentes |
| `/residents/new` | Ingreso simplificado |
| `/residents/:id` | Ficha integral del residente |
| `/personal` | Centro de personal |
| `/personal/equipo` | Funcionarios; solo administrador |
| `/personal/dotacion` | Turnos y cumplimiento de dotación |
| `/cumplimiento` | Centro de cumplimiento |
| `/cumplimiento/seremi` | Matriz de requisitos y evidencia |
| `/cumplimiento/seremi/carpeta` | Carpeta imprimible/exportable |
| `/cumplimiento/obligaciones` | Protocolos, brechas y reportes |
| `/cumplimiento/emergencias` | Plan, escenarios y simulacros |
| `/cumplimiento/reclamos` | Reclamos y sugerencias |
| `/operacion/cuidados` | Tareas de cuidado del turno |
| `/operacion/medicamentos` | Administración de medicamentos |
| `/operacion/turnos` | Entrega y consulta de turnos |

Signos vitales, observaciones y eventos adversos se consideran flujos internos del área Residentes aunque conserven URLs técnicas propias.

### Plataforma

| Ruta | Contenido |
|---|---|
| `/superadmin` | Resumen de cartera |
| `/superadmin/clientes` | ELEAM y suscripciones |
| `/superadmin/leads` | CRM y solicitudes de demo |
| `/superadmin/pagos` | Pagos registrados |
| `/superadmin/tareas` | Tareas comerciales |
| `/superadmin/blog` | Gestión editorial |

### Sitio público

- `/`
- `/software-eleam`
- `/acreditacion-seremi`
- `/autoevaluacion-decreto-20`
- `/plazos-decreto-20`
- `/calculadora-dotacion-eleam`
- `/blog` y `/blog/:slug`
- `/preguntas-frecuentes`
- `/contacto`

Las páginas públicas se cargan sin montar `AuthProvider`. El árbol autenticado se carga de forma diferida desde `AuthenticatedApp.jsx`.

## Permisos

Hay dos niveles complementarios:

1. **Áreas de producto** mediante `can_access_feature`:
   - `dashboard`
   - `establishment`
   - `residents`
   - `personnel`
   - `compliance`
2. **Acciones sensibles** mediante `funcionario_can`, por ejemplo crear residentes, registrar signos vitales, administrar medicamentos o modificar evidencia.

El catálogo frontend está en `src/features/permissions/featureCatalog.js`. Las reglas de base de datos están en `funcionario_permisos`, `eleam_feature_permissions`, `profile_feature_permissions`, RLS y funciones `security definer`.

## Flujos principales

### Ingreso de residente

El formulario solicita identificación mínima, antecedentes clínicos esenciales, fecha de ingreso y estado. Después permite asignar cama y completar el ingreso DS20 desde la ficha.

La importación Excel usa el mismo contrato y ya no crea usuarios asociados. Los residentes activos y hospitalizados consumen cupo; egresados y fallecidos no.

### Habitaciones y camas

- Las habitaciones pertenecen a un ELEAM.
- Las camas pertenecen a una habitación.
- Un residente activo u hospitalizado puede tener una sola cama actual.
- Las asignaciones conservan historial y auditoría.
- Hospitalizar permite reservar o liberar la cama según la decisión del usuario.

### Plan de cuidado

Cada residente puede tener un plan activo con actividades y horarios. El sistema genera tareas por fecha y turno. Una tarea puede cumplirse, omitirse o reprogramarse y puede originar un seguimiento.

### Medicamentos y eMAR

Las indicaciones contienen dosis, vía, horarios y reglas de stock. Los medicamentos controlados exigen stock y doble validación. Cada administración y movimiento queda trazado.

### Cumplimiento SEREMI

La evidencia puede ser documental u operacional. La carpeta SEREMI reúne documentos cargados y registros producidos en Residentes, Personal y Establecimiento. Los módulos de emergencias, reclamos, protocolos y reportes complementan la matriz DS20.

## Edge Functions

| Función | Uso |
|---|---|
| `create-demo-user` | Aprueba una solicitud y crea el administrador demo |
| `create-staff-user` | Crea o invita a un funcionario |
| `delete-staff-user` | Elimina un funcionario desde Auth y datos asociados |
| `mp-create-subscription` | Inicia una suscripción MercadoPago |
| `mp-cancel-subscription` | Cancela la renovación |
| `mp-webhook` | Procesa eventos firmados de MercadoPago |
| `track-landing-event` | Registra analítica pública limitada |
| `send-crm-email-campaign` | Envía campañas autorizadas |
| `crm-unsubscribe` | Procesa la baja de correo |

Despliegue de ejemplo:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy create-demo-user
npx supabase functions deploy create-staff-user
npx supabase functions deploy delete-staff-user
npx supabase functions deploy mp-create-subscription
npx supabase functions deploy mp-cancel-subscription
npx supabase functions deploy mp-webhook --no-verify-jwt
npx supabase functions deploy track-landing-event --no-verify-jwt
npx supabase functions deploy send-crm-email-campaign
npx supabase functions deploy crm-unsubscribe --no-verify-jwt
```

Configura los secretos descritos en `.env.example` con `npx supabase secrets set`.

## Storage

El bucket `documentos-acreditacion` debe ser privado. Los archivos se organizan por ELEAM y requisito. El acceso se controla con políticas Storage y nunca mediante URLs públicas permanentes.

## Estructura del proyecto

```text
src/
├── components/          componentes compartidos
├── context/             sesión, perfil y permisos
├── navigation/          cinco áreas y acciones rápidas
├── routes/              rutas públicas y autenticadas
├── features/
│   ├── establishment/   centro del establecimiento
│   ├── residents/       ficha integral
│   ├── personnel/       centro de personal
│   ├── compliance/      centro SEREMI
│   ├── beds/            habitaciones y camas
│   ├── carePlans/       planes y tareas de cuidado
│   ├── emar/            medicamentos y stock
│   ├── accreditation/   matriz y carpeta SEREMI
│   ├── ds20/            dotación e ingreso reglamentario
│   ├── emergencias/     plan y simulacros
│   ├── reclamos/        reclamos y sugerencias
│   └── superadmin/      operación de plataforma
└── services/            configuración y contexto Supabase

supabase/
└── functions/           Edge Functions
```

## Calidad y verificación

Ejecuta antes de entregar:

```bash
npm run verify
```

Incluye:

1. ESLint.
2. Typecheck Deno de todas las Edge Functions TypeScript.
3. Pruebas Vitest.
4. Auditoría de contratos frontend/Supabase.
5. Build de producción.
6. Auditoría de rutas SEO públicas.

Comandos individuales:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:contracts
npm run build
npm run seo:check
```

## Criterios para nuevas funcionalidades

Antes de agregar una pantalla o campo:

- debe resolver una obligación SEREMI o una tarea cotidiana verificable;
- debe ubicarse dentro de una de las cinco áreas;
- no debe duplicar información que ya existe en la ficha o carpeta;
- los campos infrecuentes deben ir en secciones opcionales;
- una nueva acción sensible necesita permiso, validación y RLS;
- debe incluir estado vacío, error, carga, confirmación y prueba del contrato crítico.

## Documentación relacionada

- [`PLAN_CUIDADO_SIMPLE.md`](./PLAN_CUIDADO_SIMPLE.md): alcance normativo y flujo simplificado del programa individual.
- [`MEDICAMENTOS_SIMPLE.md`](./MEDICAMENTOS_SIMPLE.md): circuito simplificado por rol para indicación, administración y medicamentos controlados.
- [`FICHA_RESIDENTE_SIMPLE.md`](./FICHA_RESIDENTE_SIMPLE.md): portada, navegación, permisos y alcance normativo de la ficha individual.
- [`CLAUDE.md`](./CLAUDE.md): guía técnica y arquitectura para agentes y mantenedores.
- [`codex.md`](./codex.md): reglas rápidas de colaboración y cambios.
- [`LIBRETO_VIDEO_TUTORIAL.md`](./LIBRETO_VIDEO_TUTORIAL.md): tutorial actualizado del producto.
- [`AUDITORIA_UX_MOTIVACION.md`](./AUDITORIA_UX_MOTIVACION.md): decisiones UX y mejoras futuras.
- [`decreto_20_fichaeleam_actualizacion.md`](./decreto_20_fichaeleam_actualizacion.md): análisis normativo.
- [`INFORME_AUDITORIA_DECRETO20_SEO.md`](./INFORME_AUDITORIA_DECRETO20_SEO.md): auditoría de contenido y SEO.
- [`INFORME_AUDITORIA_TECNICA_2026-07-20.md`](./INFORME_AUDITORIA_TECNICA_2026-07-20.md): hallazgos, remediaciones, validación y riesgos técnicos.
