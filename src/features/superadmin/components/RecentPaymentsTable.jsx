import React, { useMemo, useState } from "react";
import { formatCLP, formatDate, PLAN_LABEL, PLAN_BADGE } from "../utils/superadminFormatters";

const ESTADO_STYLE = {
  completado: { cls: "bg-emerald-100 text-emerald-700", label: "Completado" },
  fallido:    { cls: "bg-rose-100 text-rose-700",       label: "Fallido" },
  pendiente:  { cls: "bg-amber-100 text-amber-700",     label: "Pendiente" },
  reembolsado:{ cls: "bg-slate-100 text-slate-600",     label: "Reembolsado" },
};

function SearchIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

export default function RecentPaymentsTable({ payments, onSelectEleam }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return payments ?? [];
    const s = search.toLowerCase();
    return (payments ?? []).filter((p) =>
      (p.eleams?.nombre ?? "").toLowerCase().includes(s) ||
      (p.metodo_pago ?? "").toLowerCase().includes(s) ||
      (p.plan ?? "").toLowerCase().includes(s),
    );
  }, [payments, search]);

  // Summary stats
  const stats = useMemo(() => {
    const list = payments ?? [];
    const completados = list.filter((p) => p.estado === "completado");
    return {
      total: completados.reduce((sum, p) => sum + (p.monto ?? 0), 0),
      count: completados.length,
      pending: list.filter((p) => p.estado === "pendiente").length,
    };
  }, [payments]);

  if (!payments?.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-sm">
        Aún no hay pagos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-medium">Ingresos mostrados</p>
          <p className="text-xl font-bold tabular-nums text-emerald-700 mt-0.5">{formatCLP(stats.total)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.count} pago{stats.count !== 1 ? "s" : ""} completado{stats.count !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-medium">Registros en vista</p>
          <p className="text-xl font-bold tabular-nums text-slate-800 mt-0.5">{filtered.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{search ? `de ${payments.length} total` : "Total cargado"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-medium">Pendientes</p>
          <p className={`text-xl font-bold tabular-nums mt-0.5 ${stats.pending > 0 ? "text-amber-700" : "text-slate-400"}`}>
            {stats.pending}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">pago{stats.pending !== 1 ? "s" : ""} por confirmar</p>
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="Buscar ELEAM, plan o método…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-slate-50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold">ELEAM</th>
                <th className="px-4 py-2.5 text-right font-bold">Monto</th>
                <th className="px-4 py-2.5 text-center font-bold">Plan</th>
                <th className="px-4 py-2.5 text-center font-bold">Método</th>
                <th className="px-4 py-2.5 text-center font-bold">Fecha</th>
                <th className="px-4 py-2.5 text-center font-bold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                    Sin resultados para &ldquo;{search}&rdquo;
                  </td>
                </tr>
              ) : filtered.map((p) => {
                const estado = ESTADO_STYLE[p.estado] ?? { cls: "bg-slate-100 text-slate-500", label: p.estado };
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[180px]">
                      {onSelectEleam && p.eleam_id ? (
                        <button
                          type="button"
                          onClick={() => onSelectEleam(p.eleam_id)}
                          className="hover:underline text-left hover:text-teal-700 truncate block max-w-full"
                          title={p.eleams?.nombre}
                        >
                          {p.eleams?.nombre ?? "—"}
                        </button>
                      ) : (
                        <span className="truncate block max-w-full" title={p.eleams?.nombre}>
                          {p.eleams?.nombre ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                      {formatCLP(p.monto)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${PLAN_BADGE[p.plan] ?? "bg-slate-100 text-slate-600"}`}>
                        {PLAN_LABEL[p.plan] ?? p.plan ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                      {p.metodo_pago ? (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md capitalize">
                          {p.metodo_pago}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(p.fecha_pago)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${estado.cls}`}>
                        {estado.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Mostrando {filtered.length} de {payments.length} registros
            </p>
            <p className="text-xs font-semibold text-emerald-700 tabular-nums">
              {formatCLP(filtered.filter((p) => p.estado === "completado").reduce((s, p) => s + (p.monto ?? 0), 0))} total vista
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
