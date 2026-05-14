import React, { useEffect } from "react";
import {
  CRM_STATE_MAP, RIESGO_MAP, PLAN_LABEL,
  formatCLP, formatDate, daysUntil,
} from "../utils/superadminFormatters";
import CustomerHealthBadge from "./CustomerHealthBadge";
import InteractionTimeline from "./InteractionTimeline";
import CrmTasksPanel from "./CrmTasksPanel";
import HelpTooltip from "../../../components/HelpTooltip";

// Tooltips: solo en campos no obvios. Cada texto especifica la columna
// exacta en BD y cómo se interpreta el valor.
const TIPS = {
  origen_lead:
    "eleams.origen_lead — Ingresado manualmente. Indica el canal de captación: orgánico, referido, campaña, etc. Útil para analizar qué fuente genera más clientes.",
  plan:
    "eleams.plan — Valores: demo | mensual | anual. Se actualiza al registrar un pago manual o vía MercadoPago.",
  subscription_status:
    "eleams.subscription_status — Actualizado por el webhook de MercadoPago o al registrar pago manual.\n• activo = suscripción vigente\n• en_gracia = vencida pero aún con acceso hasta la fecha de vencimiento\n• cancelado / vencido = sin acceso\n• pausado / pendiente = estados intermedios",
  pago:
    "eleams.pago_activo — Calculado automáticamente por el trigger sync_pago_activo. Es true cuando subscription_status es 'activo' o 'en_gracia' y la fecha de vencimiento no ha pasado. Si aparece Inactiva y el ELEAM debería tener acceso, revisa la fecha de vencimiento y el estado de suscripción.",
  vence:
    "eleams.fecha_vencimiento_suscripcion — Fecha límite del acceso vigente. Se actualiza al registrar un pago. Cuando esta fecha pasa sin renovación, el trigger pone pago_activo = false automáticamente.",
  proximo_cobro:
    "eleams.proximo_cobro_en — Solo aplica si hay una preapproval activa en MercadoPago. Se actualiza vía webhook mp-webhook. Vacío si el plan es manual o si no hay suscripción automática.",
  ultimo_contacto:
    "eleams.ultimo_contacto — Se actualiza automáticamente al crear una interacción CRM desde la ficha. También editable en 'Editar ELEAM'. Sin contacto en más de 60 días activa la alerta de churn.",
  proxima_accion:
    "eleams.proxima_accion_fecha — Fecha programada para el próximo seguimiento (llamada, reunión, etc.). Se define manualmente en 'Editar ELEAM'.",
};

function SectionBlock({ title, children, cols = 2 }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 pb-1 border-b border-slate-100">
        {title}
      </p>
      <div className={`grid gap-3 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value, tip }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold flex items-center gap-1">
        {label}
        {tip && <HelpTooltip label={label}>{tip}</HelpTooltip>}
      </p>
      <p className="text-sm text-slate-800 mt-0.5 leading-snug">
        {value ?? <span className="text-slate-400">—</span>}
      </p>
    </div>
  );
}

function SubscriptionStatusPill({ status }) {
  const map = {
    activo:    { cls: "bg-emerald-100 text-emerald-700", label: "Activo" },
    en_gracia: { cls: "bg-amber-100 text-amber-700",    label: "En gracia" },
    cancelado: { cls: "bg-rose-100 text-rose-600",      label: "Cancelado" },
    vencido:   { cls: "bg-rose-100 text-rose-600",      label: "Vencido" },
    inactivo:  { cls: "bg-slate-100 text-slate-500",    label: "Inactivo" },
    pendiente: { cls: "bg-sky-100 text-sky-700",        label: "Pendiente" },
    pausado:   { cls: "bg-orange-100 text-orange-700",  label: "Pausado" },
  };
  const s = map[status] ?? { cls: "bg-slate-100 text-slate-500", label: status ?? "—" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

function PagoPill({ active }) {
  return active
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Activa</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />Inactiva</span>;
}

export default function EleamCustomerDrawer({
  eleamId, slot, loading,
  onClose, onEdit, onRegisterPayment,
  onCreateTask, onCompleteTask, onCreateInteraction,
}) {
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
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden />
      <aside
        className="fixed right-0 top-0 h-full w-full sm:w-[660px] bg-slate-50 border-l border-slate-200 shadow-2xl z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <header className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
              Ficha 360 · CRM
            </p>
            <h2 className="text-xl font-black text-slate-800 truncate">
              {eleam?.nombre ?? (loading ? "Cargando…" : "—")}
            </h2>
            {eleam && (
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                {crm && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${crm.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${crm.dot}`} />
                    {crm.label}
                  </span>
                )}
                {riesgo && (
                  <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 border ${riesgo.color}`}>
                    Riesgo: {riesgo.label}
                  </span>
                )}
                <CustomerHealthBadge eleam={eleam} tasksOverdue={tasksOverdue} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none mt-0.5"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        {!eleam ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {loading ? "Cargando ficha…" : "ELEAM no encontrado."}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Banner demo activo */}
            {eleam.plan === "demo" && (() => {
              const d = daysUntil(eleam.fecha_vencimiento_suscripcion);
              const expired = d != null && d < 0;
              const urgent  = !expired && d != null && d <= 7;
              return (
                <div className={`rounded-xl border p-4 ${expired ? "bg-rose-50 border-rose-200" : urgent ? "bg-amber-50 border-amber-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${expired ? "bg-rose-100" : "bg-amber-100"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 ${expired ? "text-rose-600" : "text-amber-700"}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold uppercase tracking-wide ${expired ? "text-rose-700" : "text-amber-800"}`}>
                        {expired ? "Demo vencido" : "Acceso demo activo"}
                      </p>
                      <p className={`text-sm mt-0.5 ${expired ? "text-rose-700" : "text-amber-900"}`}>
                        {d == null
                          ? "Sin fecha de vencimiento configurada."
                          : expired
                            ? `El período demo venció hace ${Math.abs(d)} día${Math.abs(d) !== 1 ? "s" : ""}. El acceso ya no está activo.`
                            : d === 0
                              ? "El período demo vence hoy."
                              : `Quedan ${d} día${d !== 1 ? "s" : ""} de demo (hasta ${formatDate(eleam.fecha_vencimiento_suscripcion)}).`}
                      </p>
                      {!expired && (
                        <p className="text-xs text-amber-700 mt-1">
                          Registra un pago manual o espera que el cliente se suscriba desde su panel.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Acciones rápidas */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onEdit(eleam)}
                className="text-sm bg-slate-700 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Editar ELEAM
              </button>
              <button
                type="button"
                onClick={() => onRegisterPayment(eleam.id)}
                className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Registrar pago
              </button>
            </div>

            {/* Contacto */}
            <section className="bg-white border border-slate-100 rounded-xl p-4">
              <SectionBlock title="Contacto" cols={2}>
                <Stat
                  label="Email admin"
                  value={eleam.email_admin
                    ? <a href={`mailto:${eleam.email_admin}`} className="text-sky-600 hover:underline break-all">{eleam.email_admin}</a>
                    : null}
                />
                <Stat label="Teléfono" value={eleam.telefono} />
                <Stat label="Origen lead" value={eleam.origen_lead} tip={TIPS.origen_lead} />
                <Stat label="Responsable" value={eleam.responsable?.nombre} />
              </SectionBlock>
            </section>

            {/* Suscripción */}
            <section className={`border rounded-xl p-4 ${eleam.plan === "demo" ? "bg-amber-50/50 border-amber-100" : "bg-white border-slate-100"}`}>
              <SectionBlock title={eleam.plan === "demo" ? "Demo y acceso" : "Suscripción y acceso"} cols={3}>
                <Stat
                  label="Plan"
                  value={<span className="capitalize">{PLAN_LABEL[eleam.plan] ?? eleam.plan ?? "—"}</span>}
                  tip={TIPS.plan}
                />
                <Stat
                  label="Estado"
                  value={<SubscriptionStatusPill status={eleam.subscription_status} />}
                  tip={TIPS.subscription_status}
                />
                <Stat
                  label="Acceso al sistema"
                  value={<PagoPill active={eleam.pago_activo} />}
                  tip={TIPS.pago}
                />
                <Stat
                  label={eleam.plan === "demo" ? "Demo vence" : "Vence"}
                  value={formatDate(eleam.fecha_vencimiento_suscripcion)}
                  tip={TIPS.vence}
                />
                {eleam.plan !== "demo" && (
                  <Stat
                    label="Próximo cobro MP"
                    value={formatDate(eleam.proximo_cobro_en)}
                    tip={TIPS.proximo_cobro}
                  />
                )}
                <Stat
                  label="Registrado"
                  value={formatDate(eleam.creado_en)}
                />
              </SectionBlock>
            </section>

            {/* CRM */}
            <section className="bg-white border border-slate-100 rounded-xl p-4">
              <SectionBlock title="Actividad CRM" cols={2}>
                <Stat
                  label="Último contacto"
                  value={eleam.ultimo_contacto
                    ? formatDate(eleam.ultimo_contacto)
                    : <span className="text-rose-500 text-xs font-medium">Sin contacto registrado</span>}
                  tip={TIPS.ultimo_contacto}
                />
                <Stat
                  label="Próxima acción"
                  value={formatDate(eleam.proxima_accion_fecha)}
                  tip={TIPS.proxima_accion}
                />
              </SectionBlock>

              {eleam.notas_admin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
                  <p className="text-[10px] uppercase font-bold text-amber-700 mb-1">Notas internas</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{eleam.notas_admin}</p>
                </div>
              )}
            </section>

            {/* Historial de pagos */}
            <section className="bg-white border border-slate-100 rounded-xl p-4">
              <h3 className="font-semibold text-slate-700 text-sm mb-2">
                Historial de pagos
                <span className="ml-2 text-[10px] text-slate-400 font-normal">tabla pagos — últimos 30</span>
              </h3>
              {(slot.payments ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">Sin pagos registrados.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {slot.payments.slice(0, 6).map((p) => (
                    <li key={p.id} className="py-2.5 flex items-center justify-between text-sm gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          {formatCLP(p.monto)}
                          <span className="text-slate-400 font-normal"> · {PLAN_LABEL[p.plan] ?? p.plan}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(p.fecha_pago)}
                          {p.metodo_pago ? ` · ${p.metodo_pago}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        p.estado === "completado"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {p.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Tareas */}
            <CrmTasksPanel
              tasks={slot.tasks ?? []}
              onCreate={onCreateTask}
              onComplete={onCompleteTask}
              defaultEleamId={eleam.id}
              title="Tareas de este ELEAM"
              compact
            />

            {/* Interacciones */}
            <section className="bg-white border border-slate-100 rounded-xl p-4">
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
