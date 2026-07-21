import { describe, expect, it } from "vitest";
import {
  buildStockLotAlerts,
  buildMedicationMetrics,
  DEFAULT_MEDICATION_INDICATION,
  daysUntilLotExpiry,
  getMedicationTurnFocus,
  getStockLotStatus,
  matchesMedicationFilter,
  sortMedicationRowsByFocus,
  sortStockLotsByExpiry,
  summarizeMedicationSchedule,
  validateMedicationIndicationDraft,
} from "./emarUi";

const med = (overrides) => ({
  id: overrides.id,
  fecha: "2026-05-23",
  hora: overrides.hora ?? "09:00",
  estado: overrides.estado ?? "pendiente",
  indicacion: { es_controlado: overrides.controlado === true },
  _overdue: overrides.overdue === true,
});

describe("emarUi medication board helpers", () => {
  it("orders overdue, pending, validation and closed rows for operational focus", () => {
    const sorted = sortMedicationRowsByFocus([
      med({ id: "closed", estado: "administrado", hora: "08:00" }),
      med({ id: "validate", estado: "pendiente_validacion", hora: "07:00" }),
      med({ id: "pending", estado: "pendiente", hora: "11:00" }),
      med({ id: "overdue", estado: "pendiente", hora: "12:00", overdue: true }),
    ], (row) => row._overdue);

    expect(sorted.map((row) => row.id)).toEqual(["overdue", "pending", "validate", "closed"]);
  });

  it("builds actionable medication metrics", () => {
    const metrics = buildMedicationMetrics([
      med({ id: "pending", estado: "pendiente", overdue: true }),
      med({ id: "validate", estado: "pendiente_validacion", controlado: true }),
      med({ id: "done", estado: "validado", controlado: true }),
      med({ id: "omitted", estado: "omitido" }),
    ], (row) => row._overdue);

    expect(metrics).toEqual({
      total: 4,
      pendientes: 1,
      porValidar: 1,
      completadas: 2,
      omitidas: 1,
      controlados: 2,
      vencidas: 1,
    });
  });

  it("filters rows with task-board style segments", () => {
    expect(matchesMedicationFilter(med({ estado: "pendiente" }), "ahora")).toBe(true);
    expect(matchesMedicationFilter(med({ estado: "pendiente_validacion" }), "por_validar")).toBe(true);
    expect(matchesMedicationFilter(med({ estado: "validado" }), "completadas")).toBe(true);
    expect(matchesMedicationFilter(med({ estado: "validado" }), "pendientes")).toBe(false);
  });

  it("chooses the highest-signal focus message without technical labels", () => {
    expect(getMedicationTurnFocus({ vencidas: 2 }).title).toBe("2 medicamentos vencidos");
    expect(getMedicationTurnFocus({ vencidas: 0, pendientes: 1 }).tone).toBe("amber");
    expect(getMedicationTurnFocus({ vencidas: 0, pendientes: 0, porValidar: 1 }).title).toBe("1 registro por validar");
    expect(getMedicationTurnFocus({ vencidas: 0, pendientes: 0, porValidar: 0 }).tone).toBe("emerald");
  });
});

describe("emarUi indication helpers", () => {
  it("summarizes daily, weekly, monthly and one-time schedules", () => {
    expect(summarizeMedicationSchedule({ frecuencia: "diaria", turno: "mañana", hora: "09:00" })).toBe("mañana · 09:00 · diaria");
    expect(summarizeMedicationSchedule({ frecuencia: "semanal", turno: "tarde", hora: "15:30", dias_semana: [1, 3] })).toBe("tarde · 15:30 · semanal (lun, mie)");
    expect(summarizeMedicationSchedule({ frecuencia: "mensual", turno: "noche", hora: "22:00", dias_mes: [5, 20] })).toBe("noche · 22:00 · mensual dia 5, 20");
    expect(summarizeMedicationSchedule({ frecuencia: "una_vez", turno: "mañana", hora: "08:00", fecha_unica: "2026-05-25" })).toBe("mañana · 08:00 · 2026-05-25");
  });

  it("validates quick indication defaults and family visibility", () => {
    expect(validateMedicationIndicationDraft({}, [])).toMatchObject({
      medicamento_nombre: "Medicamento obligatorio",
      dosis: "Dosis obligatoria",
      schedules: "Agrega al menos un horario",
    });

    expect(validateMedicationIndicationDraft(
      { medicamento_nombre: "Paracetamol", dosis: "1 comprimido", visible_familiar: true, resumen_familiar: "" },
      [{ frecuencia: "diaria", turno: "mañana", hora: "09:00" }],
    )).toMatchObject({
      resumen_familiar: "Agrega un resumen antes de publicar a familia",
    });

    expect(validateMedicationIndicationDraft(
      { medicamento_nombre: "Paracetamol", dosis: "1 comprimido", prescriptor_nombre: "Dra. Pérez", fecha_inicio: "2026-05-23", visible_familiar: true, resumen_familiar: "Analgésico indicado." },
      [{ frecuencia: "diaria", turno: "mañana", hora: "09:00" }],
    )).toEqual({});
  });

  it("mantiene el inventario fuera del flujo habitual", () => {
    expect(DEFAULT_MEDICATION_INDICATION.requiere_stock).toBe(false);
  });
});

describe("emarUi stock lot expiry helpers", () => {
  const now = new Date("2026-05-23T10:00:00");

  it("calculates days to expiry using the 30-day policy", () => {
    expect(daysUntilLotExpiry({ fecha_vencimiento: "2026-05-24" }, now)).toBe(1);
    expect(daysUntilLotExpiry({ fecha_vencimiento: "2026-05-22" }, now)).toBe(-1);
    expect(daysUntilLotExpiry({ fecha_vencimiento: "" }, now)).toBeNull();
  });

  it("classifies active, expiring, expired and empty lots", () => {
    expect(getStockLotStatus({ cantidad_actual: 3, estado: "activo", fecha_vencimiento: "2026-07-01" }, now)).toMatchObject({ key: "activo", blocked: false });
    expect(getStockLotStatus({ cantidad_actual: 3, estado: "activo", fecha_vencimiento: "2026-06-10" }, now)).toMatchObject({ key: "por_vencer", blocked: false });
    expect(getStockLotStatus({ cantidad_actual: 3, estado: "activo", fecha_vencimiento: "2026-05-01" }, now)).toMatchObject({ key: "vencido", blocked: true });
    expect(getStockLotStatus({ cantidad_actual: 0, estado: "activo", fecha_vencimiento: "2026-07-01" }, now)).toMatchObject({ key: "sin_stock", blocked: true });
  });

  it("prioritizes usable lots by closest expiry and moves blocked lots last", () => {
    const sorted = sortStockLotsByExpiry([
      { id: "expired", medicamento_nombre: "A", cantidad_actual: 2, estado: "activo", fecha_vencimiento: "2026-05-01" },
      { id: "far", medicamento_nombre: "A", cantidad_actual: 2, estado: "activo", fecha_vencimiento: "2026-08-01" },
      { id: "soon", medicamento_nombre: "A", cantidad_actual: 2, estado: "activo", fecha_vencimiento: "2026-05-30" },
      { id: "empty", medicamento_nombre: "A", cantidad_actual: 0, estado: "activo", fecha_vencimiento: "2026-05-25" },
    ], now);

    expect(sorted.map((lot) => lot.id)).toEqual(["soon", "far", "empty", "expired"]);
  });

  it("builds separated operational alerts", () => {
    const alerts = buildStockLotAlerts([
      { id: "expired", cantidad_actual: 2, estado: "activo", fecha_vencimiento: "2026-05-01" },
      { id: "soon", cantidad_actual: 2, estado: "activo", fecha_vencimiento: "2026-05-30" },
      { id: "empty", cantidad_actual: 0, estado: "activo", fecha_vencimiento: "2026-07-01" },
    ], now);

    expect(alerts.vencidos).toHaveLength(1);
    expect(alerts.porVencer).toHaveLength(1);
    expect(alerts.sinStock).toHaveLength(1);
  });
});
