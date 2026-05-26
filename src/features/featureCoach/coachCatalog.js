export const COACHES = {
  dashboard: {
    icon: "home",
    eyebrow: "Inicio",
    title: "Tu día en un solo lugar",
    description: "Cuando abres la app, ves de inmediato lo importante: alertas clínicas, tareas pendientes y residentes con prioridad.",
    steps: [
      { title: "Mira las alertas", text: "Tareas vencidas, medicamentos pendientes y eventos clínicos quedan resaltados arriba." },
      { title: "Abre el turno actual", text: "Un click en \"Tareas\" o \"Medicamentos\" y ves todo lo del momento." },
      { title: "Cierra el día desde aquí", text: "Al terminar, pasa por \"Entrega de turno\" para dejar todo trazado." },
    ],
    benefit: "Reduce el tiempo de transferencia entre turnos y te ayuda a no olvidar pendientes clínicos clave.",
    roleOverrides: {
      admin_eleam: {
        title: "El estado de tu ELEAM, claro",
        description: "Ves el resumen de gestión, la ocupación, los pendientes del equipo y los hitos de acreditación, todo en una pantalla.",
        steps: [
          { title: "Revisa indicadores", text: "Ocupación, residentes activos, alertas clínicas y vencimientos en tarjetas claras." },
          { title: "Actúa sobre alertas", text: "Las alertas críticas tienen acción directa: 1 click te lleva a resolverlas." },
          { title: "Sigue el día a día", text: "El panel operativo refleja lo que está pasando en cada turno." },
        ],
        benefit: "Tomas decisiones con datos al día y detectas problemas antes de que escalen.",
      },
    },
  },

  turnos: {
    icon: "shift",
    eyebrow: "Entrega de turno",
    title: "Pasa el turno sin perder nada",
    description: "Acá ves el historial de entregas de turno y puedes preparar el resumen para el siguiente equipo.",
    steps: [
      { title: "Revisa el histórico", text: "Cada entrega queda con fecha, turno y autor para auditoría completa." },
      { title: "Crea una entrega nueva", text: "El sistema arma el borrador con medicamentos, tareas, signos y pendientes." },
      { title: "Imprime o comparte", text: "Listo para entregar en papel o digital al equipo entrante." },
    ],
    benefit: "Elimina las hojas sueltas y las entregas verbales que se pierden. Todo queda trazado y firmado.",
  },

  "turnos-nuevo": {
    icon: "shift",
    eyebrow: "Nueva entrega",
    title: "Arma la entrega en 3 minutos",
    description: "El sistema recoge automáticamente lo del turno y lo organiza por residente. Solo agregas tus comentarios.",
    steps: [
      { title: "Revisa lo precargado", text: "Medicamentos, tareas y signos del turno aparecen ya consolidados." },
      { title: "Anota pendientes", text: "Usa el campo \"Pendientes\" para lo que el siguiente equipo debe ejecutar." },
      { title: "Guarda y comparte", text: "Queda firmado con tu nombre y disponible para todos." },
    ],
    benefit: "Tu entrega de turno deja de ser una tarea de 20 minutos y se vuelve un cierre ordenado de 3 minutos.",
  },

  "turnos-detalle": {
    icon: "shift",
    eyebrow: "Entrega de turno",
    title: "Detalle imprimible y trazado",
    description: "Acá ves la entrega completa con todos los registros del turno consolidados, lista para imprimir o consultar.",
    steps: [
      { title: "Revisa por residente", text: "Cada sección muestra lo que ocurrió con cada residente durante el turno." },
      { title: "Identifica al autor", text: "Cada entrega queda firmada con nombre y hora del cierre." },
      { title: "Imprime si lo necesitas", text: "El formato está optimizado para papel A4." },
    ],
    benefit: "Tu equipo puede consultar entregas antiguas para resolver dudas clínicas o auditar incidentes.",
  },

  "care-tasks": {
    icon: "tasks",
    eyebrow: "Tareas del turno",
    title: "Lo que toca hacer ahora",
    description: "Una bandeja con todas las tareas del turno: cuidados, signos, medicamentos y seguimientos pendientes.",
    steps: [
      { title: "Filtra por estado", text: "Pendientes, vencidas o por validar — ves solo lo accionable." },
      { title: "Cumple en 1 click", text: "Marca cumplida, omitida o reprograma con motivo, todo desde la misma fila." },
      { title: "Mide el progreso", text: "La barra de turno te muestra cuánto avanzaste sobre el total." },
    ],
    benefit: "Tu equipo trabaja contra una lista clara en lugar de buscar en cuadernos. Nada se pierde.",
  },

  emar: {
    icon: "meds",
    eyebrow: "Medicamentos",
    title: "Administración segura, sin papeles",
    description: "El kardex electrónico te muestra los medicamentos del turno con dosis, vía y alertas de stock.",
    steps: [
      { title: "Filtra el turno", text: "Mañana, tarde o noche — ves solo lo programado en ese horario." },
      { title: "Administra u omite", text: "Marca administrado con lote y dosis reales, o registra la omisión con motivo." },
      { title: "Doble firma cuando aplica", text: "Controlados y casos críticos esperan validación de un segundo usuario." },
    ],
    benefit: "Reduce errores de medicación con doble firma, stock auditado y trazabilidad de cada dosis administrada.",
  },

  residents: {
    icon: "residents",
    eyebrow: "Residentes",
    title: "Todas las fichas en un lugar",
    description: "Lista completa de residentes con su estado, dependencia y ubicación. Filtra y entra a cualquier ficha.",
    steps: [
      { title: "Busca por nombre o RUT", text: "El buscador es instantáneo y respeta tildes y mayúsculas." },
      { title: "Filtra por estado", text: "Activos, hospitalizados o egresados — según lo que necesites." },
      { title: "Entra a la ficha", text: "Click en cualquier residente para ver salud, contactos y planes." },
    ],
    benefit: "Tu equipo no pierde tiempo buscando carpetas físicas: todo está disponible en segundos desde cualquier dispositivo.",
  },

  "residents-new": {
    icon: "residents",
    eyebrow: "Nuevo residente",
    title: "Ingresa al residente paso a paso",
    description: "El formulario te guía por todo lo necesario: datos personales, contacto familiar y datos clínicos básicos.",
    steps: [
      { title: "Completa lo obligatorio", text: "Nombre, RUT, fecha de nacimiento y familiar de contacto." },
      { title: "Agrega contexto clínico", text: "Diagnóstico principal, alergias y dependencia ayudan al equipo desde el día 1." },
      { title: "Asigna cama después", text: "Crea primero al residente y luego ve a Camas para asignar habitación." },
    ],
    benefit: "El ingreso de un residente queda completo, validado y disponible al instante para todo el equipo.",
  },

  "residents-detail": {
    icon: "residents",
    eyebrow: "Ficha del residente",
    title: "Todo sobre tu residente",
    description: "La ficha agrupa datos personales, salud, plan de cuidado, medicación y trazabilidad histórica.",
    steps: [
      { title: "Navega por pestañas", text: "Ficha clínica, signos, medicamentos, plan de cuidado y trazabilidad están separados." },
      { title: "Aplica escalas funcionales", text: "Barthel y Katz desde el botón \"Nueva evaluación\" en la pestaña salud." },
      { title: "Revisa la bitácora", text: "La pestaña trazabilidad muestra qué pasó con el residente día por día." },
    ],
    benefit: "Tu equipo accede a 360° del residente en segundos, sin abrir carpetas ni planillas dispersas.",
  },

  "residents-edit": {
    icon: "residents",
    eyebrow: "Editar residente",
    title: "Actualiza la ficha cuando cambie",
    description: "Modifica datos personales, diagnósticos, alergias o estado del residente. Los cambios quedan trazados.",
    steps: [
      { title: "Edita lo que cambió", text: "Solo modifica los campos necesarios; el resto se mantiene." },
      { title: "Marca egreso o fallecimiento", text: "Si corresponde, cambia el estado con la fecha y el motivo." },
      { title: "Guarda y revisa", text: "Los cambios aplican al instante para todo el equipo." },
    ],
    benefit: "La ficha del residente siempre refleja la realidad actual, sin notas paralelas ni planillas paralelas.",
  },

  beds: {
    icon: "beds",
    eyebrow: "Camas",
    title: "Ocupación clara en tiempo real",
    description: "Mira qué camas están disponibles, ocupadas, reservadas o fuera de servicio. Asigna o transfiere desde la misma vista.",
    steps: [
      { title: "Revisa el panorama", text: "Las tarjetas arriba te dicen cuántas hay disponibles, ocupadas y en mantención." },
      { title: "Asigna residente", text: "Click en una cama vacía y buscas al residente — el sistema valida automáticamente." },
      { title: "Transfiere o libera", text: "Las camas ocupadas tienen acción directa de transferir o liberar con motivo." },
    ],
    benefit: "Coordinas la ocupación sin reuniones ni planillas paralelas: la disponibilidad es siempre el dato vivo.",
  },

  "vital-signs": {
    icon: "vitals",
    eyebrow: "Signos vitales",
    title: "Controles clínicos con alerta visual",
    description: "Historial de controles vitales por residente con rangos clínicos automáticos y filtros por turno.",
    steps: [
      { title: "Mira los rangos", text: "Verde = normal, ámbar = atención, rojo = crítico. No necesitas memorizar." },
      { title: "Filtra y compara", text: "Por residente, fecha o turno — encuentras patrones en segundos." },
      { title: "Registra uno nuevo", text: "Botón \"Nuevo control\" y guías por parámetro con feedback en vivo." },
    ],
    benefit: "Detectas tendencias antes de que se vuelvan emergencias y dejas trazabilidad clínica para auditoría.",
  },

  "vital-signs-new": {
    icon: "vitals",
    eyebrow: "Nuevo control",
    title: "Registra signos con guía clínica",
    description: "Mientras escribes valores, el sistema te avisa si están dentro de rango normal o requieren atención.",
    steps: [
      { title: "Selecciona residente y turno", text: "Auto-completa con el turno actual y la fecha." },
      { title: "Llena los parámetros", text: "Solo lo que mediste — los demás quedan en blanco sin error." },
      { title: "Marca seguimiento si aplica", text: "Si el valor es crítico, deja un seguimiento para el próximo turno." },
    ],
    benefit: "Tus controles quedan registrados con contexto clínico claro y alertas automáticas para casos críticos.",
  },

  observations: {
    icon: "observations",
    eyebrow: "Observaciones",
    title: "Novedades y seguimientos a la mano",
    description: "Registro de novedades clínicas, incidentes y seguimientos por residente con filtros por tipo y fecha.",
    steps: [
      { title: "Filtra por tipo", text: "Caídas, curaciones, visitas médicas, higiene, alimentación y más." },
      { title: "Lee descripciones completas", text: "Click en una observación para ver detalles y acciones tomadas." },
      { title: "Crea una nueva", text: "Botón \"Nueva observación\" con tipos agrupados por categoría." },
    ],
    benefit: "Tu equipo deja constancia clara de cada novedad y el siguiente turno arranca con contexto completo.",
  },

  "observations-new": {
    icon: "observations",
    eyebrow: "Nueva observación",
    title: "Documenta lo que ocurrió",
    description: "Registra novedades con tipo, descripción y acciones tomadas. Marca seguimiento si el equipo debe revisar después.",
    steps: [
      { title: "Elige el tipo", text: "Agrupados en Clínica, Cuidados, Psicosocial y Otras — fácil de encontrar." },
      { title: "Describe con detalle", text: "Sé claro: el equipo del siguiente turno depende de tu nota." },
      { title: "Activa seguimiento si aplica", text: "Define fecha y turno donde alguien debe revisar la evolución." },
    ],
    benefit: "Convierte tus observaciones en acciones rastreables, sin perder casos en notas sueltas.",
  },

  "adverse-events": {
    icon: "alert",
    eyebrow: "Eventos adversos",
    title: "Registro reglamentario serio",
    description: "Eventos clínicos críticos (caídas, errores, lesiones) con clasificación de severidad, timeline y cierre.",
    steps: [
      { title: "Filtra por severidad", text: "Leve, moderado, grave o crítico — prioriza lo que necesita acción ya." },
      { title: "Revisa el timeline", text: "Cada acción tomada queda registrada con autor y fecha." },
      { title: "Cierra cuando corresponda", text: "Solo personal autorizado puede cerrar con conclusiones." },
    ],
    benefit: "Cumples con los requisitos reglamentarios de trazabilidad sin papelería paralela y con historial inmutable.",
  },

  "adverse-events-new": {
    icon: "alert",
    eyebrow: "Nuevo evento adverso",
    title: "Registra un evento crítico",
    description: "Clasifica el evento, describe lo ocurrido, las causas probables y las acciones inmediatas que se tomaron.",
    steps: [
      { title: "Clasifica con precisión", text: "Categoría y severidad determinan el flujo de seguimiento posterior." },
      { title: "Describe contexto y testigos", text: "Cuanta más información tenga el evento, más útil es la revisión." },
      { title: "Define seguimiento", text: "Marca si el evento queda en seguimiento y la fecha compromiso de cierre." },
    ],
    benefit: "Tienes el respaldo formal frente a fiscalizaciones o auditorías sin tener que reconstruir hechos meses después.",
  },

  "adverse-events-detail": {
    icon: "alert",
    eyebrow: "Detalle del evento",
    title: "Timeline completo del evento",
    description: "Acciones tomadas, contactos con familia y medicina, derivaciones y cierre — todo en orden cronológico.",
    steps: [
      { title: "Lee el evento", text: "Datos clínicos, severidad y descripción de lo ocurrido aparecen arriba." },
      { title: "Agrega acciones", text: "Cada nueva acción se firma con tu nombre y queda en el timeline." },
      { title: "Cierra con conclusiones", text: "Solo cuando el caso está completamente resuelto." },
    ],
    benefit: "Tu equipo trabaja un caso adverso con metodología clínica clara, sin perder hilo entre turnos.",
  },

  "adverse-events-edit": {
    icon: "alert",
    eyebrow: "Editar evento adverso",
    title: "Ajusta datos del evento",
    description: "Si la clasificación, descripción o seguimiento cambiaron, actualízalo aquí. Los cambios quedan auditados.",
    steps: [
      { title: "Edita lo necesario", text: "Severidad, descripción, fechas o responsables." },
      { title: "Justifica el cambio", text: "Si es relevante, agrega una acción al timeline explicando el ajuste." },
      { title: "Guarda y revisa", text: "El evento se actualiza con la nueva información para todo el equipo." },
    ],
    benefit: "Tus registros se mantienen precisos y auditables, sin tener que crear eventos duplicados.",
  },

  accreditation: {
    icon: "accreditation",
    eyebrow: "Carpeta SEREMI",
    title: "Acreditación siempre al día",
    description: "Estado de los 14 ámbitos de DS 14/2017 con alertas de vencimientos, documentos cargados y observaciones.",
    steps: [
      { title: "Mira el cumplimiento", text: "Cada ámbito muestra su porcentaje y los requisitos pendientes." },
      { title: "Revisa alertas", text: "Vencidos, por vencer y observaciones abiertas quedan resaltados arriba." },
      { title: "Entra a un ámbito", text: "Click en cualquier ámbito para ver requisitos, evidencias y subir documentos." },
    ],
    benefit: "Tu carpeta SEREMI siempre actualizada — sin folders físicos ni hojas perdidas el día de la fiscalización.",
  },

  "accreditation-ambito": {
    icon: "accreditation",
    eyebrow: "Ámbito SEREMI",
    title: "Requisitos del ámbito",
    description: "Lista de requisitos del ámbito con estado, vencimientos y filtros por estado de cumplimiento.",
    steps: [
      { title: "Filtra por estado", text: "Pendientes, cumple, no cumple, vencidos o no aplica." },
      { title: "Identifica críticos", text: "Vencidos y observados aparecen en colores fuertes." },
      { title: "Entra al requisito", text: "Click para ver evidencias, observaciones y subir documentos nuevos." },
    ],
    benefit: "Tu administrador prioriza con un vistazo qué requisitos necesitan acción inmediata.",
  },

  "accreditation-requisito": {
    icon: "accreditation",
    eyebrow: "Requisito SEREMI",
    title: "Gestiona un requisito completo",
    description: "Evidencias versionadas, observaciones internas o de fiscalización, auditoría y cambios de estado.",
    steps: [
      { title: "Sube el documento", text: "PDF, imagen o Word — el sistema versiona automáticamente." },
      { title: "Cambia el estado", text: "Marca cumple, no aplica o pendiente con justificación si corresponde." },
      { title: "Abre observaciones", text: "Si hay hallazgos, deja observación con acciones y plazo de cierre." },
    ],
    benefit: "Cada requisito queda completamente trazado: quién subió qué documento y cuándo cambió de estado.",
  },

  "accreditation-observaciones": {
    icon: "accreditation",
    eyebrow: "Observaciones SEREMI",
    title: "Hallazgos abiertos y cerrados",
    description: "Observaciones internas (que levantas tú) o de fiscalización (que detecta SEREMI), con su estado de subsanación.",
    steps: [
      { title: "Filtra por estado", text: "Abiertas, en proceso o cerradas — prioriza lo que está pendiente." },
      { title: "Asigna responsable", text: "Cada observación tiene un dueño y una fecha compromiso de cierre." },
      { title: "Cierra con evidencia", text: "Al cerrar, deja la nota de subsanación y el responsable que cerró." },
    ],
    benefit: "Reduces el riesgo de multas y no-conformidades persistentes al gestionar observaciones con plazos claros.",
  },

  "accreditation-carpeta": {
    icon: "accreditation",
    eyebrow: "Carpeta imprimible",
    title: "Exporta tu carpeta SEREMI",
    description: "Vista imprimible (Ctrl+P) con portada, resumen, cumplimiento por ámbito, observaciones y detalle.",
    steps: [
      { title: "Revisa el resumen", text: "Verifica que los datos del ELEAM y el porcentaje global están correctos." },
      { title: "Imprime o guarda PDF", text: "Ctrl+P y elige \"Guardar como PDF\" para tener una copia digital." },
      { title: "Usa en fiscalización", text: "Lleva la carpeta impresa o muestra desde el dispositivo." },
    ],
    benefit: "Si llega una fiscalización, tienes la carpeta lista en 2 minutos sin tener que armar nada manualmente.",
  },

  team: {
    icon: "team",
    eyebrow: "Equipo",
    title: "Gestiona funcionarios y familiares",
    description: "Crea cuentas para tu equipo y los familiares de tus residentes. Define permisos granulares por funcionario.",
    steps: [
      { title: "Crea funcionarios", text: "Email, nombre y plantilla de cargo — el sistema envía enlace de acceso." },
      { title: "Asigna familiares", text: "Vincula familiares a residentes activos con nombre, email y parentesco." },
      { title: "Ajusta permisos", text: "Cada funcionario puede tener permisos a medida según su rol clínico." },
    ],
    benefit: "Cada persona accede solo a lo que necesita, sin compartir contraseñas ni dar acceso indebido a datos clínicos.",
  },

  subscription: {
    icon: "payment",
    eyebrow: "Suscripción",
    title: "Tu plan y pagos",
    description: "Estado actual de tu suscripción, planes disponibles y opciones de cambio o renovación.",
    steps: [
      { title: "Revisa tu plan", text: "Ves cuántos residentes y funcionarios incluye y cuándo vence." },
      { title: "Compara planes", text: "Si necesitas más capacidad, cambias el plan en segundos." },
      { title: "Paga vía MercadoPago", text: "Suscripción recurrente sin tener que recordar fechas." },
    ],
    benefit: "Mantienes el servicio activo sin interrupciones y escalas el plan cuando crece tu ELEAM.",
  },

  familiar: {
    icon: "familiar",
    eyebrow: "Portal familiar",
    title: "Acompaña a tu familiar a distancia",
    description: "Resumen claro y seguro de la salud, los cuidados del día y los signos vitales recientes de tu residente.",
    steps: [
      { title: "Mira el resumen del día", text: "Cuidados cumplidos, medicamentos administrados y signos del día actual." },
      { title: "Revisa los signos vitales", text: "Últimos controles con colores que indican si están en rango normal." },
      { title: "Cambia el día si necesitas", text: "Selecciona otra fecha para ver lo que ocurrió antes." },
    ],
    benefit: "Tienes tranquilidad de saber cómo está tu familiar sin tener que llamar al ELEAM o ir presencialmente.",
  },

  "familiar-visitas": {
    icon: "visits",
    eyebrow: "Mis visitas",
    title: "Anuncia y registra tus visitas",
    description: "Avisa al equipo cuando llegues y cuando te vayas. La hora se registra automáticamente sin que tengas que llenar campos.",
    steps: [
      { title: "Anuncia tu llegada", text: "Click en \"Anunciar visita\" cuando estés en la puerta del ELEAM." },
      { title: "Espera validación", text: "Un funcionario confirma tu ingreso desde la app." },
      { title: "Anuncia tu salida", text: "Al irte, click en \"Anunciar salida\" para cerrar la visita." },
    ],
    benefit: "El equipo del ELEAM siempre sabe quién está visitando y por cuánto tiempo, sin libros de papel.",
  },
};

export function hasCoach(featureId) {
  return Boolean(featureId && COACHES[featureId]);
}

export function getCoach(featureId, rol) {
  if (!hasCoach(featureId)) return null;
  const base = COACHES[featureId];
  const override = rol ? base.roleOverrides?.[rol] : null;
  const merged = override ? { ...base, ...override } : { ...base };
  delete merged.roleOverrides;
  return merged;
}

export function listCoachIds() {
  return Object.keys(COACHES);
}
