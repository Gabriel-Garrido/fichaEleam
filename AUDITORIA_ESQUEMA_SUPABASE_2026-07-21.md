# Auditoría integral del esquema Supabase

Fecha: 21 de julio de 2026

## Alcance y criterio

Se auditó `supabase_schema.sql` como fuente canónica para una instalación nueva y vacía. Se contrastaron sus tablas, funciones, políticas RLS, triggers, índices, grants, buckets y columnas con los servicios React, las Edge Functions, los contratos automatizados y los flujos vigentes del producto.

Un objeto sin consulta `.from()` directa no se consideró obsoleto automáticamente. Se conservaron tablas indirectas necesarias para triggers, RPC, auditoría, seguridad o cumplimiento, entre ellas `camas_audit`, `plan_cuidado_audit`, `medicamentos_audit`, `medicamentos_stock_movimientos`, `acred_requisitos` y `demo_lead_throttle`.

## Problemas encontrados

- El esquema mezclaba la definición final con migraciones históricas `ALTER TABLE` para columnas ya presentes.
- Las ocho tablas CRM se eliminaban con `DROP TABLE ... CASCADE` inmediatamente antes de volver a crearse. Esto era destructivo e innecesario para una base vacía.
- `public.funcionario_can` se redefinía tres veces por fases; la primera versión ya contenía el contrato final.
- Persistían las tablas, funciones, RLS, índices y grants del portal familiar y del registro de visitas, aunque esos flujos ya habían sido retirados de la aplicación.
- Reclamos, trazabilidad y métricas de cartera conservaban referencias al portal y a visitas inexistentes.
- El verificador de contratos exigía conservar la reconstrucción histórica del CRM en vez de impedirla.

## Correcciones y decisiones

- Se consolidaron columnas de planes, residentes, evaluaciones clínicas, permisos, planes de cuidado y catálogo DS20 dentro de sus `CREATE TABLE` definitivos.
- Se eliminaron todas las reconstrucciones `DROP TABLE` y los bloques de migración por fases.
- Se dejó una única definición de `public.funcionario_can`, incluyendo los 31 permisos vigentes.
- Se eliminaron `familiar_residentes`, `visitas_familiar`, sus índices, RLS y políticas.
- Se eliminaron las funciones `get_familiar_resident_snapshot`, `my_familiar_residente_ids` y los helpers `familiar_can_view_*`, junto con sus grants.
- Se retiraron visitas del RPC de trazabilidad y del agregado de uso de cartera.
- Se simplificó `reclamos_sugerencias`: desaparecieron el canal `familiar_portal`, la bandera `visita_familiar_origen` y las excepciones RLS para el rol retirado. Se mantienen `familiar` y `visita` como tipos legítimos de solicitante presencial, telefónico o escrito.
- Se actualizaron los servicios y contratos del frontend afectados para que no consulten objetos eliminados.
- Se reforzó `scripts/check-supabase-contracts.mjs` para rechazar `DROP TABLE`, objetos retirados y cualquier función pública definida más de una vez.

## Resultado

- Tablas públicas: 70 (antes 72).
- Funciones/RPC públicas: 60 (59 tras la depuración, más `ds20_operational_evidence_summary` para verificadores automáticos de cumplimiento).
- Tablas públicas sin RLS: 0 según el auditor de contratos.
- Definiciones duplicadas de funciones: 0.
- Reconstrucciones `DROP TABLE`: 0.
- Referencias de código a las tablas retiradas: 0.

## Validación

- `npm run test:contracts`: correcto.
- `npm run verify`: correcto; 60 archivos de prueba y 368 pruebas aprobadas, lint y typecheck sin errores, contratos Supabase correctos, build productivo y auditoría SEO correctos.
- `git diff --check`: correcto.

El entorno de trabajo no dispone de PostgreSQL, Docker ni una CLI global de Supabase; por eso la ejecución transaccional del SQL completo debe repetirse en un proyecto Supabase vacío antes del despliegue productivo. El análisis estático y los contratos automatizados sí cubren referencias, columnas seleccionadas, RPC, grants, RLS, permisos, buckets y ausencia de artefactos retirados.

## Riesgos y recomendaciones

1. Ejecutar el esquema completo en un proyecto Supabase de staging vacío y guardar el log como evidencia de despliegue.
2. Incorporar ese arranque limpio a CI mediante Supabase CLI y PostgreSQL efímero.
3. Generar tipos TypeScript desde la base desplegada y sustituir gradualmente los servicios JavaScript sin tipado por contratos generados.
4. Mantener `supabase_schema.sql` como snapshot limpio; los cambios futuros de producción deberían acompañarse de migraciones versionadas separadas, sin contaminar este bootstrap canónico.
