export const ESTADO_CONFIG = {
  activo:        { label: "Activo",        badge: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  hospitalizado: { label: "Hospitalizado", badge: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-500"   },
  egresado:      { label: "Egresado",      badge: "bg-gray-100 text-gray-700 border-gray-200",          dot: "bg-gray-400"    },
  fallecido:     { label: "Fallecido",     badge: "bg-rose-100 text-rose-800 border-rose-200",          dot: "bg-rose-500"    },
};

export const ESTADO_BADGE = {
  activo:        "bg-emerald-100 text-emerald-800 border border-emerald-200",
  hospitalizado: "bg-amber-100 text-amber-800 border border-amber-200",
  egresado:      "bg-gray-100 text-gray-700 border border-gray-200",
  fallecido:     "bg-rose-100 text-rose-800 border border-rose-200",
};

export const DEPENDENCIA_TONE = {
  leve:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderado: "bg-amber-50 text-amber-700 border-amber-200",
  severo:   "bg-orange-50 text-orange-700 border-orange-200",
  total:    "bg-rose-50 text-rose-700 border-rose-200",
};

export const TIPO_LABEL = {
  observacion_general:         "General",
  caida:                       "Caída",
  incidente:                   "Incidente",
  curacion:                    "Curación",
  visita_medica:               "Visita médica",
  administracion_medicamento:  "Medicamento",
  cambio_posicion:             "Cambio posición",
  higiene:                     "Higiene",
  alimentacion:                "Alimentación",
  eliminacion:                 "Eliminación",
  actividad:                   "Actividad",
  otro:                        "Otro",
};

export const TIPO_BADGE = {
  caida:                      "bg-rose-100 text-rose-700",
  incidente:                  "bg-orange-100 text-orange-700",
  visita_medica:              "bg-blue-100 text-blue-700",
  curacion:                   "bg-purple-100 text-purple-700",
  administracion_medicamento: "bg-amber-100 text-amber-700",
  observacion_general:        "bg-gray-100 text-gray-700",
};

export function initials(nombre = "", apellido = "") {
  return ((nombre[0] || "") + (apellido[0] || "")).toUpperCase() || "?";
}

export function calcAge(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const fn = new Date(fechaNacimiento);
  if (isNaN(fn)) return null;
  const today = new Date();
  let age = today.getFullYear() - fn.getFullYear();
  const m = today.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < fn.getDate())) age--;
  return age;
}
