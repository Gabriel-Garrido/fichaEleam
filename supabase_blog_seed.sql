-- SEED BLOG - FichaEleam
-- Articulos publicos para SEO + LLM de fichaeleam.cl.
-- Fuente normativa de trabajo: Decreto Supremo N 20 MINSAL, Ley Chile.
-- Ejecutar despues de supabase_schema.sql en Supabase SQL Editor.
-- Idempotente: usa on conflict (slug) do update set ...
-- ============================================================

insert into public.blog_posts
  (slug, titulo, resumen, meta_title, meta_description, keywords,
   tiempo_lectura_min, autor_nombre, estado, publicado_en, destacado, contenido_md)
values
(
  'decreto-20-fiscalizacion-seremi-eleam',
  'Decreto N°20: qué exige la SEREMI a un ELEAM en Chile',
  'Guía práctica para entender el Decreto N°20 aplicado a ELEAM: autorización sanitaria, dirección técnica, dotación, registros vivos, derechos y fiscalización.',
  'Decreto N°20 ELEAM: guía SEREMI 2026 | FichaEleam',
  'Guía actualizada del Decreto N°20 para ELEAM en Chile: artículos críticos, evidencia documental y operativa, transitorios y fiscalización SEREMI.',
  ARRAY['Decreto N°20 ELEAM','fiscalización SEREMI','Carpeta SEREMI DS 20','ELEAM Chile','personas mayores'],
  9, 'Equipo FichaEleam', 'publicado', now() - interval '2 days', true,
$post$
## Qué cambia con el Decreto N°20

El Decreto N°20 actualiza el reglamento aplicable a los Establecimientos de Larga Estadía para Personas Mayores. La mirada ya no puede ser solo una carpeta de documentos: el ELEAM debe demostrar autorización sanitaria, operación real, enfoque de derechos, dotación suficiente, registros clínicos y evidencia trazable.

Para un director o administrador, la pregunta clave es: ¿puedo mostrar a la SEREMI cómo funciona mi establecimiento hoy, por artículo, con evidencia vigente y responsable identificado?

## Evidencia que debe estar viva

Una fiscalización revisa documentos, pero también registros operativos:

- Autorización sanitaria, modificaciones y antecedentes del inmueble.
- Dirección técnica, jornada, reemplazos y comunicaciones a la autoridad.
- Dotación por dependencia, turnos y competencias del personal.
- Ingreso, consentimiento, contrato, inventario y entrega de derechos.
- Programa de atención integral usuaria y evaluaciones funcionales, cognitivas y nutricionales.
- Medicamentos: prescripción, administración, stock, temperatura, gaveta, controlados y eliminación.
- Protocolos, red de salud, urgencias, fallecimiento, reclamos y eventos críticos.
- Reportes a SENAMA y preparación para fiscalizaciones SEREMI.

## Cómo ordenar la Carpeta SEREMI DS 20

Trabaja por artículos, no por carpetas genéricas. Cada requisito debe tener:

1. Referencia normativa.
2. Tipo de evidencia: documento, registro o mixta.
3. Criticidad.
4. Responsable.
5. Estado fiscalizable.
6. Vencimiento o fecha de actualización si corresponde.
7. Historial de cambios.

## Cómo ayuda FichaEleam

FichaEleam está diseñado para apoyar la gestión y evidencia documental exigida por el Decreto N°20. La Carpeta SEREMI DS 20 cruza documentos, registros vivos y módulos operativos: programa integral, medicamentos, eventos adversos, camas, visitas, equipo y permisos.

La plataforma no promete cumplimiento automático. Entrega orden, trazabilidad, alertas y exportación para que el establecimiento llegue mejor preparado a una revisión.

> Solicita una demo gratuita y revisa cómo se ve una matriz DS 20 organizada por artículos, evidencia y brechas críticas.
$post$
),
(
  'checklist-fiscalizacion-seremi-ds20-eleam',
  'Checklist de fiscalización SEREMI DS 20 para ELEAM',
  'Checklist actualizado para preparar una fiscalización SEREMI bajo Decreto N°20: documentos, registros, vigencias, transitorios y evidencia operacional.',
  'Checklist fiscalización SEREMI DS 20 para ELEAM | FichaEleam',
  'Checklist DS 20 para fiscalización SEREMI en ELEAM: autorización sanitaria, dirección técnica, dotación, programa integral, medicamentos y registros.',
  ARRAY['checklist DS 20','fiscalización SEREMI ELEAM','documentos ELEAM','Carpeta SEREMI','Decreto N°20'],
  8, 'Equipo FichaEleam', 'publicado', now() - interval '4 days', true,
$post$
## Antes de la visita

Revisa la carpeta con foco en evidencia fiscalizable. No basta con tener archivos: la SEREMI necesita ver vigencia, responsable, trazabilidad y coherencia entre lo declarado y la operación real.

## Checklist esencial

### Autorización y modificaciones
- [ ] Solicitud o resolución sanitaria disponible.
- [ ] Antecedentes del inmueble, recepción final y certificados técnicos.
- [ ] Cambios de propietario, planta física o dirección técnica informados.
- [ ] Observaciones anteriores con plan de cierre.

### Dirección técnica y dotación
- [ ] Director técnico con calificación, jornada y reemplazo documentados.
- [ ] Dotación calculada según dependencia.
- [ ] Turnos actualizados y competencias del personal respaldadas.
- [ ] Manipuladores de alimentos y personal clínico con registros al día.

### Residentes y derechos
- [ ] Ingreso con consentimiento cuando corresponde.
- [ ] Contrato de residencia e inventario de bienes.
- [ ] Entrega de derechos y deberes con respaldo.
- [ ] Evaluaciones funcionales, cognitivas y nutricionales.

### Operación clínica
- [ ] Programa de atención integral usuaria vigente.
- [ ] Registros de signos vitales y observaciones con seguimiento.
- [ ] Medicamentos con receta, administración, stock y controlados.
- [ ] Eventos críticos, derivaciones y notificaciones registradas.

### Infraestructura y protocolos
- [ ] Plan de emergencias y evacuación.
- [ ] Protocolos de ingreso, egreso, urgencias y fallecimiento.
- [ ] Cocina, lavandería, residuos, medicamentos y sala de salud revisados.
- [ ] Red de salud y convenios externos disponibles.

## Estados recomendados

Usa estados fiscalizables: pendiente, en revisión, vigente, observado, vencido, no cumple, no aplica y requiere actualización. Así el equipo ve brechas reales sin confundir evidencia cargada con evidencia vigente.

FichaEleam incorpora estos estados en la Carpeta SEREMI DS 20 y permite exportar una vista de fiscalización para revisión interna.
$post$
),
(
  'programa-atencion-integral-usuaria-eleam',
  'Programa de atención integral usuaria en ELEAM: cómo llevarlo a la práctica',
  'El Decreto N°20 refuerza una gestión centrada en la persona mayor. Esta guía explica cómo convertir el programa integral en rutinas, tareas y evidencia.',
  'Programa de atención integral usuaria ELEAM | FichaEleam',
  'Cómo estructurar el programa de atención integral usuaria en ELEAM: objetivos, evaluaciones, rutinas de cuidado, seguimiento y evidencia DS 20.',
  ARRAY['programa atención integral usuaria','ELEAM','cuidados personas mayores','Decreto N°20','plan de cuidado'],
  7, 'Equipo FichaEleam', 'publicado', now() - interval '7 days', false,
$post$
## No es un documento guardado

El programa de atención integral usuaria debe vivir en la operación diaria. Si solo existe como PDF, no sirve para demostrar cuidado real ni continuidad entre turnos.

Un programa útil conecta diagnóstico, nivel de dependencia, objetivos, alimentación, hidratación, movilidad, higiene, eliminación, prevención de caídas, prevención de lesiones por presión, actividades y controles.

## Qué debe contener

- Evaluación funcional, cognitiva y nutricional.
- Objetivos de cuidado medibles.
- Actividades por turno y frecuencia.
- Responsable de ejecución.
- Registro de cumplimiento u omisión.
- Seguimiento cuando hay cambios clínicos.
- Revisión ante hospitalización, caída o deterioro.

## Cómo digitalizarlo

En FichaEleam, el módulo de planes de cuidado se presenta como Programa de atención integral usuaria. Cada actividad puede generar tareas por fecha, turno y hora; el funcionario completa, omite o reprograma con motivo y seguimiento.

La ventaja es que el programa deja de ser una promesa: se convierte en evidencia diaria, consultable por residente y por turno.
$post$
),
(
  'medicamentos-eleam-ds20-receta-stock-controlados',
  'Medicamentos en ELEAM bajo DS 20: receta, stock, frío y controlados',
  'Guía práctica para ordenar medicamentos en ELEAM: prescripción vigente, administración, control de stock, temperatura, gaveta, eliminación y psicotrópicos.',
  'Medicamentos ELEAM DS 20: receta, stock y controlados | FichaEleam',
  'Buenas prácticas de medicamentos en ELEAM bajo Decreto N°20: eMAR, receta, stock, frío, temperatura, gaveta, eliminación y controlados.',
  ARRAY['medicamentos ELEAM','eMAR ELEAM','psicotrópicos ELEAM','Decreto N°20','stock medicamentos'],
  7, 'Equipo FichaEleam', 'publicado', now() - interval '10 days', false,
$post$
## La administración es solo una parte

Un sistema moderno de medicamentos debe cubrir todo el ciclo: indicación, receta, horarios, administración, omisión, validación, stock, temperatura, almacenamiento, eliminación y control de psicotrópicos o estupefacientes.

## Puntos críticos

- Cada medicamento debe tener prescripción o respaldo vigente.
- La administración debe asociarse a residente, horario, funcionario y lote cuando corresponde.
- Las omisiones deben tener motivo.
- Los controlados requieren doble validación y trazabilidad de stock.
- La cadena de frío y temperatura deben registrarse cuando aplica.
- La eliminación o retiro debe quedar documentado.

## Qué hace FichaEleam

FichaEleam incluye eMAR, horarios, administración, validación de controlados, lotes, movimientos de stock, conciliaciones y auditoría. Esto permite detectar brechas antes de una fiscalización y mejora la continuidad entre turnos.
$post$
),
(
  'eventos-criticos-eleam-ds20-registro-seguimiento',
  'Eventos críticos en ELEAM: registro, seguimiento y notificación',
  'Cómo documentar caídas, errores de medicación, infecciones, fugas, agresiones y otros eventos críticos con trazabilidad útil para SEREMI y familias.',
  'Eventos críticos ELEAM: registro y seguimiento | FichaEleam',
  'Guía para registrar eventos críticos en ELEAM: categoría, severidad, acciones inmediatas, seguimiento, notificación familiar y cierre.',
  ARRAY['eventos críticos ELEAM','eventos adversos ELEAM','caídas ELEAM','fiscalización SEREMI','Decreto N°20'],
  6, 'Equipo FichaEleam', 'publicado', now() - interval '12 days', false,
$post$
## Por qué importa el registro completo

Un evento crítico sin seguimiento documentado abre riesgo clínico, legal y reputacional. La evidencia mínima debe responder qué ocurrió, cuándo, dónde, a quién afectó, quién actuó, qué se hizo, a quién se notificó y cómo se cerró.

## Campos mínimos

- Categoría y severidad.
- Fecha, hora, lugar y turno.
- Descripción clara.
- Causas probables.
- Acciones inmediatas.
- Notificación a familia o red de salud.
- Responsable de seguimiento.
- Conclusiones y cierre.

## En FichaEleam

El módulo de eventos adversos cubre eventos críticos, acciones de seguimiento, auditoría y visibilidad familiar controlada. También se conecta con observaciones diarias para evitar dobles registros y mantener la trazabilidad.
$post$
),
(
  'preparar-eleam-pequeno-fiscalizacion-seremi',
  'Cómo preparar un ELEAM pequeño para una fiscalización SEREMI DS 20',
  'Plan de cuatro semanas para ELEAM pequeños: evidencia DS 20, responsables, vigencias, registros clínicos y operación diaria sin sobrecargar al equipo.',
  'Preparar ELEAM pequeño para fiscalización DS 20 | FichaEleam',
  'Guía para preparar un ELEAM pequeño ante fiscalización SEREMI bajo Decreto N°20: documentos, registros vivos, dotación, medicamentos y eventos.',
  ARRAY['ELEAM pequeño','fiscalización SEREMI','Decreto N°20','gestión documental ELEAM','Carpeta SEREMI'],
  8, 'Equipo FichaEleam', 'publicado', now() - interval '16 days', false,
$post$
## Semana 1: autorización e infraestructura

Ordena resolución sanitaria, antecedentes del inmueble, certificados técnicos, plan de emergencia, cocina, lavandería, sala de salud y almacenamiento de medicamentos.

## Semana 2: dirección técnica y equipo

Revisa dirección técnica, reemplazos, dotación por dependencia, turnos, contratos, competencias, capacitaciones y manipuladores de alimentos.

## Semana 3: residentes

Valida ingresos, consentimientos, contratos, inventarios, entrega de derechos, evaluaciones y programa de atención integral usuaria.

## Semana 4: registros operativos

Revisa signos vitales, observaciones, medicamentos, eventos críticos, visitas, reclamos, red de salud y reportes.

## Regla práctica

Si no puedes encontrar la evidencia en menos de dos minutos, la carpeta no está lista para fiscalización. FichaEleam centraliza esta evidencia por artículo DS 20 y muestra brechas críticas primero.
$post$
),
(
  'digitalizar-ficha-clinica-eleam',
  'Cómo digitalizar la ficha clínica de un ELEAM en 30 días',
  'Plan paso a paso para llevar fichas clínicas, signos vitales, observaciones, medicamentos y Carpeta SEREMI DS 20 a un sistema digital.',
  'Digitalizar ficha clínica ELEAM en 30 días | FichaEleam',
  'Plan de 30 días para digitalizar la ficha clínica de un ELEAM en Chile: residentes, signos vitales, observaciones, medicamentos y Carpeta SEREMI DS 20.',
  ARRAY['ficha clínica digital','ELEAM','digitalización ELEAM','Carpeta SEREMI DS 20','personas mayores'],
  8, 'Equipo FichaEleam', 'publicado', now() - interval '20 days', false,
$post$
## Día 1 a 7: residentes

Carga residentes activos, contactos, diagnósticos, alergias, previsión, dependencia y ubicación. Define una fecha de corte para dejar de duplicar papel y sistema.

## Día 8 a 14: signos vitales y observaciones

Capacita al turno con más registros. Define categorías, seguimiento obligatorio y responsables. Revisa alertas críticas todos los días.

## Día 15 a 21: medicamentos

Carga indicaciones, horarios, recetas, lotes y stock. Define reglas para omisiones, controlados, temperatura y doble validación.

## Día 22 a 30: Carpeta SEREMI DS 20

Carga evidencia por artículo, criticidad, vigencia y responsable. Activa revisión de vencimientos y brechas críticas. El objetivo no es terminar todo en un mes: es dejar el sistema operativo y confiable.
$post$
),
(
  'comunicacion-familias-eleam-protocolo',
  'Comunicación con familias en ELEAM: protocolo y evidencia',
  'Cómo informar a familias de personas mayores de forma clara, trazable y segura, con portal familiar, visitas y notificación de eventos.',
  'Comunicación con familias en ELEAM | FichaEleam',
  'Buenas prácticas de comunicación con familias en ELEAM: qué informar, cuándo, cómo registrar visitas y cómo reducir reclamos con trazabilidad.',
  ARRAY['familias ELEAM','portal familiar ELEAM','visitas ELEAM','personas mayores','comunicación clínica'],
  6, 'Equipo FichaEleam', 'publicado', now() - interval '24 days', false,
$post$
## La familia necesita información concreta

La comunicación mejora cuando el establecimiento informa con datos: estado general, visitas, cambios relevantes, eventos, acciones tomadas y próximos pasos. Mensajes vagos generan ansiedad y reclamos.

## Protocolo mínimo

- Definir contacto principal.
- Registrar visitas y salidas.
- Notificar eventos relevantes con hora y responsable.
- Evitar compartir fotos de fichas o cuadernos por canales inseguros.
- Mantener trazabilidad de quién informó y cuándo.

## Portal familiar

FichaEleam permite acceso restringido por residente. La familia ve información autorizada sin modificar registros clínicos ni acceder a datos de otros residentes.
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
