import { describe, expect, it } from "vitest";
import {
  crmProspectImportConfig,
  normalizeProspectRows,
} from "./crmProspectImportConfig";

function row(rowNumber, raw) {
  return { rowNumber, raw };
}

describe("crmProspectImportConfig", () => {
  it("exports the sales funnel columns required by sales", () => {
    const keys = crmProspectImportConfig.columns.map((c) => c.key);
    expect(keys).toEqual([
      "eleam_nombre",
      "comuna",
      "telefono",
      "email",
      "origen",
      "canal_preferido",
      "cargo_contacto",
      "decision_maker_nombre",
      "decision_maker_cargo",
      "num_residentes",
      "digitalizacion_estado",
      "software_actual",
      "dolor_principal",
      "urgencia",
      "fit_score",
      "proxima_accion_fecha",
      "facebook_url",
      "instagram_url",
      "tiktok_url",
      "notas",
    ]);
  });

  it("only eleam_nombre is required", () => {
    const required = crmProspectImportConfig.columns.filter((c) => c.required);
    expect(required.map((c) => c.key)).toEqual(["eleam_nombre"]);
  });

  it("declares native Excel validations for commercial enums and dates", () => {
    const byKey = Object.fromEntries(crmProspectImportConfig.columns.map((c) => [c.key, c]));

    expect(byKey.origen.validationList).toContain("import_excel");
    expect(byKey.canal_preferido.validationList).toContain("telefono");
    expect(byKey.digitalizacion_estado.validationList).toContain("papel_excel_whatsapp");
    expect(byKey.urgencia.validationList).toContain("alta");
    expect(byKey.proxima_accion_fecha.type).toBe("date");
  });
});

describe("normalizeProspectRows", () => {
  it("skips fully blank rows", () => {
    const rows = [
      row(2, { eleam_nombre: "", comuna: "", telefono: "", email: "" }),
      row(3, { eleam_nombre: "ELEAM A" }),
    ];
    const result = normalizeProspectRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].payload.eleam_nombre).toBe("ELEAM A");
  });

  it("requires eleam_nombre", () => {
    const result = normalizeProspectRows([row(2, { email: "foo@bar.cl" })]);
    expect(result).toHaveLength(1);
    expect(result[0].errors).toContain("\"Nombre del ELEAM\" es obligatorio.");
    expect(result[0].payload).toBeNull();
  });

  it("normalizes email to lowercase and detects duplicates within the file", () => {
    const result = normalizeProspectRows([
      row(2, { eleam_nombre: "A", email: "Contacto@Ejemplo.cl" }),
      row(3, { eleam_nombre: "B", email: "CONTACTO@ejemplo.cl" }),
    ]);
    expect(result[0].payload.email).toBe("contacto@ejemplo.cl");
    expect(result[1].errors).toContain("Correo duplicado dentro de la planilla.");
  });

  it("detects duplicates against existing prospects", () => {
    const result = normalizeProspectRows(
      [row(2, { eleam_nombre: "A", email: "yaexiste@x.cl" })],
      { existingProspects: [{ email: "Yaexiste@X.cl" }] },
    );
    expect(result[0].errors).toContain("Este correo ya existe en la base de prospectos.");
  });

  it("rejects malformed emails", () => {
    const result = normalizeProspectRows([
      row(2, { eleam_nombre: "A", email: "no-es-un-correo" }),
    ]);
    expect(result[0].errors).toContain("Correo electrónico inválido.");
  });

  it("normalizes URLs adding https:// when missing", () => {
    const result = normalizeProspectRows([
      row(2, {
        eleam_nombre: "A",
        facebook_url: "facebook.com/mipage",
        instagram_url: "https://instagram.com/mipage",
        tiktok_url: "tiktok.com/@mipage",
      }),
    ]);
    expect(result[0].errors).toEqual([]);
    expect(result[0].payload.facebook_url).toBe("https://facebook.com/mipage");
    expect(result[0].payload.instagram_url).toBe("https://instagram.com/mipage");
    expect(result[0].payload.tiktok_url).toBe("https://tiktok.com/@mipage");
  });

  it("rejects URLs without a host with a dot", () => {
    const result = normalizeProspectRows([
      row(2, { eleam_nombre: "A", facebook_url: "no-es-url" }),
    ]);
    expect(result[0].errors.some((e) => e.includes("link facebook"))).toBe(true);
  });

  it("trims long notes and does not accept per-prospect copy", () => {
    const long = "x".repeat(6000);
    const result = normalizeProspectRows([
      row(2, { eleam_nombre: "A", notas: long }),
    ]);
    expect(result[0].payload.notas).toHaveLength(3000);
    expect(result[0].payload).not.toHaveProperty("correo_sugerido");
    expect(result[0].payload).not.toHaveProperty("script_llamada_sugerido");
  });

  it("keeps free text notes as scalar text", () => {
    const result = normalizeProspectRows([
      row(2, { eleam_nombre: "A", notas: "Prospecto en investigación por fiscalización cercana." }),
    ]);

    expect(result[0].errors).toEqual([]);
    expect(result[0].payload.notas).toBe("Prospecto en investigación por fiscalización cercana.");
  });

  it("ignores empty phone but validates when present", () => {
    const result = normalizeProspectRows([
      row(2, { eleam_nombre: "A", telefono: "" }),
      row(3, { eleam_nombre: "B", telefono: "123" }),
    ]);
    expect(result[0].payload.telefono).toBeNull();
    expect(result[1].errors.some((e) => e.toLowerCase().includes("teléfono"))).toBe(true);
  });

  it("accepts row without email (RRSS-only prospect)", () => {
    const result = normalizeProspectRows([
      row(2, { eleam_nombre: "A", facebook_url: "facebook.com/a" }),
    ]);
    expect(result[0].errors).toEqual([]);
    expect(result[0].payload.email).toBeNull();
  });

  it("treats No encontrado as empty optional data", () => {
    const result = normalizeProspectRows([
      row(2, {
        eleam_nombre: "A",
        comuna: "No encontrado",
        telefono: "No encontrado",
        email: "No encontrado",
        facebook_url: "No encontrado",
        instagram_url: "No encontrado",
        tiktok_url: "No encontrado",
        software_actual: "No encontrado",
        dolor_principal: "No encontrado",
        notas: "No encontrado",
      }),
    ]);
    expect(result[0].errors).toEqual([]);
    expect(result[0].payload).toMatchObject({
      comuna: null,
      telefono: null,
      email: null,
      facebook_url: null,
      instagram_url: null,
      tiktok_url: null,
      software_actual: null,
      dolor_principal: null,
      notas: null,
    });
  });

  it("normalizes commercial fields", () => {
    const result = normalizeProspectRows([
      row(2, {
        eleam_nombre: "A",
        origen: "Excel",
        canal_preferido: "Teléfono",
        digitalizacion_estado: "Papel",
        urgencia: "Alta",
        num_residentes: "32",
        fit_score: "91",
        proxima_accion_fecha: "2026-06-04",
        dolor_principal: "Carpeta SEREMI y turnos",
      }),
    ]);
    expect(result[0].errors).toEqual([]);
    expect(result[0].payload).toMatchObject({
      origen: "import_excel",
      canal_preferido: "telefono",
      digitalizacion_estado: "papel_excel_whatsapp",
      urgencia: "alta",
      num_residentes: 32,
      fit_score: 91,
      proxima_accion_fecha: "2026-06-04",
    });
  });

  it("accepts real Excel dates and text dates", () => {
    const result = normalizeProspectRows([
      row(2, { eleam_nombre: "A", proxima_accion_fecha: new Date(Date.UTC(2026, 5, 4)) }),
      row(3, { eleam_nombre: "B", proxima_accion_fecha: "2026-06-05" }),
    ]);

    expect(result[0].errors).toEqual([]);
    expect(result[0].payload.proxima_accion_fecha).toBe("2026-06-04");
    expect(result[1].errors).toEqual([]);
    expect(result[1].payload.proxima_accion_fecha).toBe("2026-06-05");
  });
});
