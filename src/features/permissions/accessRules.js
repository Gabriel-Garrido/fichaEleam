// Reglas compartidas por menús, tarjetas y accesos rápidos. Las rutas y la base
// de datos mantienen sus propios controles como defensa en profundidad.
export const CARE_TURN_PERMISSIONS = Object.freeze([
  "completar_tareas_cuidado",
  "crear_signos_vitales",
  "crear_observaciones",
]);

export const MEDICATION_TURN_PERMISSIONS = Object.freeze([
  "administrar_medicamentos",
  "validar_medicamentos_controlados",
]);

export function hasAnyPermission(can, permissions = []) {
  return typeof can === "function" && permissions.some((permission) => can(permission));
}

export function canUseFeatureAction({ canFeature, can }, featureId, permissions = []) {
  if (typeof canFeature !== "function" || !canFeature(featureId)) return false;
  return permissions.length === 0 || hasAnyPermission(can, permissions);
}
