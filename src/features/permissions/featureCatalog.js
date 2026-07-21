// El producto se configura por áreas de trabajo, no por cada pantalla interna.
// Los permisos clínicos sensibles siguen controlándose con funcionario_permisos.
export const FEATURE_CATALOG = [
  {
    id: "dashboard",
    label: "Inicio",
    description: "Prioridades, alertas y avance de cumplimiento.",
    group: "FichaEleam",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "establishment",
    label: "Establecimiento",
    description: "Infraestructura, capacidad, habitaciones y camas.",
    group: "FichaEleam",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "residents",
    label: "Residentes",
    description: "Carpetas personales, cuidados, salud y registros diarios.",
    group: "FichaEleam",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "personnel",
    label: "Personal",
    description: "Equipo, competencias, capacitación, turnos y dotación.",
    group: "FichaEleam",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "compliance",
    label: "Cumplimiento SEREMI",
    description: "Requisitos, documentos, protocolos, reclamos y fiscalización.",
    group: "FichaEleam",
    roles: ["admin_eleam", "funcionario"],
  },
];

export const FEATURE_BY_ID = Object.fromEntries(FEATURE_CATALOG.map((feature) => [feature.id, feature]));
export const FEATURE_ROLES = ["admin_eleam", "funcionario"];

export function featuresForRole(role) {
  return FEATURE_CATALOG.filter((feature) => feature.roles.includes(role));
}

export function featureDefaultMap(role, base = {}) {
  return Object.fromEntries(featuresForRole(role).map((feature) => [
    feature.id,
    base[feature.id] !== false,
  ]));
}

export function groupFeatures(features) {
  const groups = [];
  for (const feature of features) {
    let group = groups.find((item) => item.label === feature.group);
    if (!group) {
      group = { label: feature.group, items: [] };
      groups.push(group);
    }
    group.items.push(feature);
  }
  return groups;
}
