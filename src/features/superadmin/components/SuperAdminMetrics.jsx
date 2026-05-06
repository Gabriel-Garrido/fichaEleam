import React from "react";
import { formatCLP } from "../utils/superadminFormatters";

function MetricCard({ label, value, sub, color = "text-gray-800", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${
        onClick ? "hover:border-slate-300 hover:shadow transition-all" : "cursor-default"
      } w-full`}
    >
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </button>
  );
}

export default function SuperAdminMetrics({ metrics, onFilterRisk, onFilterLeads, leadsNuevos = 0, activeInDemoCount = 0 }) {
  if (!metrics) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-6">
      <MetricCard
        label="ELEAMs"
        value={metrics.totalEleams}
        sub={`+${metrics.newEleamsThisMonth} este mes`}
      />
      <MetricCard
        label="Activos"
        value={metrics.activeSubscriptions}
        color="text-emerald-600"
        sub="Suscripciones al día"
      />
      <MetricCard
        label="Demos / pruebas"
        value={metrics.demoEleams}
        color="text-indigo-600"
      />
      <MetricCard
        label="Leads"
        value={metrics.leads}
        color="text-sky-600"
        sub="Pipeline en frío"
        onClick={onFilterLeads}
      />
      <MetricCard
        label="En riesgo"
        value={metrics.enRiesgo}
        color="text-rose-600"
        sub="Churn alto / cliente_riesgo"
        onClick={onFilterRisk}
      />
      <MetricCard
        label="Ingresos mes"
        value={formatCLP(metrics.mrrCLP)}
        color="text-blue-600"
      />
      <MetricCard
        label="Residentes"
        value={metrics.totalResidents}
        sub={`${metrics.activeResidents} activos`}
      />
      <MetricCard
        label="Leads nuevos (7d)"
        value={leadsNuevos}
        color="text-violet-600"
        sub="Landing page"
      />
      <MetricCard
        label="En demo ahora"
        value={activeInDemoCount}
        color={activeInDemoCount > 0 ? "text-teal-600" : "text-gray-500"}
        sub={activeInDemoCount > 0 ? "Activos" : "Ninguno"}
      />
    </div>
  );
}
