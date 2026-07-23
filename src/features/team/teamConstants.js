export const ROLE_LABEL = {
  admin_eleam: { txt: "Administrador", cls: "bg-indigo-100 text-indigo-700" },
  funcionario: { txt: "Funcionario",   cls: "bg-emerald-100 text-emerald-700" },
  superadmin:  { txt: "Superadmin",    cls: "bg-amber-100 text-amber-800" },
};

export const PERM_GROUPS = [
  {
    label: "Residentes",
    featureId: "residents",
    perms: [
      { key: "crear_residentes",    label: "Crear" },
      { key: "editar_residentes",   label: "Editar" },
      { key: "eliminar_residentes", label: "Eliminar" },
    ],
  },
  {
    label: "Establecimiento",
    featureId: "establishment",
    perms: [
      { key: "asignar_camas", label: "Asignar y liberar" },
      { key: "editar_inventario_bienes", label: "Editar inventario de bienes" },
    ],
  },
  {
    label: "Signos Vitales",
    featureId: "residents",
    perms: [
      { key: "crear_signos_vitales",    label: "Registrar" },
      { key: "editar_signos_vitales",   label: "Editar" },
      { key: "eliminar_signos_vitales", label: "Eliminar" },
    ],
  },
  {
    label: "Observaciones",
    featureId: "residents",
    perms: [
      { key: "crear_observaciones",    label: "Registrar" },
      { key: "editar_observaciones",   label: "Editar" },
      { key: "eliminar_observaciones", label: "Eliminar" },
    ],
  },
  {
    label: "Eventos adversos",
    featureId: "residents",
    perms: [
      { key: "crear_eventos_adversos",  label: "Registrar evento" },
      { key: "editar_eventos_adversos", label: "Editar y agregar acciones" },
      { key: "cerrar_eventos_adversos", label: "Cerrar / cancelar / reabrir" },
    ],
  },
  {
    label: "Plan de cuidado",
    featureId: "residents",
    perms: [
      { key: "crear_planes_cuidado",         label: "Crear plan" },
      { key: "editar_planes_cuidado",        label: "Editar plan" },
      { key: "completar_tareas_cuidado",     label: "Cumplir tareas" },
      { key: "editar_indicaciones_cuidado",  label: "Editar indicaciones" },
    ],
  },
  {
    label: "Evaluaciones geriátricas",
    featureId: "residents",
    perms: [
      { key: "aplicar_evaluaciones_clinicas", label: "Aplicar Barthel, Katz, MNA, MMSE y Tinetti" },
    ],
  },
  {
    label: "Cumplimiento",
    featureId: "compliance",
    perms: [
      { key: "subir_acreditacion",      label: "Subir documentos" },
      { key: "editar_acreditacion",     label: "Revisar documentos y estados" },
      { key: "archivar_acreditacion",   label: "Archivar documentos" },
      { key: "gestionar_cumplimiento",  label: "Editar protocolos" },
      { key: "gestionar_emergencias",   label: "Editar plan de emergencias" },
      { key: "registrar_simulacros",    label: "Registrar simulacros" },
      { key: "gestionar_reclamos",      label: "Gestionar reclamos" },
    ],
  },
  {
    label: "Medicamentos",
    featureId: "residents",
    perms: [
      { key: "crear_indicaciones_medicamentos",  label: "Crear indicaciones" },
      { key: "editar_indicaciones_medicamentos", label: "Editar indicaciones" },
      { key: "administrar_medicamentos",         label: "Administrar" },
      { key: "validar_medicamentos_controlados", label: "Validar medicamentos" },
      { key: "ajustar_stock_medicamentos",       label: "Ajustar stock" },
    ],
  },
  {
    label: "Cobranza",
    featureId: "resident_payments",
    perms: [
      { key: "ver_pagos_residentes", label: "Ver cobros e historial" },
      { key: "registrar_pagos_residentes", label: "Crear cobros y registrar pagos" },
      { key: "enviar_comprobantes_pagos", label: "Enviar y reenviar comprobantes" },
      { key: "anular_pagos_residentes", label: "Anular cobros y pagos" },
    ],
  },
];

export const FEATURE_ACTION_PERMISSIONS = Object.fromEntries(
  ["dashboard", "establishment", "residents", "personnel", "compliance", "resident_payments"].map((featureId) => [
    featureId,
    PERM_GROUPS
      .filter((group) => group.featureId === featureId)
      .flatMap((group) => group.perms.map((permission) => permission.key)),
  ]),
);

export function normalizePaymentAccess(areas, actions) {
  const paymentVisible = areas.resident_payments === true && actions.ver_pagos_residentes === true;
  return {
    areas: { ...areas, resident_payments: paymentVisible },
    actions: paymentVisible
      ? actions
      : {
          ...actions,
          ver_pagos_residentes: false,
          registrar_pagos_residentes: false,
          enviar_comprobantes_pagos: false,
          anular_pagos_residentes: false,
        },
  };
}

export const PERMISSION_FEATURE = Object.fromEntries(
  Object.entries(FEATURE_ACTION_PERMISSIONS)
    .flatMap(([featureId, permissions]) => permissions.map((permission) => [permission, featureId])),
);

export const DEFAULT_PERMS = {
  crear_residentes: true,    editar_residentes: true,    eliminar_residentes: false,
  crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
  crear_observaciones: true,  editar_observaciones: true,  eliminar_observaciones: false,
  crear_planes_cuidado: true, editar_planes_cuidado: true, completar_tareas_cuidado: true,
  editar_indicaciones_cuidado: false,
  crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
  administrar_medicamentos: true, validar_medicamentos_controlados: false, ajustar_stock_medicamentos: false,
  asignar_camas: true,
  subir_acreditacion: true,   editar_acreditacion: true,   archivar_acreditacion: false,
  aplicar_evaluaciones_clinicas: true,
  crear_eventos_adversos: true, editar_eventos_adversos: true, cerrar_eventos_adversos: false,
  editar_inventario_bienes: false, gestionar_reclamos: true,
  gestionar_emergencias: false, registrar_simulacros: true,
  gestionar_cumplimiento: false,
  ver_pagos_residentes: false, registrar_pagos_residentes: false,
  enviar_comprobantes_pagos: false, anular_pagos_residentes: false,
};

export const PLANTILLAS_CARGO = {
  "Enfermero/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    crear_planes_cuidado: true, editar_planes_cuidado: true, completar_tareas_cuidado: true,
    editar_indicaciones_cuidado: false,
    crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
    administrar_medicamentos: true, validar_medicamentos_controlados: true, ajustar_stock_medicamentos: true,
    asignar_camas: true,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: false,
    aplicar_evaluaciones_clinicas: true,
    crear_eventos_adversos: true, editar_eventos_adversos: true, cerrar_eventos_adversos: true,
    editar_inventario_bienes: false, gestionar_reclamos: true,
    gestionar_emergencias: false, registrar_simulacros: true,
    gestionar_cumplimiento: false,
  },
  "Kinesiólogo/a": {
    crear_residentes: false,  editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    crear_planes_cuidado: true, editar_planes_cuidado: true, completar_tareas_cuidado: true,
    editar_indicaciones_cuidado: true,
    crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
    administrar_medicamentos: false, validar_medicamentos_controlados: false, ajustar_stock_medicamentos: false,
    asignar_camas: true,
    subir_acreditacion: false, editar_acreditacion: false, archivar_acreditacion: false,
    aplicar_evaluaciones_clinicas: true,
    crear_eventos_adversos: true, editar_eventos_adversos: true, cerrar_eventos_adversos: false,
    editar_inventario_bienes: false, gestionar_reclamos: false,
    gestionar_emergencias: false, registrar_simulacros: false,
    gestionar_cumplimiento: false,
  },
  "Médico/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    crear_planes_cuidado: true, editar_planes_cuidado: true, completar_tareas_cuidado: true,
    editar_indicaciones_cuidado: true,
    crear_indicaciones_medicamentos: true, editar_indicaciones_medicamentos: true,
    administrar_medicamentos: true, validar_medicamentos_controlados: true, ajustar_stock_medicamentos: true,
    asignar_camas: true,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: false,
    aplicar_evaluaciones_clinicas: true,
    crear_eventos_adversos: true, editar_eventos_adversos: true, cerrar_eventos_adversos: true,
    editar_inventario_bienes: false, gestionar_reclamos: true,
    gestionar_emergencias: true, registrar_simulacros: true,
    gestionar_cumplimiento: false,
  },
  "Auxiliar ATD": {
    crear_residentes: false,  editar_residentes: false,  eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: false, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: false, eliminar_observaciones: false,
    crear_planes_cuidado: false, editar_planes_cuidado: false, completar_tareas_cuidado: true,
    editar_indicaciones_cuidado: false,
    crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
    administrar_medicamentos: true, validar_medicamentos_controlados: false, ajustar_stock_medicamentos: false,
    asignar_camas: true,
    subir_acreditacion: false, editar_acreditacion: false, archivar_acreditacion: false,
    aplicar_evaluaciones_clinicas: false,
    crear_eventos_adversos: true, editar_eventos_adversos: false, cerrar_eventos_adversos: false,
    editar_inventario_bienes: false, gestionar_reclamos: true,
    gestionar_emergencias: false, registrar_simulacros: true,
    gestionar_cumplimiento: false,
  },
  "Administrativo/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: false, editar_signos_vitales: false, eliminar_signos_vitales: false,
    crear_observaciones: false, editar_observaciones: false, eliminar_observaciones: false,
    crear_planes_cuidado: false, editar_planes_cuidado: false, completar_tareas_cuidado: false,
    editar_indicaciones_cuidado: false,
    crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
    administrar_medicamentos: false, validar_medicamentos_controlados: false, ajustar_stock_medicamentos: false,
    asignar_camas: true,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: true,
    aplicar_evaluaciones_clinicas: false,
    crear_eventos_adversos: false, editar_eventos_adversos: false, cerrar_eventos_adversos: false,
    editar_inventario_bienes: true, gestionar_reclamos: true,
    gestionar_emergencias: true, registrar_simulacros: true,
    gestionar_cumplimiento: true,
    ver_pagos_residentes: true, registrar_pagos_residentes: true,
    enviar_comprobantes_pagos: true, anular_pagos_residentes: false,
  },
};

const EMPTY_PERMS = Object.fromEntries(Object.keys(DEFAULT_PERMS).map((key) => [key, false]));

export const PERMISOS_POR_FUNCION = {
  cuidador: PLANTILLAS_CARGO["Auxiliar ATD"],
  tens: {
    ...PLANTILLAS_CARGO["Auxiliar ATD"],
    editar_signos_vitales: true,
    editar_observaciones: true,
    aplicar_evaluaciones_clinicas: true,
  },
  profesional: PLANTILLAS_CARGO["Kinesiólogo/a"],
  manipulador: EMPTY_PERMS,
  aseo: EMPTY_PERMS,
  administrativo: PLANTILLAS_CARGO["Administrativo/a"],
  otro: EMPTY_PERMS,
};

export function defaultPermissionsForFunction(functionId) {
  const actions = { ...EMPTY_PERMS, ...(PERMISOS_POR_FUNCION[functionId] ?? {}) };
  const areas = {
    dashboard: true,
    establishment: ["administrativo", "aseo"].includes(functionId),
    residents: ["cuidador", "tens", "profesional"].includes(functionId),
    personnel: true,
    compliance: functionId === "administrativo",
    resident_payments: functionId === "administrativo",
  };
  return { actions, areas };
}
