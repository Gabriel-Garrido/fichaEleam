# FichaEleam — guía técnica para mantenedores y agentes

## Objetivo

FichaEleam centraliza la gestión clínica, operativa y documental de un ELEAM chileno y genera trazabilidad útil para el Decreto N.° 20 y fiscalización SEREMI.

La aplicación actual parte desde una base vacía. No se deben reintroducir rutas, roles o flujos heredados solo por compatibilidad.

## Principio de producto

Toda funcionalidad debe pertenecer a una de estas cinco áreas:

| Feature ID | Área | Responsabilidad |
|---|---|---|
| `dashboard` | Inicio | Prioridades y avance |
| `establishment` | Establecimiento | Infraestructura, habitaciones y camas |
| `residents` | Residentes | Ficha, salud, cuidados, medicamentos y turnos |
| `personnel` | Personal | Usuarios, dotación, competencias y capacitación |
| `compliance` | Cumplimiento SEREMI | Requisitos, evidencia, protocolos y fiscalización |

No crear un sexto módulo principal sin una decisión explícita de producto. Las pantallas especializadas deben colgar de una de estas áreas.

## Alcance vigente

- Roles activos: `admin_eleam`, `funcionario`, `superadmin`.
- El administrador crea funcionarios; no existen cuentas familiares en la UX vigente.
- No existe portal familiar ni gestión de visitas en las rutas activas.
- No existe onboarding modal o checklist bloqueante.
- La ayuda contextual se entrega con `FeatureCoach` y estados vacíos accionables.
- Las referencias a familiar/persona significativa siguen siendo válidas cuando son antecedentes clínicos o normativos.

## Stack

- React 19, React Router 7 y Vite 6.
- Tailwind CSS 4.
- Supabase JS 2 para Auth, PostgreSQL, Storage y Functions.
- Zod 4 para validaciones.
- Vitest 4.
- MercadoPago, Resend, Excel y PDF.

## Archivos fuente de verdad

| Tema | Archivo |
|---|---|
| Esquema, funciones, triggers y RLS | `supabase_schema.sql` |
| Rutas autenticadas | `src/routes/AuthenticatedApp.jsx` |
| Rutas públicas y prefetch | `src/routes/publicRoutes.js` |
| Navegación | `src/navigation/navigationConfig.js` |
| Áreas habilitables | `src/features/permissions/featureCatalog.js` |
| Sesión y permisos | `src/context/AuthContext.jsx` |
| Variables y secretos | `.env.example` |
| Contratos automáticos | `scripts/check-supabase-contracts.mjs` |

No dupliques listas de roles, features o rutas en nuevos archivos si ya existe una fuente de verdad.

## Arquitectura de rutas

### Áreas

```text
/dashboard
/establecimiento
└── /establecimiento/camas
/residents
├── /residents/new
├── /residents/:id
└── /residents/:id/edit
/personal
├── /personal/equipo
└── /personal/dotacion
/cumplimiento
├── /cumplimiento/seremi
├── /cumplimiento/seremi/ambito/:codigo
├── /cumplimiento/seremi/requisito/:id
├── /cumplimiento/seremi/observaciones
├── /cumplimiento/seremi/carpeta
├── /cumplimiento/obligaciones
├── /cumplimiento/emergencias
└── /cumplimiento/reclamos
```

### Operación dentro de Residentes

```text
/operacion/cuidados
/operacion/medicamentos
/operacion/turnos
/operacion/turnos/nuevo
/operacion/turnos/:id
/vital-signs
/vital-signs/new
/observations
/observations/new
/eventos-adversos
/eventos-adversos/nuevo
/eventos-adversos/:id
```

Las URLs técnicas de signos, observaciones y eventos no deben volver a aparecer como módulos principales en la navegación.

## Autenticación

`AuthContext` expone sesión, perfil, ELEAM, rol, estado de pago, permisos y helpers de autorización.

Reglas:

1. El cliente nunca elige `rol` ni `eleam_id` con autoridad.
2. La creación se provisiona mediante Edge Function y metadatos server-side.
3. `handle_new_user` rechaza cuentas sin origen autorizado.
4. `admin_eleam` y `funcionario` requieren ELEAM asociado.
5. `superadmin` no pertenece a un ELEAM.
6. `must_reset_password` fuerza el establecimiento de clave antes del uso normal.

Google OAuth solo debe aceptar correos previamente invitados o provisionados. No habilitar autoregistro público.

## Autorización

La autorización se aplica en cuatro capas:

1. **Rutas** con `ProtectedRoute` o `SuperAdminRoute`.
2. **Áreas** con `canFeature(featureId)`.
3. **Acciones** con `can(permission)` y `funcionario_can(perm)`.
4. **Datos** con RLS, funciones `security definer`, pertenencia al ELEAM y acceso de suscripción.

Ocultar un botón no sustituye una política de base de datos.

Los administradores tienen autoridad operativa completa dentro de su ELEAM. Los funcionarios dependen de `funcionario_permisos`. El superadmin se valida siempre con `public.is_superadmin()`.

## Suscripción

`public.eleam_has_access(eleam_id)` acepta:

- `pago_activo = true`;
- `subscription_status` activo o en gracia;
- demo pendiente con vencimiento futuro;
- cancelación con período pagado todavía vigente.

Los límites de residentes y funcionarios se validan tanto en frontend como en PostgreSQL. Invitaciones pendientes consumen cupo de funcionarios.

## Dominios

### Residentes

`residentes` contiene identidad, ingreso, estado y snapshot de dependencia. Barthel y Katz se calculan mediante evaluaciones clínicas, no durante el alta.

El formulario inicial debe seguir corto. Datos avanzados se completan desde la ficha:

- ingreso y consentimiento DS20;
- red de salud y controles;
- evaluaciones Barthel, Katz, MNA y MMSE;
- plan de cuidado;
- medicamentos;
- trazabilidad.

### Establecimiento y camas

`habitaciones`, `camas` y `cama_asignaciones` mantienen capacidad e historial. No actualizar `residentes.cama_actual_id` directamente desde el cliente; usar las RPC de asignación, liberación y hospitalización.

### Cuidados

`planes_cuidado` tiene un plan activo por residente. Actividades y horarios generan `tareas_cuidado`. Las operaciones críticas usan RPC para cumplir o reprogramar y generan auditoría.

### Medicamentos

Las indicaciones y horarios generan administraciones. El stock se mantiene por lotes y movimientos. Para controlados:

- `es_controlado = true`;
- tipo controlado obligatorio;
- stock obligatorio;
- doble validación obligatoria.

No realizar descuentos de stock directamente desde el frontend.

### Personal

- `profiles`: identidad de acceso.
- `staff_members`: nómina operativa.
- `staff_competencies`: competencias y vencimientos.
- `staff_training_records`: capacitaciones.
- `staff_shift_assignments`: cobertura de turnos.
- `funcionario_permisos`: acciones autorizadas.

`/personal/equipo` es solo para administradores. `/personal/dotacion` puede ser consultado por personal autorizado.

### Cumplimiento

- `acred_ambitos` y `acred_requisitos`: catálogo normativo.
- `acred_requisitos_eleam`: estado por establecimiento.
- `acred_documentos`: versiones de evidencia.
- `acred_observaciones`: hallazgos y subsanación.
- `protocolos_eleam`, `transitorio_brechas`, `reportes_senama`.
- `plan_emergencias`, `escenarios_emergencia`, `simulacros`.
- `reclamos_sugerencias`.

La evidencia operacional debe enlazarse o resumirse; no duplicar registros clínicos dentro de la carpeta.

## Formularios

- Validar con schemas del dominio antes de llamar servicios.
- Mostrar errores por campo y resumen accionable.
- Campos obligatorios visibles; campos infrecuentes dentro de secciones opcionales.
- Preservar borradores cuando el flujo existente lo soporte.
- Confirmar operaciones irreversibles.
- Nunca solicitar un dato solo porque existe una columna.

## Servicios frontend

Los componentes no deben construir reglas de pertenencia o autorización. Los servicios:

- obtienen `userId`, `eleamId` y rol mediante `serviceContext`;
- normalizan payloads;
- llaman tablas/RPC/Functions;
- convierten errores técnicos en errores manejables;
- dejan la autorización final a Supabase.

## Edge Functions

Funciones autenticadas:

- `create-demo-user`
- `create-staff-user`
- `delete-staff-user`
- `mp-create-subscription`
- `mp-cancel-subscription`
- `send-crm-email-campaign`

Funciones públicas con validación propia:

- `mp-webhook`
- `track-landing-event`
- `crm-unsubscribe`

Toda función pública debe limitar origen, validar entrada, evitar exposición de secretos y ser idempotente cuando procese eventos externos.

## Storage

`documentos-acreditacion` es privado. La ruta debe quedar bajo el ELEAM y requisito correspondiente. Validar tipo, tamaño, propiedad y permisos antes de guardar metadatos.

## UI y rendimiento

- Mantener las cinco áreas en desktop y navegación móvil.
- Reutilizar `AreaCard`, `PageLayout`, `FormKit`, `EmptyState`, `Notice` y `FeatureCoach`.
- Cargar pantallas pesadas con `lazy`.
- Evitar tours globales, confeti, animaciones pesadas y polling innecesario.
- La motivación se entrega con progreso real, confirmaciones breves y próximos pasos relevantes.
- Respetar `prefers-reduced-motion`.

## Sitio público y SEO

Las rutas públicas no deben importar el árbol autenticado en el bundle inicial. Los cambios de rutas o contenido público requieren:

```bash
npm run build
npm run seo:check
```

El build genera artefactos SEO de posts. No editar `dist` manualmente.

## Pruebas obligatorias

Antes de cerrar un cambio:

```bash
npm run verify
```

Para cambios pequeños puede iterarse con comandos individuales, pero la entrega final debe pasar `verify`.

Agregar pruebas cuando cambien:

- rutas críticas;
- navegación o catálogo de features;
- validaciones y normalizadores;
- cálculos DS20;
- límites de planes;
- contratos de tablas, RPC o Edge Functions;
- contenido SEO estructurado.

## Base de datos nueva

La estrategia actual no mantiene compatibilidad de migración. Al cambiar `supabase_schema.sql`:

1. asegurar orden válido de tablas, funciones, triggers y policies;
2. ejecutar auditoría de contratos;
3. probar sobre un proyecto vacío;
4. documentar cualquier secreto, bucket o configuración manual;
5. no añadir `ALTER` de compatibilidad salvo que vuelva a existir una necesidad explícita.

El esquema todavía puede contener campos de comunicación familiar requeridos por normativa. Eso no autoriza reintroducir el rol o portal familiar.

## Checklist de cambio

- [ ] Pertenece a una de las cinco áreas.
- [ ] Resuelve una obligación o tarea frecuente.
- [ ] No duplica datos existentes.
- [ ] Rutas y navegación coinciden.
- [ ] Roles y permisos están en frontend y backend.
- [ ] RLS protege lectura y escritura.
- [ ] Estados vacío, carga, error y éxito están cubiertos.
- [ ] Tests actualizados.
- [ ] Documentación actualizada.
- [ ] `npm run verify` aprobado.
