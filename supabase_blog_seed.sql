-- ============================================================
-- SEED BLOG — FichaEleam
-- Ejecutar después de supabase_schema.sql si quieres cargar
-- los artículos iniciales del blog público.
-- ============================================================

-- ── Seed: 5 artículos iniciales de alto valor ──────────────────
insert into public.blog_posts
  (slug, titulo, resumen, meta_title, meta_description, keywords,
   tiempo_lectura_min, autor_nombre, estado, publicado_en, destacado, contenido_md)
values
(
  'ds-14-2017-fiscalizacion-seremi-eleam',
  'DS 14/2017 explicado: qué exige la SEREMI a un ELEAM en Chile (guía 2026)',
  'Guía práctica del Decreto 14/2017 del MINSAL. Qué documentos pide la SEREMI, en qué falla la mayoría de las residencias y cómo prepararte sin perder noches.',
  'DS 14/2017: qué exige la SEREMI a un ELEAM en Chile · FichaEleam',
  'Guía 2026 del DS 14/2017 para ELEAM en Chile: 14 ámbitos, documentos clave y cómo evitar las observaciones más comunes en una fiscalización SEREMI.',
  ARRAY['DS 14/2017','fiscalización SEREMI','ELEAM','acreditación','adulto mayor','Chile'],
  9, 'Equipo FichaEleam', 'publicado', now() - interval '2 days', true,
$post$
## ¿Qué es el DS 14/2017?

El **Decreto Supremo 14 del Ministerio de Salud** (publicado el 2 de febrero de 2018) establece el reglamento que rige a los **Establecimientos de Larga Estadía para Adultos Mayores (ELEAM)** en Chile. Reemplazó al antiguo DS 466 e introdujo exigencias mucho más estrictas de infraestructura, dotación, registros clínicos y derechos de los residentes.

> Si tu ELEAM funciona en Chile, **es la norma sobre la que serás fiscalizado** por la SEREMI de Salud de tu región.

## Los 14 ámbitos que la SEREMI revisa

En la práctica, una fiscalización SEREMI revisa estos **14 ámbitos**:

1. Antecedentes legales del ELEAM
2. Autorización sanitaria y resolución de funcionamiento
3. Infraestructura, inmueble y condiciones sanitarias
4. Seguridad, incendios, evacuación y señalética
5. Dirección técnica
6. Personal, dotación y turnos
7. Protocolos obligatorios
8. Residentes y carpetas personales
9. Contratos, consentimientos y derechos de residentes
10. Medicamentos y registros asociados
11. Alimentación, cocina y manipulación de alimentos
12. Aseo, lavandería, residuos y control de plagas
13. Reclamos, sugerencias y comunicación con familias
14. Fiscalizaciones, actas, observaciones y subsanaciones

Cada ámbito agrupa **entre 4 y 8 requisitos** específicos: documentos vigentes, protocolos firmados, registros al día, condiciones físicas verificables.

## Las 5 observaciones más comunes (y cómo evitarlas)

### 1. Documentos vencidos
Certificados SEC, fumigación, extintores, salud del personal. La SEREMI no acepta "estaba vigente la semana pasada".
**Solución:** un sistema con alertas de vencimiento por documento (lo que hace [FichaEleam](/) en el módulo Carpeta SEREMI).

### 2. Plan de cuidados individualizado (PAI) inexistente o desactualizado
Cada residente debe tener un PAI firmado y revisado periódicamente.
**Solución:** revisar Barthel + plan cada 6 meses como parte del protocolo.

### 3. Kardex de medicamentos en papel ilegible
La SEREMI revisa cómo registras la administración. Cuadernos con tachones son una observación segura.
**Solución:** registro digital con firma electrónica del funcionario.

### 4. Falta de simulacros de evacuación
Mínimo 2 al año, con acta firmada. Casi nadie los registra correctamente.

### 5. Bitácora de aseo y control HACCP en blanco
Cocina y aseo son los ámbitos donde más fallan los ELEAM.

## ¿Cómo prepararte?

1. **Inventario:** lista los 14 ámbitos y marca qué tienes y qué te falta.
2. **Vigencias:** revisa fechas de todos los certificados; muchos vencen a los 6-12 meses.
3. **Protocolos firmados y conocidos:** no basta con tenerlos, el personal debe poder explicarlos.
4. **Carpetas de residentes:** ficha clínica, evaluaciones funcionales, consentimientos, prescripciones vigentes.
5. **Acta de simulacro:** programa simulacros con anticipación.

## Cómo te ayuda FichaEleam

[FichaEleam](/) es la primera plataforma chilena hecha específicamente para el DS 14/2017:

- **Carpeta SEREMI con los 14 ámbitos** ya pre-cargados (~70 requisitos).
- **Alertas de vencimiento** automáticas por documento.
- **Versionado de evidencias:** cada vez que reemplazas un certificado, el anterior queda en historial.
- **Export imprimible** para llegar a la fiscalización con todo en orden.

> [Crea tu cuenta gratis](/register) y revisa qué está al día y qué te falta en menos de 10 minutos.

## Recursos oficiales

- [Decreto 14/2017 — BCN](https://bcn.cl)
- [SEREMI de Salud por región](https://www.minsal.cl)

---

*¿Tienes una fiscalización pendiente? Prueba el [demo de FichaEleam](/demo) y te mostramos cómo se ve un ELEAM con la documentación al día.*
$post$
),

(
  'checklist-fiscalizacion-seremi-eleam',
  'Checklist completo de fiscalización SEREMI para tu ELEAM (descargable)',
  'El checklist de los documentos, protocolos y registros que tu ELEAM necesita tener visibles cuando llegue la SEREMI. Ordenado por los 14 ámbitos del DS 14/2017.',
  'Checklist fiscalización SEREMI para ELEAM · DS 14/2017 · FichaEleam',
  'Checklist 2026: 14 ámbitos y +70 requisitos que la SEREMI revisa en una fiscalización a tu ELEAM en Chile. Documentos, protocolos y registros clave.',
  ARRAY['checklist fiscalización SEREMI','ELEAM','documentos SEREMI','DS 14/2017','acreditación adulto mayor'],
  7, 'Equipo FichaEleam', 'publicado', now() - interval '4 days', true,
$post$
## ¿Por qué necesitas un checklist?

Cuando llega la SEREMI a tu ELEAM tienes **una sola oportunidad** de mostrar que todo está en orden. Las observaciones se quedan en acta, y subsanarlas después implica plazos, cartas oficiales y, a veces, multas.

Este checklist te entrega **los requisitos críticos por ámbito** para que llegues con la carpeta lista.

## Checklist por ámbito

### A01 · Antecedentes legales
- [ ] Escritura de constitución de la sociedad
- [ ] Certificado de vigencia persona jurídica (≤ 6 meses)
- [ ] RUT empresa
- [ ] Iniciación de actividades SII
- [ ] Identificación del representante legal

### A02 · Autorización sanitaria
- [ ] Resolución sanitaria vigente
- [ ] CIP municipal vigente
- [ ] Permiso de edificación
- [ ] Recepción final de obra

### A03 · Infraestructura
- [ ] Planos actualizados
- [ ] Certificado SEC eléctrico (TE-1)
- [ ] Certificado SEC gas (si aplica)
- [ ] Informe potabilidad de agua (anual)
- [ ] Certificado fumigación y desratización (≤ 6 meses)
- [ ] Certificado ascensor (si aplica)

### A04 · Seguridad y emergencias
- [ ] Plan de emergencia y evacuación firmado
- [ ] Certificado extintores vigente
- [ ] Señalética instalada
- [ ] Acta de **2 simulacros al año**
- [ ] Bitácora de luces de emergencia
- [ ] Protocolo de búsqueda y rescate

### A05 · Dirección técnica
- [ ] Credencial vigente del director técnico
- [ ] Título profesional
- [ ] Contrato de prestación
- [ ] Carta de aceptación SEREMI

### A06 · Personal
- [ ] Nómina actualizada
- [ ] Contratos de todos
- [ ] Títulos profesionales
- [ ] **Certificados de salud vigentes** (anuales)
- [ ] Registro de capacitaciones
- [ ] Convenios con prestadores externos

### A07 · Protocolos obligatorios
- [ ] PCI (prevención y control de infecciones)
- [ ] Lavado de manos
- [ ] Aislamiento (contacto y gotitas)
- [ ] Manejo de residuos REAS
- [ ] Manejo de medicamentos
- [ ] Alimentación y deglución
- [ ] Emergencias clínicas

### A08 · Carpetas de residentes
- [ ] Ficha clínica completa
- [ ] Índice de Barthel actualizado (≤ 6 meses)
- [ ] MMSE / Test del reloj
- [ ] Evaluación nutricional
- [ ] **Plan de cuidados individualizado (PAI)** firmado
- [ ] Consentimiento informado
- [ ] Escala de Morse (riesgo caídas)

### A09 · Contratos y derechos
- [ ] Contrato de residencia firmado
- [ ] Carta de derechos entregada (con acuse)
- [ ] Reglamento interno publicado
- [ ] Carta de tarifas vigente

### A10 · Medicamentos
- [ ] Inventario de botiquín
- [ ] Kardex de administración por residente
- [ ] Prescripciones médicas vigentes
- [ ] **Libro foliado de psicotrópicos**
- [ ] Convenio con químico farmacéutico

### A11 · Alimentación
- [ ] Minuta mensual visada por nutricionista
- [ ] Certificados de manipuladores
- [ ] **Bitácora HACCP de temperaturas**
- [ ] Protocolo de dietas especiales
- [ ] Encuestas de satisfacción

### A12 · Aseo y residuos
- [ ] Programa de aseo
- [ ] Bitácora diaria
- [ ] Protocolo de lavandería
- [ ] Convenio retiro REAS
- [ ] Certificado de control de plagas

### A13 · Reclamos y comunicación con familias
- [ ] Libro de reclamos foliado
- [ ] Procedimiento de respuesta
- [ ] Buzón de sugerencias
- [ ] Bitácora de comunicaciones
- [ ] Actas de reuniones con familias

### A14 · Fiscalizaciones previas
- [ ] Acta de la última fiscalización
- [ ] Plan de subsanación firmado
- [ ] Bitácora de seguimiento

## Cómo gestionar este checklist sin volverte loco

Imprimirlo y pegarlo en la pared no escala. Necesitas:

1. **Estado por requisito:** cumple / pendiente / observado / vencido / no aplica.
2. **Vencimiento por documento.**
3. **Evidencia digital adjunta** (PDF, foto del certificado).
4. **Historial:** qué cambió y cuándo.

[FichaEleam](/) trae los 14 ámbitos y +70 requisitos pre-cargados. Cada vez que subes una evidencia, el sistema marca el requisito como cumple, calcula el vencimiento y te avisa 30 días antes.

> **Crea tu cuenta gratis y descarga la Carpeta SEREMI lista para imprimir** en 10 minutos. [Empezar →](/register)
$post$
),

(
  'digitalizar-ficha-clinica-eleam',
  'Cómo digitalizar la ficha clínica de un ELEAM en 30 días',
  'Plan paso a paso para llevar las fichas clínicas de tu ELEAM al mundo digital sin romper la operación. Qué priorizar las primeras 4 semanas.',
  'Digitaliza la ficha clínica de tu ELEAM en 30 días · FichaEleam',
  'Plan de 30 días para digitalizar la ficha clínica de un ELEAM en Chile: residentes, signos vitales, observaciones de turno y carpeta SEREMI.',
  ARRAY['ficha clínica digital','ELEAM','digitalización','Chile','adulto mayor'],
  8, 'Equipo FichaEleam', 'publicado', now() - interval '7 days', false,
$post$
## ¿Por qué digitalizar?

Hay tres razones que aparecen en cada ELEAM con el que conversamos:

1. **La SEREMI cada vez exige más trazabilidad.** Cuadernos en lápiz son insuficientes.
2. **Rotación del personal:** los registros viven en la cabeza de quien renuncia.
3. **Familias quieren saber.** Y deben saber, por derecho.

Lo que sigue es un plan **realista de 30 días**, hecho con ELEAMs reales que ya hicieron la transición.

## Semana 1 · Inventario y residentes

**Objetivo:** todos los residentes activos cargados en sistema.

- Día 1-2: Lista en Excel con `nombre · RUT · fecha nacimiento · diagnóstico principal · alergias · contacto familiar`.
- Día 3-5: Carga en el sistema. En FichaEleam se hace en ~3 minutos por residente.
- Día 6-7: Verificación cruzada con la lista en papel. **No avances si quedan residentes sin cargar.**

> El error más común es saltar este paso. Sin residentes, el resto no funciona.

## Semana 2 · Signos vitales

**Objetivo:** cero signos vitales en cuaderno desde el día 8.

- Capacita al personal de turno mañana primero (es donde más se registra).
- Define **rangos clínicos** que disparen alertas (ej. SatO₂ < 92, FC > 110).
- Empieza a registrar **en paralelo** con el cuaderno en los primeros 3 días, luego solo digital.

FichaEleam muestra el rango clínico en vivo: cuando el funcionario escribe 88 de saturación, ve la celda en rojo y sabe que hay que avisar.

## Semana 3 · Observaciones por turno

**Objetivo:** dejar de tener "el cuaderno de novedades".

Define las **12 categorías** que vas a usar (caídas, incidentes, curaciones, medicamentos, cambios posturales, higiene, alimentación, etc.).

Reglas que funcionan:
- Toda caída se registra **antes de terminar el turno**.
- Toda observación marcada como "requiere seguimiento" tiene un responsable.
- El director revisa el módulo cada mañana en lugar de leer cuadernos.

## Semana 4 · Carpeta SEREMI

**Objetivo:** ámbitos legales, infraestructura y residentes con evidencia digital.

- Sube los certificados que tienes a mano (resolución sanitaria, SEC, fumigación).
- Asigna responsable a los requisitos pendientes.
- Programa los simulacros de evacuación pendientes.

Después de 30 días no tendrás todo perfecto, pero tendrás **el sistema funcionando**, una carpeta visible y trazabilidad real.

## Errores típicos que no debes cometer

- **Cargar todos los residentes "en paralelo" mientras siguen en cuaderno.** Define una fecha de corte.
- **Dejar la digitalización al "día cuando haya tiempo".** No lo va a haber.
- **Comprar un sistema genérico de salud** que no entiende el flujo ELEAM.

## Por qué FichaEleam acelera esto

- Pre-cargado para Chile (DS 14/2017, 14 ámbitos, 12 categorías de observación).
- Permisos por rol: admin, funcionario clínico, familiar.
- Funciona desde el celular del turno.
- Suscripción mensual desde **$50.000 CLP** por establecimiento (no por usuario).

> [Empieza ahora con el demo gratuito](/demo) y, si te convence, [crea tu cuenta](/register).
$post$
),

(
  'signos-vitales-adulto-mayor-rangos-criticos',
  'Signos vitales en adultos mayores: rangos normales, alertas y errores típicos',
  'Tabla actualizada de signos vitales para adultos mayores institucionalizados, con qué pasa cuando salen de rango y cuándo avisar al médico de turno.',
  'Signos vitales adulto mayor: rangos normales y alertas críticas · FichaEleam',
  'Rangos clínicos de signos vitales en adultos mayores: presión, frecuencia cardíaca, saturación, temperatura, glucosa y dolor. Cuándo es alerta crítica.',
  ARRAY['signos vitales adulto mayor','rangos clínicos','ELEAM','enfermería geriátrica','presión arterial'],
  6, 'Equipo FichaEleam', 'publicado', now() - interval '10 days', false,
$post$
## ¿Por qué los rangos del adulto mayor son distintos?

En geriatría los signos vitales tienen **rangos distintos a los del adulto joven**: la fragilidad, la polifarmacia y los diagnósticos crónicos cambian la lectura. Lo que en una persona de 30 sería tolerable, en un residente de 85 puede ser una urgencia.

Este artículo entrega los rangos que usamos en FichaEleam y cuándo deberías escalar al médico de turno.

## Tabla de rangos clínicos

| Parámetro | Normal | Atención (warning) | Crítico |
|-----------|--------|--------------------|---------|
| **Presión sistólica** (mmHg) | 100–139 | 90–99 ó 140–179 | <90 ó ≥180 |
| **Presión diastólica** (mmHg) | 60–89 | 50–59 ó 90–109 | <50 ó ≥110 |
| **Frecuencia cardíaca** (lpm) | 60–100 | 50–59 ó 101–120 | <50 ó >120 |
| **Frecuencia respiratoria** (rpm) | 12–20 | 10–11 ó 21–24 | <10 ó >24 |
| **Temperatura** (°C) | 36.0–37.7 | 35.0–35.9 ó 37.8–38.9 | <35 ó ≥39 |
| **Saturación O₂** (%) | ≥95 | 90–94 | <90 |
| **Glucosa** (mg/dL) | 70–179 | 60–69 ó 180–249 | <60 ó ≥250 |
| **Dolor** (0–10) | 0–3 | 4–6 | ≥7 |

## Cuándo escalar al médico de turno

Escalar **siempre** ante:

- **SatO₂ < 90** sin oxígeno o que no recupera con O₂ a 2 lpm.
- **PAS < 90 sostenida** + síntomas (mareo, piel pálida).
- **Temperatura ≥ 39** o hipotermia < 35.
- **Glucemia < 60** sintomática o ≥ 300.
- **Dolor 7+** sin causa identificada.
- **Frecuencia respiratoria > 24** con uso de musculatura accesoria.

## Errores típicos al registrar

1. **Saltarse el primer control matinal porque "está dormido".** El residente con sepsis suele estar somnoliento.
2. **Confiar solo en la SatO₂ del oxímetro de dedo en pacientes con uñas pintadas o frío periférico.**
3. **No registrar el dolor.** Si no se mide, no se trata.
4. **No anotar la postura en la presión arterial.** PAS de pie vs acostado puede diferir 30 mmHg.

## Cómo lo hace FichaEleam

Cada parámetro tiene **su rango clínico cargado**. Cuando el funcionario escribe el valor, ve **en vivo** el color del rango (verde/ámbar/rojo) y un resumen global del registro. Si SatO₂ es 89, el sistema marca el registro como "Requiere atención inmediata" antes de guardarlo.

> [Prueba el demo de signos vitales](/demo/funcionario) y mira cómo se ve un control de turno con alertas automáticas.

## Bibliografía rápida

- *Manual de Geriatría* — Sociedad de Geriatría y Gerontología de Chile.
- *Vital signs in the elderly* — Journal of Gerontological Nursing.
$post$
),

(
  'comunicacion-familias-eleam-protocolo',
  'Comunicación con familias en ELEAM: protocolo, herramientas y formato que sí funciona',
  'Cómo informar a las familias sin saturarlas, qué decir cuando hay un evento clínico y por qué dar acceso digital reduce reclamos a la mitad.',
  'Comunicación con familias en ELEAM: protocolo y formato · FichaEleam',
  'Buenas prácticas de comunicación con familias en ELEAM: qué informar, cuándo y cómo. Reduce reclamos y mejora la confianza.',
  ARRAY['comunicación familias ELEAM','adulto mayor','protocolo familias','ELEAM Chile'],
  6, 'Equipo FichaEleam', 'publicado', now() - interval '14 days', false,
$post$
## El problema real

Las familias no reclaman porque les llamen poco. Reclaman porque **no entienden qué está pasando con su familiar**. Una llamada al mes que dice "todo bien" genera más ansiedad que cuatro mensajes cortos con datos concretos.

Si un ELEAM mejora su comunicación con familias, baja reclamos, baja rotación de residentes y sube la cuota promedio que las familias están dispuestas a pagar.

## Qué información esperan las familias

Por encuestas y conversaciones con familiares, lo que más quieren saber es:

1. **Estado anímico y físico de su familiar.**
2. **Comió, durmió, fue al baño.**
3. **Se cayó, se enfermó, lo vio el médico.**
4. **Cuándo es la próxima visita médica.**
5. **Cuándo y cómo los pueden visitar.**

Casi nunca preguntan por la presión arterial exacta. Pero sí quieren saber si "está bien".

## Protocolo simple que funciona

### Comunicación de rutina (sin eventos)

- **Bitácora semanal** automática: estado general, peso, situaciones destacables.
- Familia puede revisar cuando quiera, sin esperar a que el ELEAM llame.

### Comunicación ante evento clínico

Sigue siempre este orden:

1. **Estabilizar** al residente.
2. **Llamada al contacto familiar primario** dentro de los primeros 30 minutos.
3. **Mensaje escrito** (WhatsApp o portal) con: qué pasó, qué se hizo, próximos pasos.
4. **Registro en sistema** firmado por el funcionario.

### Comunicación de visitas

- Calendario claro y visible.
- Confirmación 24h antes.
- Bitácora de visitas con duración.

## Por qué dar acceso digital baja reclamos

Cuando la familia tiene un **portal donde ve los signos vitales recientes, las observaciones del turno y puede registrar sus visitas**, se siente parte del cuidado en lugar de cliente que reclama.

FichaEleam tiene un **portal del familiar** integrado: cada residente puede tener uno o varios familiares autorizados, ven solo a su residente y no pueden modificar registros clínicos. Esa frontera es importante.

## Errores que aún se ven

- **Mandar foto del cuaderno por WhatsApp.** Es ilegible y no es trazable.
- **Llamar solo cuando hay problemas.** La familia entra en pánico cada vez que ve la llamada.
- **Decir "está bien" sin datos.** Genera desconfianza.

## Cómo lo hace FichaEleam

- Portal del familiar con últimos signos vitales y observaciones.
- Registro de visitas (en sistema o en papel + digital).
- Permisos limitados al residente vinculado.
- Sin costo extra por familiar.

> [Mira cómo se ve el portal del familiar en el demo](/demo/familiar) — sin registro, sin instalación.

---

*¿Tienes tu propia plantilla de comunicación con familias? Escríbenos a contacto@fichaeleam.cl y la sumamos a este artículo con tu crédito.*
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
