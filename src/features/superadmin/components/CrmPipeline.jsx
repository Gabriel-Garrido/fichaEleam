import React, { useMemo } from "react";
import { CRM_STATES } from "../utils/superadminFormatters";
import MetricHelp from "./MetricHelp";

const STATE_HELP = {
  lead: "Primer registro comercial, aun sin contacto efectivo.",
  contactado: "Prospecto con contacto inicial ya realizado.",
  demo_agendada: "Existe una demo comprometida en agenda.",
  demo_realizada: "La demo ya ocurrio y falta cierre o seguimiento.",
  prueba: "Cuenta en prueba o evaluacion activa del producto.",
  pendiente_pago: "Cliente listo para activar, pendiente de pago o suscripcion.",
  cliente_activo: "Cliente operativo con relacion activa.",
  cliente_riesgo: "Cliente que requiere accion de retencion.",
  perdido: "Oportunidad descartada o cliente perdido.",
};

// Pipeline visual con conteo por estado. Cada etapa puede filtrar la tabla.
export default function CrmPipeline({ eleams, onPickState, activeState }) {
  const counts = useMemo(() => {
    const out = {};
    for (const e of eleams) out[e.crm_estado] = (out[e.crm_estado] ?? 0) + 1;
    return out;
  }, [eleams]);

  const total = eleams.length || 0;

  return (
    <section className="mb-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-800">Pipeline comercial</h2>
            <MetricHelp
              title="Pipeline comercial"
              description="Distribuye cada ELEAM segun su estado comercial actual."
              source="public.eleams.crm_estado."
              action="Usalo para detectar cuellos de botella entre lead, demo, pago y cliente activo."
            />
          </div>
          <p className="text-xs text-slate-500">
            Selecciona una etapa para filtrar la tabla de clientes.
          </p>
        </div>
        {activeState && (
          <button
            type="button"
            onClick={() => onPickState(null)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:bg-white"
          >
            Limpiar selección
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {CRM_STATES.map((s) => {
          const n = counts[s.key] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          const active = activeState === s.key;
          return (
            <article
              key={s.key}
              className={`rounded-lg border bg-white p-4 shadow-sm transition-all ${
                active
                  ? "border-slate-700 bg-slate-50"
                  : "border-gray-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
                  <span className="text-[10px] font-semibold uppercase text-slate-500">
                    {s.label}
                  </span>
                </div>
                <MetricHelp
                  title={s.label}
                  description={STATE_HELP[s.key]}
                  source={`public.eleams.crm_estado = ${s.key}.`}
                  action="El boton de esta tarjeta filtra la cartera por esta etapa."
                />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">{n}</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${s.dot}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{pct}% de cartera</span>
                <button
                  type="button"
                  onClick={() => onPickState(active ? null : s.key)}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                >
                  {active ? "Quitar" : "Filtrar"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
