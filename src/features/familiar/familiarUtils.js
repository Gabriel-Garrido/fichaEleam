export function summarizeFamilySnapshot({ care = [], medications = [] } = {}) {
  return {
    careDone: care.filter((item) => item.estado === "cumplida").length,
    carePending: care.filter((item) => item.estado === "pendiente").length,
    medicationsDone: medications.filter((item) => ["administrado", "validado"].includes(item.estado)).length,
    medicationsPending: medications.filter((item) => item.estado === "pendiente").length,
  };
}
