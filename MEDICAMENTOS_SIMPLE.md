# Circuito simple y seguro de medicamentos

## Principio

La ficha electrónica transcribe y ejecuta una indicación emitida por un profesional habilitado; no reemplaza la receta u orden clínica original. La orden de respaldo debe conservarse según el protocolo documental del ELEAM.

## Flujo por rol

### Prescriptor o profesional autorizado

Registra medicamento, dosis completa, vía, identificación del prescriptor, inicio, fin opcional, indicaciones especiales y una fila por cada hora. Puede seleccionar todos los días o días específicos.

### Cuidador o técnico autorizado

Trabaja desde **Medicamentos del turno**. Para cada dosis confirma **Administrar** u **Omitir**. Una administración común no solicita stock, cantidad ni notas. La omisión exige motivo y permite una observación y seguimiento.

### Supervisor de medicamentos

Gestiona lotes y conciliaciones únicamente cuando se trata de medicamentos controlados. El sistema bloquea lotes agotados o vencidos.

### Segundo validador

Los medicamentos marcados como controlados exigen lote y una firma de un usuario distinto de quien administró.

## Simplificaciones

- El inventario deja de ser obligatorio para medicamentos comunes.
- Stock, lote y segunda firma se activan juntos al marcar un medicamento controlado.
- Se eliminan del formulario las recurrencias mensual y única y la tolerancia configurable.
- Se eliminan unidad separada, principio activo, concentración y forma farmacéutica como decisiones duplicadas: la dosis debe escribirse completa, por ejemplo `1 comprimido de 500 mg`.
- Se eliminan visibilidad familiar y resumen familiar del circuito clínico.
- El tablero muestra solo Ahora, Completadas y Todas, con cuatro indicadores operativos.
- Las indicaciones vigentes aparecen en una sola lista.

## Mínimo documental

La transcripción conserva residente, medicamento, dosis, vía, posología, período, prescriptor, instrucciones, usuario, fechas y resultado de cada dosis. Las omisiones incluyen motivo. Los controlados mantienen lote, movimientos y doble validación.

Referencias oficiales:

- [Decreto Supremo N.º 20 para ELEAM](https://www.bcn.cl/leychile/navegar?idNorma=1182129).
- [Reglamento de farmacias y contenido de la prescripción](https://www.bcn.cl/leychile/navegar?idNorma=13613).
