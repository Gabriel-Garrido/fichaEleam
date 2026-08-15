# Actualización funcional de FichaEleam — 15 de agosto de 2026

Este documento resume los cambios consolidados en la experiencia del ELEAM, su seguridad y la preparación documental relacionada con el Decreto Supremo N.º 20. La plataforma organiza evidencia y operación; no reemplaza la evaluación de la autoridad sanitaria ni el criterio clínico de profesionales habilitados.

## Acceso durante la demo

- Un ELEAM con demo vigente entra directamente a la plataforma y no ve la pantalla de planes como condición para utilizarla.
- La selección comercial permanece disponible cuando corresponde activar o renovar, sin interrumpir una demo activa.
- Los correos Gmail reciben instrucciones para entrar directamente con **Continuar con Google** desde fichaeleam.cl y no quedan obligados a crear una contraseña adicional.
- Los demás dominios reciben un enlace personal, de un solo uso, para definir su contraseña, además de instrucciones de recuperación si el enlace vence.

## Equipo y accesos

- El directorio reúne en una sola ficha los datos, función, acceso, permisos, antecedentes y capacitaciones de cada persona, sin repetir una segunda lista de usuarios activos.
- Los accesos desactivados y las invitaciones pendientes permanecen disponibles en paneles compactos que sólo se abren cuando se necesitan.
- El historial de desactivación y restauración conserva fecha, motivo y responsable sin depender de relaciones privadas de Auth.
- Un fallo temporal del historial o de las invitaciones no impide consultar el directorio principal.
- Las cuentas Gmail del equipo ingresan directamente con Google; los demás dominios activan su cuenta mediante un enlace personal para definir contraseña.

## Cumplimiento y documentación DS20

- Cumplimiento utiliza una única **Lista de trabajo**, sin tarjetas de conteo ni filtros internos que obliguen al usuario a interpretar categorías técnicas.
- Cada requisito explica qué exige la norma, qué aporta FichaEleam y qué documento o comprobación externa debe conservarse.
- Los medios verificadores operacionales se calculan con residentes, personal, dotación, turnos, consentimientos, evaluaciones, red de salud, planes de cuidado y medicamentos.
- Los resultados parciales no se presentan como cumplimiento total cuando todavía falta inspección física, socialización, documentación o revisión profesional.
- Los documentos de cumplimiento aceptan PDF, Word, Excel e imágenes hasta 10 MB. Si un PDF excede el límite, la interfaz recomienda comprimirlo con iLovePDF.
- La documentación histórica queda versionada y no se reemplaza silenciosamente.

## Consentimiento informado

- Cada residente permite registrar un consentimiento nuevo o subir uno que ya estaba firmado.
- El archivo queda dentro de la carpeta del residente, con validación de tipo, tamaño y pertenencia al ELEAM.
- La evidencia cargada alimenta el verificador de consentimiento sin duplicar un checklist dentro de la ficha.

## Información general del residente

- **Resumen** e **Ingreso SEREMI** se reúnen en una sola pestaña llamada **Información general**.
- La cabecera permite desplegar los antecedentes personales sin repetirlos en otra tarjeta.
- Dependencia, diagnóstico principal, alergias y edición de datos forman parte de ese desplegable; las acciones frecuentes ocupan su lugar en la cabecera para estar siempre disponibles.
- Cuando existe una valoración Barthel, la dependencia de antecedentes personales muestra la categoría y puntaje de esa valoración más reciente en lugar de la clasificación manual.
- La pestaña **Turno** se retiró de la ficha: **Ver tareas pendientes** abre directamente Cuidados del turno filtrado por el residente y sólo muestra lo que falta realizar.
- Consentimiento, red de salud, persona significativa e intereses permanecen en Información general; el checklist normativo general queda exclusivamente en Cumplimiento.
- **Nuevo registro** reúne signos vitales, evolución y controles o derivaciones. El control sale de Información general y, al guardarse, se consulta en Historial.
- **Control o derivación** utiliza un formulario progresivo: siempre solicita fecha, centro y motivo; sólo cuando la atención fue realizada exige las observaciones e indicaciones recibidas y permite registrar profesional, acompañante, próximo control y coordinación con familia o persona significativa. Los estados programado, cancelado o inasistente ocultan campos que no corresponden.
- La red de salud usa un resumen compacto y muestra el formulario sólo al registrar o editar.
- Los enlaces antiguos a Resumen o Ingreso SEREMI siguen abriendo la sección correcta.

## Usuarios, administradores y continuidad histórica

- Un administrador puede crear funcionarios con permisos configurables y otros administradores del mismo ELEAM.
- La creación de otro administrador exige una confirmación explícita porque entrega acceso completo a información clínica, documentos, personal, pagos y configuración.
- “Eliminar usuario” se implementa como **desactivar acceso**: revoca inmediatamente el ingreso, pero conserva perfil, permisos, capacitaciones, documentos y autoría histórica.
- Las cuentas desactivadas aparecen en un historial y pueden restaurarse. No es posible desactivar la propia cuenta ni dejar al ELEAM sin un administrador activo.

## Medicamentos

- La ficha mantiene sólo tres espacios: **Tratamiento y recetas**, **Recepción y stock** y **Administraciones**.
- El checklist normativo y los respaldos físicos permanecen en Cumplimiento, sin repetirse dentro de cada residente.
- Las recetas aceptan PDF, JPG, PNG y WEBP hasta 3 MB. Los PDF grandes muestran un enlace e instrucción breve para iLovePDF.
- “Adjuntar recetas” es un permiso independiente: archivar el documento no obliga a entregar acceso para registrar o modificar un tratamiento.
- Los cuidadores pueden archivar recetas, pero la administración queda desactivada por defecto y sólo debe habilitarse con capacitación acreditada y protocolo.
- TENS recibe por defecto administración, recepción/stock y segunda firma. Enfermería puede mantener el tratamiento indicado y sus respaldos. Los perfiles genéricos parten con mínimo acceso.
- La base de datos y Storage vuelven a comprobar formato, tamaño, ELEAM, residente y permiso mediante restricciones y RLS.

## Registro de evolución por residente

- La antigua acción “Nueva observación” ya no abre una pantalla independiente ni vuelve a solicitar el residente.
- La evolución se registra desde **Nuevo registro** en la cabecera de la ficha, mediante un modal con el residente fijo, fecha y hora local, turno y seguimiento opcional. El selector se limita a estado general, cambio clínico o síntoma, dolor, piel o heridas y conducta o estado de ánimo; medicamentos, cuidados rutinarios, controles y eventos adversos permanecen en sus módulos para evitar duplicaciones.
- Los textos y campos cambian según la categoría para guiar una nota objetiva que incluya hallazgo, atención realizada, respuesta del residente y continuidad. En cambios clínicos, dolor y piel o heridas se exige documentar la atención y respuesta.
- No existe una pestaña paralela de Registro de evolución: los registros guardados se consultan junto con toda la trazabilidad en **Historial**.
- Historial permite buscar por texto, seleccionar un período rápido y aplicar tipo, estado o fechas personalizadas sólo cuando son necesarios.
- La carga progresiva y los detalles bajo demanda permiten consultar antecedentes sin saturar la pantalla ni el backend.
- No se ofrece eliminación directa, para proteger la continuidad del historial clínico.
- Los accesos antiguos `/observations` y `/observations/new` redirigen a la ficha correspondiente o a la selección de residentes, por lo que los enlaces existentes no quedan rotos.
- Cumplimiento reconoce el Registro de evolución como parte de la evidencia parcial de una carpeta personal actualizada, sin convertirlo por sí solo en cumplimiento total.

## Inicio y prioridades del turno

- El dashboard se presenta como **Resumen del día** y sitúa arriba sólo tres acciones operativas disponibles según el rol: entrega de turno, cuidados y medicamentos. Signos vitales y Registro de evolución se registran desde la ficha del residente para evitar accesos duplicados.
- Se retiraron “Preparar carpeta” y los accesos secundarios que ya existen en el menú lateral.
- El panel de pendientes muestra sólo situaciones activas; los indicadores en cero no ocupan espacio ni compiten con lo urgente.
- El estado diario se limita a residentes activos, alertas clínicas, cobertura de controles y documentación DS 20.
- Medicamentos y cuidados se agrupan como trabajo del turno. Distribución, dependencia y actividad quedan plegadas bajo **Más información**.
- Los títulos, ayudas y tarjetas se adaptan a permisos y a pantallas móviles sin ocultar las acciones esenciales.

## Entrega de turno

- La preparación reúne medicamentos, cuidados, prioridades clínicas, controles e incidentes sin repetir tarjetas equivalentes.
- El equipo escribe una sola sección de **Información para el siguiente turno** y recibe una indicación explícita para no copiar los pendientes automáticos.
- El historial consulta sólo metadatos, aplica turno y período en el servidor, y carga 25 entregas por página para no descargar resúmenes clínicos completos innecesariamente.
- Los permisos **Registrar entregas** y **Ver historial** se administran por funcionario; el administrador del ELEAM conserva acceso completo.
- Cada creación o actualización registra automáticamente responsable, fecha y una versión inmutable en auditoría. Los usuarios operativos no pueden borrar entregas.
- Al cerrar un turno, cada cuidado abierto debe **pasar al siguiente turno** o quedar como **no realizado**, siempre con un motivo. La entrega no puede guardarse con decisiones incompletas.
- La entrega y las decisiones se confirman en una única transacción: se conserva responsable, origen, destino y motivo sin riesgo de guardar sólo una parte del cierre.
- Los medicamentos no se traspasan como cuidados genéricos; deben resolverse desde su flujo propio para conservar dosis, lote y firmas.
- La vista imprimible omite secciones vacías, usa filas compactas, controla cortes internos y configura márgenes A4 para evitar páginas innecesarias.
- La impresión muestra las decisiones tomadas sobre los pendientes, separando tareas traspasadas y no realizadas.

## Cuidados del turno

- La pantalla utiliza el nombre consistente **Cuidados del turno** y elimina encabezados internos que repetían el propósito de la página.
- Fecha, turno, búsqueda, estado y tipo de tarea quedan reunidos en un único bloque de control responsive.
- El filtro por tipo separa cuidados, medicamentos, signos vitales y seguimientos usando los datos del turno ya cargados, sin provocar nuevas consultas al backend.
- La lista conserva orden por vencimiento, urgencia y hora para facilitar la ejecución y la trazabilidad normativa.

## Historial del residente

- La ficha principal registra automáticamente altas y modificaciones, indicando campos anteriores y nuevos, fecha y responsable.
- También se auditan consentimientos, valoraciones geriátricas, red de salud y controles. Los movimientos de cama utilizan su registro específico para evitar duplicados.
- Persona significativa e intereses o actividades también conservan altas, modificaciones y eliminaciones, completando la trazabilidad de toda Información general.
- La línea de tiempo muestra inicialmente sólo título, fecha, responsable, tipo y estado; los detalles se consultan al abrir cada registro.
- El backend entrega páginas de 25 eventos y aplica periodo, tipo, estado y búsqueda antes de responder. Los filtros sólo generan una consulta al aplicar un cambio efectivo.
- Los detalles ya consultados se conservan en memoria durante la sesión para no repetir solicitudes al backend.

## Plan de atención y cuidados

- La ficha reúne primero un resumen breve del objetivo individual, alimentación, hidratación, mantención o rehabilitación, bienestar biopsicosocial y participación del residente o representante.
- Los cuidados se muestran por turno y una misma acción aparece en cada horario que le corresponde, sin quedar oculta bajo un único turno.
- Crear el plan ya no inventa riesgos, objetivos ni pautas clínicas: guía al equipo para completar la información real del residente.
- La revisión de dirección técnica requiere un permiso independiente y sólo se confirma cuando el resumen y al menos un cuidado con frecuencia están completos.
- Una modificación posterior del plan, sus cuidados o frecuencias invalida la revisión para evitar respaldar información desactualizada.
- Las altas, modificaciones y eliminaciones del plan quedan en auditoría y se integran al Historial del residente.
- La edición conserva las recurrencias semanales, mensuales o de fecha única ya existentes aunque la pantalla operativa mantenga una configuración sencilla.

## Permisos y seguridad del equipo

- “Agregar una persona” explica la diferencia entre una persona **con acceso** —cuenta individual y sólo las áreas/acciones autorizadas— y **sin acceso** —registro de dotación sin posibilidad de iniciar sesión— mediante texto breve y ayuda contextual accesible.
- Escritorio, navegación móvil, tarjetas de Personal y acciones del dashboard aplican las mismas reglas de área y acción. Entrega de turno se oculta sin permiso de lectura; medicamentos reconoce tanto administración como segunda firma; cuidados aparece sólo cuando existe alguna acción operativa autorizada.
- Las dependencias del backend también se aplican en la interfaz: registrar una entrega exige poder consultar el historial y cualquier operación de cobranza exige permiso de lectura. El configurador activa o desactiva automáticamente los permisos relacionados para evitar combinaciones inválidas.
- Los permisos de funcionarios fallan de forma cerrada si no cargan o son desconocidos. El cliente envía exclusivamente las claves autorizadas y nunca puede reemplazar accidentalmente el identificador del usuario objetivo.
- Menús y botones son sólo la primera barrera: las rutas vuelven a comprobar rol, vigencia, área y acción; RLS/RPC aíslan por ELEAM y validan el permiso antes de leer o escribir; las Edge Functions sensibles verifican JWT, administrador activo, pertenencia al mismo ELEAM y estado vigente.
- La vigencia de demos, suscripciones activas, gracia y períodos cancelados aún vigentes usa una regla única en las funciones de creación, edición, recuperación, desactivación y restauración de usuarios.
- Las políticas que modifican permisos por área o acción ahora exigen además que el ELEAM conserve acceso operativo vigente.
- Se actualizaron React Router y dependencias transitivas de build afectadas por avisos de seguridad; `npm audit` finaliza sin vulnerabilidades conocidas.

## Despliegue

### Estado al 15 de agosto de 2026

Desplegadas y verificadas como `ACTIVE` en Supabase `gzvjqzilaxlnzmjkcrbw`, todas con validación JWT habilitada:

- `create-demo-user` v39.
- `create-staff-user` v37.
- `update-staff-user` v4.
- `delete-staff-user` v32.

El despliegue incluyó los módulos compartidos de correo, autenticación y validación de vigencia. Las migraciones SQL se aplican por separado y no deben considerarse desplegadas sólo por publicar las Edge Functions.

1. Aplicar [`supabase_schema.sql`](./supabase_schema.sql) en la instancia Supabase.
2. Desplegar las Edge Functions modificadas.
3. Construir y desplegar el frontend.
4. Ejecutar antes de publicar:

```bash
npm run verify
```

## Fuente normativa

- [Decreto Supremo N.º 20 para ELEAM, texto consolidado](https://www.bcn.cl/leychile/navegar?idNorma=1182129).
# Estados de carga y consistencia visual

- Las rutas autenticadas esperan a que se resuelvan el perfil, el ELEAM y los permisos antes de mostrar navegación o decisiones de acceso.
- Los cambios de ruta muestran una estructura de carga estable para evitar pantallas vacías y saltos de diseño.
- Dashboard, camas, dotación, tareas, medicamentos y listados clínicos ya no muestran ceros, estados “al día” ni mensajes “sin registros” mientras la consulta sigue pendiente.
- Los errores de consulta se distinguen de un resultado realmente vacío e incluyen una acción clara para reintentar.
- Las operaciones globales usan una capa de progreso que bloquea acciones duplicadas sin reemplazar visualmente la pantalla en curso.
