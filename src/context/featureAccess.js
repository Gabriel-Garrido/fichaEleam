// Lógica de canFeature aislada de AuthProvider para poder probarla sin
// renderizar el contexto.
//
// Fail-closed: si los permisos por feature no cargaron (featurePermissionsError),
// las features protegidas se bloquean. Mientras cargan (featurePermissions es
// null y no hay error) se permite, porque la UI relevante ya está gateada por
// profileLoading. Un mapa sin la entrada significa feature habilitada.
export function computeCanFeature({
  featureId,
  isSuperadmin,
  featurePermissions,
  featurePermissionsError,
}) {
  if (!featureId) return true;
  if (isSuperadmin) return true;
  if (featurePermissionsError) return false;
  if (!featurePermissions) return true;
  return featurePermissions[featureId] !== false;
}
