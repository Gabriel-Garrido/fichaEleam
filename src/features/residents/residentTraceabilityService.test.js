import { describe, expect, it } from "vitest";
import {
  buildTraceSummary,
  eventMatchesTraceQuery,
  filterTraceEvents,
  getTraceQuickRange,
  groupTraceEventsByDate,
  normalizeTraceEvent,
  sanitizeTraceDetail,
} from "./residentTraceabilityService";

describe("resident traceability helpers", () => {
  it("normalizes timeline events with visible labels and tones", () => {
    expect(normalizeTraceEvent({
      id: "1",
      tipo: "tipo_nuevo",
      estado: "resuelto",
      fecha_hora: "2026-05-14T12:00:00.000Z",
      titulo: "Seguimiento pendiente",
      detalle_texto: "Evolución estable",
      responsable_nombre: "Equipo turno",
      prioridad_visual: 0,
    })).toMatchObject({
      key: "tipo_nuevo:1",
      typeLabel: "tipo_nuevo",
      statusLabel: "Resuelto",
      title: "Seguimiento pendiente",
      actorName: "Equipo turno",
      priority: 0,
    });
  });

  it("filters events by searchable text", () => {
    const event = normalizeTraceEvent({
      id: "2",
      tipo: "medicamentos",
      estado: "administrado",
      titulo: "Paracetamol",
      detalle_texto: "Dosis administrada",
    });

    expect(eventMatchesTraceQuery(event, "para")).toBe(true);
    expect(eventMatchesTraceQuery(event, "visita")).toBe(false);
  });

  it("groups events by local date key from their timestamp", () => {
    const groups = groupTraceEventsByDate([
      normalizeTraceEvent({ id: "a", tipo: "cuidado", fecha_hora: "2026-05-14T09:00:00.000Z" }),
      normalizeTraceEvent({ id: "b", tipo: "signos", fecha_hora: "2026-05-14T10:00:00.000Z" }),
      normalizeTraceEvent({ id: "c", tipo: "visitas", fecha_hora: "2026-05-15T10:00:00.000Z" }),
    ]);

    expect(Object.keys(groups).sort()).toEqual(["2026-05-14", "2026-05-15"]);
    expect(groups["2026-05-14"]).toHaveLength(2);
  });

  it("builds operational summary and keeps pending events first", () => {
    const events = [
      normalizeTraceEvent({ id: "done", tipo: "cuidado", estado: "cumplida", fecha_hora: "2026-05-14T09:00:00.000Z" }),
      normalizeTraceEvent({ id: "pending", tipo: "medicamentos", estado: "pendiente_validacion", fecha_hora: "2026-05-13T09:00:00.000Z" }),
    ];

    const summary = buildTraceSummary(events);
    expect(summary).toMatchObject({ total: 2, pending: 1, validation: 1 });
    expect(summary.ordered.map((event) => event.id)).toEqual(["pending", "done"]);
  });

  it("supports quick ranges and client-side filters", () => {
    expect(getTraceQuickRange("hoy", new Date("2026-05-23T12:00:00.000Z"))).toMatchObject({
      desde: "2026-05-23",
      hasta: "2026-05-23",
    });
    expect(getTraceQuickRange("todo", new Date("2026-05-23T12:00:00.000Z"))).toMatchObject({
      desde: "",
      hasta: "2026-05-23",
    });

    const events = [
      normalizeTraceEvent({ id: "a", tipo: "seguimientos", estado: "pendiente", titulo: "Curación" }),
      normalizeTraceEvent({ id: "b", tipo: "visitas", estado: "completada", titulo: "Visita familiar" }),
    ];
    expect(filterTraceEvents(events, { type: "seguimientos", status: "pendiente", query: "cura" }).map((event) => event.id)).toEqual(["a"]);
  });

  it("sanitizes technical JSON details into readable text", () => {
    expect(sanitizeTraceDetail('{"lote_id":"abc","dosis":1,"motivo_omision":null}')).toBe("Lote Id: abc · Dosis: 1 · Motivo Omision: sin dato");
    expect(sanitizeTraceDetail("{broken")).toBe("Detalle técnico disponible");
  });
});
