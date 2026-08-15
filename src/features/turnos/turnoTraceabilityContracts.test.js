import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../../../supabase_schema.sql", import.meta.url), "utf8");
const service = readFileSync(new URL("./turnosService.js", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("./TurnosDashboard.jsx", import.meta.url), "utf8");
const printable = readFileSync(new URL("./TurnoPrintable.jsx", import.meta.url), "utf8");
const builder = readFileSync(new URL("./TurnoBuilder.jsx", import.meta.url), "utf8");
const pendingUtils = readFileSync(new URL("./turnPendingUtils.js", import.meta.url), "utf8");

describe("entregas de turno trazables y eficientes", () => {
  it("protege registro e historial con permisos separados", () => {
    expect(schema).toContain("registrar_entregas_turno boolean");
    expect(schema).toContain("ver_entregas_turno       boolean");
    expect(schema).toContain("funcionario_can('ver_entregas_turno')");
    expect(schema).toContain("funcionario_can('registrar_entregas_turno')");
  });

  it("conserva cada versión y bloquea el borrado operativo", () => {
    expect(schema).toContain("create table if not exists public.turno_entregas_audit");
    expect(schema).toContain("create trigger trg_turno_entregas_audit");
    expect(schema).toMatch(/create policy "te_delete"[\s\S]*?public\.is_superadmin\(\)[\s\S]*?\);/);
  });

  it("resuelve los cuidados pendientes junto con la entrega en una transacción", () => {
    expect(schema).toContain("create or replace function public.guardar_entrega_turno(");
    expect(schema).toContain("'traspasada_turno'");
    expect(schema).toContain("'{gestion_pendientes}'");
    expect(schema).toContain("Cada cuidado pendiente debe tener una sola decisión");
    expect(schema).toContain("Tarea de cuidado no realizada al entregar turno");
    expect(service).toContain('"guardar_entrega_turno"');
    expect(builder).toContain("Resolver cuidados pendientes");
    expect(pendingUtils).toContain("Pasar al siguiente turno");
  });

  it("pagina y filtra el historial sin descargar el resumen clínico", () => {
    const listImplementation = service.slice(service.indexOf("export async function listTurnoEntregas"), service.indexOf("export async function getTurnoEntrega"));
    expect(listImplementation).toContain(".range(");
    expect(listImplementation).toContain('if (turno) query = query.eq("turno", turno)');
    expect(listImplementation).not.toContain("resumen_json");
    expect(dashboard).toContain("Cargar entregas anteriores");
  });

  it("genera una impresión compacta sin secciones vacías", () => {
    expect(printable).toContain("@page { size: A4 portrait; margin: 9mm; }");
    expect(printable).toContain("if (!items?.length) return null");
    expect(printable).toContain("turno-print-row");
    expect(builder).toContain("Información para el siguiente turno");
    expect(printable).toContain("Decisiones sobre cuidados pendientes");
    expect(builder).not.toContain("Actividad del turno");
  });
});
