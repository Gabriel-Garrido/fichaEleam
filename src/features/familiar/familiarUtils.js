export function summarizeFamilySnapshot({ care = [], medications = [] } = {}) {
  return {
    careDone: care.filter((item) => item.estado === "cumplida").length,
    carePending: care.filter((item) => ["pendiente", "reprogramada"].includes(item.estado)).length,
    medicationsDone: medications.filter((item) => ["administrado", "validado"].includes(item.estado)).length,
    medicationsPending: medications.filter((item) => item.estado === "pendiente").length,
  };
}

export function applyOwnVisitFilter(query, profileId) {
  return query.eq("profile_id", profileId);
}
