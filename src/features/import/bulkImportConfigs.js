import { formatRut, validateEmail, validateRut } from "../../utils/validators";
import { isResidentInPlanQuota } from "../payment/planCatalog";
import { DEFAULT_PERMS, PLANTILLAS_CARGO } from "../team/teamConstants";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STAFF_NAME_MAX = 120;
const EMAIL_MAX = 254;

function clean(value) {
  if (value == null) return "";
  if (value instanceof Date) return value;
  return String(value).replace(/\s+/g, " ").trim();
}

function keyText(value) {
  return clean(value)
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isBlank(value) {
  return clean(value) === "";
}

function dateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseExcelSerialDate(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  // Excel serial dates range from 1 (1900-01-01) to ~55000 (2050); reject outliers
  if (value < 1 || value > 55000) return null;
  const date = new Date(1899, 11, 30);
  date.setDate(date.getDate() + Math.floor(value));
  return dateToISO(date);
}

function parseDate(value, label, errors) {
  if (isBlank(value)) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return dateToISO(value);
  if (typeof value === "number") return parseExcelSerialDate(value);
  const text = clean(value);
  if (DATE_RE.test(text)) return text;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return dateToISO(parsed);
  errors.push(`${label} debe tener formato AAAA-MM-DD.`);
  return null;
}

function normalizeEnum(value, label, allowed, errors, fallback = null) {
  if (isBlank(value)) return fallback;
  const text = keyText(value);
  const alias = ENUM_ALIASES[label]?.[text];
  if (alias) return alias;
  const found = allowed.find((item) => keyText(item) === text);
  if (found) return found;
  errors.push(`${label} debe ser: ${allowed.join(", ")}.`);
  return fallback;
}

function normalizeRut(value, errors) {
  if (isBlank(value)) return null;
  const rut = clean(value);
  if (!validateRut(rut)) {
    errors.push(`RUT inválido: revisa el dígito verificador de ${rut}. Si no lo tienes confirmado, deja el RUT vacío.`);
    return null;
  }
  return formatRut(rut);
}

function parseInteger(value, label, errors, min, max) {
  if (isBlank(value)) return null;
  const number = Number.parseInt(clean(value), 10);
  if (!Number.isInteger(number) || number < min || number > max) {
    errors.push(`${label} debe ser un número entre ${min} y ${max}.`);
    return null;
  }
  return number;
}

function splitList(value) {
  if (isBlank(value)) return [];
  return clean(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCargo(value, errors) {
  const cargo = clean(value);
  if (!cargo) {
    errors.push("Cargo / plantilla de permisos es obligatorio.");
    return null;
  }
  const found = Object.keys(PLANTILLAS_CARGO).find((item) => keyText(item) === keyText(cargo));
  if (!found) {
    errors.push(`Cargo no reconocido. Usa: ${Object.keys(PLANTILLAS_CARGO).join(", ")}.`);
    return null;
  }
  return found;
}

function rowHasPayload(row) {
  return Object.values(row.raw).some((value) => !isBlank(value));
}

const ENUM_ALIASES = {
  Sexo: {
    f: "femenino",
    fem: "femenino",
    mujer: "femenino",
    femenino: "femenino",
    m: "masculino",
    masc: "masculino",
    hombre: "masculino",
    masculino: "masculino",
    o: "otro",
    otra: "otro",
    otro: "otro",
  },
  Estado: {
    activo: "activo",
    activa: "activo",
    vigente: "activo",
    ingresado: "activo",
    ingresada: "activo",
    hospitalizado: "hospitalizado",
    hospitalizada: "hospitalizado",
    hospitalizacion: "hospitalizado",
    egresado: "egresado",
    egresada: "egresado",
    alta: "egresado",
    fallecido: "fallecido",
    fallecida: "fallecido",
    defuncion: "fallecido",
  },
  "Nivel dependencia": {
    leve: "leve",
    ligera: "leve",
    ligero: "leve",
    bajo: "leve",
    baja: "leve",
    moderado: "moderado",
    moderada: "moderado",
    medio: "moderado",
    media: "moderado",
    severo: "severo",
    severa: "severo",
    alto: "severo",
    alta: "severo",
    total: "total",
    completa: "total",
    completo: "total",
  },
  "Estado civil": {
    soltero: "soltero",
    soltera: "soltero",
    casado: "casado",
    casada: "casado",
    viudo: "viudo",
    viuda: "viudo",
    divorciado: "divorciado",
    divorciada: "divorciado",
    separado: "divorciado",
    separada: "divorciado",
    otro: "otro",
    otra: "otro",
  },
};

export const residentImportConfig = {
  kind: "residents",
  title: "Cargar residentes desde Excel",
  sheetName: "Residentes",
  templateFilename: "planilla_residentes_fichaeleam.xlsx",
  primaryAction: "Importar residentes",
  emptyLabel: "residentes",
  instructions: [
    "Descarga la planilla y completa una fila por residente.",
    "No cambies los títulos de columnas. Puedes dejar vacías las columnas opcionales.",
    "El sistema validará RUT, fechas, estado y duplicados antes de importar.",
    "La cama se asigna después desde el módulo Camas.",
  ],
  columns: [
    { key: "nombre", header: "Nombres *", aliases: ["nombre"], required: true, width: 20 },
    { key: "apellido", header: "Apellidos *", aliases: ["apellido"], required: true, width: 20 },
    { key: "rut", header: "RUT", aliases: ["rut residente"], width: 16, note: "Ejemplo: 12.345.678-9" },
    { key: "fecha_nacimiento", header: "Fecha nacimiento", aliases: ["fecha de nacimiento"], width: 18 },
    { key: "sexo", header: "Sexo", validationList: ["masculino", "femenino", "otro"], width: 14 },
    { key: "fecha_ingreso", header: "Fecha ingreso *", aliases: ["fecha de ingreso"], required: true, width: 18 },
    { key: "estado", header: "Estado", validationList: ["activo", "hospitalizado", "egresado", "fallecido"], width: 16 },
    { key: "nivel_dependencia", header: "Nivel dependencia", validationList: ["leve", "moderado", "severo", "total"], width: 20 },
    { key: "indice_barthel", header: "Índice Barthel", aliases: ["indice barthel"], width: 16 },
    { key: "prevision", header: "Previsión", aliases: ["prevision"], width: 16 },
    { key: "diagnostico_principal", header: "Diagnóstico principal", aliases: ["diagnostico principal"], width: 28 },
    { key: "alergias", header: "Alergias", width: 24, note: "Separa múltiples alergias con coma." },
    { key: "nombre_contacto", header: "Nombre contacto", width: 24 },
    { key: "telefono_contacto", header: "Teléfono contacto", aliases: ["telefono contacto"], width: 18 },
    { key: "parentesco_contacto", header: "Parentesco contacto", width: 20 },
    { key: "nacionalidad", header: "Nacionalidad", width: 16 },
    { key: "estado_civil", header: "Estado civil", validationList: ["soltero", "casado", "viudo", "divorciado", "otro"], width: 16 },
    { key: "grupo_sanguineo", header: "Grupo sanguíneo", aliases: ["grupo sanguineo"], width: 16 },
    { key: "fecha_egreso", header: "Fecha egreso", width: 18 },
    { key: "motivo_egreso", header: "Motivo egreso", width: 24 },
  ],
  sampleRows: [
    {
      nombre: "María Elena",
      apellido: "González Rojas",
      rut: "12.345.678-5",
      fecha_nacimiento: "1942-08-18",
      sexo: "femenino",
      fecha_ingreso: "2026-05-13",
      estado: "activo",
      nivel_dependencia: "moderado",
      indice_barthel: "65",
      prevision: "FONASA",
      diagnostico_principal: "Hipertensión arterial",
      alergias: "Penicilina",
      nombre_contacto: "Paula González",
      telefono_contacto: "+56 9 1234 5678",
      parentesco_contacto: "Hija",
      nacionalidad: "Chilena",
    },
  ],
};

export const staffImportConfig = {
  kind: "staff",
  title: "Cargar funcionarios desde Excel",
  sheetName: "Funcionarios",
  templateFilename: "planilla_funcionarios_fichaeleam.xlsx",
  primaryAction: "Importar funcionarios",
  emptyLabel: "funcionarios",
  instructions: [
    "Completa una fila por funcionario. No incluyas administradores ni familiares en esta planilla.",
    "El cargo define los permisos iniciales. Después puedes ajustarlos desde Equipo y permisos.",
    "Los correos Gmail se habilitan para entrar con Google. Otros correos reciben un enlace de acceso por correo.",
  ],
  columns: [
    { key: "nombre", header: "Nombre completo *", aliases: ["nombre", "nombres"], required: true, width: 28 },
    { key: "email", header: "Correo electrónico *", aliases: ["email", "correo"], required: true, width: 32 },
    {
      key: "cargo",
      header: "Cargo / plantilla de permisos *",
      aliases: ["cargo", "plantilla"],
      required: true,
      width: 30,
      validationList: Object.keys(PLANTILLAS_CARGO),
      note: "Define los permisos iniciales del funcionario.",
    },
  ],
  sampleRows: [
    { nombre: "Camila Torres", email: "camila.torres@residencia.cl", cargo: "Enfermero/a" },
    { nombre: "Luis Martínez", email: "luis.martinez@gmail.com", cargo: "Auxiliar ATD" },
  ],
};

export function normalizeResidentRows(rows, {
  existingResidents = [],
  maxResidentes = null,
  currentResidentSlots = null,
} = {}) {
  const existingRuts = new Set(
    existingResidents
      .map((r) => r.rut)
      .filter(Boolean)
      .map((rut) => formatRut(rut)),
  );
  const fileRuts = new Set();
  const currentSlots = currentResidentSlots ?? existingResidents.filter(isResidentInPlanQuota).length;
  let acceptedForPlan = 0;

  return rows.filter(rowHasPayload).map((row) => {
    const r = row.raw;
    const errors = [];
    const nombre = clean(r.nombre);
    const apellido = clean(r.apellido);
    const rut = normalizeRut(r.rut, errors);
    const fechaIngreso = parseDate(r.fecha_ingreso, "Fecha ingreso", errors);
    const estado = normalizeEnum(r.estado, "Estado", ["activo", "hospitalizado", "egresado", "fallecido"], errors, "activo");
    const fechaEgreso = parseDate(r.fecha_egreso, "Fecha egreso", errors);

    if (!nombre) errors.push("Nombres es obligatorio.");
    if (!apellido) errors.push("Apellidos es obligatorio.");
    if (!fechaIngreso) errors.push("Fecha ingreso es obligatoria.");
    if (rut && existingRuts.has(rut)) errors.push("Ya existe un residente con este RUT.");
    if (rut && fileRuts.has(rut)) errors.push("RUT duplicado dentro de la planilla.");
    if (rut) fileRuts.add(rut);
    if (["egresado", "fallecido"].includes(estado) && !fechaEgreso) {
      errors.push("Fecha egreso es obligatoria si el estado es egresado o fallecido.");
    }
    if (errors.length === 0 && maxResidentes !== null && ["activo", "hospitalizado"].includes(estado)) {
      if (currentSlots + acceptedForPlan >= maxResidentes) {
        errors.push(`El plan permite máximo ${maxResidentes} residentes activos u hospitalizados. Reduce la planilla o actualiza el plan.`);
      } else {
        acceptedForPlan += 1;
      }
    }

    const payload = {
      nombre,
      apellido,
      rut,
      fecha_nacimiento: parseDate(r.fecha_nacimiento, "Fecha nacimiento", errors),
      sexo: normalizeEnum(r.sexo, "Sexo", ["masculino", "femenino", "otro"], errors),
      nacionalidad: clean(r.nacionalidad) || "Chilena",
      estado_civil: normalizeEnum(r.estado_civil, "Estado civil", ["soltero", "casado", "viudo", "divorciado", "otro"], errors),
      nombre_contacto: clean(r.nombre_contacto) || null,
      telefono_contacto: clean(r.telefono_contacto) || null,
      parentesco_contacto: clean(r.parentesco_contacto) || null,
      prevision: clean(r.prevision) || null,
      diagnostico_principal: clean(r.diagnostico_principal) || null,
      alergias: splitList(r.alergias),
      grupo_sanguineo: clean(r.grupo_sanguineo) || null,
      fecha_ingreso: fechaIngreso,
      fecha_egreso: fechaEgreso,
      motivo_egreso: clean(r.motivo_egreso) || null,
      estado,
      indice_barthel: parseInteger(r.indice_barthel, "Índice Barthel", errors, 0, 100),
      nivel_dependencia: normalizeEnum(r.nivel_dependencia, "Nivel dependencia", ["leve", "moderado", "severo", "total"], errors),
    };

    return {
      rowNumber: row.rowNumber,
      label: `${apellido || "Sin apellido"}, ${nombre || "sin nombre"}`,
      payload,
      errors,
    };
  });
}

export function normalizeStaffRows(rows, {
  existingMembers = [],
  pendingInvites = [],
  maxFuncionarios = null,
  currentFuncionarios = 0,
} = {}) {
  const knownEmails = new Set([
    ...existingMembers.map((m) => m.email),
    ...pendingInvites.map((i) => i.email),
  ].filter(Boolean).map((email) => email.trim().toLowerCase()));
  const fileEmails = new Set();
  let acceptedForPlan = 0;

  return rows.filter(rowHasPayload).map((row) => {
    const r = row.raw;
    const errors = [];
    const nombre = clean(r.nombre);
    const email = clean(r.email).toLowerCase();
    const cargo = normalizeCargo(r.cargo, errors);

    if (!nombre) errors.push("Nombre completo es obligatorio.");
    else if (nombre.length > STAFF_NAME_MAX) errors.push(`Nombre completo no puede superar ${STAFF_NAME_MAX} caracteres.`);
    if (!email) errors.push("Correo electrónico es obligatorio.");
    else if (email.length > EMAIL_MAX) errors.push(`Correo electrónico no puede superar ${EMAIL_MAX} caracteres.`);
    else if (!validateEmail(email)) errors.push("Correo electrónico inválido.");
    if (email && knownEmails.has(email)) errors.push("Este correo ya existe o tiene invitación pendiente.");
    if (email && fileEmails.has(email)) errors.push("Correo duplicado dentro de la planilla.");
    if (email) fileEmails.add(email);
    if (errors.length === 0 && maxFuncionarios !== null) {
      if (currentFuncionarios + acceptedForPlan >= maxFuncionarios) {
        errors.push(`El plan permite máximo ${maxFuncionarios} funcionarios. Reduce la planilla o actualiza el plan.`);
      } else {
        acceptedForPlan += 1;
      }
    }

    return {
      rowNumber: row.rowNumber,
      label: nombre || email || "Funcionario sin nombre",
      payload: {
        nombre,
        email,
        rol: "funcionario",
        cargo,
        permisos: cargo ? { ...PLANTILLAS_CARGO[cargo] } : { ...DEFAULT_PERMS },
      },
      errors,
    };
  });
}
