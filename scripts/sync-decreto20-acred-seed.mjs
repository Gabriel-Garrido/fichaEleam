import fs from "node:fs";
import path from "node:path";
import {
  DECRETO20_AMBITOS,
  DECRETO20_META,
  DECRETO20_REQUISITOS,
} from "../src/content/decreto20Eleam.js";

const root = process.cwd();
const schemaPath = path.join(root, "supabase_schema.sql");

function sql(value) {
  if (value == null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function ambitoRow(item) {
  return `  (${[
    item.codigo,
    item.nombre,
    item.descripcion,
    item.icono,
    DECRETO20_META.normaCodigo,
    item.articulo_ref,
    DECRETO20_META.fuenteUrl,
    item.orden,
  ].map(sql).join(",")})`;
}

function requisitoRow(item) {
  return `  (${[
    item.ambito_codigo,
    item.codigo,
    item.nombre,
    item.descripcion,
    item.medio_verificador,
    item.obligatorio,
    item.permite_no_aplica,
    item.requiere_vencimiento,
    item.vigencia_dias_sugerida,
    item.norma_codigo,
    item.articulo_ref,
    item.fuente_url,
    item.criticidad,
    item.tipo_evidencia,
    item.origen_evidencia,
    item.requisito_operacional,
    item.orden,
  ].map(sql).join(",")})`;
}

function buildSeed() {
  return `insert into public.acred_ambitos (
  codigo, nombre, descripcion, icono, norma_codigo, articulo_ref, fuente_url, orden
) values
${DECRETO20_AMBITOS.map(ambitoRow).join(",\n")}
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  icono = excluded.icono,
  norma_codigo = excluded.norma_codigo,
  articulo_ref = excluded.articulo_ref,
  fuente_url = excluded.fuente_url,
  orden = excluded.orden;

with vals(
  ambito_codigo, codigo, nombre, descripcion, medio_verificador,
  obligatorio, permite_no_aplica, requiere_vencimiento, vigencia_dias_sugerida,
  norma_codigo, articulo_ref, fuente_url, criticidad, tipo_evidencia,
  origen_evidencia, requisito_operacional, orden
) as (values
${DECRETO20_REQUISITOS.map(requisitoRow).join(",\n")}
)
insert into public.acred_requisitos (
  ambito_id, codigo, nombre, descripcion, medio_verificador,
  obligatorio, permite_no_aplica, requiere_vencimiento, vigencia_dias_sugerida,
  norma_codigo, articulo_ref, fuente_url, criticidad, tipo_evidencia,
  origen_evidencia, requisito_operacional, orden
)
select
  a.id, v.codigo, v.nombre, v.descripcion, v.medio_verificador,
  v.obligatorio, v.permite_no_aplica, v.requiere_vencimiento, v.vigencia_dias_sugerida,
  v.norma_codigo, v.articulo_ref, v.fuente_url, v.criticidad, v.tipo_evidencia,
  v.origen_evidencia, v.requisito_operacional, v.orden
from vals v
join public.acred_ambitos a on a.codigo = v.ambito_codigo
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  medio_verificador = excluded.medio_verificador,
  obligatorio = excluded.obligatorio,
  permite_no_aplica = excluded.permite_no_aplica,
  requiere_vencimiento = excluded.requiere_vencimiento,
  vigencia_dias_sugerida = excluded.vigencia_dias_sugerida,
  norma_codigo = excluded.norma_codigo,
  articulo_ref = excluded.articulo_ref,
  fuente_url = excluded.fuente_url,
  criticidad = excluded.criticidad,
  tipo_evidencia = excluded.tipo_evidencia,
  origen_evidencia = excluded.origen_evidencia,
  requisito_operacional = excluded.requisito_operacional,
  orden = excluded.orden;

`;
}

const schema = fs.readFileSync(schemaPath, "utf8");
const seedBlock = /insert into public\.acred_ambitos[\s\S]*?\n(?=do \$\$)/;

if (!seedBlock.test(schema)) {
  throw new Error("No se pudo ubicar el bloque seed de acreditación en supabase_schema.sql.");
}

const next = schema.replace(seedBlock, buildSeed());

if (next === schema) {
  console.log(`Seed DS20 ya estaba sincronizado: ${DECRETO20_AMBITOS.length} ámbitos, ${DECRETO20_REQUISITOS.length} requisitos.`);
} else {
  fs.writeFileSync(schemaPath, next);
  console.log(`Seed DS20 sincronizado: ${DECRETO20_AMBITOS.length} ámbitos, ${DECRETO20_REQUISITOS.length} requisitos.`);
}

