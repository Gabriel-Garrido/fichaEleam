import React from "react";
import {
  CRM_STATE_MAP, RIESGO_MAP, PLAN_LABEL, PLAN_BADGE,
  formatDate, daysUntil,
} from "../utils/superadminFormatters";
import CustomerHealthBadge from "./CustomerHealthBadge";

function VencimientoCell({ fecha, pagoActivo }) {
  const d = daysUntil(fecha);
  if (!fecha) return <span className="text-xs text-gray-400">—</span>;
  let cls = "bg-emerald-50 text-emerald-700";
  if (d != null && d < 0)       cls = "bg-rose-100 text-rose-700";
  else if (d != null && d <= 14) cls = "bg-amber-100 text-amber-800";
  if (!pagoActivo) cls = "bg-slate-100 text-slate-500";
  return (
    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${cls}`}>
      {formatDate(fecha)}
    </span>
  );
}

export default function EleamTable({ eleams, onEdit, onOpen, taskCountByEleam = {} }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
            <tr>
              <th className="px-3 py-2 text-left">ELEAM</th>
              <th className="px-3 py-2 text-left">Email admin</th>
              <th className="px-3 py-2 text-center">Estado CRM</th>
              <th className="px-3 py-2 text-center">Plan</th>
              <th className="px-3 py-2 text-center">Pago</th>
              <th className="px-3 py-2 text-center">Riesgo</th>
              <th className="px-3 py-2 text-center">Salud</th>
              <th className="px-3 py-2 text-center">Vencimiento</th>
              <th className="px-3 py-2 text-center">Último contacto</th>
              <th className="px-3 py-2 text-center">Próx. acción</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {eleams.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                  No hay ELEAMs que coincidan con el filtro.
                </td>
              </tr>
            ) : eleams.map((e) => {
              const crm = CRM_STATE_MAP[e.crm_estado] ?? CRM_STATE_MAP.lead;
              const riesgo = RIESGO_MAP[e.riesgo_churn] ?? RIESGO_MAP.desconocido;
              const overdue = taskCountByEleam[e.id] ?? 0;
              return (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    <button onClick={() => onOpen(e)} className="hover:underline text-left">
                      {e.nombre}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs truncate max-w-[180px]">
                    {e.email_admin ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${crm.color}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${crm.dot}`} />
                      {crm.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${PLAN_BADGE[e.plan] ?? "bg-gray-100 text-gray-600"}`}>
                      {PLAN_LABEL[e.plan] ?? e.plan ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      e.pago_activo ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
                    }`}>
                      {e.pago_activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 border ${riesgo.color}`}>
                      {riesgo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <CustomerHealthBadge eleam={e} tasksOverdue={overdue} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <VencimientoCell fecha={e.fecha_vencimiento_suscripcion} pagoActivo={e.pago_activo} />
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs">
                    {e.ultimo_contacto ? formatDate(e.ultimo_contacto) : <span className="text-rose-500">Sin contacto</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs">
                    {e.proxima_accion_fecha ? formatDate(e.proxima_accion_fecha) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => onOpen(e)}
                      className="text-slate-700 hover:underline text-xs mr-3"
                    >
                      Ficha
                    </button>
                    <button
                      onClick={() => onEdit(e)}
                      className="text-slate-600 hover:underline text-xs"
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
