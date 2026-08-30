# Preparación documental DS20

La sección `/cumplimiento` reúne la documentación y los registros necesarios para preparar una revisión del ELEAM sin duplicar la operación diaria. El porcentaje mostrado mide preparación interna; no es una certificación ni un resultado oficial de la SEREMI.

El texto consolidado del DS20 rige desde el 1 de octubre de 2025. Para los ELEAM comprendidos en las disposiciones transitorias, el plazo general se cumple el 1 de octubre de 2028 y el plazo de la letra k) del artículo 10 el 1 de octubre de 2030. La aplicabilidad debe revisarse según la situación particular del establecimiento.

## Flujo

1. **Resolver prioridades.** La vista inicial muestra los puntos pendientes y críticos antes que la matriz completa.
2. **Distinguir el tipo de evidencia.** Cada punto indica si FichaEleam lo verifica, aporta solo una parte o requiere un documento externo.
3. **Seguir una acción concreta.** Se explica qué exige el DS20, qué registro falta y qué respaldo debe conservarse.
4. **Abrir el registro de origen.** Residentes, dotación, medicamentos, protocolos, emergencias y reclamos se corrigen en su módulo fuente.
5. **Emitir una carpeta de revisión.** El reporte conserva la referencia normativa, el tipo de respaldo y las brechas abiertas.

## Verificadores calculados desde los registros

La pantalla y el reporte usan el mismo cálculo del servidor. Un resultado automático solo prepara el punto sin intervención manual cuando los registros estructurados cubren el medio verificador disponible en la plataforma:

- consentimiento firmado: residentes actuales con consentimiento firmado / residentes actuales;
- evaluaciones vigentes: evaluación funcional (Barthel o Katz), nutricional (MNA) y cognitiva (MMSE) / residentes actuales;
- red de salud: residentes con centro o sistema de salud y un control reciente o programado / residentes actuales;
- dotación: turnos con cuidadores suficientes / turnos de hoy y los próximos seis días;
- cobertura TENS: turnos cubiertos / turnos del mismo período;
- entrega de derechos: consentimientos firmados que consignan la entrega / residentes actuales.

Cuando el denominador es cero, el estado es **Sin datos**, no “Al día”. Una observación abierta siempre prevalece sobre un cálculo favorable.

Los registros de capacitación, planes individuales, carpeta personal, protocolos, emergencias, habitaciones y medicamentos solo verifican una parte del requisito. El **Registro de evolución** aporta observaciones fechadas, acciones, responsable y seguimientos a la carpeta personal, pero no sustituye sus demás antecedentes clínicos y sociales. Estos puntos se muestran como **Apoyo de FichaEleam** y no se cierran automáticamente cuando todavía pueden faltar el plan anual con objetivos y evaluación, el programa general, documentos, socialización, aplicación o inspección física.

En medicamentos, Cumplimiento separa dos verificadores: **stock y almacenamiento** y **receta, recepción y uso**. FichaEleam calcula lotes con identificación, ubicación y vencimiento; indicaciones activas con receta en PDF o imagen; recepciones y administraciones. La ficha del residente conserva esos registros operativos sin mostrar un checklist normativo duplicado. Cumplimiento concentra la revisión del acceso restringido, gavetas, almacenamiento bajo llave, cadena de frío, designación del responsable y demás respaldos físicos o documentales.

Los requisitos obligatorios no permiten “No aplica”. Esa opción se reserva a situaciones condicionales, como cambios que no han ocurrido, observaciones SEREMI inexistentes, ausencia de almacenamiento de medicamentos o servicios privados que no han sido necesarios.

El sistema tampoco inventa vencimientos. Solo exige fecha para obligaciones con periodicidad expresa dentro de esta matriz: reporte trimestral SENAMA, plan anual de capacitación e inventario anual de bienes personales. En otros documentos se puede registrar voluntariamente la fecha indicada por su emisor.

## Vigencia de documentos

En los requisitos de evidencia **documental** o **mixta**, FichaEleam mantiene el estado según el documento actual:

- al cargar un respaldo cuya fecha sigue vigente, el punto queda **Vigente**;
- si la fecha informada es hoy o ya pasó, el archivo se conserva y el punto queda **Vencido**;
- al llegar la fecha de vencimiento, la matriz y el detalle sincronizan el estado automáticamente;
- si se archiva el documento actual y existen versiones anteriores, queda **Requiere actualización**;
- un documento nuevo reemplaza la versión anterior sin borrar el historial.

Antes de guardar se muestra el resultado esperado. La fecha de emisión no puede estar en el futuro y el vencimiento no puede ser anterior a ella. La carga admite los formatos documentales e imágenes indicados en pantalla hasta 10 MB; si el archivo excede ese límite, se recomienda reducirlo con [iLovePDF](https://www.ilovepdf.com/es/comprimir_pdf) y volver a cargarlo.

Un usuario con permiso para editar Cumplimiento puede aplicar un **ajuste manual** cuando exista una excepción verificable. El motivo y el responsable quedan en auditoría y el estado no vuelve a cambiar por fecha hasta seleccionar **Volver a actualización automática** o cargar un nuevo documento. Los puntos calculados desde registros operativos no muestran carga documental.

## Protocolos incluidos

La vista enfocada `/cumplimiento/protocolos` conserva únicamente los protocolos documentales administrados directamente en esta sección. Se abre desde el ámbito correspondiente y ya no repite accesos a emergencias, reclamos ni al reporte:

- ingreso y egreso;
- urgencias médicas;
- fallecimiento.

El plan anual de capacitación se mantiene en Personal; el plan de emergencias, en su registro propio; y el programa de atención integral, en Residentes. No se vuelven a crear dentro de Cumplimiento.

No se duplica una matriz transitoria separada. El reporte trimestral a SENAMA sí se conserva como requisito documental porque el artículo 12 letra t exige reportar, al menos trimestralmente y por el medio dispuesto por SENAMA, información administrativa, residentes y trabajadores.

## Acceso y seguridad

El administrador del ELEAM siempre puede configurar permisos. Para un funcionario se requiere:

1. tener habilitada el área **Cumplimiento** para consultar la carpeta y el reporte;
2. tener el permiso de acción correspondiente para modificar documentos, protocolos, emergencias, simulacros o reclamos.

Sin permiso de área, Cumplimiento no aparece en el menú y sus rutas quedan bloqueadas. Las políticas RLS de Supabase aplican la misma regla sobre los datos y archivos; ocultar el menú no es el control de seguridad.

## Fuente normativa

Alcance contrastado con el texto consolidado vigente del Decreto Supremo N.º 20 sobre ELEAM, incluidas las modificaciones publicadas en 2025:

https://www.bcn.cl/leychile/navegar?i=1182129

La plataforma ayuda a organizar evidencia; la evaluación definitiva corresponde a la autoridad sanitaria.
