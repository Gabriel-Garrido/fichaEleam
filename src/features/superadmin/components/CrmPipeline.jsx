import React, { useMemo } from "react";
import { CRM_STATES } from "../utils/superadminFormatters";

// Pipeline visual con conteo por estado. Click filtra en la tabla.
export default function CrmPipeline({ eleams, onPickState, activeState }) {
  const counts = useMemo(() => {
    const out = {};
    for (const e of eleams) out[e.crm_estado] = (out[e.crm_estado] ?? 0) + 1;
    return out;
  }, [eleams]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Pipeline CRM</h2>
        {activeState && (
          <button
            onClick={() => onPickState(null)}
            className="text-xs text-slate-600 hover:underline"
          >
            Limpiar selección
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CRM_STATES.map((s) => {
          const n = counts[s.key] ?? 0;
          const active = activeState === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onPickState(active ? null : s.key)}
              className={`shrink-0 rounded-xl border px-4 py-3 text-left transition-all ${
                active
                  ? "border-slate-700 bg-slate-50"
                  : "border-gray-200 hover:border-slate-300"
              }`}
              style={{ minWidth: 130 }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
                <span className="text-[10px] uppercase font-semibold text-gray-500">
                  {s.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800 tabular-nums">{n}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
