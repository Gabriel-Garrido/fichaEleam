export const ROLE_LABEL = {
  admin_eleam: { txt: "Administrador", cls: "bg-indigo-100 text-indigo-700" },
  funcionario: { txt: "Funcionario",   cls: "bg-emerald-100 text-emerald-700" },
  familiar:    { txt: "Familiar",      cls: "bg-sky-100 text-sky-700" },
  superadmin:  { txt: "Superadmin",    cls: "bg-amber-100 text-amber-800" },
};

export const PERM_GROUPS = [
  {
    label: "Residentes",
    perms: [
      { key: "crear_residentes",    label: "Crear" },
      { key: "editar_residentes",   label: "Editar" },
      { key: "eliminar_residentes", label: "Eliminar" },
    ],
  },
  {
    label: "Signos Vitales",
    perms: [
      { key: "crear_signos_vitales",    label: "Registrar" },
      { key: "editar_signos_vitales",   label: "Editar" },
      { key: "eliminar_signos_vitales", label: "Eliminar" },
    ],
  },
  {
    label: "Observaciones",
    perms: [
      { key: "crear_observaciones",    label: "Registrar" },
      { key: "editar_observaciones",   label: "Editar" },
      { key: "eliminar_observaciones", label: "Eliminar" },
    ],
  },
  {
    label: "Plan de cuidado",
    perms: [
      { key: "crear_planes_cuidado",         label: "Crear plan" },
      { key: "editar_planes_cuidado",        label: "Editar plan" },
      { key: "completar_tareas_cuidado",     label: "Cumplir tareas" },
      { key: "editar_indicaciones_cuidado",  label: "Editar indicaciones" },
    ],
  },
  {
    label: "eMAR medicamentos",
    perms: [
      { key: "crear_indicaciones_medicamentos",  label: "Crear indicaciones" },
      { key: "editar_indicaciones_medicamentos", label: "Editar indicaciones" },
      { key: "administrar_medicamentos",         label: "Administrar" },
      { key: "validar_medicamentos_controlados", label: "Validar controlados" },
      { key: "ajustar_stock_medicamentos",       label: "Ajustar stock" },
    ],
  },
  {
    label: "Acreditación",
    perms: [
      { key: "subir_acreditacion",    label: "Subir documentos" },
      { key: "editar_acreditacion",   label: "Editar estado" },
      { key: "archivar_acreditacion", label: "Archivar" },
    ],
  },
  {
    label: "Visitas familiares",
    perms: [
      { key: "registrar_visitas", label: "Registrar visitas" },
    ],
  },
];

export const DEFAULT_PERMS = {
  crear_residentes: true,    editar_residentes: true,    eliminar_residentes: false,
  crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
  crear_observaciones: true,  editar_observaciones: true,  eliminar_observaciones: false,
  crear_planes_cuidado: true, editar_planes_cuidado: true, completar_tareas_cuidado: true,
  editar_indicaciones_cuidado: false,
  crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
  administrar_medicamentos: true, validar_medicamentos_controlados: false, ajustar_stock_medicamentos: false,
  subir_acreditacion: true,   editar_acreditacion: true,   archivar_acreditacion: false,
  registrar_visitas: true,
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
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: false,
    registrar_visitas: true,
  },
  "Kinesiólogo/a": {
    crear_residentes: false,  editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    crear_planes_cuidado: true, editar_planes_cuidado: true, completar_tareas_cuidado: true,
    editar_indicaciones_cuidado: true,
    crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
    administrar_medicamentos: false, validar_medicamentos_controlados: false, ajustar_stock_medicamentos: false,
    subir_acreditacion: false, editar_acreditacion: false, archivar_acreditacion: false,
    registrar_visitas: false,
  },
  "Médico/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    crear_planes_cuidado: true, editar_planes_cuidado: true, completar_tareas_cuidado: true,
    editar_indicaciones_cuidado: true,
    crear_indicaciones_medicamentos: true, editar_indicaciones_medicamentos: true,
    administrar_medicamentos: true, validar_medicamentos_controlados: true, ajustar_stock_medicamentos: true,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: false,
    registrar_visitas: false,
  },
  "Auxiliar ATD": {
    crear_residentes: false,  editar_residentes: false,  eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: false, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: false, eliminar_observaciones: false,
    crear_planes_cuidado: false, editar_planes_cuidado: false, completar_tareas_cuidado: true,
    editar_indicaciones_cuidado: false,
    crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
    administrar_medicamentos: true, validar_medicamentos_controlados: false, ajustar_stock_medicamentos: false,
    subir_acreditacion: false, editar_acreditacion: false, archivar_acreditacion: false,
    registrar_visitas: true,
  },
  "Administrativo/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: false, editar_signos_vitales: false, eliminar_signos_vitales: false,
    crear_observaciones: false, editar_observaciones: false, eliminar_observaciones: false,
    crear_planes_cuidado: false, editar_planes_cuidado: false, completar_tareas_cuidado: false,
    editar_indicaciones_cuidado: false,
    crear_indicaciones_medicamentos: false, editar_indicaciones_medicamentos: false,
    administrar_medicamentos: false, validar_medicamentos_controlados: false, ajustar_stock_medicamentos: false,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: true,
    registrar_visitas: false,
  },
};
