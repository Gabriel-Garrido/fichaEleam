import fs from "node:fs";
import path from "node:path";

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

const funcionarioCanMatch = schemaNoComments.match(
  /create\s+or\s+replace\s+function\s+public\.funcionario_can[\s\S]*?\$\$;/i,
);
const funcionarioCanCases = funcionarioCanMatch
  ? collect(/when\s+'([^']+)'\s+then/gi, funcionarioCanMatch[0])
  : new Set();
if (!funcionarioCanMatch) {
  fail("No se encontró public.funcionario_can en supabase_schema.sql.");
}

const frontendPermKeys = new Set();
for (const entry of sourceEntries) {
  if (!/AuthContext\.jsx$|teamConstants\.[jt]sx?$/.test(entry.relativePath)) continue;
  for (const match of entry.text.matchAll(/["']([a-z]+_[a-z0-9_]+)["']/g)) {
    const key = match[1];
    if (
      /^(crear|editar|eliminar|completar|administrar|validar|ajustar|subir|archivar|registrar)_/.test(key)
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

for (const key of dbPermColumns) {
  if (!frontendPermKeys.has(key)) {
    warn(`Permiso backend "${key}" no está referenciado en AuthContext/teamConstants.`);
  }
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
