# Auditoría técnica integral — 20 de julio de 2026

## Alcance y arquitectura revisada

Se revisó la SPA React 19/Vite, rutas públicas y autenticadas, servicios Supabase, esquema PostgreSQL/RLS/RPC, nueve Edge Functions, pagos MercadoPago, correo Resend, SEO prerenderizado, cabeceras de despliegue, dependencias y pipeline de calidad. La arquitectura objetivo mantiene cinco áreas: Inicio, Establecimiento, Residentes, Personal y Cumplimiento SEREMI; los únicos roles de cuenta son `admin_eleam`, `funcionario` y `superadmin`.

## Problemas encontrados y correcciones

- Dependencias con vulnerabilidades conocidas: 2 altas y 2 bajas en producción, además de avisos transitivos de desarrollo. Se actualizaron versiones compatibles sin `--force`; `npm audit` quedó en 0.
- `crm-unsubscribe` era público por diseño pero no estaba declarado con `verify_jwt = false`; los enlaces de baja podían fallar desplegados. Se corrigió la configuración y se añadieron contratos para las nueve Functions.
- La página de baja podía filtrar el token por `Referer` y carecía de CSP propia. Ahora usa `no-referrer`, `DENY`, `no-store` y una CSP cerrada.
- La CSP web permitía `unsafe-eval` sin necesidad de runtime. Se eliminó.
- El login consultaba una RPC anónima por email para distinguir demos pendientes, permitiendo enumeración de cuentas. Se eliminó la RPC y el cliente usa mensajes no enumerables; OAuth conserva el error firmado `DEMO_PENDING`.
- El frontend y SEO seguían prometiendo un portal familiar retirado. Se corrigieron landing, metadatos, JSON-LD, FAQ, contenido prerenderizado y precios.
- Formularios y servicios de observaciones/eventos adversos aún publicaban datos hacia ese portal. Se retiró esa funcionalidad, preservando la trazabilidad reglamentaria de notificación a familia.
- `create-staff-user`, el trigger Auth y las tablas de provisión conservaban parámetros y ramas familiares inalcanzables. El flujo quedó restringido a funcionarios y se eliminaron `residente_id`/`parentesco` del aprovisionamiento nuevo.
- No existía typecheck automatizado de las Edge Functions. Se añadió Deno al proyecto y `npm run typecheck`; la primera ejecución detectó y corrigió un `catch` inseguro en el webhook de MercadoPago.
- Se eliminó `featurePermissionsService.js`, que no tenía consumidores y conservaba un rol obsoleto.

## Decisiones de arquitectura y API/datos

- La autoridad de roles y pertenencia continúa server-side: metadata escrita por Admin API, trigger de Auth, RLS y RPC.
- Las Functions públicas son únicamente webhook, analítica anónima y baja CRM; todas declaran explícitamente su política JWT y realizan validación propia.
- Se retiró `public.demo_lead_status(text)` y su grant anónimo. Es un cambio intencional de API para evitar enumeración.
- Las invitaciones y solicitudes de provisión nuevas ya no modelan residentes ni parentesco: solo provisionan administradores/funcionarios.
- La notificación a persona significativa en eventos adversos sigue siendo un antecedente clínico/reglamentario; no implica una cuenta ni acceso externo.

## Pruebas y resultados

- ESLint: aprobado.
- Typecheck Deno: 17 archivos TypeScript aprobados.
- Vitest: 58 archivos y 361 pruebas aprobadas tras retirar cinco expectativas exclusivas del portal eliminado y añadir nueve contratos JWT.
- Contratos Supabase: aprobados (72 tablas, 64 RPC/funciones, 9 Edge Functions, 27 RPC usadas por frontend).
- Build Vite: aprobado, 705 módulos transformados.
- SEO público: 10 rutas y 8 posts aprobados.
- `npm audit --omit=dev`: 0 vulnerabilidades.

## Archivos y dependencias eliminados

- `src/features/permissions/featurePermissionsService.js`: servicio sin consumidores y con rol legacy.
- API `demo_lead_status` y lógica cliente asociada.
- Dependencias transitivas vulnerables/obsoletas reemplazadas por `npm audit fix`.

## Riesgos pendientes y gates de producción

1. **P0 — validar esquema desde cero.** Docker no estaba disponible en el entorno, por lo que no fue posible ejecutar `supabase db reset`/lint contra PostgreSQL real. Antes del primer despliegue se debe crear un proyecto vacío, aplicar `supabase_schema.sql` completo y ejecutar smoke tests de Auth, RLS, Storage y RPC.
2. **P1 — residuos de modelo familiar.** El esquema aún contiene tablas/policies históricas de visitas y columnas `visible_familiar` en cuidados/medicamentos. No son alcanzables por los roles vigentes, pero deben retirarse en una siguiente simplificación atómica junto con sus RPC y pruebas de trazabilidad.
3. **P1 — ausencia de E2E en navegador.** Agregar Playwright para login, alta de residente, camas, tareas, eMAR, permisos, pago y baja CRM.
4. **P1 — frontend JavaScript.** El typecheck cubre Functions TypeScript, no los componentes React. Migrar por dominio a TypeScript estricto empezando por Auth, pagos y servicios clínicos.
5. **P2 — componentes extensos.** `CareTasksPage`, `ResidentDetails`, `EmarResidentTab` y acreditación superan 1.000 líneas; dividir por caso de uso después de asegurar E2E para evitar refactors visuales ciegos.

## Checklist previo al despliegue

1. Configurar secretos según `.env.example` y dominios permitidos.
2. Aplicar el esquema a una base vacía y crear/verificar el bucket privado.
3. Desplegar Functions respetando `supabase/config.toml`.
4. Ejecutar `npm ci`, `npm run verify` y `npm audit --omit=dev` en CI.
5. Probar webhooks MercadoPago con firma real de sandbox y confirmar idempotencia.
6. Verificar CSP/cabeceras en el CDN real y ejecutar un smoke test de recuperación/login OAuth.
