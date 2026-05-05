import React from "react";
import { formatCLP, formatDate, PLAN_LABEL, PLAN_BADGE } from "../utils/superadminFormatters";

export default function RecentPaymentsTable({ payments, onSelectEleam }) {
  if (!payments?.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
        Aún no hay pagos registrados.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
            <tr>
              <th className="px-3 py-2 text-left">ELEAM</th>
              <th className="px-3 py-2 text-center">Monto</th>
              <th className="px-3 py-2 text-center">Plan</th>
              <th className="px-3 py-2 text-center">Método</th>
              <th className="px-3 py-2 text-center">Fecha</th>
              <th className="px-3 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-800">
                  {onSelectEleam && p.eleam_id ? (
                    <button
                      onClick={() => onSelectEleam(p.eleam_id)}
                      className="hover:underline text-left"
                    >
                      {p.eleams?.nombre ?? "—"}
                    </button>
                  ) : (p.eleams?.nombre ?? "—")}
                </td>
                <td className="px-3 py-2 text-center font-medium text-gray-700">{formatCLP(p.monto)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${PLAN_BADGE[p.plan] ?? "bg-gray-100 text-gray-600"}`}>
                    {PLAN_LABEL[p.plan] ?? p.plan}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-gray-500">{p.metodo_pago ?? "—"}</td>
                <td className="px-3 py-2 text-center text-gray-400 text-xs">{formatDate(p.fecha_pago)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    p.estado === "completado" ? "bg-emerald-100 text-emerald-700" :
                    p.estado === "fallido"   ? "bg-rose-100 text-rose-700" :
                                               "bg-gray-100 text-gray-500"
                  }`}>
                    {p.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
