import { CRM_STATES, CRM_STATE_MAP, RIESGO_CHURN, RIESGO_MAP, PLAN_LABEL } from "../utils/superadminFormatters";

function chipLabel(key, value) {
  if (key === "crmEstado") return `Estado: ${CRM_STATE_MAP[value]?.label ?? value}`;
  if (key === "plan") return `Plan: ${PLAN_LABEL[value] ?? value}`;
  if (key === "pagoActivo") return value === "si" ? "Acceso activo" : "Sin acceso";
  if (key === "riesgo") return `Riesgo: ${RIESGO_MAP[value]?.label ?? value}`;
  if (key === "uso") return ({ con_uso: "Con actividad", sin_uso: "Sin actividad", activos_7d: "Actividad reciente", sin_activar: "Acceso pendiente", demo_recuperar: "Sin plan pagado" })[value] ?? value;
  return value;
}

const selectClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

export default function EleamFilters({ filters, setFilters, count }) {
  const set = (patch) => setFilters((previous) => ({ ...previous, ...patch }));
  const active = Object.entries(filters).filter(([key, value]) => value && key !== "search");
  const hasFilters = Boolean(filters.search) || active.length > 0;

  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px_180px_auto] md:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Buscar cliente</span>
          <input type="search" placeholder="Nombre o correo del administrador" value={filters.search ?? ""} onChange={(event) => set({ search: event.target.value })} className={selectClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Actividad</span>
          <select value={filters.uso ?? ""} onChange={(event) => set({ uso: event.target.value || undefined })} className={selectClass}>
            <option value="">Cualquier nivel</option><option value="demo_recuperar">Sin plan pagado</option><option value="activos_7d">Actividad reciente</option><option value="con_uso">Con actividad</option><option value="sin_uso">Sin actividad</option><option value="sin_activar">Acceso pendiente</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Plan</span>
          <select value={filters.plan ?? ""} onChange={(event) => set({ plan: event.target.value || undefined })} className={selectClass}>
            <option value="">Todos</option>{Object.entries(PLAN_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <span className="pb-2 text-sm text-slate-500"><strong className="text-slate-800">{count}</strong> resultado{count === 1 ? "" : "s"}</span>
      </div>

      <details className="mt-3 border-t border-slate-100 pt-3">
        <summary className="cursor-pointer list-none text-xs font-bold text-teal-700">Más filtros</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label><span className="mb-1 block text-xs text-slate-500">Estado comercial</span><select value={filters.crmEstado ?? ""} onChange={(event) => set({ crmEstado: event.target.value || undefined })} className={selectClass}><option value="">Todos</option>{CRM_STATES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label><span className="mb-1 block text-xs text-slate-500">Riesgo de baja</span><select value={filters.riesgo ?? ""} onChange={(event) => set({ riesgo: event.target.value || undefined })} className={selectClass}><option value="">Todos</option>{RIESGO_CHURN.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label><span className="mb-1 block text-xs text-slate-500">Acceso</span><select value={filters.pagoActivo ?? ""} onChange={(event) => set({ pagoActivo: event.target.value || undefined })} className={selectClass}><option value="">Todos</option><option value="si">Activo</option><option value="no">Sin acceso</option></select></label>
        </div>
      </details>

      {hasFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {active.map(([key, value]) => <span key={key} className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">{chipLabel(key, value)}</span>)}
          <button type="button" onClick={() => setFilters({})} className="ml-auto text-xs font-semibold text-rose-600 hover:underline">Limpiar filtros</button>
        </div>
      )}
    </section>
  );
}
