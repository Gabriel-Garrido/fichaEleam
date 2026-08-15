import { todayIso } from "../../utils/dateUtils";

export const HEALTH_CONTROL_TYPES = [
  ["control", "Control de salud"],
  ["derivacion", "Derivación"],
  ["urgencia", "Atención de urgencia"],
  ["teleconsulta", "Teleconsulta"],
  ["otro", "Otra atención de salud"],
];

export const HEALTH_CONTROL_STATES = [
  ["realizado", "Atención realizada"],
  ["programado", "Pendiente o programada"],
  ["cancelado", "Cancelada"],
  ["inasistente", "No asistió"],
];

export const HEALTH_CONTROL_TYPE_HELP = {
  control: "Control preventivo, de seguimiento o de una condición de salud.",
  derivacion: "Atención solicitada a otro centro o especialidad.",
  urgencia: "Atención no programada por una situación aguda.",
  teleconsulta: "Atención realizada a distancia por un profesional de salud.",
  otro: "Otra atención de salud que no corresponde a las opciones anteriores.",
};

export function initialHealthControlForm() {
  return {
    tipo: "control",
    estado: "realizado",
    fecha_programada: todayIso(),
    centro_atencion: "",
    especialidad: "",
    profesional: "",
    acompanante: "",
    motivo: "",
    resultado: "",
    proximo_control: "",
    familia_informada: false,
    coordinacion_familia: "",
  };
}

export function healthControlCopy(form) {
  if (form.estado === "cancelado") {
    return {
      dateLabel: "Fecha programada",
      reasonLabel: "Motivo de cancelación",
      reasonPlaceholder: "Indica brevemente por qué se canceló y si debe reagendarse.",
    };
  }
  if (form.estado === "inasistente") {
    return {
      dateLabel: "Fecha programada",
      reasonLabel: "Observación de inasistencia",
      reasonPlaceholder: "Indica el motivo conocido y la gestión realizada para reprogramar.",
    };
  }
  if (form.estado === "programado") {
    return {
      dateLabel: "Fecha programada",
      reasonLabel: "Motivo de la atención",
      reasonPlaceholder: "Indica qué control, evaluación o atención necesita el residente.",
    };
  }
  return {
    dateLabel: "Fecha de atención",
    reasonLabel: "Motivo de la atención",
    reasonPlaceholder: "Indica por qué se realizó el control, derivación o atención.",
  };
}

export function validateHealthControlForm(form) {
  const errors = {};
  const clean = {
    ...form,
    centro_atencion: form.centro_atencion?.trim() || "",
    especialidad: form.especialidad?.trim() || "",
    profesional: form.profesional?.trim() || "",
    acompanante: form.acompanante?.trim() || "",
    motivo: form.motivo?.trim() || "",
    resultado: form.resultado?.trim() || "",
    coordinacion_familia: form.coordinacion_familia?.trim() || "",
  };

  if (!clean.fecha_programada) errors.fecha_programada = "Indica la fecha de la atención.";
  if (!clean.centro_atencion) errors.centro_atencion = "Indica el centro o lugar de atención.";
  if (!clean.motivo) errors.motivo = "Indica el motivo de la atención.";
  if (clean.estado === "realizado" && !clean.resultado) {
    errors.resultado = "Registra las observaciones e indicaciones recibidas.";
  }
  if (clean.proximo_control && clean.fecha_programada && clean.proximo_control < clean.fecha_programada) {
    errors.proximo_control = "El próximo control no puede ser anterior a esta atención.";
  }
  if (clean.familia_informada && !clean.coordinacion_familia) {
    errors.coordinacion_familia = "Indica con quién se coordinó y qué se acordó.";
  }

  return { ok: Object.keys(errors).length === 0, errors, data: clean };
}
