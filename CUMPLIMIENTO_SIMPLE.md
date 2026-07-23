# Cumplimiento simple

La sección `/cumplimiento` reúne solo la información necesaria para preparar una fiscalización del ELEAM sin duplicar la operación diaria.

## Flujo

1. **Elegir un ámbito.** La pantalla utiliza el mismo orden temático del reporte emitido.
2. **Desplegar sus puntos.** Solo queda un ámbito abierto para evitar listas largas y ruido visual.
3. **Completar un punto.** Cada elemento explica su estado, el respaldo esperado y muestra una sola acción.
4. **Abrir registros relacionados.** Protocolos, emergencias o reclamos aparecen dentro del ámbito correspondiente y solo cuando el usuario tiene permiso.
5. **Preparar fiscalización.** La carpeta consolidada se abre desde el botón principal y mantiene el mismo orden.

## Verificadores calculados desde los registros

La pantalla y el reporte usan el mismo cálculo del servidor. Un resultado automático solo reemplaza la revisión manual cuando los registros demuestran todo el medio verificador:

- consentimiento firmado: residentes actuales con consentimiento firmado / residentes actuales;
- evaluaciones vigentes: evaluación funcional (Barthel o Katz), nutricional (MNA) y cognitiva (MMSE) / residentes actuales;
- red de salud: residentes con centro o sistema de salud y un control reciente o programado / residentes actuales;
- capacitación: personal activo con al menos 22 horas en el año / personal activo;
- dotación: turnos con cuidadores suficientes / turnos de hoy y los próximos seis días;
- cobertura TENS: turnos cubiertos / turnos del mismo período;
- entrega de derechos: consentimientos firmados que consignan la entrega / residentes actuales.

Cuando el denominador es cero, el estado es **Sin datos**, no “Al día”. Una observación abierta siempre prevalece sobre un cálculo favorable.

Los registros de planes individuales, carpeta personal, protocolos, emergencias, habitaciones y medicamentos solo verifican una parte del requisito. Se muestran como **Avance desde registros** y no cierran el punto porque todavía pueden faltar el programa general, documentos, socialización, aplicación o inspección física. En medicamentos se calcula la proporción de lotes activos con lote, ubicación y vencimiento vigente, pero eso no prueba por sí solo temperatura, acceso restringido, gavetas ni cadena de frío.

## Protocolos incluidos

La vista enfocada `/cumplimiento/protocolos` conserva únicamente los protocolos documentales administrados directamente en esta sección. Se abre desde el ámbito correspondiente y ya no repite accesos a emergencias, reclamos ni al reporte:

- ingreso y egreso;
- urgencias médicas;
- fallecimiento.

El plan anual de capacitación se mantiene en Personal; el plan de emergencias, en su registro propio; y el programa de atención integral, en Residentes. No se vuelven a crear dentro de Cumplimiento.

Se retiraron la matriz paralela de brechas transitorias y el reporte trimestral SENAMA porque duplicaban información o presentaban como periódica una obligación que el Decreto 20 no establece de esa forma.

## Acceso y seguridad

El administrador del ELEAM siempre puede configurar permisos. Para un funcionario se requiere:

1. tener habilitada el área **Cumplimiento** para consultar la carpeta y el reporte;
2. tener el permiso de acción correspondiente para modificar documentos, protocolos, emergencias, simulacros o reclamos.

Sin permiso de área, Cumplimiento no aparece en el menú y sus rutas quedan bloqueadas. Las políticas RLS de Supabase aplican la misma regla sobre los datos y archivos; ocultar el menú no es el control de seguridad.

## Fuente normativa

Alcance contrastado con el texto consolidado vigente del Decreto Supremo N.º 20 sobre ELEAM, especialmente sus artículos 25 y 31:

https://www.bcn.cl/leychile/navegar?i=1182129

La plataforma ayuda a organizar evidencia; la evaluación definitiva corresponde a la autoridad sanitaria.
