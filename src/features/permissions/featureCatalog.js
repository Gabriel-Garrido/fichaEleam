export const FEATURE_CATALOG = [
  {
    id: "dashboard",
    label: "Inicio operativo",
    description: "Prioridades, alertas y resumen diario.",
    group: "Operación",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "turnos",
    label: "Entrega de turno",
    description: "Resumen para traspasar pendientes al siguiente equipo.",
    group: "Operación",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "residents",
    label: "Residentes",
    description: "Fichas, contactos y datos clínicos base.",
    group: "Operación",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "vital-signs",
    label: "Signos vitales",
    description: "Registro e historial de controles clínicos.",
    group: "Operación",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "observations",
    label: "Observaciones",
    description: "Novedades, incidentes y seguimientos.",
    group: "Operación",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "accreditation",
    label: "Carpeta SEREMI",
    description: "Acreditación, documentos y observaciones.",
    group: "Gestión",
    roles: ["admin_eleam", "funcionario"],
  },
  {
    id: "team",
    label: "Equipo",
    description: "Usuarios, familiares y permisos.",
    group: "Gestión",
    roles: ["admin_eleam"],
  },
  {
    id: "subscription",
    label: "Suscripción",
    description: "Plan, pagos y estado del acceso.",
    group: "Gestión",
    roles: ["admin_eleam"],
  },
  {
    id: "familiar",
    label: "Portal familiar",
    description: "Resumen visible del residente vinculado.",
    group: "Familia",
    roles: ["familiar"],
  },
  {
    id: "familiar-visitas",
    label: "Visitas familiares",
    description: "Registro de visitas y notas para el equipo.",
    group: "Familia",
    roles: ["familiar"],
  },
];

export const FEATURE_BY_ID = Object.fromEntries(FEATURE_CATALOG.map((feature) => [feature.id, feature]));
export const FEATURE_ROLES = ["admin_eleam", "funcionario", "familiar"];

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

