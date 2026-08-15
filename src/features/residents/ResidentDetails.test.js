import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeResidentTab } from "./residentUtils";

const detailsSource = readFileSync(new URL("./ResidentDetails.jsx", import.meta.url), "utf8");

describe("ResidentDetails navigation", () => {
  it("preserva enlaces antiguos sin reintroducir pestañas duplicadas", () => {
    expect(normalizeResidentTab("info")).toBe("general");
    expect(normalizeResidentTab("resumen")).toBe("general");
    expect(normalizeResidentTab("ds20")).toBe("general");
    expect(normalizeResidentTab("signos")).toBe("general");
    expect(normalizeResidentTab("observaciones")).toBe("trazabilidad");
    expect(normalizeResidentTab("evolution")).toBe("trazabilidad");
    expect(normalizeResidentTab("tareas")).toBe("general");
    expect(normalizeResidentTab("turno")).toBe("general");
  });

  it("acepta secciones vigentes y recupera valores desconocidos", () => {
    expect(normalizeResidentTab("emar")).toBe("emar");
    expect(normalizeResidentTab("evolucion")).toBe("trazabilidad");
    expect(normalizeResidentTab("desconocida")).toBe("general");
  });

  it("mantiene los antecedentes personales plegables junto al nombre sin duplicarlos en el resumen", () => {
    expect(detailsSource).toContain("Ver antecedentes personales");
    expect(detailsSource).toContain('aria-controls="resident-personal-details"');
    expect(detailsSource).not.toContain('>Datos esenciales<');
    expect(detailsSource).toContain('label="Dependencia"');
    expect(detailsSource).toContain("barthelDependency || resident.nivel_dependencia");
    expect(detailsSource).toContain("Resultado del último Barthel");
    expect(detailsSource).toContain('label="Diagnóstico principal"');
    expect(detailsSource).toContain('label="Alergias"');
    expect(detailsSource).toContain("Editar datos del residente");
    expect(detailsSource).not.toContain("function Essential(");
  });

  it("ubica las acciones en la cabecera de la ficha", () => {
    expect(detailsSource.indexOf('id="resident-quick-actions"')).toBeLessThan(detailsSource.indexOf("<TabBar"));
    expect(detailsSource).toContain('>Acciones</h2>');
    expect(detailsSource).not.toContain('label: "Registro de evolución"');
    expect(detailsSource).toContain("<ResidentObservationModal");
    expect(detailsSource).toContain('label="Nuevo registro"');
    expect(detailsSource).not.toContain('label="Registrar signos"');
    expect(detailsSource).not.toContain('label="Registrar evolución"');
    expect(detailsSource).toContain("<NewResidentRecordModal");
    expect(detailsSource).toContain("<ResidentHealthControlModal");
    expect(detailsSource).toContain('label="Ver tareas pendientes"');
    expect(detailsSource).toContain("view=pendientes&q=");
    expect(detailsSource).not.toContain('label="Revisar ingreso"');
    expect(detailsSource).not.toContain('{ id: "turno", label: "Turno" }');
  });

  it("agrupa resumen e ingreso en una sola pestaña de información general", () => {
    expect(detailsSource).toContain('{ id: "general", label: "Información general" }');
    expect(detailsSource).not.toContain('{ id: "ds20", label: "Ingreso SEREMI" }');
    expect(detailsSource).toContain("<ResidentDs20Tab resident={resident}");
  });
});
