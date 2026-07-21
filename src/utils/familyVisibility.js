export const FAMILY_VISIBILITY_ERROR =
  "Debes escribir un resumen para familia antes de compartir este registro.";

export function normalizeFamilyVisibility(input = {}) {
  const visible = input.visible_familiar === true;
  const summary = input.resumen_familiar?.trim() || "";
  if (visible && !summary) throw new Error(FAMILY_VISIBILITY_ERROR);
  return { visible_familiar: visible, resumen_familiar: visible ? summary : null };
}
