const REQUIRED_COMPANION_PERMISSIONS = Object.freeze({
  registrar_entregas_turno: ["ver_entregas_turno"],
  registrar_pagos_residentes: ["ver_pagos_residentes"],
  enviar_comprobantes_pagos: ["ver_pagos_residentes"],
  anular_pagos_residentes: ["ver_pagos_residentes"],
});

// Replica las dependencias aplicadas por funcionario_can() en PostgreSQL para
// que la interfaz nunca ofrezca una acción que RLS rechazará al ejecutarla.
export function evaluateFuncionarioPermission(permissions, permission) {
  if (!permissions || permissions[permission] !== true) return false;
  return (REQUIRED_COMPANION_PERMISSIONS[permission] ?? [])
    .every((requiredPermission) => permissions[requiredPermission] === true);
}

export function applyPermissionToggle(permissions, permission, enabled) {
  const next = { ...permissions, [permission]: enabled };
  if (enabled) {
    for (const requiredPermission of REQUIRED_COMPANION_PERMISSIONS[permission] ?? []) {
      next[requiredPermission] = true;
    }
  } else {
    for (const [dependentPermission, requirements] of Object.entries(REQUIRED_COMPANION_PERMISSIONS)) {
      if (requirements.includes(permission)) next[dependentPermission] = false;
    }
  }
  return next;
}

export { REQUIRED_COMPANION_PERMISSIONS };
