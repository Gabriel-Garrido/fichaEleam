export const DS20_CORE_ASSESSMENTS = Object.freeze(["barthel", "mna", "mmse"]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function residentPersonalDs20Pending(resident) {
  if (!resident) return [];

  const hasDependency = resident.indice_barthel != null || hasText(resident.nivel_dependencia);
  const hasAllergyStatus = Array.isArray(resident.alergias)
    ? resident.alergias.some((item) => hasText(String(item ?? "")))
    : hasText(resident.alergias);

  return [
    !hasText(resident.prevision) ? "prevision" : null,
    !hasDependency ? "dependencia" : null,
    !hasText(resident.diagnostico_principal) ? "diagnostico_principal" : null,
    !hasAllergyStatus ? "alergias" : null,
  ].filter(Boolean);
}

export function isDs20CoreAssessment(type) {
  return DS20_CORE_ASSESSMENTS.includes(type);
}
