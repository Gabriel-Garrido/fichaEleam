import React from "react";
import {
  CRM_STATE_MAP, RIESGO_MAP, PLAN_LABEL, PLAN_BADGE,
  formatDate, daysUntil,
} from "../utils/superadminFormatters";
import CustomerHealthBadge from "./CustomerHealthBadge";
import HelpTooltip from "../../../components/HelpTooltip";

// Tooltips de columna: solo en campos que no son auto-evidentes.
// Cada texto especifica la columna exacta en BD y cómo interpretarla.
const COL_TIPS = {
  crmEstado:
    "eleams.crm_estado — Etapa del ciclo comercial, editable desde 'Editar ELEAM'.\nPipeline: Lead → Contactado → Demo agendada → Demo realizada → En prueba → Pago pendiente → Cliente activo → En riesgo → Perdido.",
  plan:
    "eleams.plan — Plan contratado: demo | mensual | anual. Se actualiza al registrar un pago manual o vía MercadoPago.",
  pago:
    "eleams.pago_activo — Calculado automáticamente por el trigger sync_pago_activo. Activo cuando subscription_status es 'activo' o 'en_gracia' y la fecha de vencimiento no ha pasado.",
  riesgo:
    "eleams.riesgo_churn — Evaluación manual: bajo | medio | alto | desconocido. Se edita en 'Editar ELEAM'. Alto = requiere atención inmediata para retener.",
  salud:
    "Indicador calculado en el cliente combinando:\n• eleams.pago_activo y subscription_status\n• Días hasta eleams.fecha_vencimiento_suscripcion (≤14d = alerta)\n• Días desde eleams.ultimo_contacto (>60d sin contacto = alerta)\n• eleams.riesgo_churn\n• Tareas CRM vencidas (crm_tasks con fecha_vencimiento pasada)\nPasa el cursor sobre el badge para ver los motivos detallados.",
  vencimiento:
    "eleams.fecha_vencimiento_suscripcion — Fecha límite del acceso.\nVerde: vigente · Ámbar: vence en ≤14 días · Rojo: ya venció.",
  ultimoContacto:
    "eleams.ultimo_contacto — Se actualiza automáticamente al crear una interacción CRM. Sin contacto en más de 60 días hace que 'Salud' baje a 'Atención'. 'Sin contacto' en rojo = nunca hubo interacción registrada.",
  proxAccion:
    "eleams.proxima_accion_fecha — Fecha programada para el próximo seguimiento comercial. Se define manualmente en 'Editar ELEAM'.",
};

function ThTip({ children, tip, center, className = "" }) {
  return (
    <th className={`px-3 py-2.5 text-left ${center ? "text-center" : ""} ${className}`}>
      <span className={`inline-flex items-center gap-1 ${center ? "justify-center" : ""}`}>
        {children}
        {tip && <HelpTooltip label={String(children)}>{tip}</HelpTooltip>}
      </span>
    </th>
  );
}

function VencimientoCell({ fecha, pagoActivo, isDemo }) {
  const d = daysUntil(fecha);
  if (!fecha) return <span className="text-xs text-slate-400">—</span>;
  let cls = isDemo ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700";
  if (d != null && d < 0)        cls = "bg-rose-100 text-rose-700";
  else if (d != null && d <= 7)  cls = "bg-rose-100 text-rose-700";
  else if (d != null && d <= 14) cls = "bg-amber-100 text-amber-800";
  if (!pagoActivo && !isDemo)    cls = "bg-slate-100 text-slate-500";
  const title = d == null ? "" : d < 0
    ? `${isDemo ? "Demo venció" : "Venció"} hace ${Math.abs(d)} días`
    : d === 0 ? `${isDemo ? "Demo vence" : "Vence"} hoy`
    : `${isDemo ? "Demo vence" : "Vence"} en ${d} días`;
  return (
    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${cls}`} title={title}>
      {formatDate(fecha)}
      {isDemo && d != null && d >= 0 && (
        <span className="ml-1 opacity-70">({d}d)</span>
      )}
    </span>
  );
}

export default function EleamTable({ eleams, onEdit, onOpen, taskCountByEleam = {} }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-100">
            <tr>
              <ThTip className="font-bold w-40">ELEAM</ThTip>
              <ThTip className="font-bold">Email admin</ThTip>
              <ThTip tip={COL_TIPS.crmEstado} center className="font-bold">Estado CRM</ThTip>
              <ThTip tip={COL_TIPS.plan} center className="font-bold">Plan</ThTip>
              <ThTip tip={COL_TIPS.pago} center className="font-bold">Pago</ThTip>
              <ThTip tip={COL_TIPS.riesgo} center className="font-bold">Riesgo</ThTip>
              <ThTip tip={COL_TIPS.salud} center className="font-bold">Salud</ThTip>
              <ThTip tip={COL_TIPS.vencimiento} center className="font-bold">Vencimiento</ThTip>
              <ThTip tip={COL_TIPS.ultimoContacto} center className="font-bold whitespace-nowrap">Último contacto</ThTip>
              <ThTip tip={COL_TIPS.proxAccion} center className="font-bold whitespace-nowrap">Próx. acción</ThTip>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {eleams.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-slate-400 text-sm">
                  No hay ELEAMs que coincidan con el filtro.
                </td>
              </tr>
            ) : eleams.map((e) => {
              const crm    = CRM_STATE_MAP[e.crm_estado] ?? CRM_STATE_MAP.lead;
              const riesgo = RIESGO_MAP[e.riesgo_churn] ?? RIESGO_MAP.desconocido;
              const overdue = taskCountByEleam[e.id] ?? 0;
              const isDemo = e.plan === "demo";
              return (
                <tr key={e.id} className={`transition-colors ${isDemo ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-slate-50"}`}>
                  <td className="px-3 py-2.5 font-semibold text-slate-800 w-40">
                    <button
                      type="button"
                      onClick={() => onOpen(e)}
                      className="hover:underline text-left hover:text-teal-700 transition-colors leading-tight"
                    >
                      {e.nombre}
                    </button>
                    {isDemo && (
                      <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold border border-amber-200">
                        Demo
                      </span>
                    )}
                    {overdue > 0 && (
                      <span
                        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-bold"
                        title={`${overdue} tarea(s) CRM vencida(s)`}
                        aria-label={`${overdue} tareas vencidas`}
                      >
                        {overdue}
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs truncate max-w-[180px]">
                    {e.email_admin ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${crm.color}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${crm.dot}`} />
                      {crm.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${PLAN_BADGE[e.plan] ?? "bg-slate-100 text-slate-600"}`}>
                      {PLAN_LABEL[e.plan] ?? e.plan ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      e.pago_activo
                        ? "bg-emerald-100 text-emerald-700"
                        : isDemo
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-600"
                    }`}>
                      {e.pago_activo ? "Activo" : isDemo ? "Demo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 border ${riesgo.color}`}>
                      {riesgo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <CustomerHealthBadge eleam={e} tasksOverdue={overdue} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <VencimientoCell fecha={e.fecha_vencimiento_suscripcion} pagoActivo={e.pago_activo} isDemo={isDemo} />
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs whitespace-nowrap">
                    {e.ultimo_contacto
                      ? <span className="text-slate-500">{formatDate(e.ultimo_contacto)}</span>
                      : <span className="text-rose-500 font-medium">Sin contacto</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center text-slate-500 text-xs whitespace-nowrap">
                    {e.proxima_accion_fecha ? formatDate(e.proxima_accion_fecha) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onOpen(e)}
                      className="text-teal-700 hover:underline text-xs mr-3 font-medium"
                    >
                      Ficha
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(e)}
                      className="text-slate-500 hover:underline text-xs"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
