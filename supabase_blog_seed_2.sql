-- ============================================================
-- SEED BLOG v2 — FichaEleam
-- 10 posts nuevos: gestión operativa, normativa y digitalización de ELEAM
-- Ejecutar en Supabase SQL Editor (después de supabase_schema.sql)
-- Compatible con supabase_blog_seed.sql existente
-- ============================================================

insert into public.blog_posts
  (slug, titulo, resumen, meta_title, meta_description, keywords,
   tiempo_lectura_min, autor_nombre, estado, publicado_en, destacado, contenido_md)
values

-- ════════════════════════════════════════════════════════════════
-- POST 1
-- Preparar un ELEAM pequeño para fiscalización SEREMI
-- ════════════════════════════════════════════════════════════════
(
  'preparar-eleam-pequeno-fiscalizacion-seremi',
  'Cómo preparar un ELEAM pequeño para una fiscalización SEREMI',
  'Guía práctica para directores con equipos reducidos: qué documentos revisar antes de una visita, los errores que más observaciones generan y cómo dejar la carpeta SEREMI al día con recursos limitados.',
  'Preparar un ELEAM pequeño para fiscalización SEREMI | FichaEleam',
  'Guía práctica para ELEAM pequeños: qué revisar semana a semana antes de una fiscalización SEREMI, errores frecuentes y cómo demostrar cumplimiento del DS 14/2017.',
  ARRAY['fiscalización SEREMI ELEAM', 'preparar ELEAM fiscalización', 'DS 14/2017 ELEAM', 'documentos SEREMI ELEAM', 'ELEAM pequeño Chile'],
  9, 'Equipo FichaEleam', 'publicado', now() - interval '18 days', false,
$post$
Una fiscalización no avisa con anticipación. La SEREMI de Salud puede presentarse cualquier día hábil para revisar el funcionamiento de tu establecimiento. En un ELEAM pequeño —donde el director, el administrador y a veces el técnico paramédico son la misma persona— la preparación no puede depender de "la semana tranquila".

Esta guía está pensada para establecimientos de entre 10 y 40 residentes, donde quien lee esto es probablemente quien firma todo.

## Qué busca el fiscalizador (y cómo lo piensa)

La SEREMI de Salud fiscaliza el cumplimiento del **Decreto Supremo N°14/2017 del MINSAL**, que regula los Establecimientos de Larga Estadía para Adultos Mayores en Chile. Una visita puede surgir de:

- Denuncia de un familiar o residente
- Fiscalización rutinaria de oficio
- Seguimiento de una observación anterior
- Solicitud de renovación de la resolución sanitaria

El fiscalizador no busca "atrapar" al establecimiento. Busca evidencia de que los procesos existen, el personal los conoce y los registros lo demuestran. **El error más frecuente no es no tener los procesos: es no poder demostrarlos cuando llega la visita.**

## Semana 1 · Documentos del establecimiento

Reúne y verifica la vigencia de:

- **Resolución sanitaria de funcionamiento** (¿vence pronto?)
- **Certificado eléctrico SEC** (TE-1)
- **Certificado de gas** (si aplica)
- **Informe de potabilidad de agua** (renovación anual)
- **Certificado de fumigación y desratización** (revisar vigencia con tu SEREMI regional)
- **Certificados de extintores** con mantención al día

> Truco práctico: arma una tabla simple con nombre del documento, fecha de vencimiento y responsable de renovarlo. Revísala el primer día de cada mes.

## Semana 2 · Personal y director técnico

- Contratos de trabajo de **todos los funcionarios** al día
- Títulos y credenciales del **director técnico** vigentes
- Carta de aceptación del director técnico ante la SEREMI
- **Certificados de salud ocupacional** del personal (renovación anual)
- Registro de capacitaciones (al menos una por semestre, con lista firmada)
- Convenios vigentes con profesionales externos si no tienes planta propia

Un error frecuente: el director técnico figura en los documentos pero otra persona ejerce en la práctica. La SEREMI puede citar directamente al director para una entrevista.

## Semana 3 · Carpetas clínicas de residentes

Revisa que cada residente activo tenga:

- **Ficha clínica completa**: diagnóstico principal, alergias, medicamentos actuales, contacto de emergencia
- **Índice de Barthel** actualizado (la norma exige revisarlo al menos cada 6 meses o ante cambio de condición)
- **Plan de atención individualizado (PAI)** firmado
- **Contrato de residencia** y carta de derechos entregada con acuse de recibo
- **Consentimiento informado**

Si tienes 25 residentes y el Barthel más reciente tiene un año de antigüedad, eso será una observación directa. Los residentes con cambios de condición (hospitalización, fractura, deterioro cognitivo) necesitan actualización inmediata.

## Semana 4 · Registros operativos y protocolos

- **Protocolos firmados y físicamente accesibles**: infecciones, lavado de manos, medicamentos, emergencias clínicas, manejo de residuos
- **Plan de evacuación** actualizado con actas de **2 simulacros por año**
- **Kardex de medicamentos** por residente, sin huecos ni tachaduras
- **Libro foliado de psicotrópicos** (si aplica)
- **Bitácora de aseo y registros HACCP** (si tiene cocina interna)

## Los 3 errores que más observaciones generan en ELEAM pequeños

### 1. Protocolos "que están en el archivo"
No basta con tener el protocolo de administración de medicamentos. Debe estar impreso en el lugar de uso y el técnico de turno debe poder describir los pasos básicos. La SEREMI entrevista al personal, no solo al director.

### 2. Fichas clínicas desactualizadas
Un residente con fractura de cadera que aún figura con Barthel de "independiente" es una observación grave. Las fichas antiguas no son neutrales: son evidencia de falta de seguimiento clínico.

### 3. Registros sin firma ni responsable identificado
Cada observación, administración de medicamento y evento debe tener nombre y firma del funcionario que lo registró. Un registro sin firma equivale a ausencia de trazabilidad.

## Si ya tienes observaciones de una visita anterior

Las subsanaciones tienen plazos fijos y la siguiente visita es para verificar el cierre. Lleva una bitácora de seguimiento: qué se pidió, qué se hizo, quién ejecutó y cuándo quedó resuelto.

---

Mantener la carpeta SEREMI al día no se hace solo cuando hay fiscalización: es un trabajo cotidiano. **FichaEleam** tiene los 14 ámbitos del DS 14/2017 pre-configurados desde el primer día: cada documento sube con su vencimiento, el sistema avisa 30 días antes y puedes exportar la carpeta completa en cualquier momento. Solicita una demo gratuita para ver cómo quedaría tu establecimiento en menos de 10 minutos.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 2
-- Checklist básico de documentos ELEAM
-- ════════════════════════════════════════════════════════════════
(
  'checklist-documentos-basicos-eleam',
  'Checklist básico de documentos que todo ELEAM debería tener ordenado',
  'Guía práctica con los documentos administrativos, clínicos y operativos que conviene mantener disponibles en un ELEAM pequeño, con foco en vigencias, responsables y respaldo digital.',
  'Checklist de documentos básicos para ELEAM | FichaEleam',
  'Documentos que todo ELEAM debe tener ordenados: administrativos, clínicos, del personal y operativos. Guía práctica para establecimientos pequeños según el DS 14/2017.',
  ARRAY['documentos ELEAM Chile', 'checklist documentación ELEAM', 'DS 14/2017 documentos requeridos', 'carpeta SEREMI ELEAM', 'administración ELEAM'],
  8, 'Equipo FichaEleam', 'publicado', now() - interval '22 days', false,
$post$
Antes de pensar en software, procesos o protocolos, hay algo más urgente: saber exactamente qué documentos tienes, dónde están y si siguen vigentes.

En la mayoría de los ELEAM pequeños que empiezan a ordenarse, el primer trabajo es ese: un inventario real. Este artículo entrega la lista básica agrupada por categoría, pensada para establecimientos que aún trabajan con carpetas físicas o archivos dispersos en distintos computadores.

## Por qué el orden documental importa

El **Decreto Supremo N°14/2017 del MINSAL** exige que los ELEAM puedan demostrar su funcionamiento con documentación respaldatoria. Eso no significa solo tener los documentos: significa tenerlos actualizados, accesibles y con responsable identificado.

Sin eso, una fiscalización de la SEREMI puede derivar en observaciones formales con plazos de subsanación que consumen tiempo, generan tensión y, en casos graves, restringen el funcionamiento del establecimiento.

La **Ley N°20.584** también establece que los residentes y sus representantes tienen derecho a acceder a sus antecedentes clínicos. Tener las fichas ordenadas no es solo una exigencia de la SEREMI: es un derecho de quienes viven en tu establecimiento.

## Categoría 1 · Documentos del establecimiento

Estos acreditan que el ELEAM está autorizado para funcionar:

- Resolución sanitaria de funcionamiento vigente (SEREMI)
- Permiso municipal o CIP vigente
- RUT del establecimiento o persona jurídica propietaria
- Reglamento interno actualizado y publicado
- Tarifa de servicios vigente

**Qué revisar:** que el reglamento interno refleje la operación real del establecimiento. Un reglamento desactualizado que no menciona los protocolos vigentes puede generar observaciones durante una fiscalización.

## Categoría 2 · Documentos técnicos e infraestructura

- Certificado eléctrico SEC (TE-1)
- Certificado de gas (si aplica)
- Informe de potabilidad de agua (anual)
- Certificado de fumigación y desratización (vigencia variable por región)
- Certificados de mantención de extintores
- Certificado de ascensor (si aplica)
- Plan de evacuación y emergencias actualizado

**Qué revisar:** los certificados de extintores y fumigación vencen en plazos cortos y son los primeros que el fiscalizador pide ver. Ponlos en una carpeta visible con su fecha de vencimiento al frente.

## Categoría 3 · Documentos del personal

Por cada funcionario:
- Contrato de trabajo vigente
- Título o credencial profesional (para quienes ejercen cargos que lo exigen)
- Certificado de salud ocupacional (renovación anual)

Del equipo:
- Registro de capacitaciones con lista de asistencia y firma
- Descripción de cargos

Del director técnico:
- Credencial vigente
- Carta de aceptación ante la SEREMI

**Qué revisar:** los certificados de salud vencen anualmente y es muy frecuente encontrar personal con el certificado del año anterior. Agéndalos junto con los contratos de trabajo.

## Categoría 4 · Carpetas clínicas de residentes

Por cada residente activo:
- Ficha clínica completa: diagnóstico, alergias, medicamentos, contacto familiar
- Índice de Barthel actualizado (máximo 6 meses de antigüedad)
- Evaluación nutricional
- Plan de atención individualizado (PAI) firmado
- Escala de riesgo de caídas (Morse u otra)
- Consentimiento informado firmado
- Contrato de residencia firmado

**Qué revisar:** que la ficha de residentes antiguos esté igual de completa que la de quienes ingresaron recientemente. En ELEAM pequeños es frecuente que los residentes de más años tengan fichas incompletas "porque siempre estuvo así".

## Categoría 5 · Registros operativos

- Kardex de medicamentos (actualizado, sin huecos)
- Libro foliado de psicotrópicos (si corresponde)
- Registro de signos vitales por turno
- Libro de novedades u observaciones diarias
- Registro de caídas e incidentes
- Bitácora de aseo y HACCP (si tiene cocina)
- Registro de visitas de familias

**Qué revisar:** que estén al día sin interrupciones. Un Kardex con tres días sin registro levanta sospechas de inmediato.

## Cómo mantener este orden sin que se convierta en carga extra

Los checklists en papel no se actualizan solos. Lo que sí funciona:

1. **Asigna un responsable por categoría**, no por documento individual.
2. **Revisa vencimientos el primer día de cada mes**, no cuando hay fiscalización.
3. **Sube los documentos a un lugar digital único** aunque sea una carpeta compartida bien estructurada.

La carpeta SEREMI de **FichaEleam** hace exactamente eso: cada documento se sube con su vencimiento, el sistema avisa 30 días antes de que expire y puedes ver el estado de cumplimiento de todos los ámbitos en una sola pantalla. Útil tanto para el día a día como para llegar preparado a cualquier visita.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 3
-- Errores comunes en registros diarios de ELEAM
-- ════════════════════════════════════════════════════════════════
(
  'errores-registros-diarios-eleam',
  'Errores comunes en los registros diarios de un ELEAM y cómo evitarlos',
  'Observaciones vagas, sin firma, sin fecha o sin seguimiento: los problemas más frecuentes en los registros diarios de un ELEAM, con ejemplos concretos de cómo se ve un buen registro versus uno incompleto.',
  'Errores en registros diarios de ELEAM y cómo corregirlos | FichaEleam',
  'Los errores más frecuentes en los registros diarios de observación, signos vitales y novedades en ELEAM en Chile. Cómo evitarlos y qué protege a tu equipo y a tus residentes.',
  ARRAY['registros diarios ELEAM', 'errores fichas clínicas ELEAM', 'observaciones ELEAM', 'cómo registrar ELEAM', 'trazabilidad clínica adulto mayor'],
  7, 'Equipo FichaEleam', 'publicado', now() - interval '26 days', false,
$post$
En un ELEAM, los registros diarios son mucho más que burocracia. Son el historial clínico de cada residente, la evidencia de que el cuidado ocurrió y la herramienta que permite que el turno siguiente retome desde donde dejó el anterior.

Un registro mal hecho no solo puede generar observaciones durante una fiscalización. Puede ocultar un deterioro clínico que debería haberse detectado a tiempo.

Estos son los errores más frecuentes y cómo se ven cuando están bien hechos.

## Error 1 · Observaciones vagas sin información útil

**Malo:**
> "Paciente tranquilo durante el turno."

**Bueno:**
> "Residente durmió en intervalos cortos, despertó dos veces agitado entre las 02:00 y las 04:00. Se le realizó cambio postural, se administró medicamento indicado por médico (ver Kardex). Al amanecer estaba más tranquilo. No refirió dolor. Se avisa a turno siguiente para continuar observación de patrón de sueño."

**Por qué importa:** la Ley N°20.584 establece que los pacientes tienen derecho a que su historial clínico refleje la atención recibida. Una observación vaga no es un registro clínico: es una nota de presencia.

## Error 2 · Sin fecha, hora o turno

El registro sin marca de tiempo no tiene valor clínico ni legal. Si un residente sufre una caída a las 14:30 y el registro dice solo "se cayó", es imposible establecer en qué turno ocurrió, quién estaba presente y qué acciones se tomaron.

**Regla mínima:** todo registro debe tener fecha, hora y turno (mañana, tarde o noche).

## Error 3 · Sin nombre ni firma del funcionario responsable

Un registro sin autor es un registro anónimo. En caso de reclamo, denuncia o fiscalización, la pregunta inmediata será: ¿quién lo registró?

En registros en papel, la firma es obligatoria. En sistemas digitales, el autor queda asociado automáticamente al guardar. En ambos casos, **no existe el registro sin responsable**.

## Error 4 · Signos vitales con valores imposibles o incompletos

Frecuentes en el papel:

- Presión arterial registrada como "120" sin sistólica ni diastólica
- Saturación de oxígeno escrita como "95" sin indicar si el residente usaba O₂ suplementario
- Dolor sin escala (solo "refirió dolor")
- Temperatura sin unidad o en rango imposible para un adulto vivo

**Regla práctica:** si no tienes el dato, escríbelo como "no tomado" con el motivo, no lo dejes en blanco. Un campo vacío puede leerse como omisión.

## Error 5 · Eventos sin seguimiento documentado

Un funcionario registra que el residente se cayó a las 16:00. El turno siguiente no menciona el incidente. Una semana después, la familia pregunta cómo está el moretón.

El problema no es que no se haya registrado la caída: es que no hay trazabilidad del seguimiento. Un buen registro de evento incluye:

1. Qué pasó (fecha, hora, circunstancias)
2. Estado del residente al momento del evento
3. Acciones inmediatas realizadas
4. Notificaciones hechas (familia, médico)
5. Plan de seguimiento y responsable

## Error 6 · Copiar el registro de ayer

Ocurre en el papel y en algunos sistemas: el funcionario "copia" la nota del turno anterior porque "todo estuvo igual". El problema es que si algo cambia y no se registra, el historial clínico queda incorrecto.

Cada turno debe reflejar la observación real de ese turno. "Sin novedades" es válido solo si efectivamente no hay novedades y se especifica que se realizó la evaluación.

## Por qué un buen registro protege a todos

- **Al residente**: permite detectar cambios graduales que se pierden en la memoria.
- **Al funcionario**: demuestra que hizo su trabajo correctamente.
- **Al establecimiento**: es la principal defensa ante reclamos de familias o fiscalizaciones.
- **Al médico de cabecera**: le entrega contexto real sin depender de los recuerdos del turno.

El artículo 12 de la **Ley N°20.584** establece el derecho de toda persona a ser informada sobre su condición de salud y a que esa información esté documentada. Un ELEAM que no registra correctamente no solo incumple la norma: pone en riesgo a las personas que cuida.

---

**FichaEleam** incluye 12 tipos de observaciones con campos estructurados que hacen obligatorios los datos mínimos (fecha, hora, turno, descripción y responsable). Los eventos marcados como "requiere seguimiento" quedan visibles en el dashboard hasta que se documentan las acciones tomadas. Así nada queda sin respuesta.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 4
-- Kardex de medicamentos en ELEAM
-- ════════════════════════════════════════════════════════════════
(
  'kardex-medicamentos-eleam-pequeno',
  'Por qué el Kardex de medicamentos es clave en un ELEAM pequeño',
  'Qué es un Kardex, qué exige la normativa chilena, los errores más frecuentes al administrar medicamentos en un ELEAM pequeño y cómo un registro digital mejora la seguridad del residente.',
  'Kardex de medicamentos en ELEAM: qué es y cómo hacerlo bien | FichaEleam',
  'Guía sobre el Kardex de medicamentos en ELEAM en Chile: qué debe contener, errores frecuentes, libro de psicotrópicos y cómo la digitalización mejora la seguridad del residente.',
  ARRAY['Kardex medicamentos ELEAM', 'administración medicamentos adulto mayor', 'registro medicamentos ELEAM Chile', 'psicotrópicos ELEAM', 'seguridad medicación geriátrica'],
  8, 'Equipo FichaEleam', 'publicado', now() - interval '30 days', false,
$post$
En un ELEAM pequeño es común que la administración de medicamentos la realice siempre la misma persona. Cuando esa persona falta, toma vacaciones o renuncia, aparece el problema: nadie sabe con certeza qué tomó cada residente, en qué dosis y a qué hora.

El Kardex de medicamentos existe exactamente para evitar eso.

## Qué es un Kardex y para qué sirve

El Kardex es el registro individual de medicamentos de cada residente. Documenta:

- Qué medicamento se prescribió
- Dosis y vía de administración
- Frecuencia e indicación horaria
- Quién lo administró y a qué hora
- Observaciones relevantes (rechazó la dosis, vomitó, etc.)

No es una receta ni un listado. Es un **registro activo** que se llena en cada administración, por cada funcionario que la realiza. Su propósito es garantizar continuidad, seguridad y trazabilidad.

## Qué exige la normativa

El **Decreto Supremo N°14/2017 del MINSAL** establece que los ELEAM deben mantener registros de la administración de medicamentos por residente. El Kardex cumple esa función. Además:

- Las **prescripciones médicas** deben estar vigentes y firmadas por el médico tratante.
- Los **medicamentos psicotrópicos y estupefacientes** requieren un libro foliado oficial, con registro de stock, entradas y salidas. La SEREMI revisa ese libro en toda fiscalización.
- Los medicamentos deben almacenarse bajo condiciones adecuadas de temperatura y humedad.
- Debe haber un **convenio con un químico farmacéutico** que respalde el sistema de medicación.

## Errores frecuentes en el Kardex de medicamentos

### Huecos en el registro
Si un medicamento se administra pero no se registra, el Kardex queda incompleto. Al día siguiente no se sabe si se omitió la dosis o simplemente no se anotó. Ambas situaciones son problemáticas: una es un error clínico y la otra es un error de registro.

### Tachaduras y correcciones ilegibles
En el Kardex en papel es frecuente ver dosis corregidas con tachado y letra encima. La normativa requiere que las correcciones sean claras, con la firma de quien corrige. En sistemas digitales, cada corrección queda registrada en el historial sin poder borrarse.

### Prescripciones vencidas o sin indicación médica
Administrar un medicamento sin prescripción vigente es una falta grave. El Kardex debe cruzarse periódicamente con las prescripciones activas del médico tratante.

### Falta de registro de reacciones o rechazos
Si el residente rechaza una dosis, tiene una reacción o vomita el medicamento, eso debe quedar registrado. No es un detalle menor: puede cambiar la indicación clínica.

## El libro de psicotrópicos y estupefacientes

Algunos residentes tienen indicaciones de benzodiazepinas (como clonazepam o lorazepam) u otros medicamentos controlados. La ley chilena exige un **libro foliado oficial** de registro de estos medicamentos, diferente al Kardex general.

Ese libro debe mostrar:
- Stock inicial
- Cada entrada (compra, reposición)
- Cada salida (administración)
- Saldo actual

La SEREMI revisa este libro en detalle durante las fiscalizaciones. Los errores de cuadre son una de las observaciones más graves.

## Cómo un Kardex digital mejora la seguridad

Cuando el registro se hace en papel, el funcionario anota después de administrar. Es fácil olvidar, tachear o perder el registro. Con un sistema digital:

- El registro queda asociado automáticamente al funcionario y con marca de tiempo
- No hay tachaduras: las correcciones generan un historial
- Las prescripciones vencidas pueden alertar antes de la administración
- El director puede revisar el módulo de medicamentos desde cualquier lugar

---

El módulo EMAR (registro electrónico de administración de medicamentos) de **FichaEleam** registra cada administración con fecha, hora, funcionario y observaciones. El historial queda inmutable: no se puede borrar ni editar sin dejar rastro. Si tu ELEAM usa medicamentos controlados, puedes llevar el seguimiento de stock integrado con las administraciones diarias. Solicita una demo y muéstrale a tu equipo cómo se ve en un turno real.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 5
-- Registro de caídas e incidentes en ELEAM
-- ════════════════════════════════════════════════════════════════
(
  'registro-caidas-incidentes-eleam',
  'Cómo registrar caídas, incidentes y eventos relevantes en un ELEAM',
  'Guía práctica para documentar caídas, heridas, derivaciones y eventos clínicos en un ELEAM: qué datos mínimos debe tener cada registro, por qué importa legalmente y cómo garantizar el seguimiento.',
  'Cómo registrar caídas e incidentes en ELEAM | FichaEleam',
  'Guía práctica para registrar caídas, incidentes y eventos clínicos en ELEAM: datos mínimos, protocolo de notificación y por qué el registro protege al residente, al equipo y al establecimiento.',
  ARRAY['registro caídas ELEAM', 'incidentes ELEAM Chile', 'eventos adversos adulto mayor', 'ficha incidente ELEAM', 'protocolo caídas adulto mayor'],
  7, 'Equipo FichaEleam', 'publicado', now() - interval '34 days', false,
$post$
Las caídas en adultos mayores institucionalizados son el evento adverso más frecuente en un ELEAM. Según datos del MINSAL, entre el 30 y el 40% de los adultos mayores institucionalizados sufre al menos una caída por año. La mayoría no resulta en lesión grave, pero todas merecen registro.

El registro no es burocracia. Es protección: para el residente, para el funcionario que estaba de turno y para el establecimiento frente a cualquier reclamo posterior.

## Por qué registrar todos los eventos, incluso los menores

Hay una tendencia a registrar solo cuando "pasó algo grave". Ese criterio es un error por tres razones:

1. **Los eventos menores son predictores de eventos mayores.** Una caída sin lesión hoy puede preceder una fractura de cadera en dos semanas. Si no registras la primera, perdiste la señal.

2. **Sin registro no hay defensa.** Si una familia denuncia que su familiar se cayó y "nunca les avisaron", la única evidencia que tiene el ELEAM es el registro. Sin él, la palabra del funcionario no tiene soporte.

3. **La normativa exige trazabilidad.** El **DS 14/2017** y la **Ley N°20.584** obligan a documentar los eventos relevantes en la atención de los residentes.

## Qué datos mínimos debe tener un registro de evento

Todo registro de caída, incidente o evento clínico relevante debe contener:

| Campo | Por qué importa |
|-------|----------------|
| Fecha y hora exacta | Establece el turno y el contexto |
| Nombre del residente | Vincula el registro a la ficha correcta |
| Descripción del evento | Qué pasó, dónde, cómo fue encontrado |
| Condición del residente al momento | Consciente, confuso, con dolor, lesión visible |
| Acciones inmediatas | Qué se hizo, en qué orden |
| Notificaciones realizadas | A quién se avisó (familia, médico, director) y a qué hora |
| Plan de seguimiento | Próxima evaluación, responsable |
| Nombre y firma del registrador | Quién levantó el evento |

## Ejemplos de registro completo vs incompleto

**Incompleto (inaceptable):**
> "Residente se cayó. Se revisó. No hay lesiones."

**Completo:**
> "14 de mayo, 15:45, turno tarde. La residente [nombre] fue encontrada en el suelo del baño por la técnica [nombre]. Refirió dolor leve en cadera derecha. Consciente y orientada. Se realizó evaluación clínica, sin lesiones visibles al examen. Se comunicó a médico de turno vía teléfono a las 15:55, quien indicó observación y nueva evaluación en 2 horas. Se notificó a hija (contacto principal) a las 16:05. Se aplicó protocolo de caídas: revisión de cama, antideslizantes en baño solicitados. Próxima evaluación a las 18:00 por turno noche. Turno siguiente debe documentar estado. Firma: [nombre y cargo]."

La diferencia es enorme. El segundo registro protege al residente, al funcionario y al establecimiento.

## Eventos que siempre deben registrarse

- Caídas (con o sin lesión)
- Heridas, laceraciones o contusiones
- Agitación o conducta disruptiva significativa
- Crisis hipertensivas, hipoglicemia u otras urgencias
- Traslados a urgencias u hospitalización
- Fallecimiento (con todos los datos del proceso)
- Reclamos verbales de familias
- Errores de medicación (dosis equivocada, medicamento omitido, vía incorrecta)

## El seguimiento es parte del registro

Un evento registrado sin seguimiento documentado es un registro incompleto. El turno que recibe debe saber qué pasó y qué está pendiente. La anotación de seguimiento debe indicar:

- Si el plan se ejecutó
- Cómo evolucionó el residente
- Si se requiere nueva evaluación médica
- Si la familia fue informada del resultado

---

En **FichaEleam**, las observaciones tienen 12 tipos predefinidos —incluyendo caídas, incidentes y derivaciones— con todos los campos mínimos obligatorios. Los registros marcados como "requiere seguimiento" aparecen visibles en el dashboard hasta que el turno siguiente los cierra. El historial no se puede borrar, lo que protege al establecimiento ante cualquier consulta posterior.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 6
-- Comunicación con familias en ELEAM
-- ════════════════════════════════════════════════════════════════
(
  'comunicacion-familias-eleam-derechos',
  'Cómo mejorar la comunicación con familias en un ELEAM (y qué tienen derecho a saber)',
  'Qué información tienen derecho a recibir los familiares de residentes según la Ley 20.584, cómo estructurar esa comunicación y por qué la transparencia reduce reclamos y aumenta la confianza.',
  'Comunicación con familias en ELEAM: derechos y buenas prácticas | FichaEleam',
  'Guía para ELEAM: qué información tienen derecho a recibir las familias según la Ley 20.584, cómo comunicar sin saturar y cómo la transparencia reduce reclamos.',
  ARRAY['comunicación familias ELEAM', 'derechos familias ELEAM', 'Ley 20584 adulto mayor', 'portal familias ELEAM', 'transparencia ELEAM Chile'],
  7, 'Equipo FichaEleam', 'publicado', now() - interval '38 days', false,
$post$
Las familias que reclaman no siempre lo hacen porque algo salió mal. Muchas veces reclaman porque no saben qué está pasando y la incertidumbre se convierte en sospecha.

Un ELEAM que comunica bien —con regularidad, con datos concretos y con acceso fácil— recibe menos reclamos, retiene más residentes y genera más confianza en su trabajo diario.

## Qué dice la Ley sobre el derecho a la información

La **Ley N°20.584**, que regula los derechos y deberes de las personas en su atención en salud, establece principios que aplican directamente a los residentes de ELEAM:

- **Derecho a la información**: toda persona tiene derecho a ser informada de manera oportuna y comprensible sobre su estado de salud, el diagnóstico, el tratamiento y la evolución de su condición.
- **Confidencialidad**: la información clínica es privada. Solo puede compartirse con el titular o con la persona que tenga representación legal o autorización escrita.
- **Acceso al historial clínico**: el residente (o su representante legal) tiene derecho a solicitar copia de su ficha clínica.

Esto tiene consecuencias prácticas para los ELEAM:
1. La familia no tiene acceso automático a la ficha clínica si el residente es legalmente capaz y no ha otorgado autorización.
2. Cuando hay deterioro cognitivo o incapacidad, el representante legal sí tiene ese derecho.
3. Compartir información clínica sin autorización (por ejemplo, por WhatsApp) puede constituir una infracción.

## Qué información esperan las familias

Las familias rara vez piden acceso a los exámenes o diagnósticos técnicos. Lo que más les interesa es:

1. Cómo amaneció su familiar hoy
2. Si comió, si durmió, si tuvo dolor
3. Si hubo algún incidente o cambio de condición
4. Cuándo lo ve el médico y qué dijo
5. Cómo y cuándo pueden visitarlo

Casi nunca preguntan por la frecuencia cardíaca exacta. Pero sí quieren saber si "está bien".

## Estructura de comunicación que funciona

### Comunicación de rutina (sin eventos)

- Define un canal claro: llamada semanal, mensaje por portal o correo.
- Contenido mínimo: estado anímico general, si participa en actividades, si hay cambios de condición menores.
- Evita: vagas respuestas de "todo bien". Dan la sensación de que no sabes realmente cómo está el residente.

### Comunicación ante evento clínico

Sigue siempre este orden:

1. **Estabilizar al residente** primero.
2. **Llamar al contacto familiar primario** en los primeros 30 minutos.
3. **Enviar mensaje escrito** (correo o portal) con: qué ocurrió, qué se hizo, próximos pasos.
4. **Dejar registro en el sistema** con nombre de quien notificó y hora.

### Visitas

- Calendario claro de horarios y condiciones.
- Confirmación previa si es necesario.
- Registro de visitas con duración y observaciones.

## Errores frecuentes en la comunicación con familias

- **Mandar foto del cuaderno o Kardex por WhatsApp.** Esto viola la privacidad clínica del residente y crea un respaldo informal que puede usarse fuera de contexto.
- **Llamar solo cuando hay problemas.** La familia asocia las llamadas del ELEAM con malas noticias y entra en pánico antes de contestar.
- **Dar información clínica sin validar la identidad de quien llama.** Cualquiera puede llamar diciendo ser hijo o hija del residente.

## Por qué el acceso digital estructurado mejora la relación

Cuando la familia puede ver los últimos signos vitales, leer el resumen del turno y registrar sus propias visitas desde un portal, deja de depender de llamadas para sentirse tranquila. Eso transforma la relación: de "cliente que reclama" a "familia que participa".

---

**FichaEleam** incluye un portal del familiar integrado: cada residente puede tener uno o varios familiares autorizados, quienes ven únicamente a su residente y no pueden modificar registros clínicos. Esa separación entre vista y escritura es importante: la familia recibe información real sin interferir en la operación clínica. Solicita una demo y muéstrale a una familia cómo se vería su portal.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 7
-- Papel vs Excel vs Sistema digital para ELEAM
-- ════════════════════════════════════════════════════════════════
(
  'papel-excel-sistema-digital-eleam',
  'Papel, Excel o sistema digital: qué conviene más para administrar un ELEAM pequeño',
  'Comparación honesta de las tres formas de gestionar un ELEAM pequeño en Chile: ventajas y desventajas del papel, las planillas y el software especializado. Cuándo tiene sentido dar el salto digital.',
  'Papel, Excel o sistema digital para un ELEAM pequeño | FichaEleam',
  'Comparación honesta entre papel, Excel y software especializado para gestionar un ELEAM pequeño en Chile: costos reales, riesgos de cada opción y cuándo conviene digitalizar.',
  ARRAY['software ELEAM Chile', 'gestión digital ELEAM', 'digitalizar ELEAM pequeño', 'sistema gestión adulto mayor', 'Excel vs software ELEAM'],
  9, 'Equipo FichaEleam', 'publicado', now() - interval '42 days', false,
$post$
La mayoría de los ELEAM pequeños en Chile empiezan con papel. Algunos pasan a Excel. Pocos llegan a un sistema especializado. No hay una respuesta universal sobre cuál es mejor, pero sí hay un punto en el que cada opción empieza a fallar —y es útil saber cuál es ese punto antes de llegar a él.

## El papel: funciona hasta que ya no funciona

**Ventajas reales:**
- Sin costo de tecnología
- Todos saben cómo usarlo
- No depende de internet ni luz
- Firmable en el momento

**Cuándo empieza a fallar:**
- Cuando hay más de 15 residentes y el cuaderno de novedades tiene 200 páginas que nadie lee
- Cuando un funcionario renuncia y se lleva el conocimiento que no estaba escrito
- Cuando la SEREMI pide trazabilidad de los últimos 6 meses y tienes que revisar 6 cuadernos distintos
- Cuando una familia pregunta por el estado de su familiar y nadie recuerda qué pasó el martes pasado

El papel no escala. Funciona bien en ELEAMs muy pequeños (menos de 10 residentes) con personal estable y baja rotación. Fuera de esos casos, el costo real del papel es el tiempo que se pierde buscando y el riesgo de la información que se pierde.

## Excel: mejor que papel, con sus propias trampas

**Ventajas reales:**
- Más estructurado que el cuaderno
- Se puede buscar (si está bien organizado)
- Respaldo digital con poco esfuerzo
- Costo bajo o cero

**Cuándo empieza a fallar:**
- Cuando el archivo tiene 15 pestañas y solo una persona lo entiende
- Cuando dos funcionarios editan el mismo archivo y los datos se superponen
- Cuando no hay control de versiones y alguien borra filas sin querer
- Cuando el archivo está guardado en el computador del director (que está en reparación)
- Cuando tienes que demostrar "quién registró qué y cuándo"

El problema más grave de Excel no es la usabilidad: es la ausencia de control de acceso y trazabilidad. **La Ley N°19.628 sobre protección de datos personales** establece obligaciones sobre quién puede acceder a información de salud sensible. Un Excel compartido en una carpeta de OneDrive no cumple esos requisitos mínimos.

## WhatsApp como "sistema": el más peligroso de todos

Muchos ELEAM pequeños usan grupos de WhatsApp para coordinar turnos, registrar novedades y comunicar eventos clínicos. Es ágil, todos lo tienen y no cuesta nada.

El problema es que:
- No hay registro clínico: un mensaje de WhatsApp no es un documento respaldatorio
- Los mensajes se borran o se pierden al cambiar de teléfono
- Viola la privacidad del residente al compartir información de salud en una plataforma privada extranjera sin control de acceso
- No hay forma de saber quién borró qué

Un ELEAM que usa WhatsApp como sistema de registro no tiene registros: tiene conversaciones. Ante una fiscalización o un reclamo familiar, eso no es suficiente.

## Software especializado: cuándo conviene

Un sistema de gestión especializado para ELEAM resuelve los problemas del papel y el Excel, pero tiene un costo mensual. ¿Cuándo vale la pena?

**Conviene cuando:**
- Tienes más de 12-15 residentes y la información empieza a dispersarse
- Tienes más de 3 funcionarios y la coordinación de turno es un problema
- Te preparas para una fiscalización y no tienes certeza de dónde está cada documento
- La familia de algún residente empieza a hacer preguntas que no puedes responder rápido
- Tienes observaciones de la SEREMI pendientes de subsanar

**No conviene (todavía) cuando:**
- Tienes menos de 8 residentes y un equipo de 2 personas muy estable
- Tu principal problema es infraestructura o dotación, no información

## La pregunta real: ¿cuánto cuesta el desorden?

El papel y Excel parecen gratis. El costo real incluye:

- **Tiempo** de buscar información dispersa (15-30 min por consulta en ELEAMs sin sistema)
- **Riesgo** de una observación SEREMI por documentación deficiente
- **Reclamos** de familias por falta de información oportuna
- **Errores clínicos** por falta de continuidad entre turnos

Un sistema digital especializado consolida esos costos en una suscripción mensual fija.

---

**FichaEleam** fue diseñado específicamente para ELEAM en Chile: fichas clínicas, signos vitales, observaciones, carpeta SEREMI con los 14 ámbitos del DS 14/2017 y portal del familiar, todo en una sola plataforma. No es un sistema hospitalario adaptado ni una planilla mejorada. Es software pensado para establecimientos como el tuyo. Solicita una demo gratuita y ve si resuelve el problema que tienes hoy.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 8
-- Protección de datos personales en ELEAM
-- ════════════════════════════════════════════════════════════════
(
  'proteccion-datos-personales-eleam',
  'Protección de datos personales en ELEAM: lo básico que debe saber un administrador',
  'Qué son los datos sensibles de salud, qué obliga la Ley 19.628 a los ELEAM, cómo estructurar el acceso por roles y por qué compartir fichas por WhatsApp es un riesgo legal.',
  'Protección de datos personales en ELEAM: obligaciones y buenas prácticas | FichaEleam',
  'Guía para administradores de ELEAM sobre protección de datos: Ley 19.628, datos sensibles de salud, control de acceso, y cómo digitalizar sin exponer información de residentes.',
  ARRAY['protección datos ELEAM', 'Ley 19628 salud Chile', 'datos sensibles ELEAM', 'privacidad fichas clínicas ELEAM', 'seguridad datos adulto mayor'],
  8, 'Equipo FichaEleam', 'publicado', now() - interval '46 days', false,
$post$
Los residentes de un ELEAM confían a tu establecimiento información muy sensible: diagnósticos, medicamentos, historial clínico, situación familiar y económica. Esa información es un dato personal de salud y tiene protección legal en Chile.

No conocer esa protección no exime de cumplirla.

## Qué son los datos personales y los datos sensibles de salud

La **Ley N°19.628 sobre protección de la vida privada** define los datos personales como toda información que permite identificar a una persona. Los datos de salud son una categoría especial: **datos sensibles**, que reciben protección reforzada.

¿Qué cuenta como dato sensible de salud en un ELEAM?

- Diagnósticos médicos
- Medicamentos y prescripciones
- Nivel de dependencia
- Historial de hospitalizaciones y procedimientos
- Estado cognitivo y evaluaciones psicológicas
- Información sobre incontinencia, heridas, caídas

Cualquier registro clínico de un residente es un dato sensible. Eso incluye las fichas en papel, los cuadernos de turno, los Kardex y los archivos digitales.

## Qué obliga la Ley N°19.628 a los ELEAM

La ley establece que quien trata datos de salud debe:

1. **Tener una base legal para hacerlo.** En el caso de los ELEAM, la base es la prestación del servicio de cuidado: los datos se tratan porque son necesarios para atender al residente.

2. **Garantizar la confidencialidad.** Los datos no pueden compartirse con terceros sin autorización del titular o su representante legal.

3. **Asegurar que el acceso es proporcional.** No toda la información de un residente tiene que estar disponible para todos los funcionarios.

4. **Permitir al titular ejercer sus derechos.** El residente (o su representante) puede solicitar acceso a su información, corregir datos incorrectos o pedir que se le informe quién ha accedido a su ficha.

## Prácticas que generan riesgo legal

### Compartir fichas o Kardex por WhatsApp
WhatsApp no es un canal seguro para información de salud. Los mensajes se guardan en servidores fuera de Chile, no hay control de quién puede reenviarlos y no queda registro de acceso. Si un funcionario envía la ficha de un residente por WhatsApp a la familia sin autorización escrita del titular, eso puede constituir una infracción a la Ley N°19.628 y a la Ley N°20.584.

### Dejar fichas físicas accesibles en áreas comunes
Una carpeta de fichas en recepción, visible para visitas o proveedores, no cumple los requisitos de confidencialidad. Las fichas deben estar en un lugar de acceso restringido al personal autorizado.

### No diferenciar niveles de acceso
No todos los funcionarios necesitan ver la misma información. Un auxiliar de aseo no necesita acceso al Kardex de medicamentos. Un familiar no necesita ver el diagnóstico psiquiátrico del residente. Definir roles y accesos es una obligación de gestión, no solo una buena práctica.

### Sin control de quién ve qué y cuándo
Un sistema de información sin registro de accesos no permite saber si alguien consultó la ficha de un residente sin autorización. En caso de filtración o reclamo, esa falta de trazabilidad es una debilidad grave.

## Cómo estructurar el acceso a la información

La regla básica es **acceso mínimo necesario**: cada persona debe ver solo lo que necesita para hacer su trabajo.

Un esquema práctico:

| Rol | Acceso |
|-----|--------|
| Director/admin | Todo el establecimiento |
| Enfermera/técnico | Fichas clínicas y registros de su turno |
| Auxiliar | Registros de tareas (aseo, alimentación) |
| Familiar autorizado | Resumen del residente asignado, sin datos de terceros |

Digitalizar no es "subir archivos a una carpeta": es **controlar quién ve, quién modifica y quién descarga** información sensible.

---

**FichaEleam** implementa control de acceso por rol desde el diseño: el director ve todo el establecimiento, el funcionario ve solo lo necesario para su trabajo y el familiar ve únicamente a su residente. Cada acción queda registrada con usuario, fecha y hora. Así cumples la Ley N°19.628 sin tener que construir el sistema desde cero.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 9
-- Organización de tareas por turno en ELEAM
-- ════════════════════════════════════════════════════════════════
(
  'organizacion-tareas-turno-eleam',
  'Cómo organizar las tareas por turno en un ELEAM pequeño para que nada se pierda',
  'Guía práctica para estructurar las tareas diarias de un ELEAM por turno de mañana, tarde y noche: qué registrar, cómo hacer el traspaso y cómo evitar olvidos que afectan al residente.',
  'Cómo organizar tareas por turno en un ELEAM | FichaEleam',
  'Guía para ELEAM pequeños: cómo estructurar las tareas de cada turno (mañana, tarde, noche), qué registrar, cómo hacer el traspaso y evitar olvidos en la atención diaria.',
  ARRAY['tareas turno ELEAM', 'organización turnos ELEAM Chile', 'traspaso turno ELEAM', 'gestión turno adulto mayor', 'continuidad atención ELEAM'],
  7, 'Equipo FichaEleam', 'publicado', now() - interval '50 days', false,
$post$
El problema más frecuente en los turnos de un ELEAM no es que el personal no sepa hacer su trabajo. Es que no sabe exactamente qué dejó pendiente el turno anterior.

Un medicamento que no se administró porque "se olvidó anotar". Un residente con dolor que no se comunicó al siguiente turno. Una familia que llamó y nadie registró qué dijo. Estas situaciones no son negligencia: son consecuencia de un sistema de traspaso mal estructurado.

## Por qué el traspaso de turno es el momento más crítico

El **Decreto Supremo N°14/2017** exige que los ELEAM garanticen continuidad en la atención de sus residentes. Esa continuidad depende del traspaso de turno: el momento en que quien termina le entrega a quien llega todo lo que necesita saber para hacer bien su trabajo.

Un traspaso oral no es suficiente. Las personas olvidan, omiten detalles y priorizan de forma distinta. El traspaso necesita un soporte escrito que contenga lo esencial.

## Estructura básica por turno

### Turno mañana (07:00 - 15:00)

Es el turno de mayor actividad clínica. Tareas habituales:

- Control de signos vitales (a hora establecida, no "cuando hay tiempo")
- Registro de medicamentos de la mañana en Kardex
- Higiene y aseo personal
- Desayuno con registro de aceptación y dieta especial si corresponde
- Evaluación visual de condición general de cada residente
- Atención de heridas o procedimientos programados

**Qué registrar al cerrar el turno:**
- Residentes con cambios de condición observados
- Medicamentos omitidos y motivo
- Eventos (caídas, agitación, quejas)
- Pendientes para turno tarde

### Turno tarde (15:00 - 23:00)

- Medicamentos de la tarde
- Actividades recreativas o terapéuticas
- Once y cena con registro
- Visitas de familias
- Seguimiento de eventos del turno mañana

**Qué registrar al cerrar:**
- Visitas recibidas (nombre, hora, duración)
- Estado anímico del residente al final del turno
- Eventos o novedades
- Pendientes para turno noche

### Turno noche (23:00 - 07:00)

- Control de medicamentos nocturnos
- Rondas de verificación de sueño y postura
- Atención a residentes con insomnio o agitación nocturna
- Registro de cambios posturales en residentes de alto riesgo

**Qué registrar al cerrar:**
- Calidad del sueño por residente (general)
- Incidentes nocturnos
- Pendientes urgentes para turno mañana

## El error de registrar "sin novedades" cuando hay novedades menores

"Sin novedades" es una nota válida cuando literalmente no pasó nada relevante. Pero cuando ocurre algo menor —el residente no durmió bien, rechazó el desayuno, estuvo más confuso de lo habitual— ese detalle sí importa.

Un deterioro gradual se ve en la suma de esas notas. Si cada turno escribe "sin novedades" porque el residente "más o menos igual", se pierde la señal temprana de un cambio clínico relevante.

## Cómo hacer que el traspaso funcione

Tres condiciones para un traspaso efectivo:

1. **Formato fijo**: siempre se registra lo mismo, en el mismo lugar, con la misma estructura. Así quien llega sabe exactamente dónde buscar.

2. **Pendientes explícitos**: si algo quedó sin hacer o requiere seguimiento, se escribe con nombre del responsable y plazo. No "hay que ver cómo sigue el residente X": sino "residente X: reevaluar presión a las 21:00, si supera 160 avisar médico de turno".

3. **Cierre formal del turno**: el funcionario que termina confirma que registró todo y firma (en papel o digital). El que llega confirma que leyó los pendientes.

## El cuaderno de novedades no escala

En ELEAMs pequeños, el cuaderno de novedades cumple la función de traspaso durante años. El problema aparece cuando:

- Hay más de 10 residentes y el cuaderno mezcla todo
- Tienes que buscar qué pasó con un residente específico hace 3 semanas
- El director no puede revisar el turno de la noche sin estar físicamente presente

---

**FichaEleam** estructura el traspaso por turno de forma digital: cada observación queda asociada al residente, al turno y al funcionario. Los pendientes marcados como "requiere seguimiento" son visibles hasta que se cierran. El director puede revisar el resumen del turno desde el celular antes de llegar al establecimiento. Solicita una demo para ver cómo se ve un traspaso de turno en la plataforma.
$post$
),

-- ════════════════════════════════════════════════════════════════
-- POST 10
-- Trazabilidad en ELEAM: guía para propietarios y directores
-- ════════════════════════════════════════════════════════════════
(
  'trazabilidad-eleam-guia-directores',
  'Trazabilidad en un ELEAM: qué es, para qué sirve y cómo construirla desde hoy',
  'Qué significa trazabilidad en términos simples para un ELEAM, por qué protege al establecimiento ante familias y fiscalizaciones, y cómo construirla con o sin tecnología.',
  'Trazabilidad en ELEAM: qué es y cómo protege tu establecimiento | FichaEleam',
  'Guía para directores de ELEAM: qué es la trazabilidad, por qué es clave ante fiscalizaciones SEREMI y reclamos de familias, y cómo construirla paso a paso.',
  ARRAY['trazabilidad ELEAM', 'gestión ELEAM Chile', 'documentación ELEAM directores', 'ELEAM fiscalización trazabilidad', 'DS 14/2017 registros ELEAM'],
  9, 'Equipo FichaEleam', 'publicado', now() - interval '54 days', false,
$post$
"Trazabilidad" es una de esas palabras que aparece en los reglamentos pero que pocos definen en términos prácticos. En un ELEAM, la trazabilidad significa exactamente esto:

**Poder responder cuatro preguntas sobre cualquier evento:**
1. ¿Qué pasó?
2. ¿Cuándo pasó?
3. ¿Quién lo registró?
4. ¿Qué acción se tomó?

Si puedes responder esas cuatro preguntas sobre cualquier cosa que ocurrió en tu establecimiento en los últimos 6 meses, tienes trazabilidad. Si no puedes, tienes un problema.

## Por qué la trazabilidad protege tu establecimiento

### Ante una fiscalización SEREMI

El fiscalizador llega con preguntas específicas: "¿Cuándo fue la última evaluación de Barthel de este residente?", "¿Quién administró este medicamento el lunes pasado?", "¿Qué pasó después de la caída del mes anterior?"

Si tienes los registros, respondes en 2 minutos. Si no los tienes, o están en un cuaderno ilegible, o la persona que los hizo ya no trabaja contigo, estás en problemas.

El **Decreto Supremo N°14/2017** exige documentación respaldatoria de los procesos de atención. La **Ley N°20.584** establece el derecho de los residentes a que su atención quede documentada. La trazabilidad no es una opción: es una obligación legal.

### Ante el reclamo de una familia

Una familia acusa que su familiar fue mal medicado. O que nadie les avisó de una caída. O que el residente llegó con una herida que nunca se comunicó.

En ese momento, la única defensa real es el registro. Si el Kardex muestra la administración con nombre y hora, si el registro de caída tiene descripción completa y notificación a la familia, si el turno que siguió documentó el seguimiento, el reclamo tiene respuesta.

Sin registros, la palabra del establecimiento no tiene soporte.

### Como ventaja operativa

Un ELEAM con trazabilidad real puede:

- Detectar deterioros clínicos graduales que no se notan día a día pero son visibles en el historial
- Identificar patrones: un residente que cae frecuentemente en el turno noche tiene un problema de entorno o de atención nocturna
- Entregar información precisa a médicos y especialistas sin depender de la memoria del personal

## Ejemplos de trazabilidad bien y mal implementada

### Medicamento administrado

**Sin trazabilidad:**
> Cuaderno dice "mañana: medicamentos"

**Con trazabilidad:**
> "08:35. Residente [nombre]. Enalapril 5mg vía oral administrado por técnico paramédico [nombre]. Sin novedades."

---

### Caída

**Sin trazabilidad:**
> "Se cayó. Sin lesiones."

**Con trazabilidad:**
> "Fecha, hora, turno. Descripción del evento. Condición del residente. Evaluación clínica. Acciones realizadas. Notificación a familia (nombre de contacto, hora). Plan de seguimiento. Nombre y firma del registrador."

---

### Documento de acreditación actualizado

**Sin trazabilidad:**
> Certificado guardado en una carpeta sin fecha

**Con trazabilidad:**
> "Certificado de fumigación subido el [fecha] por [usuario]. Vence el [fecha]. Reemplaza versión anterior del [fecha]."

---

### Comunicación con familia

**Sin trazabilidad:**
> Llamada de WhatsApp sin registro

**Con trazabilidad:**
> "Familiar [nombre] visitó al residente el [fecha] de 15:00 a 17:30. Registro de visita cerrado por técnico [nombre]."

## Cómo construir trazabilidad sin sistema digital

Si aún no tienes un sistema digital, puedes mejorar significativamente la trazabilidad con estas reglas básicas:

1. **Todo registro tiene fecha, hora y nombre.** Sin excepción.
2. **Cada evento tiene seguimiento documentado.** No se cierra un incidente hasta que el turno siguiente registra la evolución.
3. **Los documentos tienen fecha de vigencia.** Cada certificado tiene escrita su fecha de vencimiento en la portada.
4. **Los cambios dejan rastro.** Si un medicamento cambia de dosis, la prescripción anterior no se destruye: se archiva con la fecha de cambio.

## Por qué la trazabilidad digital es más confiable

La trazabilidad en papel depende de la disciplina de cada funcionario. Un día de mucha presión, un turno corto de personal, o simplemente el olvido, pueden romper la cadena de registros.

Un sistema digital elimina algunos de esos puntos de falla: el registro queda automáticamente asociado al usuario con sesión activa, la fecha y hora no se pueden manipular y el historial no se puede borrar.

---

**FichaEleam** genera trazabilidad completa en cada módulo: quién registró, cuándo, desde qué dispositivo y qué cambió. Los documentos de acreditación tienen historial de versiones. Las observaciones clínicas tienen seguimiento obligatorio. Los signos vitales muestran alertas si el valor sale del rango normal. Todo conectado, todo con nombre y hora, todo disponible para cuando lo necesites. Si quieres ver cómo se ve esa trazabilidad en la práctica, solicita una demo gratuita sin compromiso.
$post$
)

on conflict (slug) do update set
  titulo            = excluded.titulo,
  resumen           = excluded.resumen,
  contenido_md      = excluded.contenido_md,
  meta_title        = excluded.meta_title,
  meta_description  = excluded.meta_description,
  keywords          = excluded.keywords,
  destacado         = excluded.destacado,
  actualizado_en    = now();
