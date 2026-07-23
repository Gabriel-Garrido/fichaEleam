# Auditoría de escalabilidad, seguridad y experiencia — 23 de julio de 2026

## Alcance

Se revisaron arquitectura React/Vite, rutas y navegación por rol, contexto de autenticación, permisos por área y acción, servicios Supabase, esquema SQL/RLS/RPC, Storage, 11 Edge Functions, validaciones, mensajes de error, cabeceras de despliegue, caché, assets, dependencias, pruebas y documentación.

El objetivo operativo es conservar una solución sencilla en la etapa inicial y soportar más de 1.000 usuarios distribuidos entre ELEAM sin rediseñar prematuramente el producto.

## Hallazgos y correcciones realizadas

### Seguridad

- `sharp 0.34.5` y su libvips tenían cuatro CVE de severidad alta. Se actualizó a `0.35.3`; `npm audit` completo quedó sin vulnerabilidades.
- Los permisos de funcionarios se consultaban con `select("*")`. Se reemplazó por una lista blanca de 35 acciones y se agregó estado de error separado.
- Un fallo al refrescar perfil o permisos podía conservar autorizaciones anteriores en memoria. Ahora las invalida y bloquea áreas/acciones hasta revalidarlas.
- `create-demo-user` devolvía errores serializados y sugerencias internas sobre esquema/triggers. Los detalles permanecen solo en logs; el cliente recibe códigos estables y mensajes accionables.
- `create-staff-user` también dejó de exponer instrucciones técnicas de infraestructura.
- Se ampliaron contratos JWT para cubrir `update-staff-user` y `send-resident-payment-receipt`, y se añadieron pruebas contra filtración de errores internos.
- La CSP Apache permitía `unsafe-eval` aunque el build de producción no lo necesita. Fue eliminado y se añadieron `Cross-Origin-Opener-Policy` y `X-Permitted-Cross-Domain-Policies`.

### Escalabilidad y rendimiento

- Los chunks de React, Supabase, PDF y código por feature siguen separados y cargados bajo demanda. El build no incluye sourcemaps de producción.
- Los assets con hash ahora tienen caché anual inmutable. Las imágenes públicas sin hash usan siete días y `stale-while-revalidate`, evitando contenido permanentemente obsoleto.
- Se retiraron cinco PNG fuente duplicados u obsoletos de `src` (más de 8 MB). Los WebP optimizados y los PNG públicos requeridos por SEO/redes permanecen.
- El optimizador de imágenes usa una única fuente canónica pública para dashboards y continúa generando WebP de 6–95 KB.
- El esquema dispone de índices por ELEAM, fecha, estado y relaciones críticas; los contratos no detectaron tablas/RPC frontend inexistentes.
- Cobranza limita entregas al último envío por pago y recordatorios al mes actual. Los planes comerciales vigentes limitan residentes por ELEAM, evitando que sus vistas operativas crezcan sin control.

### Navegación, responsive y accesibilidad

- Escritorio y móvil consumen el mismo catálogo filtrado por rol, suscripción, área y permiso, evitando menús divergentes.
- Si un área no está habilitada, desaparece de ambos menús y la ruta vuelve a bloquearla.
- El lanzador móvil pasa de cuatro a tres columnas bajo 400 px, conserva cuatro cuando existe espacio, enfoca la búsqueda al abrir, encierra el foco, responde a Escape y devuelve el foco al botón de origen.
- Las métricas de campañas pasan a dos columnas en teléfonos y cuatro desde `sm`.
- El aviso de permisos usa `role="status"` y `aria-live`, explica el bloqueo seguro y ofrece reintento.

### Errores y validación

- `friendlyError` reconoce SQLSTATE/PostgREST/HTTP (`42501`, `23505`, `PGRST116`, `429`) antes de analizar texto. Esto evita mostrar nombres de constraints, tablas o políticas.
- Los errores desconocidos conservan el mensaje de dominio indicado por cada flujo.
- Se añadieron pruebas para permisos, duplicados, registros inexistentes, rate limiting y ocultamiento de detalles.

## Elementos retirados

- `src/assets/images/entrega-turno-equipo-clinico-dashboard.png`
- `src/assets/images/excel-papel-vs-fichaeleam-dashboard.png`
- `src/assets/images/fichaeleam-demo-soporte.png`
- `src/assets/images/fichaeleam-hero.png`
- `src/assets/images/logos/fichaeleam-logo-stacked-color.png`

La eliminación es recuperable desde Git. Ninguno tenía importaciones de runtime; sus equivalentes públicos/optimizados continúan disponibles.

## Decisiones de arquitectura

- Mantener SPA + Supabase es suficiente para esta escala: Auth, RLS, RPC y aislamiento por `eleam_id` distribuyen la carga sin requerir microservicios.
- Las operaciones sensibles permanecen en RPC/Edge Functions; el frontend nunca es la autoridad final.
- Se priorizan consultas agregadas para superadmin y cargas paralelas tolerantes a fallos en dashboard.
- No se introdujo una caché de datos clínicos compartida: podría servir información obsoleta o cruzar tenants. La caché agresiva se limita a recursos estáticos.
- No se eliminó código solo por tamaño. Componentes clínicos extensos se dividirán cuando existan E2E que protejan sus flujos.

## Riesgos pendientes priorizados

1. **P0 — aplicar y validar en Supabase real.** Ejecutar `supabase_schema.sql` en una base vacía y probar RLS/RPC/Storage con cuentas de cada rol. El auditor local valida contratos estáticos, no planes reales de PostgreSQL.
2. **P0 — desplegar Functions modificadas.** Publicar `create-demo-user` y `create-staff-user` antes de considerar activa la mejora de respuestas seguras.
3. **P1 — observabilidad.** Centralizar errores de frontend/Functions, métricas p95/p99, tasa de errores, consultas lentas y alertas de correo/webhook sin incluir datos clínicos.
4. **P1 — pruebas E2E y carga.** Incorporar Playwright para flujos críticos y pruebas k6/Artillery con al menos 1.000 sesiones distribuidas, priorizando login, dashboard, tareas y eMAR.
5. **P1 — paginación futura.** Superadmin y CRM aún pueden cargar colecciones completas. Antes de superar cientos de ELEAM/prospectos, mover filtros y cursores al servidor.
6. **P2 — TypeScript frontend.** Migrar primero Auth, permisos, pagos y servicios clínicos para reforzar contratos de datos.
7. **P2 — componentes grandes.** Separar `CareTasksPage`, `ResidentDetails`, `EmarResidentTab` y emergencias por caso de uso después de contar con E2E.

## Checklist de producción

1. `npm ci`
2. `npm run verify`
3. `npm audit`
4. Aplicar esquema a Supabase vacío y ejecutar smoke tests por rol.
5. Desplegar Edge Functions según `supabase/config.toml`.
6. Configurar `APP_ENV=production` y `ALLOWED_ORIGINS=https://fichaeleam.cl`.
7. Verificar cabeceras CSP/HSTS/COOP y caché en el CDN real.
8. Probar correo, recuperación de contraseña, recordatorios y webhooks en sandbox.
9. Confirmar backups, recuperación y alertas antes de incorporar datos reales.

## Verificación final

- `npm run lint`: aprobado.
- `npm run typecheck`: aprobado para las 11 Edge Functions y módulos compartidos.
- `npm run test:run`: 66 archivos y 418 pruebas aprobadas.
- `npm run test:contracts`: aprobado; 75 tablas públicas, 68 funciones/RPC y 35 permisos consistentes.
- `npm run build`: aprobado; 712 módulos transformados y rutas divididas por funcionalidad.
- `npm run seo:check`: aprobado para 10 rutas públicas y 8 artículos.
- `npm audit`: 0 vulnerabilidades en 415 dependencias.
- `git diff --check`: aprobado, sin errores de espacios ni parches incompletos.
