export const COACHES = {
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
    roleOverrides: {
      funcionario: {
        title: "Consulta el equipo y la cobertura",
        description: "Directorio, competencias, capacitación y dotación disponibles para consulta.",
        steps: [
          { title: "Abre el directorio", text: "Consulta cargos, competencias y cursos registrados por persona." },
          { title: "Revisa la dotación", text: "El calendario muestra la cobertura planificada para cada turno." },
        ],
        benefit: "Encuentras la información del equipo sin acceder a configuraciones administrativas.",
      },
    },
  },

  turnos: {
    icon: "shift",
    eyebrow: "Entrega de turno",
    title: "Pasa el turno sin perder nada",
    description: "Historial trazable y resumen operativo para el siguiente equipo.",
    steps: [
      { title: "Crea una entrega", text: "El sistema junta medicamentos, tareas y signos por ti.", permission: "registrar_entregas_turno" },
      { title: "Consulta o imprime", text: "Queda identificada por responsable y disponible para el equipo entrante." },
    ],
    benefit: "Adiós a las hojas sueltas y las entregas verbales que se pierden.",
  },

  "turnos-nuevo": {
    icon: "shift",
    eyebrow: "Nueva entrega",
    title: "Completa una entrega clara",
    description: "El turno llega precargado. Sólo agregas información que no esté ya en los pendientes automáticos.",
    steps: [
      { title: "Revisa lo precargado", text: "Medicamentos, tareas y signos ya consolidados." },
      { title: "Deja instrucciones", text: "Registra sólo lo que el siguiente equipo debe conocer o ejecutar." },
    ],
    benefit: "El cierre queda breve, completo y trazado para el equipo entrante.",
  },

  "turnos-detalle": {
    icon: "shift",
    eyebrow: "Entrega de turno",
    title: "Detalle imprimible y trazado",
    description: "Entrega compacta con responsable, versiones y formato A4.",
    steps: [
      { title: "Revisa prioridades", text: "Consulta sólo los pendientes y antecedentes relevantes del turno." },
      { title: "Imprime si lo necesitas", text: "Formato optimizado para papel A4." },
    ],
    benefit: "Resuelves dudas y auditas incidentes consultando entregas anteriores.",
  },

  "care-tasks": {
    icon: "tasks",
    eyebrow: "Cuidados del turno",
    title: "Lo que toca hacer ahora",
    description: "Una bandeja con cuidados, signos, medicamentos y seguimientos del turno.",
    steps: [
      { title: "Filtra lo accionable", text: "Pendientes, vencidas o por validar." },
      { title: "Resuelve desde la lista", text: "Registra sólo las acciones autorizadas para tu función.", anyPermissions: ["completar_tareas_cuidado", "administrar_medicamentos", "validar_medicamentos_controlados", "crear_signos_vitales", "crear_observaciones"] },
      { title: "Activa seguimiento", text: "Cuando el equipo deba revisar la evolución en otro turno.", permission: "crear_observaciones" },
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
      { title: "Administra u omite", text: "Con lote y dosis reales, o motivo de omisión.", permission: "administrar_medicamentos" },
      { title: "Valida si corresponde", text: "Los controlados requieren la confirmación de un segundo usuario.", permission: "validar_medicamentos_controlados" },
      { title: "Revisa antes de entregar", text: "Comprueba pendientes, vencidas y registros por validar.", anyPermissions: ["administrar_medicamentos", "validar_medicamentos_controlados"] },
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
      { title: "Asigna o transfiere", text: "Desde la misma cama, con validación automática.", permission: "asignar_camas" },
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
      { title: "Registra uno nuevo", text: "Con guía por parámetro y avisos de rango en vivo.", permission: "crear_signos_vitales" },
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

  "adverse-events": {
    icon: "alert",
    eyebrow: "Eventos adversos",
    title: "Registro reglamentario serio",
    description: "Caídas, errores y lesiones con severidad, línea de tiempo y cierre.",
    steps: [
      { title: "Prioriza por severidad", text: "Leve, moderado, grave o crítico." },
      { title: "Cierra con conclusiones", text: "Documenta el resultado cuando el caso esté resuelto.", permission: "cerrar_eventos_adversos" },
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
      { title: "Revisa la línea de tiempo", text: "Responsables, acciones y cambios aparecen en orden cronológico." },
      { title: "Agrega acciones", text: "Cada una se firma y queda en la línea de tiempo.", permission: "editar_eventos_adversos" },
      { title: "Cierra con conclusiones", text: "Cuando el caso está resuelto.", permission: "cerrar_eventos_adversos" },
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
      { title: "Revisa el plan vigente", text: "Consulta responsables, procedimientos y recursos para cada emergencia." },
      { title: "Mantén el plan al día", text: "Actualiza aprobación, revisión, escenarios e inventario.", permission: "gestionar_emergencias" },
      { title: "Registra simulacros", text: "Fecha, participantes, resultado y acciones de mejora.", permission: "registrar_simulacros" },
    ],
    benefit: "Tu plan de emergencias queda listo para la fiscalización SEREMI.",
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
      { title: "Completa lo pendiente", text: "Cada punto explica en palabras simples qué respaldo falta.", anyPermissions: ["subir_acreditacion", "editar_acreditacion"] },
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

  "accreditation-requisito": {
    icon: "accreditation",
    eyebrow: "Requisito SEREMI",
    title: "Gestiona un requisito completo",
    description: "Evidencias versionadas, observaciones, auditoría y estados.",
    steps: [
      { title: "Revisa el requisito", text: "Consulta qué exige, el respaldo esperado y su historial." },
      { title: "Sube el documento", text: "PDF, imagen o Word; se versiona solo.", permission: "subir_acreditacion" },
      { title: "Cambia el estado", text: "Vigente, no aplica o pendiente, con justificación.", permission: "editar_acreditacion" },
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
      { title: "Cierra con respaldo", text: "Registra la subsanación y su responsable.", roles: ["admin_eleam"] },
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
    benefit: "Ante una fiscalización, presentas la carpeta en un orden claro y consistente.",
  },

  team: {
    icon: "team",
    eyebrow: "Equipo",
    title: "Equipo del establecimiento",
    description: "Registra personas con o sin acceso y mantén sus antecedentes DS 20.",
    steps: [
      { title: "Elige el tipo de registro", text: "Da acceso sólo a quien necesite iniciar sesión." },
      { title: "Configura el acceso", text: "Asigna únicamente las áreas y acciones necesarias." },
      { title: "Mantén sus antecedentes", text: "Actualiza función, competencias y capacitación." },
    ],
    benefit: "Cada persona ve solo lo suyo, con sus credenciales al día.",
    roleOverrides: {
      funcionario: {
        title: "Consulta el directorio del equipo",
        description: "Información, competencias y cursos registrados para cada persona.",
        steps: [
          { title: "Busca una persona", text: "Usa nombre, cargo o correo para abrir su ficha." },
          { title: "Revisa sus antecedentes", text: "Consulta función, competencias y capacitación registrada." },
        ],
        benefit: "Encuentras antecedentes del equipo sin ver controles de acceso o permisos.",
      },
    },
  },

  subscription: {
    roles: ["admin_eleam"],
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

function isAllowed(rule, auth) {
  if (!auth || typeof auth === "string") return true;
  if (rule.roles?.length && !rule.roles.includes(auth.rol)) return false;
  if (rule.permission && (typeof auth.can !== "function" || !auth.can(rule.permission))) return false;
  if (rule.anyPermissions?.length && (typeof auth.can !== "function" || !rule.anyPermissions.some((permission) => auth.can(permission)))) return false;
  return true;
}

function withoutAccessMetadata(value) {
  const visible = { ...value };
  delete visible.roles;
  delete visible.permission;
  delete visible.anyPermissions;
  return visible;
}

export function getCoach(featureId, authOrRole) {
  if (!hasCoach(featureId)) return null;
  const base = COACHES[featureId];
  if (!isAllowed(base, authOrRole)) return null;
  const rol = typeof authOrRole === "string" ? authOrRole : authOrRole?.rol;
  const override = rol ? base.roleOverrides?.[rol] : null;
  const merged = override ? { ...base, ...override } : { ...base };
  delete merged.roleOverrides;
  const steps = (merged.steps ?? [])
    .filter((step) => isAllowed(step, authOrRole))
    .map(withoutAccessMetadata);
  if (steps.length === 0) return null;
  return { ...withoutAccessMetadata(merged), steps };
}

export function listCoachIds() {
  return Object.keys(COACHES);
}
