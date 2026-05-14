import React from "react";
import { CRM_STATES, CRM_STATE_MAP, RIESGO_CHURN, RIESGO_MAP, PLAN_LABEL } from "../utils/superadminFormatters";

// Human-readable label for each active filter
function getChipLabel(key, value) {
  if (key === "crmEstado")  return `Estado: ${CRM_STATE_MAP[value]?.label ?? value}`;
  if (key === "plan")       return `Plan: ${PLAN_LABEL[value] ?? value}`;
  if (key === "pagoActivo") return `Pago: ${value === "si" ? "Activo" : "Inactivo"}`;
  if (key === "riesgo")     return `Riesgo: ${RIESGO_MAP[value]?.label ?? value}`;
  return value;
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function EleamFilters({ filters, setFilters, count }) {
  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const clear = (key) => setFilters((prev) => { const next = { ...prev }; delete next[key]; return next; });

  // Active chip filters (excludes the free-text search)
  const activeChips = Object.entries(filters).filter(
    ([k, v]) => v && k !== "search" && ["crmEstado", "plan", "pagoActivo", "riesgo"].includes(k),
  );

  const hasAnyFilter = !!filters.search || activeChips.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4 space-y-3">
      {/* Row 1: inputs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Search */}
        <div className="md:col-span-2">
          <label htmlFor="filter-search" className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 block">
            Buscar
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              id="filter-search"
              type="search"
              placeholder="Nombre o email del admin…"
              value={filters.search ?? ""}
              onChange={(e) => set({ search: e.target.value })}
              className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-slate-50"
            />
          </div>
        </div>

        {/* Estado CRM */}
        <div>
          <label htmlFor="filter-crm" className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 block">
            Estado CRM
          </label>
          <select
            id="filter-crm"
            value={filters.crmEstado ?? ""}
            onChange={(e) => set({ crmEstado: e.target.value || undefined })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Todos los estados</option>
            {CRM_STATES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {/* Plan */}
        <div>
          <label htmlFor="filter-plan" className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 block">
            Plan
          </label>
          <select
            id="filter-plan"
            value={filters.plan ?? ""}
            onChange={(e) => set({ plan: e.target.value || undefined })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Todos los planes</option>
            {Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Riesgo */}
        <div>
          <label htmlFor="filter-riesgo" className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 block">
            Riesgo churn
          </label>
          <select
            id="filter-riesgo"
            value={filters.riesgo ?? ""}
            onChange={(e) => set({ riesgo: e.target.value || undefined })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Cualquier riesgo</option>
            {RIESGO_CHURN.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: Pago quick-filter pills + result count + clear */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pago pills */}
          {[
            { val: "", label: "Todos" },
            { val: "si", label: "Pago activo" },
            { val: "no", label: "Sin pago" },
          ].map(({ val, label }) => {
            const active = (filters.pagoActivo ?? "") === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => set({ pagoActivo: val || undefined })}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  active
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}

          {/* Active filter chips */}
          {activeChips.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-xs px-2.5 py-1 font-medium"
            >
              {getChipLabel(key, value)}
              <button
                type="button"
                onClick={() => clear(key)}
                aria-label={`Quitar filtro: ${getChipLabel(key, value)}`}
                className="ml-0.5 hover:text-teal-900 rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-400"
              >
                <XIcon />
              </button>
            </span>
          ))}
        </div>

        {/* Count + clear all */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            <strong className="text-slate-700 tabular-nums">{count}</strong> ELEAM{count !== 1 ? "s" : ""}
          </span>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Limpiar todo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
