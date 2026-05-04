import React, { useEffect } from "react";
import {
  CRM_STATE_MAP, RIESGO_MAP, PLAN_LABEL,
  formatCLP, formatDate,
} from "../utils/superadminFormatters";
import CustomerHealthBadge from "./CustomerHealthBadge";
import InteractionTimeline from "./InteractionTimeline";
import CrmTasksPanel from "./CrmTasksPanel";

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className="text-sm text-gray-800">{value ?? <span className="text-gray-400">—</span>}</p>
    </div>
  );
}

export default function EleamCustomerDrawer({
  eleamId, slot, loading,
  onClose, onEdit, onRegisterPayment,
  onCreateTask, onCompleteTask, onCreateInteraction,
}) {
  // Permite cerrar con Escape
  useEffect(() => {
    if (!eleamId) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [eleamId, onClose]);

  if (!eleamId) return null;

  const eleam = slot?.detail;
  const crm = eleam ? (CRM_STATE_MAP[eleam.crm_estado] ?? CRM_STATE_MAP.lead) : null;
  const riesgo = eleam ? (RIESGO_MAP[eleam.riesgo_churn] ?? RIESGO_MAP.desconocido) : null;
  const tasksOverdue = (slot?.tasks ?? []).filter((t) => {
    if (t.estado === "completada" || t.estado === "cancelada") return false;
    if (!t.fecha_vencimiento) return false;
    return new Date(t.fecha_vencimiento) < new Date(new Date().setHours(0, 0, 0, 0));
  }).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 h-full w-full sm:w-[640px] bg-gray-50 border-l border-gray-200 shadow-2xl z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <header className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Ficha 360 · CRM</p>
            <h2 className="text-xl font-black text-gray-800 truncate">
              {eleam?.nombre ?? (loading ? "Cargando…" : "—")}
            </h2>
            {eleam && (
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {crm && (
                  <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${crm.color}`}>
                    {crm.label}
                  </span>
                )}
                {riesgo && (
                  <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 border ${riesgo.color}`}>
                    Riesgo: {riesgo.label}
                  </span>
                )}
                <CustomerHealthBadge eleam={eleam} tasksOverdue={tasksOverdue} />
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl" aria-label="Cerrar">×</button>
        </header>

        {!eleam ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {loading ? "Cargando ficha…" : "ELEAM no encontrado."}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Acciones rápidas */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => onEdit(eleam)} className="text-sm bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800">
                Editar ELEAM
              </button>
              <button onClick={() => onRegisterPayment(eleam.id)} className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                Registrar pago
              </button>
            </div>

            {/* Datos generales */}
            <section className="bg-white border border-gray-100 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Email admin" value={eleam.email_admin} />
              <Stat label="Teléfono" value={eleam.telefono} />
              <Stat label="Origen lead" value={eleam.origen_lead} />
              <Stat label="Plan" value={PLAN_LABEL[eleam.plan] ?? eleam.plan} />
              <Stat label="Suscripción" value={eleam.subscription_status ?? "—"} />
              <Stat
                label="Pago"
                value={eleam.pago_activo
                  ? <span className="text-emerald-700 font-semibold">Activa</span>
                  : <span className="text-rose-600 font-semibold">Inactiva</span>}
              />
              <Stat label="Vence" value={formatDate(eleam.fecha_vencimiento_suscripcion)} />
              <Stat label="Próximo cobro" value={formatDate(eleam.proximo_cobro_en)} />
              <Stat label="Último contacto" value={formatDate(eleam.ultimo_contacto)} />
              <Stat label="Próxima acción" value={formatDate(eleam.proxima_accion_fecha)} />
              <Stat label="Responsable" value={eleam.responsable?.nombre} />
              <Stat label="Creado" value={formatDate(eleam.creado_en)} />
              {eleam.notas_admin && (
                <div className="col-span-full bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1">
                  <p className="text-[10px] uppercase font-semibold text-amber-700">Notas internas</p>
                  <p className="text-sm text-amber-900">{eleam.notas_admin}</p>
                </div>
              )}
            </section>

            {/* Pagos del ELEAM */}
            <section className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Pagos</h3>
              {(slot.payments ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">Sin pagos registrados.</p>
              ) : (
                <ul className="divide-y">
                  {slot.payments.slice(0, 6).map((p) => (
                    <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold">{formatCLP(p.monto)} · {PLAN_LABEL[p.plan] ?? p.plan}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(p.fecha_pago)}
                          {p.metodo_pago ? ` · ${p.metodo_pago}` : ""}
                        </p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                        p.estado === "completado"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Tareas del ELEAM */}
            <CrmTasksPanel
              tasks={slot.tasks ?? []}
              onCreate={onCreateTask}
              onComplete={onCompleteTask}
              defaultEleamId={eleam.id}
              title="Tareas de este ELEAM"
              compact
            />

            {/* Interacciones */}
            <section className="bg-white border border-gray-100 rounded-xl p-4">
              <InteractionTimeline
                eleamId={eleam.id}
                interactions={slot.interactions ?? []}
                onCreate={onCreateInteraction}
              />
            </section>
          </div>
        )}
      </aside>
    </>
  );
}
