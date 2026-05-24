import { describe, expect, it } from "vitest";
import {
  buildTaskMetrics,
  getTurnFocus,
  normalizeSeguimiento,
  sortWorkItemsByUrgency,
} from "./careTasksBoardUtils";

describe("careTasksBoardUtils board helpers", () => {
  it("builds operational metrics across task sources", () => {
    const metrics = buildTaskMetrics([
      { source: "care", estado: "pendiente", open: true, overdue: true },
      { source: "care", estado: "reprogramada", open: true, overdue: false },
      { source: "med", estado: "pendiente_validacion", open: true, overdue: false },
      { source: "vitals", estado: "pendiente", open: true, overdue: false },
      { source: "seguimiento", estado: "pendiente", open: true, overdue: false },
    ]);

    expect(metrics).toMatchObject({
      total: 5,
      pendientes: 5,
      vencidas: 1,
      cuidado: 2,
      medicamentos: 1,
      signos: 1,
      seguimientos: 1,
      porValidar: 1,
      reprogramadas: 1,
    });
  });

  it("sorts open overdue and urgent items first", () => {
    const sorted = sortWorkItemsByUrgency([
      { key: "closed", source: "care", open: false, overdue: false, priority: "urgente", fecha: "2026-05-14", hora: "08:00" },
      { key: "normal", source: "vitals", open: true, overdue: false, priority: "media", fecha: "2026-05-14", hora: "08:00" },
      { key: "overdue", source: "care", open: true, overdue: true, priority: "media", fecha: "2026-05-14", hora: "10:00" },
      { key: "urgent", source: "med", open: true, overdue: false, priority: "urgente", fecha: "2026-05-14", hora: "09:00" },
    ]);

    expect(sorted.map((item) => item.key)).toEqual(["overdue", "urgent", "normal", "closed"]);
  });

  it("normalizes follow-ups as actionable pending work and prioritizes them by source", () => {
    const followUp = normalizeSeguimiento({
      id: "obs-1",
      tipo: "curacion",
      descripcion: "Revisar evolución de curación",
      seguimiento_fecha: "2026-05-14",
      seguimiento_turno: "mañana",
      residentes: { nombre: "Ana", apellido: "Paz" },
    });

    expect(followUp).toMatchObject({
      key: "seg:obs-1",
      source: "seguimiento",
      estado: "pendiente",
      title: "Control de seguimiento",
      typeLabel: "Seguimiento",
      open: true,
      priority: "alta",
    });

    const sorted = sortWorkItemsByUrgency([
      { key: "care", source: "care", open: true, overdue: false, priority: "alta", fecha: "2026-05-14", hora: "09:00" },
      followUp,
    ]);

    expect(sorted.map((item) => item.key)).toEqual(["seg:obs-1", "care"]);
  });

  it("chooses the highest-signal turn focus", () => {
    expect(getTurnFocus({ porValidar: 1, vencidas: 3 }).title).toBe("1 medicamento por validar");
    expect(getTurnFocus({ porValidar: 0, vencidas: 2 }).tone).toBe("rose");
    expect(getTurnFocus({ porValidar: 0, vencidas: 0, pendientes: 4 }).tone).toBe("teal");
    expect(getTurnFocus({ porValidar: 0, vencidas: 0, pendientes: 0 }).tone).toBe("emerald");
  });
});
