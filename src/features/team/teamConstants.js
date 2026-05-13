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
  subir_acreditacion: true,   editar_acreditacion: true,   archivar_acreditacion: false,
  registrar_visitas: true,
};

export const PLANTILLAS_CARGO = {
  "Enfermero/a": {
    crear_residentes: false,  editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    subir_acreditacion: true,  editar_acreditacion: false, archivar_acreditacion: false,
    registrar_visitas: true,
  },
  "Kinesiólogo/a": {
    crear_residentes: false,  editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    subir_acreditacion: false, editar_acreditacion: false, archivar_acreditacion: false,
    registrar_visitas: false,
  },
  "Médico/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: true, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: true, eliminar_observaciones: false,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: false,
    registrar_visitas: false,
  },
  "Auxiliar ATD": {
    crear_residentes: false,  editar_residentes: false,  eliminar_residentes: false,
    crear_signos_vitales: true, editar_signos_vitales: false, eliminar_signos_vitales: false,
    crear_observaciones: true, editar_observaciones: false, eliminar_observaciones: false,
    subir_acreditacion: false, editar_acreditacion: false, archivar_acreditacion: false,
    registrar_visitas: true,
  },
  "Administrativo/a": {
    crear_residentes: true,   editar_residentes: true,   eliminar_residentes: false,
    crear_signos_vitales: false, editar_signos_vitales: false, eliminar_signos_vitales: false,
    crear_observaciones: false, editar_observaciones: false, eliminar_observaciones: false,
    subir_acreditacion: true,  editar_acreditacion: true,  archivar_acreditacion: true,
    registrar_visitas: false,
  },
};
