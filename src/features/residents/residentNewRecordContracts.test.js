import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const details = readFileSync(new URL("./ResidentDetails.jsx", import.meta.url), "utf8");
const picker = readFileSync(new URL("./NewResidentRecordModal.jsx", import.meta.url), "utf8");
const controlModal = readFileSync(new URL("../ds20/ResidentHealthControlModal.jsx", import.meta.url), "utf8");
const generalInfo = readFileSync(new URL("../ds20/ResidentDs20Tab.jsx", import.meta.url), "utf8");
const service = readFileSync(new URL("../ds20/ds20Service.js", import.meta.url), "utf8");
const schema = readFileSync(new URL("../../../supabase_schema.sql", import.meta.url), "utf8");

describe("resident new record flow", () => {
  it("offers the three operational record types from one action", () => {
    expect(details).toContain('label="Nuevo registro"');
    expect(picker).toContain('title: "Signos vitales"');
    expect(picker).toContain('title: "Evolución"');
    expect(picker).toContain('title: "Control o derivación"');
  });

  it("keeps health control creation in a focused modal and out of general information", () => {
    expect(controlModal).toContain('title="Registrar control o derivación"');
    expect(controlModal).toContain("saveHealthControl");
    expect(controlModal).toContain("Guardará fecha, responsable, atención e indicaciones en el Historial");
    expect(generalInfo).not.toContain("Controles y derivaciones");
    expect(generalInfo).not.toContain("bundle.controls");
    expect(controlModal).toContain("validateHealthControlForm");
    expect(controlModal).toContain("Observaciones e indicaciones recibidas");
    expect(controlModal).toContain("Centro o lugar de atención");
    expect(controlModal).toContain("Se coordinó con familia o persona significativa");
    expect(schema).toContain("health_controls_registro_minimo_check");
    expect(schema).toContain("tg_table_name = 'health_controls'");
  });

  it("loads only the resident health network when opening the control modal", () => {
    expect(controlModal).toContain("getResidentHealthNetwork");
    const bundle = service.slice(
      service.indexOf("export async function getResidentDs20Bundle"),
      service.indexOf("export async function listActiveHealthCenters"),
    );
    const healthControlsQuery = [".fr", 'om("health_controls")'].join("");
    const healthCentersQuery = [".fr", 'om("health_centers")'].join("");
    expect(bundle).not.toContain(healthControlsQuery);
    expect(bundle).not.toContain(healthCentersQuery);
    expect(service).toContain("export async function listActiveHealthCenters");
  });
});
