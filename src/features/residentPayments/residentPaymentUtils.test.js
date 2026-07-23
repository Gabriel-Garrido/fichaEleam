import { describe, expect, it } from "vitest";
import { buildPaymentSummary, chargeState, latestDelivery, paidForCharge, validatePaymentFile } from "./residentPaymentUtils";

const charge = { id: "c1", monto: 100000, fecha_vencimiento: "2026-07-10", estado: "activo" };

describe("resident payment calculations", () => {
  it("calcula abonos y saldo sin contar pagos anulados", () => {
    const payments = [
      { charge_id: "c1", monto: 30000, estado: "registrado", fecha_pago: "2026-07-05" },
      { charge_id: "c1", monto: 50000, estado: "anulado", fecha_pago: "2026-07-06" },
    ];
    expect(paidForCharge("c1", payments)).toBe(30000);
    expect(chargeState(charge, payments, new Date("2026-07-22T12:00:00Z")).key).toBe("vencido");
    expect(buildPaymentSummary([charge], payments, new Date("2026-07-22T12:00:00Z"))).toMatchObject({ pending: 70000, overdue: 70000, collectedMonth: 30000 });
  });

  it("marca vencido un saldo pendiente después de la fecha límite", () => {
    expect(chargeState(charge, [], new Date("2026-07-22T12:00:00Z")).key).toBe("vencido");
  });

  it("usa el intento de envío más reciente aunque la API cambie el orden", () => {
    const deliveries = [
      { payment_id: "p1", estado: "fallido", creado_en: "2026-07-20T10:00:00Z" },
      { payment_id: "p1", estado: "enviado", creado_en: "2026-07-20T11:00:00Z" },
    ];
    expect(latestDelivery("p1", deliveries)?.estado).toBe("enviado");
  });

  it("exige respaldo externo seguro", () => {
    expect(validatePaymentFile(null)).toMatch(/Adjunta/);
    expect(validatePaymentFile({ size: 10, type: "text/html" })).toMatch(/PDF/);
    expect(validatePaymentFile({ size: 10, type: "application/pdf" })).toBeNull();
    expect(validatePaymentFile({ size: (5 * 1024 * 1024) + 1, type: "application/pdf" })).toMatch(/5 MB/);
  });
});
