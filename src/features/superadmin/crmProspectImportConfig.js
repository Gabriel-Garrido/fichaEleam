import { normalizeUrl, validateEmail, validatePhone, validateUrl } from "../../utils/validators";
import {
  CHANNEL_OPTIONS,
  DIGITALIZATION_OPTIONS,
  ORIGIN_OPTIONS,
  URGENCY_OPTIONS,
} from "./crm/crmSalesPlaybook";

// Columnas EXACTAS solicitadas por el equipo comercial. No cambiar headers
// sin coordinar — la planilla ya distribuida los usa así.
export const crmProspectImportConfig = {
  kind: "crm_prospects",
  title: "Cargar prospectos comerciales desde Excel",
  sheetName: "Prospectos",
  templateFilename: "planilla_prospectos_fichaeleam.xlsx",
  primaryAction: "Importar prospectos",
  emptyLabel: "prospectos",
  instructions: [
    "Descarga la planilla y completa una fila por ELEAM prospectado.",
    "El único campo obligatorio es \"Nombre del ELEAM\". El resto es opcional, pero sin correo la fila no podrá recibir campañas.",
    "Los enlaces de Facebook, Instagram y TikTok pueden ir sin protocolo (ej: facebook.com/MiPagina).",
    "No agregues copy personalizado por prospecto: cada campaña usa una plantilla maestra con variables como {{eleam_nombre}}, {{comuna}} y {{dolor_principal}}.",
    "Usa los campos comerciales para orientar la venta: estado digital, software actual, decisor, dolor, residentes y próxima acción.",
    "El sistema detectará duplicados de correo (case-insensitive) y omitirá los que ya existan en la base.",
  ],
  columns: [
    { key: "eleam_nombre", header: "Nombre del ELEAM *", aliases: ["nombre eleam", "eleam"], required: true, width: 32 },
    { key: "comuna", header: "Comuna", width: 18 },
    { key: "telefono", header: "Teléfono", aliases: ["telefono"], width: 18, note: "Acepta formato chileno: +56 9 1234 5678" },
    { key: "email", header: "Correo electrónico de contacto", aliases: ["correo", "email"], width: 32 },
    { key: "origen", header: "Origen", aliases: ["fuente"], width: 18, validationList: ORIGIN_OPTIONS.map(([value]) => value), note: "outbound, landing, whatsapp, referido, manual, campana, import_excel, otro" },
    { key: "canal_preferido", header: "Canal preferido", aliases: ["canal"], width: 20, validationList: CHANNEL_OPTIONS.map(([value]) => value), note: "telefono, email, whatsapp, redes, presencial, desconocido" },
    { key: "cargo_contacto", header: "Cargo contacto", aliases: ["cargo"], width: 24 },
    { key: "decision_maker_nombre", header: "Nombre decisor", aliases: ["decisor"], width: 28 },
    { key: "decision_maker_cargo", header: "Cargo decisor", aliases: ["cargo decisor"], width: 24 },
    { key: "num_residentes", header: "N° residentes", aliases: ["residentes", "num residentes"], width: 16 },
    { key: "digitalizacion_estado", header: "Estado digital", aliases: ["digitalizacion", "digitalización"], width: 28, validationList: DIGITALIZATION_OPTIONS.map(([value]) => value), note: "desconocido, papel_excel_whatsapp, software_generico, software_eleam, mixto" },
    { key: "software_actual", header: "Software actual", aliases: ["sistema actual", "competidor"], width: 28 },
    { key: "dolor_principal", header: "Dolor principal", aliases: ["dolor", "pain"], width: 42 },
    { key: "urgencia", header: "Urgencia", width: 16, validationList: URGENCY_OPTIONS.map(([value]) => value), note: "baja, media, alta, desconocida" },
    { key: "fit_score", header: "Fit score 0-100", aliases: ["fit"], width: 16 },
    { key: "proxima_accion_fecha", header: "Próxima acción fecha", aliases: ["proxima accion", "próxima acción"], width: 20, type: "date" },
    { key: "facebook_url", header: "link facebook", aliases: ["facebook", "link facebook"], width: 28 },
    { key: "instagram_url", header: "link instagram", aliases: ["instagram", "link instagram"], width: 28 },
    { key: "tiktok_url", header: "link tiktok", aliases: ["tiktok", "link tiktok"], width: 28 },
    { key: "notas", header: "Notas internas", aliases: ["notas"], width: 46 },
  ],
  sampleRows: [
    {
      eleam_nombre: "ELEAM Vista Hermosa Spa",
      comuna: "Las Condes",
      telefono: "+56 9 1234 5678",
      email: "contacto@vistahermosa.cl",
      origen: "outbound",
      canal_preferido: "telefono",
      cargo_contacto: "Administración",
      decision_maker_nombre: "María Pérez",
      decision_maker_cargo: "Directora técnica",
      num_residentes: "32",
      digitalizacion_estado: "papel_excel_whatsapp",
      software_actual: "",
      dolor_principal: "Carpeta SEREMI y continuidad de turnos repartida entre papel y WhatsApp",
      urgencia: "alta",
      fit_score: "82",
      proxima_accion_fecha: "2026-06-03",
      facebook_url: "facebook.com/ELEAMVistaHermosa",
      instagram_url: "instagram.com/eleam.vistahermosa",
      tiktok_url: "",
      notas: "Mencionar ahorro de tiempo y orden documental. Preguntar si tienen fiscalización cercana.",
    },
  ],
};

const FIELD_LIMITS = {
  eleam_nombre: 200,
  comuna: 100,
  telefono: 30,
  email: 254,
  origen: 32,
  canal_preferido: 32,
  cargo_contacto: 120,
  decision_maker_nombre: 160,
  decision_maker_cargo: 120,
  digitalizacion_estado: 40,
  software_actual: 160,
  dolor_principal: 500,
  urgencia: 20,
  proxima_accion_fecha: 10,
  facebook_url: 500,
  instagram_url: 500,
  tiktok_url: 500,
  notas: 3000,
};

const OPTION_ALIASES = {
  origen: {
    outbound: "outbound",
    landing: "landing",
    whatsapp: "whatsapp",
    wa: "whatsapp",
    referido: "referido",
    manual: "manual",
    campaña: "campana",
    campana: "campana",
    excel: "import_excel",
    import_excel: "import_excel",
    otro: "otro",
  },
  canal_preferido: {
    teléfono: "telefono",
    telefono: "telefono",
    phone: "telefono",
    email: "email",
    correo: "email",
    whatsapp: "whatsapp",
    redes: "redes",
    rrss: "redes",
    presencial: "presencial",
    desconocido: "desconocido",
  },
  digitalizacion_estado: {
    desconocido: "desconocido",
    papel: "papel_excel_whatsapp",
    excel: "papel_excel_whatsapp",
    whatsapp: "papel_excel_whatsapp",
    "papel excel whatsapp": "papel_excel_whatsapp",
    papel_excel_whatsapp: "papel_excel_whatsapp",
    software_generico: "software_generico",
    "software generico": "software_generico",
    "software genérico": "software_generico",
    software_eleam: "software_eleam",
    "software eleam": "software_eleam",
    mixto: "mixto",
  },
  urgencia: {
    baja: "baja",
    media: "media",
    alta: "alta",
    desconocida: "desconocida",
    desconocido: "desconocida",
  },
};

const OPTION_VALUES = {
  origen: new Set(ORIGIN_OPTIONS.map(([value]) => value)),
  canal_preferido: new Set(CHANNEL_OPTIONS.map(([value]) => value)),
  digitalizacion_estado: new Set(DIGITALIZATION_OPTIONS.map(([value]) => value)),
  urgencia: new Set(URGENCY_OPTIONS.map(([value]) => value)),
};

function clean(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function isNotFound(value) {
  return clean(value).toLowerCase() === "no encontrado";
}

function cleanOptional(value) {
  return isNotFound(value) ? "" : clean(value);
}

function isBlank(value) {
  return clean(value) === "" || isNotFound(value);
}

function rowHasPayload(row) {
  return Object.values(row.raw).some((value) => !isBlank(value));
}

function clipLength(text, max) {
  if (!text) return text;
  if (text.length <= max) return text;
  return text.slice(0, max);
}

function normalizeOption(value, field, fallback, label, errors) {
  if (isBlank(value)) return fallback;
  const cleaned = cleanOptional(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normalized = OPTION_ALIASES[field]?.[cleaned] ?? cleaned.replace(/\s+/g, "_");
  if (!OPTION_VALUES[field]?.has(normalized)) {
    errors.push(`${label} no es válido.`);
    return fallback;
  }
  return normalized;
}

function normalizeInteger(value, label, { min = null, max = null } = {}, errors) {
  if (isBlank(value)) return null;
  const cleaned = cleanOptional(value).replace(/\./g, "").replace(/,/g, ".");
  const parsed = Number(cleaned);
  if (!Number.isInteger(parsed)) {
    errors.push(`${label} debe ser un número entero.`);
    return null;
  }
  if (min != null && parsed < min) errors.push(`${label} debe ser mayor o igual a ${min}.`);
  if (max != null && parsed > max) errors.push(`${label} debe ser menor o igual a ${max}.`);
  return parsed;
}

function normalizeDate(value, label, errors) {
  if (isBlank(value)) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      errors.push(`${label} debe ser una fecha válida.`);
      return null;
    }
    return value.toISOString().slice(0, 10);
  }

  const text = cleanOptional(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    errors.push(`${label} debe tener formato AAAA-MM-DD.`);
    return null;
  }
  return text;
}

function normalizeUrlField(value, label, errors) {
  if (isBlank(value) || isNotFound(value)) return null;
  const text = cleanOptional(value);
  if (!validateUrl(text)) {
    errors.push(`${label} no parece una URL válida (ej: facebook.com/MiPagina).`);
    return null;
  }
  return clipLength(normalizeUrl(text), 500);
}

/**
 * Normaliza filas leídas desde Excel a payloads listos para insertar.
 * - Detecta duplicados dentro del archivo (por email lowercase).
 * - Comprueba contra `existingProspects` (lista actual del ELEAM) si se
 *   pasa, para marcar duplicado contra la base.
 * - Aplica validateEmail/validatePhone/validateUrl y normaliza URLs.
 *
 * Retorna un array de filas con shape:
 *   { rowNumber, label, payload | null, errors[] }
 * Compatible con ExcelImportModal y con bulkInsertProspects.
 */
export function normalizeProspectRows(rows, { existingProspects = [] } = {}) {
  const existingEmails = new Set(
    existingProspects
      .map((p) => (p.email ?? "").toLowerCase())
      .filter(Boolean),
  );
  const fileEmails = new Set();

  return rows.filter(rowHasPayload).map((row) => {
    const r = row.raw;
    const errors = [];

    const eleamNombre = clean(r.eleam_nombre);
    if (!eleamNombre) errors.push("\"Nombre del ELEAM\" es obligatorio.");
    else if (eleamNombre.length > FIELD_LIMITS.eleam_nombre) {
      errors.push(`"Nombre del ELEAM" no puede superar ${FIELD_LIMITS.eleam_nombre} caracteres.`);
    }

    const comuna = clipLength(cleanOptional(r.comuna), FIELD_LIMITS.comuna) || null;

    let telefono = clipLength(cleanOptional(r.telefono), FIELD_LIMITS.telefono);
    if (telefono && !validatePhone(telefono)) {
      errors.push("Teléfono no parece un número chileno válido (mínimo 8 dígitos).");
    }
    if (!telefono) telefono = null;

    let email = cleanOptional(r.email).toLowerCase();
    if (email) {
      if (email.length > FIELD_LIMITS.email) {
        errors.push(`Correo no puede superar ${FIELD_LIMITS.email} caracteres.`);
      } else if (!validateEmail(email)) {
        errors.push("Correo electrónico inválido.");
      } else if (existingEmails.has(email)) {
        errors.push("Este correo ya existe en la base de prospectos.");
      } else if (fileEmails.has(email)) {
        errors.push("Correo duplicado dentro de la planilla.");
      } else {
        fileEmails.add(email);
      }
    } else {
      email = null;
    }

    const facebook = normalizeUrlField(r.facebook_url, "link facebook", errors);
    const instagram = normalizeUrlField(r.instagram_url, "link instagram", errors);
    const tiktok = normalizeUrlField(r.tiktok_url, "link tiktok", errors);

    const origen = normalizeOption(r.origen, "origen", "import_excel", "Origen", errors);
    const canalPreferido = normalizeOption(r.canal_preferido, "canal_preferido", "desconocido", "Canal preferido", errors);
    const cargoContacto = clipLength(cleanOptional(r.cargo_contacto), FIELD_LIMITS.cargo_contacto) || null;
    const decisionMakerNombre = clipLength(cleanOptional(r.decision_maker_nombre), FIELD_LIMITS.decision_maker_nombre) || null;
    const decisionMakerCargo = clipLength(cleanOptional(r.decision_maker_cargo), FIELD_LIMITS.decision_maker_cargo) || null;
    const numResidentes = normalizeInteger(r.num_residentes, "N° residentes", { min: 1, max: 10000 }, errors);
    const digitalizacionEstado = normalizeOption(r.digitalizacion_estado, "digitalizacion_estado", "desconocido", "Estado digital", errors);
    const softwareActual = clipLength(cleanOptional(r.software_actual), FIELD_LIMITS.software_actual) || null;
    const dolorPrincipal = clipLength(cleanOptional(r.dolor_principal), FIELD_LIMITS.dolor_principal) || null;
    const urgencia = normalizeOption(r.urgencia, "urgencia", "desconocida", "Urgencia", errors);
    const fitScore = normalizeInteger(r.fit_score, "Fit score", { min: 0, max: 100 }, errors);
    const proximaAccionFecha = normalizeDate(r.proxima_accion_fecha, "Próxima acción fecha", errors);
    const notas = clipLength(cleanOptional(r.notas), FIELD_LIMITS.notas) || null;

    const payload = errors.length ? null : {
      eleam_nombre: eleamNombre,
      comuna,
      telefono,
      email,
      origen,
      canal_preferido: canalPreferido,
      cargo_contacto: cargoContacto,
      decision_maker_nombre: decisionMakerNombre,
      decision_maker_cargo: decisionMakerCargo,
      num_residentes: numResidentes,
      digitalizacion_estado: digitalizacionEstado,
      software_actual: softwareActual,
      dolor_principal: dolorPrincipal,
      urgencia,
      fit_score: fitScore ?? 50,
      proxima_accion_fecha: proximaAccionFecha,
      facebook_url: facebook,
      instagram_url: instagram,
      tiktok_url: tiktok,
      notas,
    };

    return {
      rowNumber: row.rowNumber,
      label: eleamNombre || email || `Fila ${row.rowNumber}`,
      payload,
      errors,
    };
  });
}
