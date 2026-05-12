const hasAccess = (auth) => auth?.pagoActivo || auth?.isSuperadmin;

export const ROLE_LABELS = {
  admin_eleam: "Admin",
  funcionario: "Funcionario",
  familiar: "Familiar",
  superadmin: "Superadmin",
};

export const NAV_SECTIONS = [
  {
    id: "operacion",
    label: "Operación",
    items: [
      {
        id: "dashboard",
        featureId: "dashboard",
        label: "Inicio",
        icon: "home",
        path: "/dashboard",
        description: "Prioridades y alertas del día",
        roles: ["admin_eleam", "funcionario", "superadmin"],
        requiresEleam: true,
        requiresActive: true,
        mobile: true,
      },
      {
        id: "turnos",
        featureId: "turnos",
        label: "Entrega de turno",
        icon: "shift",
        path: "/turnos",
        description: "Resumen operativo para el siguiente equipo",
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
        description: "Fichas clínicas, contactos y estado",
        roles: ["admin_eleam", "funcionario", "superadmin"],
        requiresEleam: true,
        requiresActive: true,
        mobile: true,
      },
      {
        id: "vital-signs",
        featureId: "vital-signs",
        label: "Signos vitales",
        icon: "vitals",
        path: "/vital-signs",
        description: "Controles y alertas clínicas",
        roles: ["admin_eleam", "funcionario", "superadmin"],
        requiresEleam: true,
        requiresActive: true,
      },
      {
        id: "observations",
        featureId: "observations",
        label: "Observaciones",
        icon: "observations",
        path: "/observations",
        description: "Novedades, incidentes y seguimiento",
        roles: ["admin_eleam", "funcionario", "superadmin"],
        requiresEleam: true,
        requiresActive: true,
      },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    items: [
      {
        id: "accreditation",
        featureId: "accreditation",
        label: "Carpeta SEREMI",
        icon: "accreditation",
        path: "/accreditation",
        description: "Documentos, vencimientos y observaciones",
        roles: ["admin_eleam", "funcionario", "superadmin"],
        requiresEleam: true,
        requiresActive: true,
        mobile: true,
      },
      {
        id: "team",
        featureId: "team",
        label: "Equipo",
        icon: "team",
        path: "/equipo",
        description: "Usuarios, familiares y permisos",
        roles: ["admin_eleam"],
        requiresEleam: true,
        requiresActive: true,
      },
      {
        id: "subscription",
        featureId: "subscription",
        label: "Suscripción",
        icon: "payment",
        path: "/pago",
        description: "Plan, pagos y estado del acceso",
        roles: ["admin_eleam"],
        requiresEleam: true,
      },
    ],
  },
  {
    id: "familia",
    label: "Portal familiar",
    items: [
      {
        id: "familiar",
        featureId: "familiar",
        label: "Mi residente",
        icon: "familiar",
        path: "/familiar",
        description: "Resumen visible para la familia",
        roles: ["familiar"],
        requiresEleam: true,
        requiresActive: true,
        mobile: true,
      },
      {
        id: "familiar-visitas",
        featureId: "familiar-visitas",
        label: "Visitas",
        icon: "visits",
        path: "/familiar/visitas",
        description: "Registro de visitas familiares",
        roles: ["familiar"],
        requiresEleam: true,
        requiresActive: true,
        mobile: true,
      },
    ],
  },
  {
    id: "plataforma",
    label: "Plataforma",
    items: [
      {
        id: "superadmin",
        label: "Resumen",
        icon: "overview",
        path: "/superadmin",
        description: "Indicadores ejecutivos",
        roles: ["superadmin"],
        requiresEleam: false,
        mobile: true,
      },
      {
        id: "superadmin-clientes",
        label: "Clientes",
        icon: "clients",
        path: "/superadmin/clientes",
        description: "Cartera ELEAM y salud comercial",
        roles: ["superadmin"],
        requiresEleam: false,
        mobile: true,
      },
      {
        id: "superadmin-leads",
        label: "Leads",
        icon: "leads",
        path: "/superadmin/leads",
        description: "Demo guiado, contactos y landing",
        roles: ["superadmin"],
        requiresEleam: false,
        mobile: true,
      },
      {
        id: "superadmin-pagos",
        label: "Pagos",
        icon: "payments_sa",
        path: "/superadmin/pagos",
        description: "Conciliación y activaciones",
        roles: ["superadmin"],
        requiresEleam: false,
      },
      {
        id: "superadmin-tareas",
        label: "Tareas",
        icon: "tasks",
        path: "/superadmin/tareas",
        description: "Seguimiento CRM",
        roles: ["superadmin"],
        requiresEleam: false,
      },
      {
        id: "superadmin-permisos",
        label: "Permisos",
        icon: "permissions",
        path: "/superadmin/permisos",
        description: "Features por ELEAM y rol",
        roles: ["superadmin"],
        requiresEleam: false,
      },
      {
        id: "blog-admin",
        label: "Blog",
        icon: "blog",
        path: "/superadmin/blog",
        description: "Contenido público y SEO",
        roles: ["superadmin"],
        requiresEleam: false,
      },
    ],
  },
];

export const QUICK_ACTIONS = [
  {
    id: "turno-nuevo",
    featureId: "turnos",
    label: "Entrega de turno",
    description: "Preparar resumen del turno actual",
    icon: "shift",
    path: "/turnos/nueva",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
  },
  {
    id: "resident-new",
    featureId: "residents",
    label: "Nuevo residente",
    description: "Crear ficha de ingreso",
    icon: "residents",
    path: "/residents/new",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    permission: "crear_residentes",
  },
  {
    id: "vital-new",
    featureId: "vital-signs",
    label: "Signos vitales",
    description: "Registrar control clínico",
    icon: "vitals",
    path: "/vital-signs/new",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    permission: "crear_signos_vitales",
  },
  {
    id: "observation-new",
    featureId: "observations",
    label: "Observación",
    description: "Dejar novedad o seguimiento",
    icon: "observations",
    path: "/observations/new",
    roles: ["admin_eleam", "funcionario", "superadmin"],
    requiresEleam: true,
    requiresActive: true,
    permission: "crear_observaciones",
  },
  {
    id: "visit-new",
    featureId: "familiar-visitas",
    label: "Registrar visita",
    description: "Portal familiar",
    icon: "visits",
    path: "/familiar/visitas",
    roles: ["familiar"],
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

export function getNavigationSections(auth) {
  if (!auth?.user) return [];

  if (!hasAccess(auth) && auth.rol === "admin_eleam") {
    return [
      {
        id: "activacion",
        label: "Activación",
        items: [
          {
            id: "activate",
            label: "Activar ELEAM",
            icon: "$",
            path: "/pago?sinAcceso=1",
            description: "Elegir plan y habilitar el acceso",
            mobile: true,
          },
        ],
      },
    ];
  }

  if (!hasAccess(auth) && auth.rol === "funcionario") {
    return [
      {
        id: "bloqueado",
        label: "Acceso",
        items: [
          {
            id: "inactive",
            label: "Suscripción inactiva",
            icon: "!",
            description: "Contacta al administrador del ELEAM",
            disabled: true,
            mobile: true,
          },
        ],
      },
    ];
  }

  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => itemAllowed(item, auth)),
    }))
    .filter((section) => section.items.length > 0);
}

export function getQuickActions(auth) {
  return QUICK_ACTIONS.filter((item) => itemAllowed(item, auth));
}
