export const CRM_FUNNEL_STAGES = [
  "nuevo",
  "investigacion",
  "contactar",
  "contactado",
  "calificado",
  "demo_agendada",
  "demo_realizada",
  "prueba_activa",
  "propuesta_enviada",
  "negociacion",
  "ganado",
  "perdido",
  "no_contactar",
];

export const CRM_STAGE_META = {
  nuevo: {
    label: "Nuevo",
    tone: "bg-slate-100 text-slate-700",
    objective: "Ordenar el dato mínimo y decidir si vale la pena investigar.",
    signals: "Tiene nombre, comuna o canal de contacto confiable.",
    questions: "¿Cuántos residentes atienden? ¿Quién administra o decide tecnología?",
    avoid: "Llamar sin contexto o sin hipótesis de dolor.",
    nextAction: "Investigar redes, tamaño y señales de digitalización.",
  },
  investigacion: {
    label: "Investigación",
    tone: "bg-indigo-100 text-indigo-800",
    objective: "Entender el tipo de operación antes del primer contacto.",
    signals: "Hay tamaño estimado, canal preferido, decisor probable y dolor inicial.",
    questions: "¿Usan papel, planillas, WhatsApp o software? ¿Qué publican sobre cuidados o acreditación?",
    avoid: "Mandar un correo genérico sin usar el contexto encontrado.",
    nextAction: "Preparar una apertura específica y pasar a contactar.",
  },
  contactar: {
    label: "Contactar",
    tone: "bg-sky-100 text-sky-800",
    objective: "Lograr conversación con dirección, administración o encargado clínico.",
    signals: "Contesta, deriva al decisor o pide información.",
    questions: "¿Con quién debería revisar una mejora para registros, turnos y carpeta SEREMI?",
    avoid: "Vender módulos antes de confirmar prioridad y autoridad.",
    nextAction: "Registrar resultado y dejar próxima acción con fecha.",
  },
  contactado: {
    label: "Contactado",
    tone: "bg-cyan-100 text-cyan-800",
    objective: "Abrir dolor y validar si hay oportunidad real.",
    signals: "Comparte proceso actual, dolor, software o resistencia del equipo.",
    questions: "¿Qué les quita más tiempo hoy? ¿Qué pasa cuando hay fiscalización o cambio de turno?",
    avoid: "Aceptar un 'mándame información' sin acordar seguimiento.",
    nextAction: "Calificar fit, urgencia, tamaño y decisor.",
  },
  calificado: {
    label: "Calificado",
    tone: "bg-teal-100 text-teal-800",
    objective: "Confirmar necesidad, timing, autoridad y valor económico.",
    signals: "Tiene dolor claro, decisor identificado y apertura a demo.",
    questions: "Si esto se resolviera este mes, ¿qué impacto tendría para el equipo?",
    avoid: "Agendar demo con quien no puede decidir ni influir.",
    nextAction: "Agendar demo con caso de uso específico.",
  },
  demo_agendada: {
    label: "Demo agendada",
    tone: "bg-violet-100 text-violet-800",
    objective: "Asegurar asistencia y adaptar la demo al dolor principal.",
    signals: "Fecha confirmada, asistentes y problema principal documentados.",
    questions: "¿Qué pantalla o flujo sería más valioso mostrar primero?",
    avoid: "Hacer demo estándar sin conectar con su operación actual.",
    nextAction: "Enviar agenda corta y preparar prueba si corresponde.",
  },
  demo_realizada: {
    label: "Demo realizada",
    tone: "bg-purple-100 text-purple-800",
    objective: "Convertir interés en prueba, propuesta o decisión de compra.",
    signals: "Pidieron precio, usuarios, implementación o compararon con su sistema actual.",
    questions: "¿Qué tendría que pasar para que esto sea una buena decisión?",
    avoid: "Terminar la demo sin próximo paso calendarizado.",
    nextAction: "Enviar propuesta o habilitar prueba guiada.",
  },
  prueba_activa: {
    label: "Prueba activa",
    tone: "bg-emerald-100 text-emerald-800",
    objective: "Que el prospecto vea valor real con datos y flujo operativo.",
    signals: "Ingresan residentes, tareas, documentos o medicamentos.",
    questions: "¿Qué parte le ahorró más tiempo al equipo esta semana?",
    avoid: "Dejar la prueba sin onboarding ni checkpoint.",
    nextAction: "Medir uso y pedir decisión con evidencia.",
  },
  propuesta_enviada: {
    label: "Propuesta enviada",
    tone: "bg-amber-100 text-amber-900",
    objective: "Resolver dudas de valor, precio, implementación y riesgo.",
    signals: "Revisan contrato, plan, fechas o condiciones.",
    questions: "¿Hay algún punto que impida partir esta semana?",
    avoid: "Esperar pasivamente sin fecha de revisión.",
    nextAction: "Agendar cierre o negociación.",
  },
  negociacion: {
    label: "Negociación",
    tone: "bg-orange-100 text-orange-900",
    objective: "Cerrar condiciones sin bajar valor percibido.",
    signals: "Discuten plan, usuarios, fecha de pago o migración.",
    questions: "¿Qué condición concreta necesitamos cerrar para avanzar?",
    avoid: "Dar descuentos sin compromiso de fecha o volumen.",
    nextAction: "Enviar cierre confirmado y activar onboarding.",
  },
  ganado: {
    label: "Ganado",
    tone: "bg-green-100 text-green-800",
    objective: "Traspasar a activación, pago y onboarding sin fricción.",
    signals: "Pago o acuerdo confirmado.",
    questions: "¿Quién será responsable del primer set de datos?",
    avoid: "Cerrar venta y dejar implementación sin dueño.",
    nextAction: "Crear ELEAM, cuenta admin y plan de implementación.",
  },
  perdido: {
    label: "Perdido",
    tone: "bg-rose-100 text-rose-800",
    objective: "Documentar motivo real y aprender para futuras campañas.",
    signals: "Rechazo explícito, timing imposible o competidor elegido.",
    questions: "¿Qué tendría que cambiar para volver a conversar?",
    avoid: "Marcar perdido sin motivo accionable.",
    nextAction: "Registrar motivo y fecha futura si corresponde.",
  },
  no_contactar: {
    label: "No contactar",
    tone: "bg-slate-200 text-slate-600",
    objective: "Respetar baja, mala calidad de dato o solicitud expresa.",
    signals: "Pidió baja, rebote persistente o contacto incorrecto.",
    questions: "No aplicar.",
    avoid: "Reactivar sin permiso o sin nuevo dato legítimo.",
    nextAction: "Excluir de campañas.",
  },
};

export const DIGITALIZATION_OPTIONS = [
  ["desconocido", "Desconocido"],
  ["papel_excel_whatsapp", "Papel, Excel o WhatsApp"],
  ["software_generico", "Software genérico"],
  ["software_eleam", "Software ELEAM actual"],
  ["mixto", "Mixto"],
];

export const ORIGIN_OPTIONS = [
  ["outbound", "Outbound"],
  ["landing", "Landing"],
  ["whatsapp", "WhatsApp"],
  ["referido", "Referido"],
  ["manual", "Manual"],
  ["campana", "Campaña"],
  ["import_excel", "Import Excel"],
  ["otro", "Otro"],
];

export const CHANNEL_OPTIONS = [
  ["desconocido", "Desconocido"],
  ["telefono", "Teléfono"],
  ["email", "Email"],
  ["whatsapp", "WhatsApp"],
  ["redes", "Redes sociales"],
  ["presencial", "Presencial"],
];

export const URGENCY_OPTIONS = [
  ["desconocida", "Desconocida"],
  ["baja", "Baja"],
  ["media", "Media"],
  ["alta", "Alta"],
];

export const CAMPAIGN_VARIABLES = [
  "eleam_nombre",
  "comuna",
  "telefono",
  "email",
  "origen",
  "canal_preferido",
  "digitalizacion_estado",
  "software_actual",
  "dolor_principal",
  "decision_maker_nombre",
  "decision_maker_cargo",
  "cargo_contacto",
  "num_residentes",
  "urgencia",
  "fit_score",
  "proxima_accion_fecha",
  "competidor",
];

const VARIABLE_SET = new Set(CAMPAIGN_VARIABLES);
const VARIABLE_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const DEFAULT_EMAIL_TEMPLATE =
  "Hola equipo de {{eleam_nombre}},\n\n" +
  "Les escribo porque muchos ELEAM siguen gestionando registros, turnos, medicamentos y carpeta SEREMI entre papel, planillas y WhatsApp. Eso consume horas del equipo y vuelve pesada cada fiscalización.\n\n" +
  "FichaEleam reúne esos procesos en un sistema simple para residencias de adultos mayores. Si hoy están en {{digitalizacion_estado}}, podemos mostrarles cómo ordenar el trabajo sin frenar la operación.\n\n" +
  "¿Tiene sentido coordinar una demo corta esta semana?";

export const DEFAULT_CALL_SCRIPT =
  "Buenos días, ¿hablo con la persona que ve administración o dirección técnica en {{eleam_nombre}}?\n\n" +
  "Soy Gabriel de FichaEleam. Ayudamos a ELEAM a ordenar registros clínicos, turnos, medicamentos y carpeta SEREMI en un solo sistema.\n\n" +
  "Pregunta inicial: ¿hoy trabajan más con papel/Excel/WhatsApp, o ya tienen algún software?\n\n" +
  "Si no están digitalizados: enfocar en ahorro de tiempo, continuidad de turnos y fiscalización.\n" +
  "Si ya tienen sistema: preguntar qué les falta, qué módulos no calzan con ELEAM y cómo es el soporte.\n\n" +
  "Cierre: Si le muestro en 20 minutos cómo se vería con su operación, ¿qué día le acomoda?";

export const DEFAULT_RRSS_TEMPLATE =
  "Hola, soy Gabriel de FichaEleam. Vi a {{eleam_nombre}} y quería compartirles una plataforma chilena para ordenar cuidados, medicamentos, documentos SEREMI y comunicación con familias en ELEAM. ¿Con quién puedo coordinar una demo corta?";

export const OBJECTION_LIBRARY = [
  {
    objection: "Es caro",
    response: "Vuelve al costo de no ordenar: horas administrativas, riesgo en fiscalización y dependencia de personas específicas. Luego compara contra el plan que calza con su tamaño.",
  },
  {
    objection: "Ya usamos planillas",
    response: "Valida que las planillas funcionan para empezar, pero muestra el límite: trazabilidad, vencimientos, doble registro, continuidad de turno y acceso seguro.",
  },
  {
    objection: "Ya tenemos sistema",
    response: "No compitas en abstracto. Pregunta qué no usan, qué falta para ELEAM, cómo es el soporte y cuánto demora adaptar un flujo clínico real.",
  },
  {
    objection: "El equipo se resiste",
    response: "Enfoca la demo en simplicidad: menos escritura repetida, tareas claras por turno y adopción gradual por módulos.",
  },
  {
    objection: "No tenemos tiempo",
    response: "Propón una demo de 20 minutos con un solo caso de uso crítico y un plan de implementación por etapas.",
  },
  {
    objection: "Privacidad",
    response: "Explica control de accesos por rol, trazabilidad y que la información sensible queda ordenada con permisos, no dispersa en canales informales.",
  },
  {
    objection: "Fiscalización",
    response: "Conecta con carpeta SEREMI, vencimientos, documentos vigentes y reportes claros. Evita prometer aprobación automática.",
  },
  {
    objection: "Implementación",
    response: "Divide el arranque: residentes base, usuarios clave, documentos críticos y primer módulo operativo. Cierra con fecha de primer hito.",
  },
];

export function stageLabel(value) {
  return CRM_STAGE_META[value]?.label ?? value;
}

export function stageTone(value) {
  return CRM_STAGE_META[value]?.tone ?? CRM_STAGE_META.nuevo.tone;
}

export function optionLabel(options, value) {
  return options.find(([key]) => key === value)?.[1] ?? value ?? "";
}

export function digitalizationLabel(value) {
  return optionLabel(DIGITALIZATION_OPTIONS, value || "desconocido");
}

export function getTemplateVariableNames(template = "") {
  const names = new Set();
  String(template).replace(VARIABLE_RE, (_, name) => {
    names.add(name);
    return "";
  });
  return Array.from(names);
}

export function findUnknownTemplateVariables(...templates) {
  return Array.from(new Set(
    templates
      .flatMap((template) => getTemplateVariableNames(template))
      .filter((name) => !VARIABLE_SET.has(name)),
  ));
}

export function templateVariableHelp() {
  return CAMPAIGN_VARIABLES.map((name) => `{{${name}}}`).join(", ");
}

export function buildTemplateContext(prospect = {}) {
  return {
    eleam_nombre: prospect.eleam_nombre || "tu ELEAM",
    comuna: prospect.comuna || "tu comuna",
    telefono: prospect.telefono || "",
    email: prospect.email || "",
    origen: optionLabel(ORIGIN_OPTIONS, prospect.origen || "outbound"),
    canal_preferido: optionLabel(CHANNEL_OPTIONS, prospect.canal_preferido || "desconocido"),
    digitalizacion_estado: digitalizationLabel(prospect.digitalizacion_estado || "desconocido"),
    software_actual: prospect.software_actual || "sin software identificado",
    dolor_principal: prospect.dolor_principal || "ordenar la operación y ahorrar tiempo",
    decision_maker_nombre: prospect.decision_maker_nombre || "dirección",
    decision_maker_cargo: prospect.decision_maker_cargo || "decisor",
    cargo_contacto: prospect.cargo_contacto || "",
    num_residentes: prospect.num_residentes || "",
    urgencia: optionLabel(URGENCY_OPTIONS, prospect.urgencia || "desconocida"),
    fit_score: prospect.fit_score ?? "",
    proxima_accion_fecha: prospect.proxima_accion_fecha || "",
    competidor: prospect.competidor || prospect.software_actual || "",
  };
}

export function renderTemplate(template, prospect = {}, fallback = "") {
  const source = String(template || fallback || "");
  const context = buildTemplateContext(prospect);
  return source.replace(VARIABLE_RE, (_, name) => {
    if (!VARIABLE_SET.has(name)) return "";
    return String(context[name] ?? "");
  });
}

export function stageGuideText(stage) {
  const meta = CRM_STAGE_META[stage] ?? CRM_STAGE_META.nuevo;
  return [
    `Objetivo: ${meta.objective}`,
    `Señales de avance: ${meta.signals}`,
    `Preguntas: ${meta.questions}`,
    `Evitar: ${meta.avoid}`,
    `Próxima mejor acción: ${meta.nextAction}`,
  ].join("\n");
}
