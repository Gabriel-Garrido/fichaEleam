import React from "react";
import { CRM_STATES, RIESGO_CHURN, PLAN_LABEL } from "../utils/superadminFormatters";

export default function EleamFilters({ filters, setFilters, count }) {
  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="md:col-span-2">
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1 block">
          Buscar
        </label>
        <input
          type="search"
          placeholder="Nombre o email del admin…"
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value })}
          className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1 block">
          Estado CRM
        </label>
        <select
          value={filters.crmEstado ?? ""}
          onChange={(e) => set({ crmEstado: e.target.value || null })}
          className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm bg-white"
        >
          <option value="">Todos</option>
          {CRM_STATES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1 block">
          Pago
        </label>
        <select
          value={filters.pagoActivo ?? ""}
          onChange={(e) => set({ pagoActivo: e.target.value || null })}
          className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm bg-white"
        >
          <option value="">Todos</option>
          <option value="si">Activo</option>
          <option value="no">Inactivo</option>
        </select>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1 block">
          Plan
        </label>
        <select
          value={filters.plan ?? ""}
          onChange={(e) => set({ plan: e.target.value || null })}
          className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm bg-white"
        >
          <option value="">Todos</option>
          {Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1 block">
          Riesgo churn
        </label>
        <select
          value={filters.riesgo ?? ""}
          onChange={(e) => set({ riesgo: e.target.value || null })}
          className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm bg-white"
        >
          <option value="">Todos</option>
          {RIESGO_CHURN.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </div>

      <div className="md:col-span-5 flex items-center justify-between flex-wrap gap-2 pt-1">
        <span className="text-xs text-slate-500">{count} ELEAM(s) coinciden</span>
        <button
          type="button"
          onClick={() => setFilters({})}
          className="text-xs text-slate-600 hover:underline"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
