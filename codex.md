# Codex — contexto rápido de FichaEleam

Usa este documento para orientarte antes de modificar el repositorio. La especificación técnica extensa está en `CLAUDE.md` y la guía de instalación en `README.md`.

## Producto actual

FichaEleam es una aplicación React + Supabase para ELEAM chilenos. La versión actual comienza desde cero y simplifica el producto en cinco áreas:

```text
Inicio · Establecimiento · Residentes · Personal · Cumplimiento SEREMI
```

Roles activos:

- `admin_eleam`
- `funcionario`
- `superadmin`

No reintroducir portal familiar, visitas, alta familiar, onboarding modal ni módulos superiores adicionales sin solicitud explícita.

La familia o persona significativa puede aparecer en datos reglamentarios —consentimientos, notificaciones o reclamos— sin transformarse en usuario de la aplicación.

## Reglas de trabajo

1. Preserva cambios del usuario y no reformatees archivos ajenos al alcance.
2. Usa `rg` para buscar archivos y referencias.
3. Usa `apply_patch` para ediciones manuales.
4. No escribas directamente `cama_actual_id`, stock ni estados críticos si existe una RPC.
5. No confíes en ocultar botones: aplica autorización en RLS/RPC/Edge Function.
6. No expongas service role, MercadoPago o Resend en el frontend.
7. Ejecuta `npm run verify` antes de entregar.

## Fuentes de verdad

| Tema | Archivo |
|---|---|
| Base de datos | `supabase_schema.sql` |
| Rutas | `src/routes/AuthenticatedApp.jsx` |
| Navegación | `src/navigation/navigationConfig.js` |
| Features principales | `src/features/permissions/featureCatalog.js` |
| Autorización cliente | `src/context/AuthContext.jsx` |
| Variables | `.env.example` |

## Enrutamiento

```text
/dashboard
/establecimiento[/camas]
/residents[/new|/:id|/:id/edit]
/personal[/equipo|/dotacion]
/cumplimiento[/seremi|/obligaciones|/emergencias|/reclamos]
/operacion[/cuidados|/medicamentos|/turnos]
/superadmin/*
```

Signos vitales, observaciones y eventos adversos pertenecen conceptualmente a Residentes aunque conserven rutas técnicas.

## Autorización

- Área: `canFeature("dashboard|establishment|residents|personnel|compliance")`.
- Acción: `can(permission)` / `public.funcionario_can(perm)`.
- Acceso ELEAM: `public.eleam_has_access(eleam_id)`.
- Superadmin: `public.is_superadmin()`.
- Datos: RLS y validaciones de pertenencia.

## Flujos que requieren especial cuidado

### Residentes

- Alta inicial breve.
- Activo y hospitalizado consumen cupo.
- Barthel/Katz/MNA/MMSE se registran como evaluaciones.
- La ubicación se modifica mediante RPC de camas.

### Cuidados

- Un plan activo por residente.
- Actividades + horarios generan tareas.
- Cumplir, omitir y reprogramar deben conservar trazabilidad.

### Medicamentos

- Horarios generan administraciones.
- Stock por lotes y movimientos.
- Controlados requieren stock y doble validación.

### Cumplimiento

- Separar evidencia documental de evidencia operacional.
- Mantener versiones, vencimientos, observaciones y auditoría.
- No copiar información clínica completa a documentos SEREMI.

## Edge Functions

- `create-demo-user`
- `create-staff-user`
- `delete-staff-user`
- `mp-create-subscription`
- `mp-cancel-subscription`
- `mp-webhook`
- `send-crm-email-campaign`
- `track-landing-event`
- `crm-unsubscribe`

## Verificación

```bash
npm run verify
```

Ese comando debe aprobar lint, tests, contratos Supabase, build y SEO.

## Criterio para aceptar complejidad

Una pantalla, campo o permiso nuevo debe cumplir al menos una condición:

- responde a una exigencia normativa verificable;
- evita un riesgo clínico u operacional;
- reduce una tarea frecuente del ELEAM;
- produce evidencia útil para fiscalización.

Si solo agrega configuración o duplica información existente, no debe incorporarse.
