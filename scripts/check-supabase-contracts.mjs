import fs from "node:fs";
import path from "node:path";

import {
  DECRETO20_AMBITOS,
  DECRETO20_META,
  DECRETO20_REQUISITOS,
} from "../src/content/decreto20Eleam.js";

const root = process.cwd();
const schemaPath = path.join(root, "supabase_schema.sql");
const srcDir = path.join(root, "src");
const functionsDir = path.join(root, "supabase", "functions");

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function walk(dir, predicate = () => true) {
  if (!exists(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function collect(regex, text, group = 1) {
  const values = new Set();
  for (const match of text.matchAll(regex)) {
    values.add(match[group]);
  }
  return values;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEol(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

if (!exists(schemaPath)) {
  fail("No existe supabase_schema.sql en la raíz del proyecto.");
}

const schema = exists(schemaPath) ? normalizeEol(read(schemaPath)).trimEnd() : "";
const schemaNoComments = stripComments(schema);

const publicTables = collect(
  /create\s+table\s+if\s+not\s+exists\s+public\.([a-zA-Z0-9_]+)/gi,
  schemaNoComments,
);

const tableColumns = new Map();
const tableBodies = new Map();
for (const match of schemaNoComments.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\n\);/gi)) {
  const [, table, body] = match;
  const columns = new Set();
  for (const line of body.split(/\r?\n/)) {
    const columnMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+/);
    if (!columnMatch) continue;
    const name = columnMatch[1].toLowerCase();
    if (["primary", "foreign", "unique", "constraint", "check", "exclude"].includes(name)) continue;
    columns.add(columnMatch[1]);
  }
  tableColumns.set(table, columns);
  tableBodies.set(table, body);
}

for (const match of schemaNoComments.matchAll(/alter\s+table\s+public\.([a-zA-Z0-9_]+)\s+add\s+column\s+if\s+not\s+exists\s+([a-zA-Z0-9_]+)/gi)) {
  const [, table, column] = match;
  if (!tableColumns.has(table)) tableColumns.set(table, new Set());
  tableColumns.get(table).add(column);
}

const publicFunctions = collect(
  /create\s+(?:or\s+replace\s+)?function\s+public\.([a-zA-Z0-9_]+)\s*\(/gi,
  schemaNoComments,
);

const grantedFunctions = collect(
  /grant\s+execute\s+on\s+function\s+public\.([a-zA-Z0-9_]+)\s*\(/gi,
  schemaNoComments,
);

const storageBuckets = collect(
  /insert\s+into\s+storage\.buckets[\s\S]*?values\s*\(\s*'([^']+)'/gi,
  schemaNoComments,
);

const rlsEnabledTables = collect(
  /alter\s+table\s+public\.([a-zA-Z0-9_]+)\s+enable\s+row\s+level\s+security/gi,
  schemaNoComments,
);

const edgeFunctions = new Set(
  exists(functionsDir)
    ? fs
        .readdirSync(functionsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
        .map((entry) => entry.name)
    : [],
);

const sourceFiles = walk(srcDir, (filePath) => /\.(?:js|jsx|ts|tsx)$/.test(filePath));
const sourceEntries = sourceFiles.map((filePath) => ({
  filePath,
  relativePath: rel(filePath),
  text: read(filePath),
}));

const frontendTables = new Map();
const frontendRpcs = new Map();
const frontendInvokes = new Map();

function addUse(map, key, filePath) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(filePath);
}

for (const entry of sourceEntries) {
  for (const match of entry.text.matchAll(/\.from\(\s*["']([^"']+)["']/g)) {
    addUse(frontendTables, match[1], entry.relativePath);
  }
  for (const match of entry.text.matchAll(/\.rpc\(\s*["']([^"']+)["']/g)) {
    addUse(frontendRpcs, match[1], entry.relativePath);
  }
  for (const match of entry.text.matchAll(/functions\.invoke\(\s*["']([^"']+)["']/g)) {
    addUse(frontendInvokes, match[1], entry.relativePath);
  }
}

for (const [tableOrBucket, files] of frontendTables) {
  if (!publicTables.has(tableOrBucket) && !storageBuckets.has(tableOrBucket)) {
    fail(`El frontend usa .from("${tableOrBucket}") pero no existe como tabla pública ni bucket. Archivos: ${[...files].join(", ")}`);
  }
}

for (const table of publicTables) {
  if (!rlsEnabledTables.has(table)) {
    fail(`public.${table} debe tener RLS habilitado en supabase_schema.sql.`);
  }
}

for (const bucket of ["documentos-acreditacion", "documentos-eleam"]) {
  if (!storageBuckets.has(bucket)) {
    fail(`supabase_schema.sql debe crear el bucket privado ${bucket}.`);
  }
  if (!new RegExp(`bucket_id\\s*=\\s*'${escapeRegExp(bucket)}'`, "i").test(schemaNoComments)) {
    fail(`supabase_schema.sql debe definir políticas Storage para el bucket ${bucket}.`);
  }
}

function splitTopLevel(selection) {
  const parts = [];
  let current = "";
  let depth = 0;
  for (const char of selection) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function collectStringConstants(text) {
  const constants = new Map();
  const regex = /(?:export\s+)?const\s+([A-Z0-9_]+)\s*=\s*([`"'])([\s\S]*?)\2\s*;/g;
  for (const match of text.matchAll(regex)) {
    constants.set(match[1], match[3]);
  }
  return constants;
}

function resolveSelection(raw, constants, seen = new Set()) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^[A-Z0-9_]+$/.test(trimmed)) {
    if (seen.has(trimmed)) return null;
    const value = constants.get(trimmed);
    if (value == null) return null;
    seen.add(trimmed);
    return resolveSelection(value, constants, seen);
  }

  const quote = trimmed[0];
  let value = trimmed;
  if ((quote === "\"" || quote === "'" || quote === "`") && trimmed.endsWith(quote)) {
    value = trimmed.slice(1, -1);
  }

  return value.replace(/\$\{\s*([A-Z0-9_]+)\s*\}/g, (_, key) => {
    if (seen.has(key)) return "";
    const replacement = constants.get(key);
    if (replacement == null) return "";
    return resolveSelection(replacement, constants, new Set([...seen, key])) ?? "";
  });
}

function normalizeColumnToken(token) {
  return token
    .trim()
    .replace(/\s+/g, "")
    .replace(/::[a-zA-Z0-9_]+$/, "");
}

function validateSelectionColumns(table, selection, filePath) {
  if (!selection || selection.trim() === "*" || !tableColumns.has(table)) return;

  for (const rawPart of splitTopLevel(selection)) {
    const part = normalizeColumnToken(rawPart);
    if (!part || part === "*") continue;

    const relationMatch = part.match(/^(?:(?:[a-zA-Z0-9_]+):)?([a-zA-Z0-9_]+)(?:![a-zA-Z0-9_]+)?\(([\s\S]*)\)$/);
    if (relationMatch) {
      const [, relationTable, nestedSelection] = relationMatch;
      if (tableColumns.has(relationTable)) {
        validateSelectionColumns(relationTable, nestedSelection, filePath);
      }
      continue;
    }

    const column = part.includes(":") ? part.split(":").at(-1) : part;
    if (!tableColumns.get(table).has(column)) {
      fail(`Select inválido en ${filePath}: "${column}" no existe en public.${table}.`);
    }
  }
}

for (const entry of sourceEntries) {
  const constants = collectStringConstants(entry.text);
  const fromRegex = /\.from\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of entry.text.matchAll(fromRegex)) {
    const [, table] = match;
    if (!publicTables.has(table)) continue;
    const statementEnd = entry.text.indexOf(";", match.index);
    const statement = entry.text.slice(match.index, statementEnd === -1 ? entry.text.length : statementEnd);
    const selectMatch = statement.match(/\.select\(\s*([A-Z0-9_]+|`[\s\S]*?`|"[^"]*"|'[^']*')/);
    if (!selectMatch) continue;
    const beforeSelect = statement.slice(0, selectMatch.index);
    if (beforeSelect.replace(/^\.from\(\s*["'][^"']+["']\s*\)/, "").includes(".from(")) continue;
    const rawSelection = selectMatch[1];
    const selection = resolveSelection(rawSelection, constants);
    if (selection == null) continue;
    validateSelectionColumns(table, selection, entry.relativePath);
  }
}

for (const [rpc, files] of frontendRpcs) {
  if (!publicFunctions.has(rpc)) {
    fail(`El frontend invoca rpc("${rpc}") pero la función no existe en supabase_schema.sql. Archivos: ${[...files].join(", ")}`);
    continue;
  }
  if (!grantedFunctions.has(rpc)) {
    fail(`El frontend invoca rpc("${rpc}") pero no hay grant execute explícito. Archivos: ${[...files].join(", ")}`);
  }
}

for (const [fn, files] of frontendInvokes) {
  if (!edgeFunctions.has(fn)) {
    fail(`El frontend invoca Edge Function "${fn}" pero no existe supabase/functions/${fn}. Archivos: ${[...files].join(", ")}`);
  }
}

for (const column of ["frequency", "frequency_type"]) {
  if (!tableColumns.get("planes")?.has(column)) {
    fail(`public.planes debe incluir la columna ${column}; mp-create-subscription depende de ella.`);
  }
}

for (const code of ["plan-14", "plan-24", "plan-34"]) {
  if (!new RegExp(`'${escapeRegExp(code)}'`, "i").test(schemaNoComments)) {
    fail(`supabase_schema.sql debe sembrar el plan comercial ${code}.`);
  }
}

const accredCatalogColumns = {
  acred_ambitos: ["norma_codigo", "articulo_ref", "fuente_url"],
  acred_requisitos: [
    "norma_codigo",
    "articulo_ref",
    "fuente_url",
    "criticidad",
    "tipo_evidencia",
    "origen_evidencia",
    "requisito_operacional",
  ],
};

for (const [table, columns] of Object.entries(accredCatalogColumns)) {
  for (const column of columns) {
    if (!tableColumns.get(table)?.has(column)) {
      fail(`public.${table} debe incluir la columna DS20 ${column}.`);
    }
  }
}

if (DECRETO20_META.normaCodigo !== "DS20") {
  fail("src/content/decreto20Eleam.js debe exponer normaCodigo = DS20.");
}

const ds20AmbitoCodes = new Set(DECRETO20_AMBITOS.map((item) => item.codigo));
const ds20RequirementCodes = new Set();

for (const ambito of DECRETO20_AMBITOS) {
  if (!new RegExp(`'${escapeRegExp(ambito.codigo)}'`, "i").test(schemaNoComments)) {
    fail(`supabase_schema.sql debe sembrar el ámbito DS20 ${ambito.codigo}.`);
  }
}

for (const requisito of DECRETO20_REQUISITOS) {
  if (ds20RequirementCodes.has(requisito.codigo)) {
    fail(`Código DS20 duplicado en catálogo frontend: ${requisito.codigo}.`);
  }
  ds20RequirementCodes.add(requisito.codigo);

  if (!ds20AmbitoCodes.has(requisito.ambito_codigo)) {
    fail(`Requisito ${requisito.codigo} referencia ámbito inexistente ${requisito.ambito_codigo}.`);
  }
  if (requisito.norma_codigo !== DECRETO20_META.normaCodigo) {
    fail(`Requisito ${requisito.codigo} no declara norma_codigo ${DECRETO20_META.normaCodigo}.`);
  }
  if (!new RegExp(`'${escapeRegExp(requisito.codigo)}'`, "i").test(schemaNoComments)) {
    fail(`supabase_schema.sql debe sembrar el requisito DS20 ${requisito.codigo}.`);
  }
}

const ds20CodesInSchema = new Set(
  [...schemaNoComments.matchAll(/'(DS20-A[0-9]{2,3}-[^']+)'/g)]
    .map((match) => match[1])
);

if (ds20CodesInSchema.size !== ds20RequirementCodes.size) {
  fail(
    `El seed DS20 de supabase_schema.sql debe tener ${ds20RequirementCodes.size} requisitos; encontrados ${ds20CodesInSchema.size}.`,
  );
}

for (const legacyPattern of [
  new RegExp(["\\bDS\\s*", "14\\b"].join(""), "i"),
  new RegExp(["\\b14", "\\/2017\\b"].join(""), "i"),
  new RegExp(["\\bdecreto\\s+", "14\\b"].join(""), "i"),
  new RegExp(["\\bds", "-14\\b"].join(""), "i"),
]) {
  if (legacyPattern.test(schemaNoComments)) {
    fail("supabase_schema.sql contiene una referencia legacy a normativa antigua.");
  }
}

function getColumnDefinition(table, column) {
  const body = tableBodies.get(table);
  if (!body) return null;
  const regex = new RegExp(`^\\s*${escapeRegExp(column)}\\s+([^,\\n]+)`, "im");
  return body.match(regex)?.[1]?.trim() ?? null;
}

const crmProspectImportTypes = {
  list_id: "uuid",
  eleam_nombre: "text",
  comuna: "text",
  telefono: "text",
  email: "text",
  facebook_url: "text",
  instagram_url: "text",
  tiktok_url: "text",
  origen: "text",
  canal_preferido: "text",
  cargo_contacto: "text",
  decision_maker_nombre: "text",
  decision_maker_cargo: "text",
  num_residentes: "integer",
  digitalizacion_estado: "text",
  software_actual: "text",
  dolor_principal: "text",
  urgencia: "text",
  fit_score: "integer",
  proxima_accion_fecha: "date",
  notas: "text",
};

if (/drop\s+table\b/i.test(schemaNoComments)) {
  fail("El esquema de instalación limpia no debe contener DROP TABLE ni reconstrucciones históricas.");
}

const obsoleteSchemaTokens = [
  "familiar_residentes",
  "visitas_familiar",
  "get_familiar_resident_snapshot",
  "my_familiar_residente_ids",
  "familiar_can_view_residente",
  "familiar_can_view_cama",
  "familiar_can_view_habitacion",
  "visita_familiar_origen",
  "familiar_portal",
];

for (const token of obsoleteSchemaTokens) {
  if (new RegExp(`\\b${escapeRegExp(token)}\\b`, "i").test(schemaNoComments)) {
    fail(`El esquema conserva el objeto obsoleto ${token}.`);
  }
}

const functionDefinitions = [...schemaNoComments.matchAll(
  /create\s+(?:or\s+replace\s+)?function\s+public\.([a-zA-Z0-9_]+)\s*\(/gi,
)];
const functionDefinitionCount = new Map();
for (const match of functionDefinitions) {
  functionDefinitionCount.set(match[1], (functionDefinitionCount.get(match[1]) ?? 0) + 1);
}
for (const [name, count] of functionDefinitionCount) {
  if (count > 1) fail(`public.${name} se define ${count} veces; el esquema limpio exige una sola definición final.`);
}

for (const [column, expectedType] of Object.entries(crmProspectImportTypes)) {
  const definition = getColumnDefinition("crm_prospects", column);
  if (!definition) {
    fail(`public.crm_prospects debe incluir la columna importable ${column}.`);
    continue;
  }

  const actualType = definition.split(/\s+/)[0].toLowerCase();
  if (actualType !== expectedType) {
    fail(`public.crm_prospects.${column} debe ser ${expectedType}; encontrado: ${definition}.`);
  }
  if (/\bjsonb?\b/i.test(definition)) {
    fail(`public.crm_prospects.${column} no debe ser json/jsonb; el importador Excel envía escalares.`);
  }
}

if (!/create\s+policy\s+"planes_select_public"\s+on\s+public\.planes[\s\S]*?for\s+select/gi.test(schemaNoComments)) {
  fail("Falta la política RLS planes_select_public para que la UI cargue planes activos.");
}

const mpWebhookFunctionPath = path.join(functionsDir, "mp-webhook", "index.ts");
if (exists(mpWebhookFunctionPath)) {
  const text = read(mpWebhookFunctionPath);
  if (!/topic\s*===\s*"payment"/.test(text) || !/\bgetPayment\s*\(\s*dataId\s*\)/.test(text)) {
    fail("mp-webhook debe procesar eventos `payment` consultando /v1/payments/{id}.");
  }
  if (!/onConflict:\s*"mp_payment_id"/.test(text)) {
    fail("mp-webhook debe registrar eventos payment de forma idempotente por mp_payment_id.");
  }
  if (!/\bresolveBillingWindow\b/.test(text)) {
    fail("mp-webhook debe calcular la vigencia del pago desde la frecuencia del plan.");
  }
}

const permisosTableMatch = schemaNoComments.match(
  /create\s+table\s+if\s+not\s+exists\s+public\.funcionario_permisos\s*\(([\s\S]*?)\n\);/i,
);
const dbPermColumns = new Set();
if (!permisosTableMatch) {
  fail("No se encontró la tabla public.funcionario_permisos en supabase_schema.sql.");
} else {
  for (const match of permisosTableMatch[1].matchAll(/^\s*([a-zA-Z0-9_]+)\s+boolean\s+not\s+null\s+default\s+(?:true|false)/gim)) {
    dbPermColumns.add(match[1]);
  }
}

for (const match of schemaNoComments.matchAll(
  /alter\s+table\s+public\.funcionario_permisos[\s\S]*?;/gi,
)) {
  for (const column of match[0].matchAll(/add\s+column\s+if\s+not\s+exists\s+([a-zA-Z0-9_]+)\s+boolean\s+not\s+null\s+default\s+(?:true|false)/gim)) {
    dbPermColumns.add(column[1]);
  }
}

const funcionarioCanMatches = [...schemaNoComments.matchAll(
  /create\s+or\s+replace\s+function\s+public\.funcionario_can[\s\S]*?\$\$;/gi,
)];
const funcionarioCanCases = new Set();
for (const match of funcionarioCanMatches) {
  for (const key of collect(/when\s+'([^']+)'\s+then/gi, match[0])) {
    funcionarioCanCases.add(key);
  }
}
if (funcionarioCanMatches.length === 0) {
  fail("No se encontró public.funcionario_can en supabase_schema.sql.");
}
if (funcionarioCanMatches.length > 1) {
  fail("public.funcionario_can debe tener una única definición consolidada.");
}

const frontendPermKeys = new Set();
for (const entry of sourceEntries) {
  if (!/AuthContext\.jsx$|teamConstants\.[jt]sx?$/.test(entry.relativePath)) continue;
  for (const match of entry.text.matchAll(/["']([a-z]+_[a-z0-9_]+)["']/g)) {
    const key = match[1];
    if (
      /^(crear|editar|eliminar|completar|administrar|validar|ajustar|subir|archivar|registrar|asignar|aplicar|cerrar|gestionar|ver|enviar|anular)_/.test(key)
    ) {
      frontendPermKeys.add(key);
    }
  }
}

for (const key of frontendPermKeys) {
  if (!dbPermColumns.has(key)) {
    fail(`Permiso frontend "${key}" no existe como columna boolean en funcionario_permisos.`);
  }
  if (!funcionarioCanCases.has(key)) {
    fail(`Permiso frontend "${key}" no existe en public.funcionario_can.`);
  }
}

const requiredDs20Permissions = [
  "editar_inventario_bienes",
  "gestionar_reclamos",
  "gestionar_emergencias",
  "registrar_simulacros",
  "gestionar_cumplimiento",
];

for (const key of requiredDs20Permissions) {
  if (!dbPermColumns.has(key)) {
    fail(`Permiso DS20 requerido "${key}" no existe como columna boolean en funcionario_permisos.`);
  }
  if (!funcionarioCanCases.has(key)) {
    fail(`Permiso DS20 requerido "${key}" no existe en public.funcionario_can.`);
  }
  if (!frontendPermKeys.has(key)) {
    fail(`Permiso DS20 requerido "${key}" no está declarado en AuthContext/teamConstants.`);
  }
}

for (const key of dbPermColumns) {
  if (!frontendPermKeys.has(key)) {
    warn(`Permiso backend "${key}" no está referenciado en AuthContext/teamConstants.`);
  }
}

const ds20PolicyContracts = [
  ["inventario_bienes", "editar_inventario_bienes"],
  ["plan_emergencias", "gestionar_emergencias"],
  ["escenarios_emergencia", "gestionar_emergencias"],
  ["simulacros", "registrar_simulacros"],
  ["reclamos_sugerencias", "gestionar_reclamos"],
  ["protocolos_eleam", "gestionar_cumplimiento"],
];

for (const [table, permission] of ds20PolicyContracts) {
  if (!publicTables.has(table)) {
    fail(`Tabla DS20 requerida public.${table} no existe en supabase_schema.sql.`);
    continue;
  }
  const policyPattern = new RegExp(`create\\s+policy[\\s\\S]*?on\\s+public\\.${escapeRegExp(table)}[\\s\\S]*?funcionario_can\\('${escapeRegExp(permission)}'\\)`, "i");
  if (!policyPattern.test(schemaNoComments)) {
    fail(`public.${table} debe proteger escritura con public.funcionario_can('${permission}').`);
  }
}

// Un permiso de acción nunca debe abrir un área por accidente y una petición
// directa a Supabase tampoco debe saltarse la navegación protegida.
if (!/return\s+coalesce\(v_profile_enabled,\s*false\)/i.test(schemaNoComments)) {
  fail("can_access_feature debe denegar a funcionarios cuando no existe una autorización explícita para el área.");
}

if (!/v_feature_id\s*:=\s*case[\s\S]*?not\s+public\.can_access_feature\(v_feature_id\)/i.test(schemaNoComments)) {
  fail("funcionario_can debe comprobar el área correspondiente antes del permiso de acción.");
}

const featureTableGates = {
  establishment: ["habitaciones", "camas", "cama_asignaciones", "camas_audit", "inventario_bienes"],
  residents: [
    "residentes", "signos_vitales", "observaciones_diarias", "evaluaciones_clinicas",
    "resident_consents", "health_centers", "resident_health_network", "health_controls",
    "turno_entregas", "eventos_adversos", "eventos_adversos_acciones", "eventos_adversos_audit",
    "planes_cuidado", "plan_cuidado_actividades", "plan_cuidado_horarios", "tareas_cuidado",
    "plan_cuidado_audit", "medicamentos_indicaciones", "medicamentos_horarios",
    "medicamentos_stock_lotes", "medicamentos_administraciones", "medicamentos_stock_movimientos",
    "medicamentos_conciliaciones", "medicamentos_audit", "persona_significativa", "actividades_sociales",
  ],
  personnel: ["staff_members", "staff_competencies", "staff_training_records", "staff_shift_assignments"],
  resident_payments: [
    "resident_payment_contacts", "resident_billing_profiles", "resident_charges", "resident_payments",
    "resident_payment_deliveries", "resident_payment_audit",
  ],
  compliance: [
    "acred_requisitos_eleam", "acred_documentos", "acred_observaciones", "acred_audit",
    "protocolos_eleam", "plan_emergencias", "escenarios_emergencia", "simulacros", "reclamos_sugerencias",
  ],
};

if (!/create\s+policy\s+feature_access_gate[\s\S]*?as\s+restrictive[\s\S]*?can_access_feature/i.test(schemaNoComments)) {
  fail("El esquema debe crear una política RLS restrictiva y transversal para las áreas funcionales.");
}

for (const [feature, tables] of Object.entries(featureTableGates)) {
  for (const table of tables) {
    const gateTuple = new RegExp(`\\(\\s*'${escapeRegExp(table)}'\\s*,\\s*'${escapeRegExp(feature)}'\\s*\\)`, "i");
    if (!gateTuple.test(schemaNoComments)) {
      fail(`public.${table} debe quedar detrás de la puerta RLS del área ${feature}.`);
    }
  }
}

if (!/bucket_id\s*=\s*'documentos-eleam'[\s\S]*?can_access_feature\('residents'\)/i.test(schemaNoComments)) {
  fail("El bucket documentos-eleam debe exigir acceso al área residents.");
}

const allowedSupabaseAccess = (relativePath) => (
  relativePath.startsWith("src/context/")
  || relativePath.startsWith("src/services/")
  || /(?:^|\/)[a-zA-Z0-9]+Service\.[jt]sx?$/.test(relativePath)
  || relativePath === "src/features/landing/landingAnalytics.js"
);

for (const entry of sourceEntries) {
  const importsSupabaseClient = /import\s+\{[^}]*\bsupabase\b[^}]*\}\s+from\s+["'][^"']*services\/supabaseConfig["']/.test(entry.text);
  const hasSupabaseQuery = /(?:supabase|client|sb)\s*\.\s*(?:from|rpc|functions|storage)\b/.test(entry.text)
    || /\.from\(\s*["'][^"']+["']/.test(entry.text)
    || /\.rpc\(\s*["'][^"']+["']/.test(entry.text)
    || /functions\.invoke\(\s*["'][^"']+["']/.test(entry.text);

  if ((importsSupabaseClient || hasSupabaseQuery) && !allowedSupabaseAccess(entry.relativePath)) {
    fail(`Acceso Supabase directo fuera de services/context permitido: ${entry.relativePath}`);
  }
}

// El alta de usuarios ya no devuelve contraseñas: el frontend entrega el
// acceso por enlace al correo y no debe referenciar temp_password.
for (const entry of sourceEntries) {
  if (/\btemp_password\b/.test(entry.text)) {
    fail(`El frontend referencia temp_password en ${entry.relativePath}; el alta de usuarios entrega el acceso por enlace, no por contraseña.`);
  }
}

const demoUserFunctionPath = path.join(functionsDir, "create-demo-user", "index.ts");
const staffUserFunctionPath = path.join(functionsDir, "create-staff-user", "index.ts");
if (exists(demoUserFunctionPath)) {
  const text = read(demoUserFunctionPath);
  if (!/auth\.admin\.createUser[\s\S]*?from\("profiles"\)\.upsert/.test(text)) {
    fail("create-demo-user debe provisionar public.profiles después de auth.admin.createUser para evitar errores opacos del trigger de Auth.");
  }
}
if (exists(staffUserFunctionPath)) {
  const text = read(staffUserFunctionPath);
  if (!/auth\.admin\.createUser[\s\S]*?from\("profiles"\)\.upsert/.test(text)) {
    fail("create-staff-user debe provisionar public.profiles después de auth.admin.createUser para evitar errores opacos del trigger de Auth.");
  }
}
if (!/Edge Function que hizo createUser/.test(schema)) {
  fail("handle_new_user debe dejar que las Edge Functions provisionen profiles en creaciones directas con Admin API.");
}

const legacyPaths = [
  "old_supabase_schema.sql",
  "supabase_schema_partes",
  "scripts/split-supabase-schema.mjs",
];

for (const legacyPath of legacyPaths) {
  if (exists(path.join(root, legacyPath))) {
    fail(`Referencia/artefacto legacy presente en workspace: ${legacyPath}`);
  }
}

const docsToCheck = ["README.md", "CLAUDE.md", "codex.md", "package.json"];
for (const doc of docsToCheck) {
  const docPath = path.join(root, doc);
  if (!exists(docPath)) continue;
  const text = read(docPath);
  for (const legacyPath of legacyPaths) {
    if (new RegExp(escapeRegExp(legacyPath), "i").test(text)) {
      fail(`${doc} todavía referencia ${legacyPath}.`);
    }
  }
}

console.log("Supabase contract audit");
console.log(`- Public tables: ${publicTables.size}`);
console.log(`- RPC/functions: ${publicFunctions.size}`);
console.log(`- Edge functions: ${edgeFunctions.size}`);
console.log(`- Frontend tables/buckets: ${frontendTables.size}`);
console.log(`- Frontend RPCs: ${frontendRpcs.size}`);
console.log(`- Frontend Edge invokes: ${frontendInvokes.size}`);
console.log(`- Permission keys: ${frontendPermKeys.size}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const message of warnings) console.log(`- ${message}`);
}

if (errors.length) {
  console.error("\nContract errors:");
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log("\nContracts OK.");
