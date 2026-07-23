const hasAccess = (auth) => auth?.pagoActivo || auth?.isSuperadmin;

export const ROLE_LABELS = {
  admin_eleam: "Administrador",
  funcionario: "Funcionario",
  superadmin: "Superadministrador",
};

const PRODUCT_ITEMS = [
  {
    id: "dashboard",
    featureId: "dashboard",
    label: "Inicio",
    icon: "home",
    path: "/dashboard",
    description: "Prioridades, alertas y avance de cumplimiento",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    mobile: true,
  },
  {
    id: "establishment",
    featureId: "establishment",
    label: "Establecimiento",
    shortLabel: "ELEAM",
    icon: "beds",
    path: "/establecimiento",
    description: "Infraestructura, capacidad, habitaciones y camas",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    mobile: true,
  },
  {
    id: "residents",
    featureId: "residents",
    label: "Residentes",
    icon: "residents",
    path: "/residents",
    description: "Carpetas personales, salud y registros diarios",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    mobile: true,
  },
  {
    id: "personnel",
    featureId: "personnel",
    label: "Personal",
    icon: "team",
    path: "/personal",
    description: "Equipo, competencias, capacitación y dotación",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    mobile: true,
  },
  {
    id: "compliance",
    featureId: "compliance",
    label: "Cumplimiento",
    shortLabel: "Cumplir",
    icon: "compliance",
    path: "/cumplimiento",
    description: "Documentos y pendientes para una fiscalización",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    mobile: true,
  },
  {
    id: "resident_payments",
    featureId: "resident_payments",
    label: "Cobranza",
    icon: "payment",
    path: "/cobranza",
    description: "Cobros, pagos y comprobantes de residentes",
    roles: ["admin_eleam", "funcionario"],
    requiresEleam: true,
    requiresActive: true,
    permission: "ver_pagos_residentes",
  },
];

const PLATFORM_ITEMS = [
  { id: "superadmin", label: "Resumen", icon: "overview", path: "/superadmin", roles: ["superadmin"] },
  { id: "superadmin-clientes", label: "Clientes", icon: "clients", path: "/superadmin/clientes", roles: ["superadmin"] },
  { id: "superadmin-leads", label: "Leads", icon: "leads", path: "/superadmin/leads", roles: ["superadmin"] },
  { id: "superadmin-pagos", label: "Pagos", icon: "payments_sa", path: "/superadmin/pagos", roles: ["superadmin"] },
  { id: "superadmin-tareas", label: "Tareas", icon: "tasks", path: "/superadmin/tareas", roles: ["superadmin"] },
  { id: "blog-admin", label: "Blog", icon: "blog", path: "/superadmin/blog", roles: ["superadmin"] },
];

export const NAV_SECTIONS = [
  { id: "producto", label: "Gestión del ELEAM", items: PRODUCT_ITEMS },
  { id: "plataforma", label: "Administración de plataforma", items: PLATFORM_ITEMS },
];

export const QUICK_ACTIONS = [
  {
    id: "resident-new",
    featureId: "residents",
    label: "Ingresar residente",
    description: "Crear su carpeta personal",
    icon: "residents",
    path: "/residents/new",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    permission: "crear_residentes",
  },
  {
    id: "daily-care",
    featureId: "residents",
    label: "Cuidados del turno",
    description: "Registrar tareas programadas",
    icon: "tasks",
    path: "/operacion/cuidados",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    permission: "completar_tareas_cuidado",
  },
  {
    id: "medications",
    featureId: "residents",
    label: "Medicamentos",
    description: "Abrir administración del turno",
    icon: "meds",
    path: "/operacion/medicamentos",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    permission: "administrar_medicamentos",
  },
  {
    id: "shift-handoff",
    featureId: "residents",
    label: "Registro del turno",
    description: "Revisar y entregar novedades",
    icon: "shift",
    path: "/operacion/turnos",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
  },
];

function itemAllowed(item, auth) {
  if (!auth?.user || !auth?.rol) return false;
  if (!item.roles?.includes(auth.rol)) return false;
  if (item.requiresEleam && !auth.profile?.eleam_id) return false;
  if (item.requiresActive && !hasAccess(auth)) return false;
  if (item.featureId && typeof auth.canFeature === "function" && !auth.canFeature(item.featureId)) return false;
  if (item.permission && typeof auth.can === "function" && !auth.can(item.permission)) return false;
  return true;
}

export const HOME_SLOT = "__home__";

export const MOBILE_BOTTOM_NAV = {
  admin_eleam: ["dashboard", "residents", HOME_SLOT, "personnel", "compliance"],
  funcionario: ["dashboard", "residents", HOME_SLOT, "personnel", "compliance"],
  superadmin: ["superadmin", "superadmin-clientes", HOME_SLOT, "superadmin-leads", "superadmin-tareas"],
};

export function getMobileBottomNav(auth) {
  if (!auth?.user || !auth?.rol) return [];

  if (!hasAccess(auth) && auth.rol === "admin_eleam") {
    return [
      { type: "nav", item: { id: "activate", label: "Activar", icon: "payment", path: "/pago?sinAcceso=1" } },
      { type: "home" },
    ];
  }

  if (!hasAccess(auth) && auth.rol === "funcionario") {
    return [
      { type: "nav", item: { id: "inactive", label: "Inactivo", icon: "alert", disabled: true } },
      { type: "home" },
    ];
  }

  const slots = MOBILE_BOTTOM_NAV[auth.rol];
  if (!slots) return [];
  const itemById = new Map(NAV_SECTIONS.flatMap((section) => section.items).map((item) => [item.id, item]));

  const resolved = slots.map((slot) => {
    if (slot === HOME_SLOT) return { type: "home" };
    const item = itemById.get(slot);
    return item && itemAllowed(item, auth) ? { type: "nav", item } : null;
  }).filter(Boolean);

  if (!resolved.some((slot) => slot.type === "home")) resolved.push({ type: "home" });
  return resolved;
}

export function getNavigationSections(auth) {
  if (!auth?.user) return [];

  if (!hasAccess(auth) && auth.rol === "admin_eleam") {
    return [{
      id: "activacion",
      label: "Cuenta",
      items: [{ id: "activate", label: "Activar ELEAM", icon: "payment", path: "/pago?sinAcceso=1", description: "Elegir plan y habilitar el acceso" }],
    }];
  }

  if (!hasAccess(auth) && auth.rol === "funcionario") {
    return [{
      id: "bloqueado",
      label: "Acceso",
      items: [{ id: "inactive", label: "Suscripción inactiva", icon: "alert", description: "Contacta al administrador del ELEAM", disabled: true }],
    }];
  }

  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => itemAllowed(item, auth)),
  })).filter((section) => section.items.length > 0);
}

export function getQuickActions(auth) {
  return QUICK_ACTIONS.filter((item) => itemAllowed(item, auth));
}
