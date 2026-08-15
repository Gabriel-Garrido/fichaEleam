import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const workspace = read("src/features/residents/ResidentEvolutionTab.jsx");
const details = read("src/features/residents/ResidentDetails.jsx");
const history = read("src/features/residents/ResidentTraceabilityTab.jsx");
const recordPicker = read("src/features/residents/NewResidentRecordModal.jsx");
const routes = read("src/routes/AuthenticatedApp.jsx");
const schema = read("supabase_schema.sql");

describe("resident evolution workspace", () => {
  it("keeps observation registration inside the selected resident record", () => {
    expect(details).not.toContain('{ id: "evolucion", label: "Registro de evolución" }');
    expect(details).toContain('label="Nuevo registro"');
    expect(recordPicker).toContain('title: "Evolución"');
    expect(details).toContain("<ResidentObservationModal");
    expect(workspace).toContain("residente_id: residentId");
    expect(workspace).toContain('title="Registrar evolución"');
    expect(workspace).not.toContain("getResidents");
    expect(workspace).not.toContain('label="Residente"');
    expect(workspace).toContain("OBSERVATION_CATEGORY_GUIDANCE");
    expect(workspace).toContain("categoryGuidance.descriptionLabel");
    expect(workspace).toContain("categoryGuidance.actionsLabel");
  });

  it("keeps evolution records in the paginated resident history", () => {
    expect(history).toContain("Buscar en el historial");
    expect(history).toContain("Cargar registros anteriores");
    expect(history).toContain("listResidentTraceability");
    expect(history).toContain("getResidentTraceDetail");
    expect(routes).toContain("<LegacyObservationRedirect />");
    expect(routes).toContain("<LegacyObservationRedirect create />");
    expect(schema).toContain("Evolución · ");
    expect(schema).toContain("when 'cambio_clinico' then 'Cambio clínico o síntoma'");
  });

  it("keeps creation permission checks at the point of action", () => {
    expect(workspace).toContain('can("crear_observaciones")');
    expect(workspace).not.toContain("deleteObservation");
  });
});
