import { describe, expect, it } from "vitest";
import {
  buildPendingDecisions,
  nextTurnSlot,
  pendingDecisionIsComplete,
} from "./turnPendingUtils";

describe("gestión de pendientes entre turnos", () => {
  it("calcula el turno siguiente, incluido el cambio de día", () => {
    expect(nextTurnSlot("2026-08-15", "mañana")).toEqual({ fecha: "2026-08-15", turno: "tarde" });
    expect(nextTurnSlot("2026-08-15", "tarde")).toEqual({ fecha: "2026-08-15", turno: "noche" });
    expect(nextTurnSlot("2026-08-15", "noche")).toEqual({ fecha: "2026-08-16", turno: "mañana" });
  });

  it("exige acción y motivo antes de cerrar la entrega", () => {
    expect(pendingDecisionIsComplete({ accion: "traspasar", motivo: "otro" })).toBe(true);
    expect(pendingDecisionIsComplete({ accion: "no_realizada", motivo: "rechazo" })).toBe(true);
    expect(pendingDecisionIsComplete({ accion: "traspasar", motivo: "" })).toBe(false);
  });

  it("construye un payload mínimo y elimina espacios de las notas", () => {
    expect(buildPendingDecisions([{ id: "task-1" }], {
      "task-1": { accion: "traspasar", motivo: "otro", nota: "  Reintentar acompañado.  " },
    })).toEqual([{ tarea_id: "task-1", accion: "traspasar", motivo: "otro", nota: "Reintentar acompañado." }]);
  });
});
