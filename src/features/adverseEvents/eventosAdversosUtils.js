// Catálogos, labels y tones compartidos del módulo de eventos adversos.

export const CATEGORIAS = [
  "caida_con_lesion",
  "caida_sin_lesion",
  "error_medicacion",
  "broncoaspiracion",
  "lesion_por_presion",
  "fuga",
  "agresion",
  "agitacion_severa",
  "infeccion",
  "accidente_via_publica",
  "reaccion_alergica",
  "autolesion",
  "otro",
];

export const CATEGORIA_LABEL = {
  caida_con_lesion:     "Caída con lesión",
  caida_sin_lesion:     "Caída sin lesión",
  error_medicacion:     "Error de medicación",
  broncoaspiracion:     "Broncoaspiración",
  lesion_por_presion:   "Lesión por presión",
  fuga:                 "Fuga / extravío",
  agresion:             "Agresión física o verbal",
  agitacion_severa:     "Agitación severa",
  infeccion:            "Infección",
  accidente_via_publica:"Accidente en vía pública",
  reaccion_alergica:    "Reacción alérgica",
  autolesion:           "Autolesión",
  otro:                 "Otro",
};

export const SEVERIDADES = ["leve", "moderado", "grave", "critico"];

export const SEVERIDAD_LABEL = {
  leve:     "Leve",
  moderado: "Moderado",
  grave:    "Grave",
  critico:  "Crítico",
};

// Tonos consistentes con vitalRanges (emerald/amber/rose) + rojo más fuerte para crítico.
export const SEVERIDAD_TONE = {
  leve:     { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", chip: "bg-emerald-100 text-emerald-700" },
  moderado: { dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-800 border-amber-200",       chip: "bg-amber-100 text-amber-800" },
  grave:    { dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200",          chip: "bg-rose-100 text-rose-700" },
  critico:  { dot: "bg-rose-700",    badge: "bg-rose-100 text-rose-800 border-rose-400 ring-1 ring-rose-300", chip: "bg-rose-200 text-rose-900" },
};

export const ESTADOS = ["registrado", "en_revision", "en_seguimiento", "cerrado", "cancelado"];

export const ESTADO_LABEL = {
  registrado:     "Registrado",
  en_revision:    "En revisión",
  en_seguimiento: "En seguimiento",
  cerrado:        "Cerrado",
  cancelado:      "Cancelado",
};

export const ESTADO_TONE = {
  registrado:     "bg-sky-100 text-sky-800",
  en_revision:    "bg-amber-100 text-amber-800",
  en_seguimiento: "bg-violet-100 text-violet-800",
  cerrado:        "bg-emerald-100 text-emerald-800",
  cancelado:      "bg-slate-100 text-slate-500",
};

export const ACCION_TIPOS = [
  "nota",
  "accion",
  "reevaluacion",
  "contacto_familia",
  "contacto_medico",
  "derivacion",
  "cierre",
  "reabertura",
];

export const ACCION_TIPO_LABEL = {
  nota:             "Nota",
  accion:           "Acción ejecutada",
  reevaluacion:     "Reevaluación",
  contacto_familia: "Contacto con familia",
  contacto_medico:  "Contacto médico",
  derivacion:       "Derivación / traslado",
  cierre:           "Cierre",
  reabertura:       "Reapertura",
};

export const ACCION_TIPO_DOT = {
  nota:             "bg-slate-400",
  accion:           "bg-teal-600",
  reevaluacion:     "bg-amber-500",
  contacto_familia: "bg-sky-500",
  contacto_medico:  "bg-violet-500",
  derivacion:       "bg-rose-500",
  cierre:           "bg-emerald-600",
  reabertura:       "bg-amber-600",
};

export const MEDIOS_NOTIFICACION_FAMILIA = ["presencial", "telefono", "whatsapp", "email", "otro"];

export const MEDIO_NOTIFICACION_LABEL = {
  presencial: "Presencial",
  telefono:   "Teléfono",
  whatsapp:   "WhatsApp",
  email:      "Correo electrónico",
  otro:       "Otro",
};

export const TURNOS = ["mañana", "tarde", "noche"];

// Indica si una observación canónica debe sugerir crear un evento adverso vinculado.
export function shouldSuggestAdverseEventForObservation(observationTipo) {
  return observationTipo === "caida" || observationTipo === "incidente";
}

// Devuelve el tono de la severidad o un fallback seguro.
export function severityTone(severidad) {
  return SEVERIDAD_TONE[severidad] ?? SEVERIDAD_TONE.leve;
}

// Heurística para sugerir severidad inicial cuando el evento se origina desde
// una observación. Defaults conservadores: caída_con_lesion → moderado, resto → leve.
export function suggestSeverityFromCategory(categoria) {
  if (categoria === "caida_con_lesion" || categoria === "broncoaspiracion") return "moderado";
  if (categoria === "fuga" || categoria === "agresion" || categoria === "autolesion") return "grave";
  return "leve";
}

// Devuelve true si el evento está abierto (cualquier estado != cerrado/cancelado).
export function isOpenEvent(evento) {
  if (!evento) return false;
  return evento.estado !== "cerrado" && evento.estado !== "cancelado";
}

// Formatea fecha+hora del evento como dd/MM/yyyy (sin depender de Intl, que
// difiere entre Node y browser para es-CL).
export function formatEventDateTime(fechaIso, horaIso) {
  if (!fechaIso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fechaIso));
  const fechaParte = m ? `${m[3]}/${m[2]}/${m[1]}` : String(fechaIso);
  if (!horaIso) return fechaParte;
  const horaParte = String(horaIso).slice(0, 5);
  return `${fechaParte} ${horaParte}`;
}
