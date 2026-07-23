export const PAYMENT_METHODS = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  otro: "Otro",
};

export const DOCUMENT_TYPES = {
  boleta: "Boleta emitida externamente",
  factura: "Factura emitida externamente",
  comprobante_pago: "Comprobante de pago externo",
  otro: "Otro respaldo",
};

function dateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function paidForCharge(chargeId, payments = []) {
  return payments
    .filter((payment) => payment.charge_id === chargeId && payment.estado === "registrado")
    .reduce((sum, payment) => sum + Number(payment.monto || 0), 0);
}

export function chargeState(charge, payments = [], today = new Date()) {
  if (charge.estado === "anulado") return { key: "anulado", label: "Anulado", tone: "slate" };
  const paid = paidForCharge(charge.id, payments);
  if (paid >= Number(charge.monto)) return { key: "pagado", label: "Pagado", tone: "emerald" };
  const todayText = dateKey(today);
  if (charge.fecha_vencimiento < todayText) return { key: "vencido", label: paid > 0 ? "Vencido · pago parcial" : "Vencido", tone: "rose" };
  if (paid > 0) return { key: "parcial", label: "Pago parcial", tone: "sky" };
  return { key: "pendiente", label: "Pendiente", tone: "amber" };
}

export function buildPaymentSummary(charges = [], payments = [], today = new Date()) {
  const activeCharges = charges.filter((charge) => charge.estado === "activo");
  const totalCharged = activeCharges.reduce((sum, charge) => sum + Number(charge.monto || 0), 0);
  const totalPaid = activeCharges.reduce((sum, charge) => sum + paidForCharge(charge.id, payments), 0);
  const overdue = activeCharges.reduce((sum, charge) => {
    if (chargeState(charge, payments, today).key !== "vencido") return sum;
    return sum + Math.max(0, charge.monto - paidForCharge(charge.id, payments));
  }, 0);
  const currentMonth = dateKey(today).slice(0, 7);
  const collectedMonth = payments
    .filter((payment) => payment.estado === "registrado" && payment.fecha_pago?.startsWith(currentMonth))
    .reduce((sum, payment) => sum + Number(payment.monto || 0), 0);
  return { totalCharged, totalPaid, pending: Math.max(0, totalCharged - totalPaid), overdue, collectedMonth };
}

export function latestDelivery(paymentId, deliveries = []) {
  return deliveries
    .filter((delivery) => delivery.payment_id === paymentId)
    .sort((left, right) => new Date(right.creado_en ?? 0) - new Date(left.creado_en ?? 0))[0] ?? null;
}

export function validatePaymentFile(file) {
  if (!file) return "Adjunta la boleta, factura o comprobante externo.";
  if (file.size > 5 * 1024 * 1024) return "El archivo supera los 5 MB.";
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return "Usa un archivo PDF, JPG o PNG.";
  return null;
}

export function formatClp(value) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function residentName(resident) {
  return resident ? `${resident.nombre ?? ""} ${resident.apellido ?? ""}`.trim() : "Residente";
}
