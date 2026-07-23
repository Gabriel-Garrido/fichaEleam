# Auditoría técnica de cobranza de residentes

Fecha: 22 de julio de 2026
Alcance: `/cobranza`, permisos, esquema PostgreSQL, RLS, Storage, Edge Function, correo y documentación.

## Resultado

La implementación quedó preparada para una base vacía, separada de los pagos comerciales de FichaEleam y con controles consistentes en interfaz, rutas, base de datos, archivos privados y correo.

## Hallazgos corregidos

### Integridad financiera

- Una mensualidad anulada podía volver a crearse al abrir la pantalla. La unicidad ahora considera cualquier estado del período.
- Crear una mensualidad única podía sobrescribir o pausar una configuración recurrente. El perfil solo cambia cuando se solicita repetición mensual.
- El vencimiento podía quedar en un mes diferente al período facturado. Frontend y RPC ahora exigen coherencia.
- Era posible invocar el RPC para un residente inactivo. La validación del servidor limita nuevos cobros a residentes activos u hospitalizados.
- El límite documentado de 24 meses generaba 25 períodos por inclusión del mes actual. Se corrigió a 23 meses anteriores más el actual.
- Una respuesta de red perdida después de confirmar un pago podía inducir un reintento confuso. El cliente consulta el estado real antes de limpiar o anular.
- Se limitan a tres los registros de pago incompletos simultáneos por cobro para evitar acumulación de filas y archivos.

### Archivos y correo

- El RPC confiaba en MIME, tamaño y ruta declarados por el cliente. Fue eliminado y la finalización se trasladó a la Edge Function.
- La Edge Function descarga el archivo privado y detecta PDF, JPEG o PNG por firma binaria antes de registrar el pago.
- Los nombres de archivo se normalizan para impedir separadores de ruta y caracteres de control.
- Las políticas de Storage exigen exactamente la estructura `eleam/pago/archivo` y acceso vigente también al eliminar cargas incompletas.
- El PDF podía fallar con emojis u otros caracteres no admitidos por Helvetica estándar. Ahora normaliza el texto y divide valores largos en líneas seguras.
- Los reenvíos no tenían limitación. Se agregó espera de 30 segundos y máximo de 10 intentos por pago y hora.
- La verificación de suscripción de la Edge Function no contemplaba demos o cancelaciones aún vigentes. Ahora replica la regla central `eleam_has_access`.
- El envío y la finalización son idempotentes ante reintentos del mismo documento.

### Permisos y navegación

- Un funcionario con acceso exclusivo a cobranza terminaba en `/sin-permisos`. `/cobranza` se incorporó a la resolución de inicio.
- “Ver cobranza” aparecía duplicado como área y acción. La interfaz presenta una sola opción visible y sincroniza internamente ambos controles.
- Desactivar el área revoca todas sus acciones; activar cualquier acción habilita lectura y área.
- La cancelación de un registro incompleto solo se muestra a su creador o a quien pueda anular.

### UX, responsive y mantenibilidad

- La vista concentraba página, listas y cuatro modales en un archivo con JSX difícil de mantener. Se dividió en página, listas y formularios/modales.
- Las fechas iniciales se calculaban al importar el módulo y podían quedar obsoletas si la sesión cruzaba medianoche. Ahora se generan al abrir cada formulario.
- Se agregaron edición de monto, concepto y vencimiento de mensualidades futuras.
- Reactivar una mensualidad ya no genera cobros retroactivos por el período en que estuvo pausada.
- El historial renderizaba todos los registros simultáneamente. Ahora carga visualmente bloques de 40.
- Pestañas, buscador, filtros y barras de avance recibieron semántica ARIA.
- Botones y formularios se apilan en móvil; nombres, observaciones, archivos y montos largos ya no desbordan el contenedor.
- Las operaciones financieras bloquean el cierre accidental del modal mientras están guardando.

## Controles conservados

- Bloqueo `FOR UPDATE` para prevenir sobrepagos concurrentes.
- RLS por ELEAM y permisos de lectura.
- Mutaciones financieras exclusivamente mediante RPC o Edge Function autorizados.
- Bucket privado de 5 MB con rutas aisladas por ELEAM y pago.
- Anulación con motivo en lugar de borrado.
- Auditoría de creación, adjunto, envío y anulación.
- Confirmación de FichaEleam identificada como documento no tributario.

## Validación

La entrega debe cerrarse con `npm run verify`, que ejecuta ESLint, typecheck Deno, Vitest, contratos Supabase, build de producción y auditoría SEO. El resultado final queda consignado en el commit de publicación.

## Operación requerida

Como la base de datos parte vacía, se aplica el archivo `supabase_schema.sql` completo. Después se despliega `send-resident-payment-receipt` con JWT habilitado y se configuran `RESEND_API_KEY` y, opcionalmente, `RESEND_FROM_EMAIL`.
