export const BED_STATUS_LABELS = {
  operativa: "Operativa",
  mantenimiento: "Mantenimiento",
  inactiva: "Inactiva",
};

export const ASSIGNMENT_STATUS_LABELS = {
  ocupada: "Ocupada",
  reservada_hospitalizacion: "Reservada por hospitalizacion",
};

export function normalizeCode(value) {
  return String(value ?? "").trim();
}

export function formatBedLocation(cama) {
  if (!cama) return "Sin cama asignada";
  const room = cama.habitacion ?? cama.habitaciones ?? null;
  const roomCode = normalizeCode(room?.codigo);
  const bedCode = normalizeCode(cama.codigo);

  if (roomCode && bedCode) return `Hab. ${roomCode} · Cama ${bedCode}`;
  if (roomCode) return `Hab. ${roomCode}`;
  if (bedCode) return `Cama ${bedCode}`;
  return "Sin cama asignada";
}

export function withResidentLocation(resident) {
  if (!resident) return resident;
  const bed = resident.cama_actual ?? resident.camas ?? null;
  const room = bed?.habitacion ?? bed?.habitaciones ?? null;
  return {
    ...resident,
    habitacion: room?.codigo ?? null,
    cama: bed?.codigo ?? null,
    ubicacion_label: formatBedLocation(bed),
  };
}

export function normalizeAssignment(assignment) {
  if (!assignment) return null;
  return {
    ...assignment,
    residente: withResidentLocation(assignment.residente ?? assignment.residentes ?? null),
  };
}

export function attachAssignmentsToBeds(camas = [], assignments = []) {
  const activeByBed = new Map();
  for (const assignment of assignments) {
    if (!assignment?.cama_id || assignment.fecha_fin) continue;
    activeByBed.set(assignment.cama_id, normalizeAssignment(assignment));
  }
  return camas.map((bed) => ({
    ...bed,
    assignment: activeByBed.get(bed.id) ?? null,
  }));
}

export function buildBedMetrics({ camas = [], residentes = [] } = {}) {
  const isOperative = (bed) => bed.estado === "operativa" && (bed.habitacion?.estado ?? "operativa") === "operativa";
  const total = camas.length;
  const operativas = camas.filter(isOperative).length;
  const ocupadas = camas.filter((bed) => bed.assignment?.estado === "ocupada").length;
  const reservadasHospitalizacion = camas.filter(
    (bed) => bed.assignment?.estado === "reservada_hospitalizacion"
  ).length;
  const fueraServicio = camas.filter((bed) => !isOperative(bed)).length;
  const disponibles = camas.filter((bed) =>
    isOperative(bed) && !bed.assignment
  ).length;
  const residentesSinCama = residentes.filter((resident) =>
    resident.estado === "activo" && !resident.cama_actual_id
  ).length;
  const ocupacionBase = Math.max(operativas, 0);
  const porcentajeOcupacion = ocupacionBase
    ? Math.round(((ocupadas + reservadasHospitalizacion) / ocupacionBase) * 100)
    : 0;

  return {
    total,
    operativas,
    ocupadas,
    reservadasHospitalizacion,
    disponibles,
    fueraServicio,
    residentesSinCama,
    porcentajeOcupacion,
  };
}

export function groupBedsByRoom(habitaciones = [], camas = []) {
  const byRoom = new Map(
    habitaciones.map((room) => [room.id, { ...room, camas: [] }])
  );

  for (const bed of camas) {
    const roomId = bed.habitacion_id ?? bed.habitacion?.id ?? bed.habitaciones?.id;
    if (!byRoom.has(roomId)) {
      byRoom.set(roomId ?? "sin-habitacion", {
        id: roomId ?? "sin-habitacion",
        codigo: "Sin habitacion",
        nombre: null,
        estado: "inactiva",
        camas: [],
      });
    }
    byRoom.get(roomId ?? "sin-habitacion").camas.push(bed);
  }

  return [...byRoom.values()]
    .map((room) => ({
      ...room,
      camas: [...room.camas].sort((a, b) =>
        (a.orden ?? 0) - (b.orden ?? 0) || normalizeCode(a.codigo).localeCompare(normalizeCode(b.codigo))
      ),
    }))
    .sort((a, b) =>
      (a.orden ?? 0) - (b.orden ?? 0) || normalizeCode(a.codigo).localeCompare(normalizeCode(b.codigo))
    );
}
