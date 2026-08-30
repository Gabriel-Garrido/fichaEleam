import { CARE_TURN_PERMISSIONS, MEDICATION_TURN_PERMISSIONS } from "../features/permissions/accessRules";

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
    activePrefixes: [
      "/residents",
      "/vital-signs",
      "/observations",
      "/eventos-adversos",
      "/operacion/cuidados",
      "/operacion/medicamentos",
      "/operacion/turnos",
    ],
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
  { id: "superadmin", label: "Resumen", icon: "overview", path: "/superadmin", roles: ["superadmin"], requiresPlatform: true, mobile: true },
  { id: "superadmin-clientes", label: "Clientes", icon: "clients", path: "/superadmin/clientes", roles: ["superadmin"], requiresPlatform: true, mobile: true },
  { id: "superadmin-leads", label: "Leads", icon: "leads", path: "/superadmin/leads", roles: ["superadmin"], requiresPlatform: true, mobile: true },
  { id: "superadmin-pagos", label: "Pagos", icon: "payments_sa", path: "/superadmin/pagos", roles: ["superadmin"], requiresPlatform: true, mobile: true },
  { id: "superadmin-tareas", label: "Tareas", icon: "tasks", path: "/superadmin/tareas", roles: ["superadmin"], requiresPlatform: true, mobile: true },
  { id: "blog-admin", label: "Blog", icon: "blog", path: "/superadmin/blog", roles: ["superadmin"], requiresPlatform: true, mobile: true },
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
    label: "Tareas del turno",
    description: "Abrir los registros y pendientes autorizados",
    icon: "tasks",
    path: "/operacion/cuidados",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    anyPermissions: CARE_TURN_PERMISSIONS,
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
    anyPermissions: MEDICATION_TURN_PERMISSIONS,
  },
  {
    id: "shift-handoff",
    featureId: "residents",
    label: "Entrega de turno",
    description: "Registrar y consultar entregas",
    icon: "shift",
    path: "/operacion/turnos",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    permission: "ver_entregas_turno",
  },
];

function itemAllowed(item, auth) {
  if (!auth?.user || !auth?.rol) return false;
  if (!item.roles?.includes(auth.rol)) return false;
  if (item.requiresEleam && !auth.profile?.eleam_id) return false;
  if (item.requiresPlatform && auth.profile?.eleam_id) return false;
  if (item.requiresActive && !hasAccess(auth)) return false;
  if (item.featureId && typeof auth.canFeature === "function" && !auth.canFeature(item.featureId)) return false;
  if (item.permission && typeof auth.can === "function" && !auth.can(item.permission)) return false;
  if (item.anyPermissions?.length && (typeof auth.can !== "function" || !item.anyPermissions.some((permission) => auth.can(permission)))) return false;
  return true;
}

export const MOBILE_BOTTOM_NAV = {
  eleam: ["dashboard", "residents", "personnel", "compliance", "establishment", "resident_payments"],
  platform: ["superadmin", "superadmin-clientes", "superadmin-leads", "superadmin-tareas", "superadmin-pagos", "blog-admin"],
};

export function matchesNavigationItem(item, pathname) {
  if (!item?.path || !pathname) return false;
  if (item.path === "/superadmin") return pathname === "/superadmin";
  const prefixes = item.activePrefixes?.length ? item.activePrefixes : [item.path.split("?")[0]];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function withMenuSlot(items) {
  const navSlots = items.slice(0, 4).map((item) => ({ type: "nav", item }));
  const middle = Math.ceil(navSlots.length / 2);
  navSlots.splice(middle, 0, { type: "home" });
  return navSlots;
}

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

  const mode = auth.profile?.eleam_id ? "eleam" : auth.isSuperadmin ? "platform" : null;
  const priorityIds = MOBILE_BOTTOM_NAV[mode];
  if (!priorityIds) return [];
  const itemById = new Map(NAV_SECTIONS.flatMap((section) => section.items).map((item) => [item.id, item]));
  const allowed = priorityIds
    .map((id) => itemById.get(id))
    .filter((item) => item && itemAllowed(item, auth));
  return withMenuSlot(allowed);
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
