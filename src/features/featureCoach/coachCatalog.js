export const COACHES = {
  dashboard: {
    icon: "home",
    eyebrow: "Inicio",
    title: "Tu día, en una pantalla",
    description: "Lo urgente primero: alertas clínicas, pendientes del turno y residentes a vigilar.",
    steps: [
      { title: "Mira las alertas", text: "Vencidos, medicamentos y eventos quedan resaltados arriba." },
      { title: "Entra al turno", text: "Un toque en Tareas o Medicamentos y ves lo de ahora." },
    ],
    benefit: "Empiezas el turno sabiendo qué hacer, sin revisar cuadernos.",
    roleOverrides: {
      admin_eleam: {
        title: "El pulso de tu ELEAM",
        description: "Ocupación, equipo, clínica y acreditación en un solo vistazo.",
        steps: [
          { title: "Lee los indicadores", text: "Residentes, alertas y vencimientos en tarjetas claras." },
          { title: "Actúa sobre lo crítico", text: "Cada alerta te lleva a resolverla en 1 clic." },
        ],
        benefit: "Decides con datos al día y frenas los problemas antes de que escalen.",
      },
    },
  },

  establishment: {
    icon: "beds",
    eyebrow: "Establecimiento",
    title: "La instalación, ordenada",
    description: "Capacidad, habitaciones, camas y documentos físicos conectados con la carpeta SEREMI.",
    steps: [
      { title: "Registra habitaciones", text: "Define código, sector y las camas que contiene cada una." },
      { title: "Completa la evidencia", text: "Los planos y certificados se cargan una sola vez en Cumplimiento." },
    ],
    benefit: "Ves ocupación y evidencia del inmueble sin navegar por módulos separados.",
  },

  personnel: {
    icon: "team",
    eyebrow: "Personal",
    title: "Equipo y dotación en un lugar",
    description: "Accesos, competencias, capacitación y cobertura legal de turnos reunidos por persona.",
    steps: [
      { title: "Crea al funcionario", text: "Recibirá un enlace seguro y permisos operativos predeterminados." },
      { title: "Planifica la dotación", text: "El calendario avisa si algún turno queda bajo el mínimo exigido." },
    ],
    benefit: "Mantienes la nómina fiscalizable sin una matriz de permisos difícil de administrar.",
  },

  compliance: {
    icon: "compliance",
    eyebrow: "Cumplimiento SEREMI",
    title: "Todo lo fiscalizable, conectado",
    description: "Requisitos, documentos, protocolos, reclamos y emergencias organizados por obligación.",
    steps: [
      { title: "Revisa las brechas", text: "Empieza por los requisitos vencidos o sin evidencia." },
      { title: "Abre la carpeta", text: "Cada evidencia queda asociada al requisito que demuestra." },
    ],
    benefit: "Preparas una fiscalización desde una sola entrada y sin duplicar documentos.",
  },

  turnos: {
    icon: "shift",
    eyebrow: "Entrega de turno",
    title: "Pasa el turno sin perder nada",
    description: "El historial de entregas y el armado del resumen para el siguiente equipo.",
    steps: [
      { title: "Crea una entrega", text: "El sistema junta medicamentos, tareas y signos por ti." },
      { title: "Comparte o imprime", text: "Queda firmada y disponible para el equipo entrante." },
    ],
    benefit: "Adiós a las hojas sueltas y las entregas verbales que se pierden.",
  },

  "turnos-nuevo": {
    icon: "shift",
    eyebrow: "Nueva entrega",
    title: "Arma la entrega en 3 minutos",
    description: "El turno llega precargado y organizado por residente. Solo agregas tus notas.",
    steps: [
      { title: "Revisa lo precargado", text: "Medicamentos, tareas y signos ya consolidados." },
      { title: "Anota pendientes", text: "Lo que el siguiente equipo debe ejecutar." },
    ],
    benefit: "Tu cierre de turno pasa de 20 minutos a 3, y queda trazado.",
  },

  "turnos-detalle": {
    icon: "shift",
    eyebrow: "Entrega de turno",
    title: "Detalle imprimible y trazado",
    description: "La entrega completa por residente, lista para consultar o imprimir.",
    steps: [
      { title: "Revisa por residente", text: "Lo que ocurrió con cada uno en el turno." },
      { title: "Imprime si lo necesitas", text: "Formato optimizado para papel A4." },
    ],
    benefit: "Resuelves dudas y auditas incidentes consultando entregas anteriores.",
  },

  "care-tasks": {
    icon: "tasks",
    eyebrow: "Tareas del turno",
    title: "Lo que toca hacer ahora",
    description: "Una bandeja con cuidados, signos, medicamentos y seguimientos del turno.",
    steps: [
      { title: "Filtra lo accionable", text: "Pendientes, vencidas o por validar." },
      { title: "Cierra en 1 clic", text: "Cumplida, omitida o reprogramada, desde la misma fila." },
      { title: "Activa seguimiento", text: "Cuando el equipo deba revisar la evolución en otro turno." },
    ],
    benefit: "El equipo trabaja contra una lista clara. Nada se pierde.",
  },

  emar: {
    icon: "meds",
    eyebrow: "Medicamentos",
    title: "Administración segura, sin papeles",
    description: "El kardex del turno con dosis, vía y alertas de stock.",
    steps: [
      { title: "Filtra por turno", text: "Ves solo lo programado en ese horario." },
      { title: "Administra u omite", text: "Con lote y dosis reales, o motivo de omisión." },
      { title: "Doble firma si aplica", text: "Controlados esperan validación de un segundo usuario." },
      { title: "Cierra antes de entregar", text: "Revisa pendientes, vencidas y registros por validar." },
    ],
    benefit: "Menos errores de medicación, con stock auditado y cada dosis trazada.",
  },

  residents: {
    icon: "residents",
    eyebrow: "Residentes",
    title: "Todas las fichas en un lugar",
    description: "Lista completa con estado, dependencia y ubicación de cada residente.",
    steps: [
      { title: "Busca al instante", text: "Por nombre o RUT, con tildes y mayúsculas." },
      { title: "Entra a la ficha", text: "Salud, contactos y planes con un clic." },
    ],
    benefit: "Nadie pierde tiempo buscando carpetas físicas. Todo en segundos.",
  },

  "residents-new": {
    icon: "residents",
    eyebrow: "Nuevo residente",
    title: "Ingresa al residente sin dudas",
    description: "El formulario te guía con identificación, ingreso y clínica básica.",
    steps: [
      { title: "Completa lo esencial", text: "Nombre, apellido, ingreso y estado actual." },
      { title: "Agrega contexto clínico", text: "Diagnóstico, alergias y dependencia." },
      { title: "Asigna cama después", text: "Créalo y ve a Camas para ubicarlo." },
    ],
    benefit: "El ingreso queda validado y disponible al instante para el equipo.",
  },

  "residents-detail": {
    icon: "residents",
    eyebrow: "Ficha del residente",
    title: "Todo sobre tu residente",
    description: "Datos, salud, plan de cuidado, medicación y trazabilidad, juntos.",
    steps: [
      { title: "Navega las pestañas", text: "Salud, cuidado, medicamentos, Ingreso DS 20 y bitácora." },
      { title: "Aplica escalas", text: "Barthel, Katz, MNA, MMSE y Tinetti desde la pestaña de salud." },
      { title: "Completa el Ingreso DS 20", text: "Consentimiento, red de salud y persona significativa." },
    ],
    benefit: "Accedes al 360° del residente en segundos, sin planillas dispersas.",
  },

  "residents-edit": {
    icon: "residents",
    eyebrow: "Editar residente",
    title: "Actualiza cuando algo cambie",
    description: "Modifica datos, diagnósticos o estado. Todo queda trazado.",
    steps: [
      { title: "Edita lo que cambió", text: "El resto de la ficha se mantiene." },
      { title: "Marca egreso si aplica", text: "Con fecha y motivo del cambio de estado." },
    ],
    benefit: "La ficha siempre refleja la realidad actual, sin notas paralelas.",
  },

  beds: {
    icon: "beds",
    eyebrow: "Camas",
    title: "Ocupación clara en tiempo real",
    description: "Disponibles, ocupadas, reservadas o fuera de servicio, en una vista.",
    steps: [
      { title: "Mira el panorama", text: "Disponibles, ocupadas y en mantención arriba." },
      { title: "Asigna o transfiere", text: "Desde la misma cama, con validación automática." },
    ],
    benefit: "Coordinas la ocupación sin reuniones ni planillas paralelas.",
  },

  "vital-signs": {
    icon: "vitals",
    eyebrow: "Signos vitales",
    title: "Controles con alerta visual",
    description: "Historial por residente con rangos clínicos automáticos.",
    steps: [
      { title: "Lee los colores", text: "Verde normal, ámbar atención, rojo crítico." },
      { title: "Registra uno nuevo", text: "Con guía por parámetro y feedback en vivo." },
    ],
    benefit: "Detectas tendencias antes de que se vuelvan emergencias.",
  },

  "vital-signs-new": {
    icon: "vitals",
    eyebrow: "Nuevo control",
    title: "Registra con guía clínica",
    description: "Mientras escribes, el sistema te avisa si el valor está en rango.",
    steps: [
      { title: "Registra lo que mediste", text: "Los campos sin medir pueden quedar vacíos." },
      { title: "Marca seguimiento", text: "Si es crítico, deja aviso para el próximo turno." },
    ],
    benefit: "Cada control queda con contexto clínico y alertas automáticas.",
  },

  observations: {
    icon: "observations",
    eyebrow: "Observaciones",
    title: "Novedades y seguimientos a mano",
    description: "Incidentes y novedades clínicas por residente, con filtros.",
    steps: [
      { title: "Filtra por tipo", text: "Caídas, curaciones, visitas médicas y más." },
      { title: "Crea una nueva", text: "Con tipos agrupados por categoría." },
    ],
    benefit: "El siguiente turno arranca con contexto completo, sin notas sueltas.",
  },

  "observations-new": {
    icon: "observations",
    eyebrow: "Nueva observación",
    title: "Documenta lo que ocurrió",
    description: "Tipo, descripción y acciones tomadas. Marca seguimiento si aplica.",
    steps: [
      { title: "Elige el tipo", text: "Clínica, cuidados, psicosocial u otras." },
      { title: "Activa seguimiento", text: "Define fecha y turno de revisión si hace falta." },
    ],
    benefit: "Tus observaciones se vuelven acciones rastreables, no notas perdidas.",
  },

  "adverse-events": {
    icon: "alert",
    eyebrow: "Eventos adversos",
    title: "Registro reglamentario serio",
    description: "Caídas, errores y lesiones con severidad, línea de tiempo y cierre.",
    steps: [
      { title: "Prioriza por severidad", text: "Leve, moderado, grave o crítico." },
      { title: "Cierra con conclusiones", text: "Solo personal autorizado." },
    ],
    benefit: "Mantienes trazabilidad reglamentaria con historial inmutable.",
  },

  "adverse-events-new": {
    icon: "alert",
    eyebrow: "Nuevo evento adverso",
    title: "Registra un evento crítico",
    description: "Clasifica, describe lo ocurrido y las acciones inmediatas.",
    steps: [
      { title: "Clasifica con precisión", text: "Categoría y severidad guían el seguimiento." },
      { title: "Define el cierre", text: "Marca seguimiento y fecha compromiso." },
    ],
    benefit: "Tienes el respaldo formal ante fiscalizaciones, sin reconstruir hechos.",
  },

  "adverse-events-detail": {
    icon: "alert",
    eyebrow: "Detalle del evento",
    title: "La historia completa del evento",
    description: "Acciones, contactos, derivaciones y cierre, en orden cronológico.",
    steps: [
      { title: "Agrega acciones", text: "Cada una se firma y queda en la línea de tiempo." },
      { title: "Cierra con conclusiones", text: "Cuando el caso está resuelto." },
    ],
    benefit: "Trabajas el caso con método clínico, sin perder el hilo entre turnos.",
  },

  "adverse-events-edit": {
    icon: "alert",
    eyebrow: "Editar evento adverso",
    title: "Ajusta datos del evento",
    description: "Severidad, descripción o seguimiento. Los cambios quedan auditados.",
    steps: [
      { title: "Edita lo necesario", text: "Severidad, descripción, fechas o responsables." },
      { title: "Justifica el cambio", text: "Agrega una acción a la línea de tiempo si es relevante." },
    ],
    benefit: "Tus registros se mantienen precisos y auditables, sin duplicados.",
  },

  emergencias: {
    icon: "shield",
    eyebrow: "Plan de emergencias",
    title: "Preparados ante cualquier emergencia",
    description: "Plan, escenarios, simulacros e inventario en un solo lugar, como exige el DS 20.",
    steps: [
      { title: "Crea el plan base", text: "Objetivo, alcance y fechas de aprobación y revisión." },
      { title: "Documenta escenarios", text: "Incendio, sismo, evacuación: cada uno con su procedimiento." },
      { title: "Registra simulacros", text: "Fecha, participantes, resultado y acciones de mejora." },
    ],
    benefit: "Tu plan de emergencias queda listo para la fiscalización SEREMI.",
    roleOverrides: {
      funcionario: {
        title: "Conoce el plan y registra simulacros",
        description: "Los procedimientos ante emergencias y el registro de los ejercicios realizados.",
        steps: [
          { title: "Estudia los escenarios", text: "Incendio, sismo, evacuación: cada uno con su procedimiento." },
          { title: "Registra simulacros", text: "Fecha, participantes, resultado y acciones de mejora." },
        ],
        benefit: "Sabes qué hacer en una emergencia y cada ejercicio queda trazado.",
      },
    },
  },

  reclamos: {
    icon: "chat",
    eyebrow: "Reclamos y sugerencias",
    title: "Cada reclamo con folio y respuesta",
    description: "Registro codificado de reclamos, sugerencias, felicitaciones y consultas (DS 20 Art. 27).",
    steps: [
      { title: "Registra el ingreso", text: "El folio se genera solo, con tipo, canal y prioridad." },
      { title: "Gestiona y responde", text: "Cambia el estado y deja la respuesta formal por escrito." },
    ],
    benefit: "Demuestras gestión formal de reclamos sin libros de papel.",
  },

  cumplimiento: {
    icon: "compliance",
    eyebrow: "Cumplimiento",
    title: "Una carpeta fácil de revisar",
    description: "Documentos, protocolos y registros ordenados para una fiscalización.",
    steps: [
      { title: "Abre un ámbito", text: "Verás juntos todos los puntos que pertenecen al mismo tema." },
      { title: "Completa lo pendiente", text: "Cada punto explica en palabras simples qué respaldo falta." },
      { title: "Emite el reporte", text: "La vista para fiscalización conserva el mismo orden de la pantalla." },
    ],
    benefit: "Preparas la revisión sin mantener listas paralelas.",
    roleOverrides: {
      funcionario: {
        title: "La carpeta, siempre clara",
        description: "Consulta los ámbitos y abre solo el tema que necesitas revisar.",
        steps: [
          { title: "Abre un ámbito", text: "Cada tema muestra sus puntos en el orden del reporte." },
          { title: "Revisa un respaldo", text: "El estado indica si está al día o necesita atención." },
        ],
        benefit: "Encuentras lo importante sin navegar por varias pantallas.",
      },
    },
  },

  staffing: {
    icon: "staffing",
    eyebrow: "Dotación DS20",
    title: "La dotación de la semana, validada",
    description: "Asigna personas por turno y detecta brechas de cuidadores según dependencia.",
    steps: [
      { title: "Planifica la semana", text: "Asigna persona y rol en cada turno del calendario." },
      { title: "Lee las alertas", text: "Las celdas en rojo muestran turnos bajo el mínimo legal." },
      { title: "Copia la semana anterior", text: "Repite la planificación en un clic y ajusta lo necesario." },
    ],
    benefit: "Cumples la dotación mínima del DS 20 sin planillas Excel.",
    roleOverrides: {
      funcionario: {
        title: "Tu semana de turnos, clara",
        description: "Consulta la planificación semanal y las brechas de cuidadores por turno.",
        steps: [
          { title: "Ubica tu turno", text: "El calendario muestra quién cubre cada día y turno." },
          { title: "Lee las alertas", text: "Las celdas en rojo muestran turnos bajo el mínimo legal." },
        ],
        benefit: "Sabes quién cubre cada turno sin preguntar ni revisar planillas.",
      },
    },
  },

  accreditation: {
    icon: "accreditation",
    eyebrow: "Carpeta SEREMI",
    title: "Carpeta SEREMI DS 20 al día",
    description: "Los ámbitos del reporte, desplegables y con lenguaje sencillo.",
    steps: [
      { title: "Abre un ámbito", text: "Revisa sus puntos sin salir de la carpeta." },
      { title: "Completa un punto", text: "Sube o revisa el respaldo desde una sola acción." },
    ],
    benefit: "Tu carpeta lista el día de la fiscalización, sin folders perdidos.",
  },

  "accreditation-requisito": {
    icon: "accreditation",
    eyebrow: "Requisito SEREMI",
    title: "Gestiona un requisito completo",
    description: "Evidencias versionadas, observaciones, auditoría y estados.",
    steps: [
      { title: "Sube el documento", text: "PDF, imagen o Word; se versiona solo." },
      { title: "Cambia el estado", text: "Vigente, no aplica o pendiente, con justificación." },
    ],
    benefit: "Cada requisito queda trazado: quién subió qué y cuándo cambió.",
  },

  "accreditation-observaciones": {
    icon: "accreditation",
    eyebrow: "Observaciones SEREMI",
    title: "Hallazgos abiertos y cerrados",
    description: "Observaciones internas o de fiscalización, con su subsanación.",
    steps: [
      { title: "Filtra por estado", text: "Abiertas, en proceso o cerradas." },
      { title: "Cierra con evidencia", text: "Con nota de subsanación y responsable." },
    ],
    benefit: "Reduces el riesgo de multas gestionando hallazgos con plazos claros.",
  },

  "accreditation-carpeta": {
    icon: "accreditation",
    eyebrow: "Carpeta imprimible",
    title: "Exporta tu carpeta SEREMI",
    description: "Vista imprimible con portada, evidencia vigente y detalle (Ctrl+P).",
    steps: [
      { title: "Revisa el resumen", text: "Datos del ELEAM y porcentaje global." },
      { title: "Guarda como PDF", text: "Ctrl+P para tener tu copia digital." },
    ],
    benefit: "Si llega la fiscalización, tienes la carpeta lista en 2 minutos.",
  },

  team: {
    icon: "team",
    eyebrow: "Equipo",
    title: "Equipo del establecimiento",
    description: "Crea cuentas y registra la dotación y competencias DS 20.",
    steps: [
      { title: "Crea funcionarios", text: "Email, nombre y cargo; el sistema envía el acceso." },
      { title: "Registra la dotación", text: "Mantén cargos y turnos del equipo en un solo lugar." },
      { title: "Registra competencias", text: "Mantén certificados y capacitaciones al día." },
    ],
    benefit: "Cada persona ve solo lo suyo, con sus credenciales al día.",
  },

  subscription: {
    icon: "payment",
    eyebrow: "Suscripción",
    title: "Tu plan y pagos",
    description: "Estado de tu suscripción y planes disponibles.",
    steps: [
      { title: "Revisa tu plan", text: "Residentes, funcionarios y vencimiento incluidos." },
      { title: "Paga con MercadoPago", text: "Suscripción recurrente, sin recordar fechas." },
    ],
    benefit: "Servicio activo sin interrupciones, y escalas el plan al crecer.",
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
