import { describe, expect, it } from "vitest";
import {
  ADVERSE_EVENT_ACTION_EMPTY,
  ADVERSE_EVENT_CLOSE_EMPTY,
  ADVERSE_EVENT_EMPTY,
  validateAdverseEventActionForm,
  validateAdverseEventCloseForm,
  validateAdverseEventForm,
} from "./eventosAdversosFormSchema";

const base = {
  ...ADVERSE_EVENT_EMPTY,
  fecha_evento: "2026-05-25",
  categoria: "caida_sin_lesion",
  severidad: "leve",
  estado: "registrado",
  descripcion: "Residente cayó desde la cama sin lesiones aparentes; se evaluó signos vitales y sin alteraciones.",
};

describe("validateAdverseEventForm", () => {
  it("acepta un evento básico válido", () => {
    const r = validateAdverseEventForm(base);
    expect(r.ok).toBe(true);
    expect(r.data.descripcion).toBeTruthy();
    expect(r.data.categoria).toBe("caida_sin_lesion");
  });

  it("rechaza descripción muy corta", () => {
    const r = validateAdverseEventForm({ ...base, descripcion: "Caída." });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveProperty("descripcion");
  });

  it("rechaza categoría inválida", () => {
    const r = validateAdverseEventForm({ ...base, categoria: "" });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveProperty("categoria");
  });

  it("exige medio_notificacion_familia cuando notificado_familia es true", () => {
    const r = validateAdverseEventForm({ ...base, notificado_familia: true });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveProperty("medio_notificacion_familia");
  });

  it("acepta notificado_familia con medio", () => {
    const r = validateAdverseEventForm({
      ...base,
      notificado_familia: true,
      medio_notificacion_familia: "telefono",
    });
    expect(r.ok).toBe(true);
  });

  it("rechaza hora con formato inválido", () => {
    const r = validateAdverseEventForm({ ...base, hora_evento: "25:99" });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveProperty("hora_evento");
  });

  it("acepta hora HH:MM válida", () => {
    const r = validateAdverseEventForm({ ...base, hora_evento: "08:30" });
    expect(r.ok).toBe(true);
    expect(r.data.hora_evento).toBe("08:30");
  });
});

describe("validateAdverseEventActionForm", () => {
  it("requiere descripción y tipo", () => {
    const r = validateAdverseEventActionForm({ ...ADVERSE_EVENT_ACTION_EMPTY });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveProperty("descripcion");
  });

  it("acepta acción mínima válida", () => {
    const r = validateAdverseEventActionForm({ tipo: "contacto_familia", descripcion: "Se llamó a la familia para informar." });
    expect(r.ok).toBe(true);
    expect(r.data.tipo).toBe("contacto_familia");
  });

  it("rechaza tipo desconocido", () => {
    const r = validateAdverseEventActionForm({ tipo: "inventado", descripcion: "x" });
    expect(r.ok).toBe(false);
  });
});

describe("validateAdverseEventCloseForm", () => {
  it("rechaza conclusiones muy cortas", () => {
    const r = validateAdverseEventCloseForm({ ...ADVERSE_EVENT_CLOSE_EMPTY, conclusiones: "Listo" });
    expect(r.ok).toBe(false);
  });

  it("acepta conclusiones con >= 10 caracteres", () => {
    const r = validateAdverseEventCloseForm({ conclusiones: "Se resolvió sin incidentes adicionales." });
    expect(r.ok).toBe(true);
  });
});
