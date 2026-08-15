export const PENDING_ACTIONS = [
  ["traspasar", "Pasar al siguiente turno"],
  ["no_realizada", "Registrar como no realizada"],
];

export const PENDING_REASON_OPTIONS = [
  ["rechazo", "Rechazo del residente"],
  ["no_disponible", "Recurso o apoyo no disponible"],
  ["contraindicado", "No correspondía realizarla"],
  ["residente_ausente", "Residente ausente o no disponible"],
  ["otro", "Otro motivo"],
];

export const PENDING_REASON_LABEL = Object.fromEntries(PENDING_REASON_OPTIONS);

export function nextTurnSlot(fecha, turno) {
  const base = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(base.valueOf())) return null;
  if (turno === "mañana") return { fecha, turno: "tarde" };
  if (turno === "tarde") return { fecha, turno: "noche" };
  if (turno !== "noche") return null;
  base.setDate(base.getDate() + 1);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return { fecha: `${year}-${month}-${day}`, turno: "mañana" };
}

export function pendingDecisionIsComplete(decision) {
  return ["traspasar", "no_realizada"].includes(decision?.accion)
    && PENDING_REASON_LABEL[decision?.motivo] != null;
}

export function buildPendingDecisions(tasks = [], decisions = {}) {
  return tasks.map((task) => ({
    tarea_id: task.id,
    accion: decisions[task.id]?.accion ?? "",
    motivo: decisions[task.id]?.motivo ?? "",
    nota: decisions[task.id]?.nota?.trim() || null,
  }));
}
