# Circuito simple y seguro de medicamentos

## Principio

La ficha electrónica transcribe y ejecuta una indicación emitida por un profesional habilitado; no reemplaza la receta u orden clínica original. La orden de respaldo debe conservarse según el protocolo documental del ELEAM.

## Flujo por rol

### Prescriptor o profesional autorizado

Registra medicamento, dosis completa, vía, identificación del prescriptor, inicio, fin opcional, indicaciones especiales y una fila por cada hora. Puede seleccionar todos los días o días específicos.

### Cuidador o técnico autorizado

Trabaja desde **Medicamentos del turno**. Para cada dosis confirma **Administrar** u **Omitir**. Una administración común no solicita stock, cantidad ni notas. La omisión exige motivo y permite una observación y seguimiento.

### Supervisor de medicamentos

Registra la recepción de todo medicamento almacenado: lote, cantidad, vencimiento y ubicación. Revisa alertas y deja movimientos auditados. En medicamentos controlados también realiza conteos y conciliaciones. El sistema bloquea la administración con lotes agotados o vencidos cuando la indicación descuenta stock.

### Segundo validador

Los medicamentos marcados como controlados exigen lote y una firma de un usuario distinto de quien administró.

## Simplificaciones

- Todo medicamento almacenado puede mantener recepción y stock por lote desde **Recepción y stock**.
- En controlados, stock, lote y segunda firma se activan juntos y son obligatorios para administrar.
- Se eliminan del formulario las recurrencias mensual y única y la tolerancia configurable.
- Se eliminan unidad separada, principio activo, concentración y forma farmacéutica como decisiones duplicadas: la dosis debe escribirse completa, por ejemplo `1 comprimido de 500 mg`.
- Se eliminan visibilidad familiar y resumen familiar del circuito clínico.
- El tablero muestra solo Ahora, Completadas y Todas, con cuatro indicadores operativos.
- Las indicaciones vigentes aparecen en una sola lista.

## Mínimo documental

La transcripción conserva residente, medicamento, dosis, vía, posología, período, prescriptor, instrucciones, usuario, fechas y resultado de cada dosis. Cada indicación puede conservar una o más recetas en PDF o imagen, de hasta 3 MB cada una, sin sobrescribir el historial. Las recepciones mantienen lote, cantidad, vencimiento, ubicación y usuario; las omisiones incluyen motivo. Los controlados agregan conteo, movimientos y doble validación. Las verificaciones físicas y sus documentos se revisan únicamente en Cumplimiento para no duplicar funciones en la ficha del residente.

Los permisos de medicamentos separan registrar o modificar el tratamiento, adjuntar recetas, administrar, gestionar recepción y stock, y efectuar la segunda firma de controlados. Los cuidadores pueden archivar recetas, pero la administración queda desactivada por defecto: sólo debe habilitarse cuando exista capacitación acreditada y el protocolo del ELEAM lo autorice. TENS recibe por defecto administración, stock y segunda firma; enfermería puede mantener el tratamiento indicado y su respaldo. Los administradores conservan acceso completo.

Referencias oficiales:

- [Decreto Supremo N.º 20 para ELEAM](https://www.bcn.cl/leychile/navegar?idNorma=1182129).
- [Reglamento de farmacias y contenido de la prescripción](https://www.bcn.cl/leychile/navegar?idNorma=13613).
