# Decreto Supremo N°20/2021 MINSAL — ELEAM
## Documento de trabajo para actualización de FichaEleam

**Proyecto:** FichaEleam  
**Objetivo:** Consolidar el contenido normativo relevante del Decreto Supremo N°20 del Ministerio de Salud y traducirlo en requerimientos funcionales, técnicos y de producto para actualizar FichaEleam desde una lógica normativa anterior hacia una lógica alineada al Decreto N°20 y sus modificaciones vigentes.

**Fuente oficial revisada:** Ley Chile / Biblioteca del Congreso Nacional de Chile, Decreto 20, Ministerio de Salud, Subsecretaría de Salud Pública: “Aprueba Reglamento de Establecimientos de Larga Estadía para Personas Mayores (ELEAM)”.  
**URL oficial:** https://www.bcn.cl/leychile/navegar?idNorma=1182129  
**Fecha de elaboración de este documento:** 2026-06-09.  
**Nota:** Este documento es una guía técnica y operativa para desarrollo de software. No reemplaza la lectura del texto oficial ni una asesoría jurídica/sanitaria.

---

# 1. Estado normativo vigente

El Decreto Supremo N°20 del Ministerio de Salud aprueba el nuevo Reglamento de Establecimientos de Larga Estadía para Personas Mayores (ELEAM).

Puntos clave:

- Regula la instalación y funcionamiento de ELEAM públicos y privados.
- Cambia el enfoque desde “adultos mayores” hacia “personas mayores” y “residentes”.
- Incorpora con mayor fuerza el enfoque de derechos, autonomía, consentimiento, integración social, dependencia, programa de atención integral usuaria, registros, protocolos y fiscalización.
- Deroga la normativa anterior una vez que el Decreto N°20 entra en vigencia.
- La versión consolidada vigente indica entrada en vigencia desde el **1 de octubre de 2025**.
- Las obligaciones para ELEAM en funcionamiento tienen reglas transitorias:
  - Obligación general cumplidos 3 años desde la entrada en vigencia.
  - Excepción: literal k) del artículo 10 sobre condiciones de seguridad contra incendios, con plazo de 5 años.
- El texto consolidado considera modificaciones posteriores, entre ellas:
  - Decreto N°23/2023.
  - Decreto N°9/2025.
  - Decreto N°6/2025.

---

# 2. Índice normativo del Decreto N°20

El Decreto se organiza en los siguientes títulos:

1. **Título I:** Disposiciones generales.
2. **Título II:** Autorización sanitaria para el funcionamiento de un ELEAM.
3. **Título III:** Infraestructura, instalaciones y equipamiento.
4. **Título IV:** Dirección administrativa, dirección técnica y personal.
5. **Título V:** Funcionamiento y procedimientos de los ELEAM.
6. **Título VI:** Reglamento interno, contrato de residencia y registros.
7. **Título VII:** Fiscalizaciones y sanciones.
8. **Título VIII:** Vigencia.
9. **Disposiciones transitorias.**
10. **Derogación de normativa anterior.**

---

# 3. Contenido del Decreto N°20, artículo por artículo

## Artículo primero

Aprueba el Reglamento de Establecimientos de Larga Estadía para Personas Mayores (ELEAM).

---

## Título I — Disposiciones generales

### Artículo 1. Ámbito de aplicación

El reglamento regula la instalación y funcionamiento de los Establecimientos de Larga Estadía para Personas Mayores, administrados por entidades públicas o privadas.

**Implicancia para FichaEleam:**  
El sistema debe orientarse a apoyar la instalación, funcionamiento, registro y fiscalización de ELEAM, no solo a registrar datos clínicos.

---

### Artículo 2. Definición de ELEAM

Un ELEAM es un establecimiento en que residen personas de 60 años o más, sin distinción de género, que por motivos biológicos, psicológicos o sociales desean vivir en un medio ambiente protegido o requieren apoyo o cuidados diferenciados.

Se establece que el residente o quien lo represente y el establecimiento deben suscribir un contrato para regular el servicio de residencia y los cuidados, incluyendo:

- prevención y mantención de salud;
- estimulación de funcionalidad;
- reforzamiento de capacidades remanentes;
- fortalecimiento de integración social.

**Implicancia para FichaEleam:**  
Debe existir módulo de contrato de residencia, ficha de residente, cuidados, funcionalidad, integración social y plan/programa de atención.

---

### Artículo 3. Rol de SENAMA

SENAMA debe elaborar orientaciones y directrices para los establecimientos y puede solicitar información necesaria para sus funciones.

Las SEREMI de Salud colaboran con SENAMA en el Plan Nacional de Regularización de ELEAM sin autorización sanitaria.

**Implicancia para FichaEleam:**  
Debe existir capacidad de generar reportes administrativos para SENAMA y conservar antecedentes fiscalizables.

---

### Artículo 4. Definiciones

El reglamento define conceptos clave:

- **Autonomía:** capacidad y derecho de decidir sobre la propia vida y entorno.
- **Autovalencia:** capacidad de responder satisfactoriamente a exigencias cognitivas personales y del medio.
- **Condición de salud grave:** enfermedad o condición mental o física que requiere asistencia médica continua y cumple criterios de hospitalización.
- **Cuidador/a:** persona que otorga cuidados primarios o asistencia directa según nivel de dependencia.
- **Dependencia:** pérdida o falta de capacidad física, psíquica o intelectual para realizar actividades básicas de la vida diaria.
- **Equipo móvil:** equipamiento básico para atención de salud, en contenedor o carro móvil.
- **Funcionalidad:** habilidades físicas, mentales y sociales para realizar actividades del entorno.
- **Niveles de dependencia:** categorización según orientaciones técnicas aprobadas por resolución MINSAL.
- **Persona mayor:** persona que ha cumplido 60 años.
- **Persona significativa:** persona con vínculo interpersonal positivo, de apoyo y contención, sin necesidad de parentesco.
- **Programa de atención integral usuaria:** plan elaborado entre el equipo a cargo y cada residente.
- **Rehabilitación:** intervenciones para optimizar funcionamiento y reducir discapacidad.
- **Residente:** persona que reside temporal o permanentemente en ELEAM y recibe servicios sociosanitarios integrales.
- **SEREMI de Salud:** Secretaría Regional Ministerial de Salud.
- **Servicios sociosanitarios:** prestaciones para responder a necesidades sanitarias y sociales, garantizando dignidad, bienestar, independencia y autonomía.

**Implicancia para FichaEleam:**  
Actualizar vocabulario interno del sistema:
- “adulto mayor” → “persona mayor” o “residente”;
- “contacto familiar” → “persona significativa / representante legal / familiar”;
- “plan de cuidado” → “programa de atención integral usuaria”, cuando corresponda.

---

## Título II — Autorización sanitaria para el funcionamiento de un ELEAM

### Artículo 5. Solicitud de autorización sanitaria

La solicitud ante SEREMI debe contener antecedentes del solicitante, establecimiento, director técnico, personal, residentes, sexo, género, nivel de dependencia y cupos.

Debe indicar si recibe beneficios de programas sociales del Estado y, en personas jurídicas, declaración de capital inicial.

La solicitud debe acompañar antecedentes como:

1. Individualización del solicitante o representante legal.
2. Identificación del establecimiento:
   - nombre;
   - correo electrónico;
   - teléfono;
   - dirección.
3. Documentos de dominio o uso del inmueble.
4. Plano o croquis a escala, con áreas, dormitorios, distribución de camas y zona de alimentos.
5. Certificado de recepción final de la propiedad.
6. Certificados de agua potable, alcantarillado o sistemas particulares autorizados.
7. Certificado de experto en prevención de riesgos o Bomberos sobre prevención y protección contra incendios.
8. Certificación de instalaciones eléctricas y gas.
9. Identificación del director técnico:
   - certificado de título;
   - carta de aceptación;
   - jornada.
10. Planta de personal:
   - duración y distribución de jornada;
   - sistema de turnos.
11. Reglamento interno de orden, higiene y seguridad, que regule convivencia, derechos, autonomía, reclamos y uso de lugares comunes.
12. Plan de emergencias ante desastres y emergencias:
   - incendios;
   - sismos;
   - cortes de agua;
   - cortes de luz;
   - asaltos o robos;
   - otros.
13. Protocolo de ingreso y egreso:
   - especificación de residentes por nivel de dependencia;
   - modalidad de evaluación de ingreso;
   - consentimiento voluntario de ingreso;
   - inducción a residente, familia y/o persona significativa;
   - situaciones de egreso.
14. Programa de atención integral usuaria, diferenciado por nivel de dependencia, con:
   - plan relativo a cuidados de salud;
   - plan general de nutrición;
   - prestaciones de mantención y rehabilitación;
   - servicios de apoyo;
   - acciones y frecuencia;
   - instrumentos de valoración geriátrica integral;
   - programas de estimulación, acompañamiento psicosocial y recreación.
15. Plan de integración sociocomunitaria:
   - redes de apoyo socioafectivo;
   - familia;
   - persona significativa;
   - inclusión comunitaria;
   - participación en organizaciones;
   - voluntariado;
   - actividades intergeneracionales.
16. Plan de inducción y capacitación anual del personal:
   - objetivos;
   - contenidos;
   - evaluación;
   - duración mínima de 22 horas.
17. Protocolo ante urgencias médicas.
18. Protocolo ante fallecimiento de residentes.
19. Sistema de sugerencias o reclamos.
20. Carta de derechos y deberes de residentes, visible y de uso común.

**Implicancia para FichaEleam:**  
Debe existir un módulo de “Carpeta de autorización sanitaria / carpeta SEREMI” con checklist documental y estado de cumplimiento.

---

### Artículo 6. Autorización sanitaria y vigencia

SEREMI revisa solicitud y antecedentes. Si hay incumplimientos, formula observaciones y otorga 7 días para subsanar.

Puede declarar abandono si transcurren más de 30 días desde el vencimiento del plazo y luego no se subsana en 7 días.

SEREMI realiza visita inspectiva y puede realizar segunda visita.

La autorización tiene vigencia de 3 años y se renueva automáticamente por períodos iguales mientras no sea dejada sin efecto.

El cierre transitorio o definitivo debe avisarse a SEREMI.

**Implicancia para FichaEleam:**

- Registrar resolución sanitaria.
- Registrar fecha de otorgamiento.
- Calcular vigencia de 3 años.
- Alertar cierre transitorio/definitivo.
- Registrar observaciones SEREMI y subsanaciones.

---

### Artículo 7. Modificación de autorización sanitaria

Debe solicitarse modificación ante SEREMI en casos como:

- cambio de propietario;
- cambios de planta física;
- cambio de director técnico;
- cambio en personal, jornada, turnos o número de funcionarios en relación con residentes y dependencia.

Plazos relevantes:

- 20 días hábiles para cambios de propietario o planta física.
- 5 días hábiles para cambio de director técnico.
- 5 días hábiles para cambios en personal, jornada, turnos o número de funcionarios.
- SEREMI resuelve en 30 días hábiles.

**Implicancia para FichaEleam:**

- Alertas por cambios críticos.
- Registro de modificaciones.
- Historial de director técnico.
- Historial de dotación y turnos.
- Estado de solicitud de modificación ante SEREMI.

---

## Título III — Infraestructura, instalaciones y equipamiento

### Artículo 8. Requisitos de infraestructura

El ELEAM debe contar con infraestructura libre de riesgo estructural y sanitario, con condiciones adecuadas y seguras de accesibilidad.

Condiciones:

- muros en buen estado;
- pisos antideslizantes lavables, sin desniveles;
- instalaciones sanitarias operativas, limpias y sin malos olores;
- iluminación natural y artificial;
- mecanismos seguros de climatización;
- superficies limpias, sin humedad ni filtraciones;
- rutina de aseo y limpieza con desinfectantes según protocolos MINSAL;
- vías de evacuación adecuadas para personas mayores;
- señaléticas visibles y comprensibles.

**Implicancia para FichaEleam:**  
Crear checklist de infraestructura y aseo con evidencia documental/fotográfica.

---

### Artículo 9. Ubicación del establecimiento

Debe ubicarse alejado al menos 500 metros de instalaciones de residuos, aguas residuales, actividades o industrias con ruidos, gases u otras emanaciones que impliquen riesgo sanitario o molestias.

**Implicancia para FichaEleam:**  
Registrar dirección, declaración de ubicación y evidencia asociada, si el ELEAM desea mantener documentación para autorización.

---

### Artículo 10. Instalaciones y equipamiento

El establecimiento debe contar con condiciones ambientales adecuadas: ventilación, ausencia de malos olores, iluminación, señalización y seguridad para evacuación.

Debe contar al menos con:

#### a) Letrero de autorización

Letrero mínimo de 40 x 40 cm, letras de al menos 2 cm, con número y fecha de resolución sanitaria, exhibido en frontis.

#### b) Oficina o sala de recepción

Debe permitir entrevistas privadas entre residentes, familiares o visitas.

#### c) Pasillos

Pasillos iluminados, aptos para silla de ruedas o camillas, sin desniveles, con rampas y pasamanos.

#### d) Ascensores

Si hay más de un piso, debe cumplir normativa urbanística sobre ascensores.

#### e) Salas de estar o uso múltiple

Acceso grupal, comunicación entre residentes, iluminación natural, ventilación y mobiliario según dependencia.

#### f) Telecomunicaciones

Acceso a televisor, teléfono, computador con internet u otros. Debe resguardar privacidad para llamadas, correos o mensajes.

#### g) Recreación

Elementos funcionales y actualizados: música, juegos, revistas, diarios u otros, según dependencia e intereses.

#### h) Zonas exteriores

Patio, terraza o jardín en buen estado, accesible y acorde al lugar.

#### i) Comedor

Capacidad para recibir al menos al 50% de residentes simultáneamente.

#### j) Habitaciones

- máximo 4 camas por habitación;
- circulación entre camas no menor a 90 cm;
- espacio individual para guardar elementos y vestimenta, diferenciado y etiquetado;
- mesa de noche por cama;
- sistema de llamado por dormitorio;
- residentes con dependencia funcional severa deben contar con catre clínico o similar y sistema de llamado individual;
- en emergencia sanitaria o brote infeccioso deben acatarse protocolos MINSAL y del establecimiento.

#### k) Seguridad contra incendios

Deben cumplirse al menos las condiciones de seguridad contra incendios dispuestas en la Ley General de Urbanismo y Construcciones y su Ordenanza.

#### l) Vías de evacuación

Salida expedita al exterior, libre de riesgo, ingreso de equipos de emergencia, iluminación autónoma, comunicación con espacio seguro, señalética visible, plano de evacuación y seguridad al menos en recepción y comedor.

#### m) Puertas de salida

No deben abrirse contra el sentido de evacuación. Accesos señalizados y libres.

#### n) Servicios higiénicos

Al menos 1 baño por cada 5 residentes, en la misma planta de dormitorios.

Cada baño debe tener:

- inodoro;
- lavamanos;
- ducha teléfono;
- receptáculo para ducha que permita entrada de silla de ruedas;
- pisos antideslizantes;
- agua fría y caliente;
- barras de apoyo;
- iluminación suficiente;
- señalización exterior;
- timbre u otro dispositivo de alerta;
- pisos y muros lavables.

Debe existir al menos un baño por planta con receptáculo que permita baño asistido. En dependencia funcional severa debe asegurarse baño en cama o ducha asistida, definido en el programa de atención integral usuaria.

#### o) Cocina o zona de producción de alimentos

Debe cumplir estándares del Reglamento Sanitario de los Alimentos, DS N°977/1996, y autorización de cocina incorporada en autorización del establecimiento.

#### p) Sala de salud o equipo móvil

Debe contar con:

- esfigmomanómetro;
- fonendoscopio;
- termómetro;
- medidor de glicemia capilar;
- saturómetro;
- insumos de primeros auxilios;
- estantería para carpetas personales.

Insumos mínimos:

- tintura de yodo;
- algodón hidrófilo;
- gasa esterilizada;
- alcohol;
- tela adhesiva;
- vendas de diversos tamaños;
- guantes de procedimiento;
- suero fisiológico;
- parches curita.

Si hay equipo móvil, debe resguardarse privacidad del residente.

#### q) Medicamentos

Si se almacenan medicamentos de residentes, deben estar en sala de salud u otro lugar definido, de acceso restringido.

Condiciones:

- lugar ventilado, fresco, seco, temperatura menor a 25 °C;
- medicamentos con cadena de frío en frigobar o refrigerador exclusivo con control de temperatura y acceso restringido;
- estanterías o muebles exclusivos, lisos, lavables, sin grietas;
- gavetas individualizadas y etiquetadas con nombre del residente y receta;
- identificación clara del medicamento, envase, nombre o denominación genérica, vencimiento y lote;
- registro de recepción y uso: residente, medicamento, dosis, hora, vía de administración;
- psicotrópicos y estupefacientes bajo llave;
- medicamentos caducados y deteriorados separados y eliminados según corresponda;
- responsable designado;
- medicamentos solo para uso personal del residente;
- botiquín institucional requiere autorización correspondiente.

#### r) Espacio para aseo

Debe contar con:

- receptáculo para lavado de útiles de aseo;
- almacenamiento de insumos;
- lugar exclusivo para lavado profundo de chatas.

#### s) Lavandería

Debe contar con:

- recepción y almacenamiento de ropa sucia;
- lavadoras necesarias;
- secado y planchado;
- clasificación y guardado de ropa limpia;
- evitar cruce entre ropa sucia y limpia;
- si hay servicio externo, espacios diferenciados.

#### t) Residuos domiciliarios

Lugar de acopio transitorio alejado de circulación habitual. Basura en contenedor con tapa, lavable o reutilizable. Retiro al menos una vez al día o al alcanzar 3/4 de capacidad.

#### u) Servicio telefónico

Debe cubrir funcionamiento normal y emergencias del personal.

#### v) Extintores

Debe contar con extintores según DS N°594/1999 o norma que lo reemplace.

**Implicancia para FichaEleam:**  
Crear módulo de infraestructura, seguridad, medicamentos, equipamiento, aseo, lavandería, residuos, cocina, telecomunicaciones y evidencia fiscalizable.

---

## Título IV — Dirección administrativa, dirección técnica y personal

### Artículo 11. Dirección administrativa

Cada establecimiento debe tener dirección administrativa y de gestión, que apoye la dirección técnica. Puede ser ejercida por el mismo director técnico si cumple requisitos de gestión.

**Implicancia para FichaEleam:**  
Registrar director administrativo y relación con dirección técnica.

---

### Artículo 12. Dirección técnica

El director técnico debe tener:

- título profesional de carrera del área de salud y/o social de 8 o más semestres;
- habilitación para ejercer;
- diplomado o postítulo en geriatría, gerontología o personas mayores, o experiencia mínima de 1 año en ELEAM o establecimientos de cuidado de adultos/personas mayores.

Funciones del director técnico:

1. Responder ante autoridad sanitaria.
2. Gestionar y registrar que al ingreso se determine dependencia funcional, cognitiva y nutricional mediante instrumentos de valoración geriátrica.
3. Si se aporta certificado externo, debe tener máximo 15 días antes del ingreso e indicar instrumentos usados.
4. Gestionar protocolo de ingreso y egreso.
5. Proteger derechos y deberes.
6. Verificar sistema previsional de salud y gestionar incorporación si no tiene.
7. Establecer plan de cuidados de salud.
8. Establecer protocolos de urgencias médicas.
9. Determinar plan general de nutrición con asesoría nutricional.
10. Gestionar plan de integración sociocomunitaria.
11. Velar por actualización diaria y continua del historial de salud y social en carpeta personal.
12. Solicitar informe de salud a establecimientos de salud respectivos.
13. Proteger datos sensibles.
14. Facilitar información de salud al residente, representante, familiar o persona significativa en lenguaje comprensible.
15. Coordinar atención de salud con sistema público o privado.
16. Asegurar inscripción en APS si corresponde.
17. Gestionar red de derivación.
18. Coordinar con familia/persona significativa ante:
    - episodios críticos agudos;
    - descompensaciones;
    - caídas;
    - heridas;
    - agresión a otros o a sí mismo;
    - otras situaciones.
19. Coordinar profesionales externos.
20. Colaborar en RR.HH., turnos, permisos y vacaciones.
21. Hacer cumplir protocolo de fallecimiento.
22. Supervisar almacenamiento y uso de medicamentos.
23. Velar por higiene en manipulación de alimentos.
24. Reportar al menos trimestralmente a SENAMA información administrativa, residentes y trabajadores.

**Implicancia para FichaEleam:**  
Crear módulo de dirección técnica con tareas, validaciones, reportes, firma/aprobación de programas y alertas de cumplimiento.

---

### Artículo 13. Permanencia del director técnico

- Hasta 15 residentes: permanencia mínima 4 horas semanales.
- Mayor capacidad: al menos 5 horas semanales.
- Debe designar reemplazante cuando no esté presente.
- Debe estar disponible telefónicamente durante su jornada.

**Implicancia para FichaEleam:**  
Registrar jornada, asistencia, reemplazante y disponibilidad.

---

### Artículo 14. Personal

El establecimiento debe contar con personal competente para el cuidado de personas mayores, en número suficiente según residentes y dependencia.

**Implicancia para FichaEleam:**  
Módulo de personal, competencias, certificados, turnos y brechas de dotación.

---

### Artículo 15. Personal para personas mayores con dependencia

El establecimiento debe contar al menos con:

- auxiliar o técnico de enfermería 12 horas diurnas y uno de llamada nocturna;
- cuidador 12 horas diurnas por hasta 8 residentes;
- cuidador nocturno por hasta 12 residentes;
- 2 cuidadores diurnos para 9 a 16 residentes;
- 3 cuidadores diurnos para 17 a 24 residentes;
- 2 cuidadores nocturnos para 13 a 24 residentes;
- 3 cuidadores nocturnos para 25 a 36 residentes;
- incremento sucesivo cada 8 residentes diurnos y cada 12 nocturnos.

**Implicancia para FichaEleam:**  
Crear calculadora automática de dotación por dependencia y turno.

---

### Artículo 16. Personal para personas mayores autovalentes o independientes

Para residentes autovalentes:

- 1 cuidador por cada 20 residentes durante 12 horas diurnas.
- 1 cuidador por cada 20 residentes en horario nocturno.
- auxiliar o técnico de enfermería de llamada durante 24 horas.

**Implicancia para FichaEleam:**  
La calculadora debe diferenciar autovalentes/dependientes.

---

### Artículo 17. Personal mínimo nocturno

Cualquiera sea el número de residentes o condición de dependencia, debe haber al menos 2 cuidadores en horario nocturno.

**Implicancia para FichaEleam:**  
Regla dura: alerta crítica si turno nocturno tiene menos de 2 cuidadores.

---

### Artículo 18. Auxiliar o técnico de enfermería y funciones

Funciones mínimas:

- alimentación por SNG u ostomía con indicación médica;
- apoyo en cuidados y actividades de vida diaria;
- aseo y confort;
- movilidad y prevención de úlceras por presión según indicación;
- administración de medicamentos vía oral o tópica según protocolo e indicación médica;
- administración subcutánea de heparina o insulina si demuestra entrenamiento;
- resguardo y orden de medicamentos;
- registro de recepción y uso de medicamentos y alimentos;
- almacenamiento separado de medicamentos caducados/deteriorados y eliminación.

**Implicancia para FichaEleam:**  
Registrar competencias/certificados y limitar permisos por rol.

---

### Artículo 19. Cuidadores

Funciones mínimas:

- acompañar o asistir en actividades de vida diaria;
- movilización, baño, vestimenta, alimentación, orden de habitaciones y cambio de ropa;
- administrar alimentación por sonda previo entrenamiento en horarios sin TENS/auxiliar;
- acompañar a controles de salud o actividades comunitarias;
- revisar historia de salud antes de controles;
- registrar observaciones, indicaciones y recetas;
- actualizar registro de acciones en carpeta personal;
- apoyar equipo profesional con información sobre planes integrales;
- administrar medicamentos vía oral y enteral, toma de signos vitales según protocolo, previo entrenamiento;
- aplicar soporte vital básico según protocolos.

Las labores de cuidadores deben dirigirse única y directamente al cuidado de residentes.

**Implicancia para FichaEleam:**  
Crear bitácora de acciones del cuidador, capacitación obligatoria y permisos específicos.

---

### Artículo 20. Manipuladores de alimentos

Debe haber manipuladores de alimentos o servicio externalizado con plan de contingencia. Deben cumplir DS N°977/1996.

**Implicancia para FichaEleam:**  
Registrar manipuladores, certificados, servicio externo y plan de contingencia.

---

### Artículo 21. Personal de aseo y lavandería

Debe haber auxiliares de servicio suficientes para aseo, lavandería y ropería.

**Implicancia para FichaEleam:**  
Registrar personal de apoyo y tareas.

---

## Título V — Funcionamiento y procedimientos

### Artículo 22. Funcionamiento

Para funcionar se requiere autorización sanitaria, mantención de requisitos de instalación y procedimientos/registros definidos en el reglamento.

**Implicancia para FichaEleam:**  
Dashboard de cumplimiento operacional.

---

### Artículo 23. Ingreso

La persona mayor debe manifestar voluntad libre y expresa de ingresar. Si no es posible, puede hacerlo su representante legal.

La decisión debe constar por escrito en un documento denominado **consentimiento voluntario de ingreso**.

No pueden ingresar personas mayores con condición de salud grave u otra patología que requiera asistencia médica continua o permanente.

**Implicancia para FichaEleam:**

- Flujo de ingreso con consentimiento obligatorio.
- Validación de representante legal.
- Campo de condición de salud grave.
- Bloqueo o alerta si requiere asistencia médica continua.

---

### Artículo 24. Atenciones de salud

Si durante estadía el residente presenta enfermedad aguda o reagudización crónica, excepcionalmente puede continuar en el ELEAM solo con indicación médica expresa y escrita, siempre que exista personal/equipamiento suficiente y no represente riesgo.

Si no se cumplen condiciones, debe ser trasladado a establecimiento resolutivo, previo consentimiento informado.

En riesgo vital, debe trasladarse a urgencia según protocolo.

Mantiene derecho a atención de salud según sistema previsional.

**Implicancia para FichaEleam:**

- Registro de eventos agudos.
- Indicación médica escrita.
- Evaluación de capacidad de cuidado.
- Consentimiento informado de traslado.
- Protocolo de urgencia activable.
- Registro de derivación y seguimiento.

---

### Artículo 25. Protocolos, planes y programas

Todo ELEAM debe contar y mantener actualizados:

1. Protocolo de ingreso y egreso.
2. Plan de inducción y capacitación anual del personal, mínimo 22 horas.
3. Plan de emergencias y desastres.
4. Protocolo de urgencias médicas.
5. Protocolo de fallecimiento.
6. Programa de atención integral usuaria.
7. Plan de integración sociocomunitaria.

El programa de atención integral usuaria debe incluir intervenciones biopsicosociales de:

- prevención;
- mantención o mejora;
- promoción de salud;
- cobertura de necesidades básicas;
- autonomía;
- bienestar.

Debe implementarse, monitorearse y evaluarse periódicamente por dirección técnica.

**Implicancia para FichaEleam:**  
Crear módulo de protocolos con vigencia, responsables, versión, archivos, socialización, evaluación y alertas.

---

### Artículo 26. Vinculación con red de salud

Los ELEAM deben asegurar control de salud mediante APS o centro privado, permitir acceso de funcionarios de salud al establecimiento.

Si no hay acceso oportuno, pueden comprar servicios privados, preferentemente geriatra, neurólogo o médico de familia.

**Implicancia para FichaEleam:**

- Registrar centro de salud del residente.
- Registrar controles y derivaciones.
- Registrar profesionales externos.
- Registrar compras de servicios privados.

---

## Título VI — Reglamento interno, contrato de residencia y registros

### Artículo 27. Reglamento interno

Cada ELEAM debe contar con reglamento interno que declare respeto irrestricto de derechos y autonomía, e incluya:

- procedimiento de reclamo;
- uso de lugares comunes;
- orden, higiene y seguridad;
- recepción conforme por trabajadores.

Debe ubicarse copia visible del reglamento. Al ingreso debe entregarse copia al residente y familiares/persona significativa. Debe registrarse entrega. Si el residente no puede leer, debe explicarse procurando comprensión.

**Implicancia para FichaEleam:**

- Registro de entrega de reglamento.
- Firma/confirmación de recepción.
- Registro de explicación si no puede leer/comprender.
- Archivo del reglamento vigente.
- Control de versiones.

---

### Artículo 28. Contrato

Debe existir formulario de contrato tipo entre ELEAM y residente o representante.

Debe contener:

- derechos y deberes de ambas partes;
- causales de exclusión;
- obligación de rendir cuenta de gastos si se usan ingresos del residente mediante cobro delegado;
- inventario simple de bienes al ingreso, al menos anual y al término del contrato;
- prohibición de cláusulas que atenten contra derechos fundamentales;
- prohibición de condicionar contrato a poderes especiales o generales a favor de representantes, director técnico u otros trabajadores;
- inventario de bienes personales;
- una o más personas de contacto en emergencia, con teléfono, correo y domicilio.

**Implicancia para FichaEleam:**

- Módulo de contrato.
- Inventario anual.
- Rendición de gastos.
- Contactos de emergencia.
- Validación de cláusulas y documentos cargados.

---

### Artículo 29. Registros específicos

Todo ELEAM debe contar con:

1. Planta de personal, horarios y turnos.
2. Registro de sugerencias o reclamos, visible y disponible, libro foliado o digitalizado, con codificación y fácil consulta.
3. Consentimiento voluntario de ingreso de cada residente en carpeta personal.
4. Carta de derechos y deberes visible y entregada por escrito al ingreso, consignada en consentimiento.
5. Carpetas personales de cada residente con:
   - sistema de salud;
   - historial de salud;
   - historial social;
   - recepción y uso de medicamentos;
   - actualización debida;
   - acceso restringido según Ley N°20.584 y Ley N°21.098.

**Implicancia para FichaEleam:**

- Carpeta personal digital robusta.
- Registro de reclamos digital con código.
- Consentimiento adjunto.
- Derechos/deberes entregados.
- Control de acceso por rol.

---

### Artículo 30. Datos personales sensibles

El personal con acceso a datos sensibles debe guardar reserva conforme a Ley N°19.628 y normas aplicables.

**Implicancia para FichaEleam:**

- Roles y permisos.
- Auditoría de accesos.
- Seguridad de datos.
- Control de descargas.
- Registro de cambios.
- Políticas de confidencialidad.

---

## Título VII — Fiscalizaciones y sanciones

### Artículo 31. Fiscalización

SEREMI de Salud fiscaliza el cumplimiento del reglamento. La pauta de fiscalización la proporciona MINSAL y debe estar publicada y actualizada en su sitio institucional.

Las contravenciones se sancionan según Libro X del Código Sanitario.

**Implicancia para FichaEleam:**

- Modo fiscalización SEREMI.
- Checklist normativo.
- Evidencias descargables.
- Alertas de brechas críticas.

---

## Título VIII — Vigencia

### Artículo 32. Vigencia

La versión consolidada indica entrada en vigencia desde el **1 de octubre de 2025**.

Notas de vigencia:

- Texto original: vigencia un año desde publicación.
- Decreto N°23/2023 postergó entrada en vigencia al 01.04.2025.
- Decreto N°9/2025 modificó nuevamente la fecha al 01.10.2025.

---

## Disposiciones transitorias

### Artículo 1 transitorio

Las disposiciones son obligatorias para ELEAM en funcionamiento cumplidos 3 años desde la entrada en vigencia.

Excepción: literal k) del artículo 10, sobre seguridad contra incendios, aplicará en plazo de 5 años.

Los ELEAM se someterán al programa de fiscalización anual de las SEREMI de Salud.

### Artículo 2 transitorio

Los establecimientos que estén en proceso de autorización sanitaria o formen parte del Plan Nacional de Regularización de SENAMA se ajustarán a lo dispuesto en el artículo transitorio anterior.

---

## Artículo segundo

Deroga la normativa anterior del Ministerio de Salud, una vez que entre en vigencia el Decreto N°20.

---

# 4. Matriz de actualización para FichaEleam

## 4.1. Cambio conceptual del producto

FichaEleam debe dejar de presentarse como un sistema basado en normativa anterior y pasar a presentarse como:

> Plataforma de gestión clínica, administrativa y documental para ELEAM, diseñada para apoyar la gestión y evidencia documental exigida por el Decreto N°20 MINSAL y sus modificaciones vigentes.

Evitar frase riesgosa:

> Promesas absolutas de cumplimiento automático.

Frase recomendada:

> “Diseñado para apoyar la gestión y evidencia documental exigida por el Decreto N°20.”

---

# 5. Módulos que deben existir o actualizarse

## 5.1. Módulo ELEAM / Establecimiento

### Campos mínimos

- Nombre del ELEAM.
- Razón social.
- RUT.
- Representante legal.
- Dirección.
- Comuna.
- Región.
- Teléfono.
- Correo.
- Cupos autorizados.
- Número de resolución sanitaria.
- Fecha de resolución sanitaria.
- Estado de autorización.
- Fecha de otorgamiento.
- Vigencia calculada.
- Beneficios/programas estatales.
- Capital inicial, si aplica.
- Director técnico.
- Director administrativo.
- Capacidad por sexo/género, si el establecimiento lo registra.
- Cupos ocupados.
- Residentes por nivel de dependencia.

### Funciones

- Alerta de vencimiento/documentos pendientes.
- Historial de modificaciones.
- Reporte para SEREMI/SENAMA.

---

## 5.2. Módulo de autorización sanitaria / carpeta SEREMI

### Documentos requeridos

- Dominio o uso del inmueble.
- Plano/croquis.
- Certificado DOM.
- Agua potable/alcantarillado.
- Prevención de incendios.
- Instalaciones eléctricas/gas.
- Certificado título director técnico.
- Carta aceptación director técnico.
- Jornada director técnico.
- Planta de personal.
- Sistema de turnos.
- Reglamento interno.
- Plan de emergencias.
- Protocolo ingreso/egreso.
- Programa atención integral usuaria.
- Plan integración sociocomunitaria.
- Plan capacitación anual.
- Protocolo urgencias.
- Protocolo fallecimiento.
- Registro de reclamos.
- Carta de derechos/deberes.

### Estados sugeridos

- No cargado.
- Cargado.
- Observado.
- Vencido.
- Vigente.
- No aplica.
- Requiere actualización.

---

## 5.3. Módulo de residente

### Datos mínimos

- Nombre completo.
- RUT/documento.
- Fecha nacimiento.
- Edad.
- Sexo.
- Género.
- Nacionalidad.
- Sistema previsional.
- Centro de salud APS o privado.
- Contacto emergencia.
- Persona significativa.
- Representante legal, si corresponde.
- Fecha ingreso.
- Estado:
  - activo;
  - egresado;
  - hospitalizado;
  - fallecido;
  - traslado temporal.

### Datos normativos

- Consentimiento voluntario.
- Contrato.
- Inventario.
- Carta derechos/deberes entregada.
- Reglamento interno entregado.
- Inducción realizada.
- Evaluación dependencia funcional.
- Evaluación cognitiva.
- Evaluación nutricional.
- Informe de salud de ingreso.
- Certificado externo, si aplica.
- Fecha certificado externo.
- Instrumentos utilizados.
- Persona responsable del ingreso.

---

## 5.4. Módulo de ingreso

### Flujo recomendado

1. Crear residente.
2. Registrar persona significativa / representante.
3. Registrar sistema previsional.
4. Evaluar condición de salud grave.
5. Registrar dependencia funcional, cognitiva y nutricional.
6. Adjuntar certificado externo si existe.
7. Registrar consentimiento voluntario.
8. Registrar contrato.
9. Registrar inventario.
10. Entregar reglamento interno.
11. Entregar carta de derechos/deberes.
12. Registrar inducción.
13. Crear programa de atención integral inicial.
14. Asociar red de salud.
15. Finalizar ingreso.

### Validaciones duras

No permitir finalizar ingreso si falta:

- consentimiento voluntario;
- contrato;
- nivel de dependencia;
- sistema previsional;
- contacto de emergencia;
- programa inicial;
- entrega de derechos/deberes.

### Alertas

- Certificado externo con más de 15 días.
- Condición de salud grave.
- Requiere asistencia médica continua.
- No hay representante legal cuando corresponde.
- No hay persona significativa/contacto.

---

## 5.5. Programa de atención integral usuaria

### Estructura

- Diagnóstico integral.
- Nivel de dependencia.
- Objetivos.
- Intervenciones.
- Frecuencia.
- Responsable.
- Fecha inicio.
- Fecha evaluación.
- Próxima evaluación.
- Estado:
  - vigente;
  - vencido;
  - en revisión;
  - suspendido.
- Validación por director técnico.

### Ámbitos

- Salud.
- Nutrición.
- Funcionalidad.
- Rehabilitación/mantención.
- Actividades básicas.
- Higiene y confort.
- Prevención de lesiones por presión.
- Medicamentos.
- Estimulación cognitiva.
- Acompañamiento psicosocial.
- Recreación.
- Integración sociocomunitaria.
- Familia/persona significativa.

### Reglas de negocio

- Todo residente activo debe tener programa vigente.
- Todo programa debe tener responsable y fecha de reevaluación.
- Residentes con dependencia severa deben tener indicaciones específicas de baño, movilización, prevención LPP y sistema de llamado/catre clínico cuando corresponda.
- El programa debe ser modificable con historial de versiones.

---

## 5.6. Carpeta personal

Debe integrar:

- Datos personales.
- Sistema de salud.
- Historial de salud.
- Historial social.
- Evaluaciones geriátricas.
- Programa de atención integral.
- Registros diarios.
- Medicamentos.
- Recetas.
- Controles externos.
- Indicaciones.
- Derivaciones.
- Urgencias.
- Caídas.
- Heridas.
- Agresiones.
- Hospitalizaciones.
- Comunicaciones con familia/persona significativa.
- Consentimiento.
- Contrato.
- Inventario.
- Derechos/deberes.
- Reglamento interno.
- Documentos adjuntos.

### Requisito crítico

La carpeta debe tener control de acceso y auditoría.

---

## 5.7. Módulo de medicamentos

### Campos mínimos

- Residente.
- Medicamento.
- Denominación genérica.
- Dosis.
- Vía.
- Frecuencia.
- Horario.
- Indicación médica.
- Médico/prescriptor.
- Fecha receta.
- Archivo receta.
- Lote.
- Fecha vencimiento.
- Requiere frío.
- Temperatura actual o registro de temperatura.
- Psicotrópico/estupefaciente.
- Ubicación/gaveta.
- Responsable almacenamiento.
- Estado:
  - vigente;
  - suspendido;
  - vencido;
  - deteriorado;
  - eliminado.

### Registros

- Recepción.
- Administración.
- Omisión.
- Rechazo.
- Suspensión.
- Eliminación.
- Cambio de dosis.
- Registro de cadena de frío.

### Alertas

- Medicamento sin receta.
- Medicamento próximo a vencer.
- Medicamento vencido.
- Lote no registrado.
- Psicotrópico sin control bajo llave.
- Medicamento refrigerado sin temperatura.
- Administración pendiente.

---

## 5.8. Módulo de personal y dotación

### Campos

- Nombre.
- RUT.
- Cargo.
- Rol.
- Tipo:
  - director técnico;
  - director administrativo;
  - TENS/auxiliar;
  - cuidador;
  - manipulador alimentos;
  - aseo/lavandería;
  - profesional externo.
- Jornada.
- Turno.
- Certificados.
- Capacitaciones.
- Competencias específicas:
  - administración medicamentos;
  - insulina/heparina;
  - alimentación por sonda;
  - signos vitales;
  - soporte vital básico.

### Calculadora de dotación

Debe considerar:

#### Residentes con dependencia

- Diurno:
  - 1 cuidador hasta 8.
  - 2 cuidadores 9 a 16.
  - 3 cuidadores 17 a 24.
  - +1 cada 8 adicionales.
- Nocturno:
  - 1 cuidador hasta 12.
  - 2 cuidadores 13 a 24.
  - 3 cuidadores 25 a 36.
  - +1 cada 12 adicionales.
- Siempre mínimo 2 cuidadores nocturnos.
- TENS/auxiliar 12 horas diurnas.
- TENS/auxiliar de llamada nocturna.

#### Residentes autovalentes

- 1 cuidador cada 20 diurno.
- 1 cuidador cada 20 nocturno.
- TENS/auxiliar de llamada 24 horas.
- Siempre mínimo 2 cuidadores nocturnos.

### Alertas

- Dotación insuficiente.
- Falta TENS/auxiliar.
- Falta cuidador nocturno mínimo.
- Cuidador sin capacitación necesaria.
- Cambio de personal que requiere aviso/modificación ante SEREMI.

---

## 5.9. Módulo dirección técnica

### Funciones en sistema

- Aprobar ingresos.
- Validar dependencia.
- Validar programa integral.
- Revisar medicamentos.
- Revisar eventos críticos.
- Revisar reportes trimestrales.
- Controlar protocolos.
- Registrar horas semanales.
- Registrar reemplazante.
- Registrar disponibilidad telefónica.

### Alertas

- Director técnico sin certificado.
- Horas semanales insuficientes.
- Sin reemplazante.
- Programa integral sin validación.
- Reporte trimestral pendiente.

---

## 5.10. Módulo protocolos

Protocolos/planes obligatorios:

- Ingreso y egreso.
- Inducción/capacitación anual.
- Emergencias y desastres.
- Urgencias médicas.
- Fallecimiento.
- Programa atención integral usuaria.
- Integración sociocomunitaria.
- Protocolos de brotes/emergencia sanitaria, según MINSAL y establecimiento.

### Campos

- Nombre.
- Versión.
- Fecha creación.
- Fecha actualización.
- Responsable.
- Archivo.
- Estado.
- Fecha próxima revisión.
- Evidencia de socialización.
- Funcionarios capacitados.
- Observaciones.

---

## 5.11. Módulo reclamos/sugerencias

### Campos

- Código correlativo.
- Fecha.
- Tipo:
  - reclamo;
  - sugerencia;
  - felicitación;
  - solicitud.
- Reclamante:
  - residente;
  - familiar;
  - persona significativa;
  - representante;
  - otro.
- Residente asociado.
- Descripción.
- Categoría.
- Responsable.
- Estado.
- Respuesta.
- Fecha cierre.
- Evidencia.

### Funciones

- Libro digital foliado/codificado.
- Exportable.
- Vista fiscalizable.
- Alertas de reclamos sin respuesta.

---

## 5.12. Módulo contrato e inventario

### Contrato

- Archivo contrato firmado.
- Fecha firma.
- Residente.
- Representante legal.
- Derechos/deberes.
- Causales exclusión.
- Cobro delegado, si aplica.
- Rendición de gastos, si aplica.

### Inventario

- Bien.
- Descripción.
- Cantidad.
- Estado.
- Foto.
- Fecha ingreso.
- Revisión anual.
- Inventario egreso.
- Firma/confirmación.

### Alertas

- Inventario anual pendiente.
- Contrato no firmado.
- Sin contactos de emergencia.
- Rendición pendiente.

---

## 5.13. Módulo red de salud

### Campos

- Sistema previsional.
- CESFAM / centro privado.
- Médico tratante.
- Geriatra/neurólogo/médico familia, si aplica.
- Controles.
- Derivaciones.
- Indicaciones.
- Informes.
- Acceso de funcionarios de salud al ELEAM.
- Servicios privados comprados.

---

## 5.14. Módulo eventos críticos

Registrar:

- Fecha/hora.
- Tipo:
  - caída;
  - herida;
  - descompensación;
  - episodio crítico agudo;
  - agresión a otros;
  - agresión a sí mismo;
  - urgencia;
  - hospitalización;
  - fallecimiento.
- Descripción.
- Signos vitales.
- Acciones realizadas.
- Activación protocolo.
- Derivación.
- Consentimiento informado.
- Notificación a familia/persona significativa.
- Responsable.
- Cierre.
- Documentos.

---

## 5.15. Módulo derechos/deberes y reglamento interno

### Funciones

- Cargar carta de derechos/deberes.
- Cargar reglamento interno.
- Registrar entrega al ingreso.
- Registrar entrega a familiares/persona significativa.
- Registrar explicación si residente no puede leer/comprender.
- Mantener versiones.
- Mostrar documento visible en módulo fiscalización.

---

## 5.16. Portal familiar/persona significativa

### Reglas

- Acceso solo a personas autorizadas.
- Mostrar información comprensible.
- No exponer información sensible innecesaria.
- Registrar accesos.
- Permitir revisar:
  - estado general;
  - controles;
  - eventos informados;
  - documentos entregados;
  - comunicaciones;
  - programa integral resumido.

---

## 5.17. Módulo reporte trimestral SENAMA

Debe generar:

- Identificación del ELEAM.
- Director técnico.
- Director administrativo.
- Residentes activos.
- Ingresos.
- Egresos.
- Fallecimientos.
- Trabajadores.
- Turnos.
- Dependencia.
- Capacitaciones.
- Protocolos vigentes.
- Reclamos.
- Eventos críticos.
- Observaciones.

Formatos:

- PDF.
- Excel.
- CSV.

---

## 5.18. Modo fiscalización SEREMI

Debe mostrar:

- Cumplimiento global.
- Brechas críticas.
- Documentos pendientes.
- Protocolos vencidos.
- Residentes sin carpeta completa.
- Residentes sin programa vigente.
- Medicamentos vencidos o sin receta.
- Dotación insuficiente.
- Reclamos abiertos.
- Reporte SENAMA pendiente.
- Infraestructura sin evidencia.
- Seguridad contra incendios.
- Historial de subsanaciones.

---

# 6. Modelo de datos sugerido

## Tablas o colecciones principales

- `eleams`
- `eleam_authorizations`
- `eleam_documents`
- `residents`
- `resident_admissions`
- `resident_consents`
- `resident_contracts`
- `resident_inventory_items`
- `resident_health_histories`
- `resident_social_histories`
- `geriatric_assessments`
- `integral_care_programs`
- `care_program_interventions`
- `medications`
- `medication_orders`
- `medication_receptions`
- `medication_administrations`
- `medication_disposals`
- `temperature_logs`
- `staff`
- `staff_shifts`
- `staff_certifications`
- `staff_training`
- `technical_directors`
- `protocols`
- `protocol_acknowledgements`
- `complaints`
- `critical_events`
- `health_network_links`
- `family_contacts`
- `document_delivery_logs`
- `inspection_checklist_items`
- `senama_reports`
- `audit_logs`

---

# 7. Reglas de negocio críticas

## Ingreso

- No finalizar ingreso sin consentimiento voluntario.
- No finalizar ingreso sin contrato.
- No finalizar ingreso sin evaluación de dependencia.
- Alertar si certificado externo supera 15 días.
- Alertar si condición de salud requiere asistencia médica continua.

## Programa integral

- Todo residente activo debe tener programa vigente.
- Debe tener próxima evaluación.
- Debe tener responsable.
- Debe estar validado por dirección técnica.

## Medicamentos

- Todo medicamento debe tener receta.
- Debe tener lote y vencimiento.
- Debe estar asociado a residente.
- Si requiere frío, debe tener control de temperatura.
- Psicotrópicos/estupefacientes deben tener control bajo llave.
- Debe existir registro de recepción y uso.

## Dotación

- Mínimo 2 cuidadores nocturnos siempre.
- Calcular dotación por dependencia.
- Alertar brecha.
- Registrar TENS/auxiliar diurno y llamada nocturna según corresponda.

## Documentos

- Todo documento obligatorio debe tener estado.
- Todo documento debe tener fecha de carga.
- Idealmente debe tener vigencia.
- Debe existir exportación para fiscalización.

## Seguridad de datos

- Acceso restringido por rol.
- Auditoría de lectura, edición y descarga.
- No eliminación dura de registros sensibles.
- Historial de cambios.

---

# 8. Prioridad de implementación

## Fase 1 — Actualización mínima crítica

1. Reemplazar referencias de normativa anterior por Decreto 20.
2. Crear checklist Decreto 20.
3. Crear módulo de carpeta SEREMI.
4. Ampliar ficha de residente.
5. Crear consentimiento voluntario.
6. Crear programa de atención integral usuaria.
7. Crear carpeta personal digital.
8. Mejorar medicamentos.
9. Agregar roles y auditoría básica.
10. Crear exportables PDF/Excel básicos.

## Fase 2 — Cumplimiento operativo

1. Calculadora de dotación.
2. Módulo turnos.
3. Protocolos obligatorios.
4. Reclamos/sugerencias.
5. Contrato e inventario.
6. Dirección técnica.
7. Red de salud.
8. Eventos críticos.
9. Registro de derechos/deberes y reglamento.

## Fase 3 — Diferenciación comercial

1. Modo fiscalización SEREMI.
2. Reporte trimestral SENAMA.
3. Portal familiar/persona significativa.
4. Panel de riesgo normativo.
5. Alertas inteligentes.
6. Firma electrónica simple o confirmaciones digitales.
7. Historial de versiones avanzado.
8. Multi-ELEAM para cadenas/residencias con más de una sede.

---

# 9. Checklist de cumplimiento para FichaEleam

## Documentación del ELEAM

- [ ] Resolución sanitaria.
- [ ] Letrero de autorización.
- [ ] Dominio o uso del inmueble.
- [ ] Plano/croquis.
- [ ] Certificado DOM.
- [ ] Agua potable/alcantarillado.
- [ ] Prevención de incendios.
- [ ] Instalaciones eléctricas/gas.
- [ ] Reglamento interno.
- [ ] Plan emergencia.
- [ ] Protocolo ingreso/egreso.
- [ ] Protocolo urgencias.
- [ ] Protocolo fallecimiento.
- [ ] Plan capacitación anual 22 horas.
- [ ] Plan integración sociocomunitaria.
- [ ] Carta derechos/deberes.
- [ ] Registro reclamos.

## Residentes

- [ ] Consentimiento voluntario.
- [ ] Contrato.
- [ ] Inventario.
- [ ] Sistema previsional.
- [ ] Contacto emergencia.
- [ ] Persona significativa.
- [ ] Evaluación funcional.
- [ ] Evaluación cognitiva.
- [ ] Evaluación nutricional.
- [ ] Programa integral vigente.
- [ ] Historial salud/social actualizado.
- [ ] Medicamentos con receta.
- [ ] Registro recepción/uso medicamentos.

## Personal

- [ ] Director técnico con título.
- [ ] Diplomado/postítulo o experiencia.
- [ ] Jornada director técnico.
- [ ] Reemplazante.
- [ ] Planta de personal.
- [ ] Turnos.
- [ ] Dotación suficiente.
- [ ] Capacitaciones.
- [ ] Certificados de competencias.

## Funcionamiento

- [ ] Red de salud.
- [ ] Acceso APS/centro privado.
- [ ] Eventos críticos registrados.
- [ ] Familia/persona significativa notificada.
- [ ] Reporte trimestral SENAMA.
- [ ] Auditoría de datos sensibles.
- [ ] Modo fiscalización.

---

# 10. Recomendación final de producto

FichaEleam debería organizarse con una navegación principal así:

1. **Dashboard Decreto 20**
2. **Residentes**
3. **Programa Integral**
4. **Medicamentos**
5. **Eventos críticos**
6. **Personal y turnos**
7. **Protocolos**
8. **Carpeta SEREMI**
9. **Reclamos**
10. **Reportes**
11. **Portal familiar**
12. **Configuración ELEAM**

La propuesta comercial debe centrarse en:

- preparar fiscalizaciones;
- ordenar carpeta SEREMI;
- reducir riesgo normativo;
- mantener evidencia actualizada;
- mejorar continuidad de cuidados;
- evitar registros dispersos en papel, Excel o WhatsApp.

---

# 11. Pendientes para una auditoría técnica completa

Para revisar el proyecto completo se requiere acceso al código o repositorio. Pendientes:

- Revisar modelos/tablas actuales.
- Revisar reglas de seguridad de Firebase/Supabase.
- Revisar permisos por rol.
- Revisar estructura de residentes.
- Revisar módulo de medicamentos.
- Revisar exportables.
- Revisar landing page.
- Revisar dashboard.
- Revisar nomenclatura normativa anterior.
- Comparar pantallas actuales contra matriz Decreto 20.
- Crear backlog técnico con issues por módulo.

---

# 12. Backlog técnico sugerido

## Épica 1: Migración normativa Decreto 20

- Cambiar textos de normativa anterior a Decreto 20.
- Crear página “Carpeta SEREMI DS 20”.
- Crear metadata normativa por artículo.
- Crear checklist general.

## Épica 2: Residente y carpeta personal

- Ampliar esquema residente.
- Crear consentimiento.
- Crear contrato.
- Crear inventario.
- Crear historial social.
- Crear historial salud.
- Crear control de acceso.

## Épica 3: Programa de atención integral

- Crear modelo programa.
- Crear intervenciones.
- Crear validación director técnico.
- Crear alertas vencimiento.
- Crear exportable.

## Épica 4: Medicamentos

- Crear orden médica.
- Crear recepción.
- Crear administración.
- Crear eliminación.
- Crear control cadena frío.
- Crear control psicotrópicos.
- Crear alertas.

## Épica 5: Personal y dotación

- Crear personal.
- Crear turnos.
- Crear capacitaciones.
- Crear calculadora dotación.
- Crear alertas de brecha.

## Épica 6: Protocolos y documentos

- Crear repositorio documental.
- Crear control de versiones.
- Crear socialización.
- Crear vigencia.
- Crear exportables.

## Épica 7: Fiscalización y reportes

- Crear modo fiscalización.
- Crear reporte SENAMA.
- Crear carpeta SEREMI exportable.
- Crear matriz de cumplimiento.

---

# 13. Texto recomendado para landing page

> FichaEleam es una plataforma para ordenar la gestión clínica, administrativa y documental de residencias de personas mayores. Está diseñada para apoyar la gestión exigida por el Decreto N°20 MINSAL: carpeta personal del residente, programa de atención integral, medicamentos, turnos, protocolos, reclamos, documentos y preparación para fiscalización.

Versión breve:

> Digitaliza tu ELEAM y mantén ordenada la evidencia que exige el Decreto N°20.

CTA recomendado:

> Solicita una revisión gratuita de tu carpeta ELEAM.

---

# 14. Advertencia de uso

Este documento es una herramienta de análisis y planificación para desarrollo de software. La validación final de cumplimiento debe realizarse contra:

1. Texto oficial vigente de Ley Chile.
2. Pauta de fiscalización publicada por MINSAL.
3. Criterios de SEREMI de Salud correspondiente.
4. Orientaciones técnicas vigentes de SENAMA y MINSAL.
5. Revisión jurídica/sanitaria cuando se use comercialmente como promesa de cumplimiento.
