export const RESIDENT_QUOTA_STATUSES = new Set(["activo", "hospitalizado"]);

export const PUBLIC_PLAN_CATALOG = [
  {
    codigo: "plan-14",
    nombre: "Hasta 14 residentes",
    label: "Hasta 14 residentes",
    rangeLabel: "Hasta 14 residentes",
    precio_clp: 50000,
    max_residentes: 14,
    max_funcionarios: 10,
    dailyLabel: "~$1.700 / día",
    destacado: false,
    descripcion: "Ideal para residencias pequeñas",
  },
  {
    codigo: "plan-24",
    nombre: "Hasta 24 residentes",
    label: "15 a 24 residentes",
    rangeLabel: "Hasta 24 residentes",
    precio_clp: 80000,
    max_residentes: 24,
    max_funcionarios: 20,
    dailyLabel: "~$2.700 / día",
    destacado: true,
    tag: "Más elegido",
    descripcion: "El plan más elegido",
  },
  {
    codigo: "plan-34",
    nombre: "Hasta 34 residentes",
    label: "25 a 34 residentes",
    rangeLabel: "Hasta 34 residentes",
    precio_clp: 120000,
    max_residentes: 34,
    max_funcionarios: 30,
    dailyLabel: "~$4.000 / día",
    destacado: false,
    descripcion: "Para residencias grandes",
  },
];

export const INSTITUTIONAL_PLAN = {
  codigo: "institucional",
  nombre: "Institucional",
  label: "35 o más residentes",
  rangeLabel: "35 o más residentes",
  priceLabel: "Cotización personalizada",
  max_residentes: null,
  max_funcionarios: null,
};

export function getCatalogPlan(codigo) {
  return PUBLIC_PLAN_CATALOG.find((plan) => plan.codigo === codigo) ?? null;
}

export function formatPlanPrice(plan) {
  if (!plan || plan.precio_clp == null) return "Cotización";
  return `$${Number(plan.precio_clp).toLocaleString("es-CL")}`;
}

export function formatDailyPrice(precioClp) {
  const monthly = Number(precioClp);
  if (!Number.isFinite(monthly) || monthly <= 0) return null;
  const daily = Math.round(monthly / 30 / 100) * 100;
  return `~$${daily.toLocaleString("es-CL")} / día`;
}

export function getEffectivePlanLimits(eleam = {}) {
  const plan = eleam?.planes ?? null;
  return {
    maxResidents: plan?.max_residentes ?? eleam?.max_residentes ?? null,
    maxStaff: plan?.max_funcionarios ?? eleam?.max_funcionarios ?? null,
  };
}

export function isResidentInPlanQuota(resident) {
  return RESIDENT_QUOTA_STATUSES.has(String(resident?.estado ?? ""));
}

export function countPlanResidentSlots(residents = []) {
  return residents.filter(isResidentInPlanQuota).length;
}

export function countFuncionarioSlots({ members = [], pendingInvites = [] } = {}) {
  const active = members.filter((member) => member?.rol === "funcionario").length;
  const pending = pendingInvites.filter((invite) => (invite?.rol ?? "funcionario") === "funcionario").length;
  return active + pending;
}

export function planFitsUsage(plan, usage = {}) {
  if (!plan) return false;
  const residents = Number(usage.residents ?? 0);
  const staff = Number(usage.staff ?? 0);
  return (
    (plan.max_residentes == null || residents <= plan.max_residentes) &&
    (plan.max_funcionarios == null || staff <= plan.max_funcionarios)
  );
}

export function planLimitError(plan, usage = {}) {
  if (!plan) return "Plan no encontrado.";
  const residents = Number(usage.residents ?? 0);
  const staff = Number(usage.staff ?? 0);
  if (plan.max_residentes != null && residents > plan.max_residentes) {
    return `Este plan permite máximo ${plan.max_residentes} residentes activos u hospitalizados. Actualmente tienes ${residents}.`;
  }
  if (plan.max_funcionarios != null && staff > plan.max_funcionarios) {
    return `Este plan permite máximo ${plan.max_funcionarios} funcionarios. Actualmente tienes ${staff}.`;
  }
  return null;
}
