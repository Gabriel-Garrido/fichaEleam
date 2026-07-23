// Lógica de canFeature aislada de AuthProvider para poder probarla sin
// renderizar el contexto.
//
// Fail-closed para funcionarios: cada área debe estar autorizada de forma
// explícita. Esto evita que una fila ausente o una carga incompleta abra una
// sección por accidente. Administradores conservan acceso salvo que el ELEAM
// deshabilite explícitamente el área.
export function computeCanFeature({
  featureId,
  isSuperadmin,
  isAdminEleam,
  isFuncionario,
  featurePermissions,
  featurePermissionsError,
}) {
  if (!featureId) return true;
  if (isSuperadmin) return true;
  if (featurePermissionsError) return false;

  if (isFuncionario && !isAdminEleam) {
    return featurePermissions?.[featureId] === true;
  }

  if (!featurePermissions) return true;
  return featurePermissions[featureId] !== false;
}

export const FEATURE_HOME_PATHS = [
  ["dashboard", "/dashboard"],
  ["establishment", "/establecimiento"],
  ["residents", "/residents"],
  ["personnel", "/personal"],
  ["compliance", "/cumplimiento"],
  ["resident_payments", "/cobranza"],
];

export function resolveFeatureHomePath(canFeature) {
  return FEATURE_HOME_PATHS.find(([featureId]) => canFeature(featureId))?.[1] ?? "/sin-permisos";
}
