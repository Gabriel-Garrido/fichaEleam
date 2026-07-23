import Button from "../../components/Button";
import {
  PAYMENT_METHODS,
  chargeState,
  formatClp,
  latestDelivery,
  paidForCharge,
  residentName,
} from "./residentPaymentUtils";

const STATE_STYLE = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

export function SummaryCard({ label, value, detail, tone = "slate" }) {
  const color = { slate: "text-slate-900", teal: "text-teal-700", amber: "text-amber-700", rose: "text-rose-700" }[tone];
  return (
    <article className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className={`break-words text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

export function TabButton({ id, controls, active, onClick, children }) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-controls={controls}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-semibold sm:flex-none sm:px-4 ${active ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}

function ShowMore({ visible, total, onClick }) {
  if (visible >= total) return null;
  return (
    <div className="border-t border-slate-100 p-4 text-center">
      <Button type="button" onClick={onClick} className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto">
        Mostrar más · {total - visible} restantes
      </Button>
    </div>
  );
}

export function ChargeList({ id, charges, totalCount, payments, residentsById, canRegister, canVoid, onPay, onVoid, onShowMore }) {
  if (!charges.length) {
    return (
      <div id={id} role="tabpanel" aria-labelledby="charges-tab" className="px-5 py-14 text-center">
        <p className="font-semibold text-slate-700">No hay cobros en esta selección</p>
        <p className="mt-1 text-sm text-slate-500">Crea el primer cobro o cambia los filtros.</p>
      </div>
    );
  }
  return (
    <div id={id} role="tabpanel" aria-labelledby="charges-tab">
      <ul className="divide-y divide-slate-100">
        {charges.map((charge) => {
          const paid = paidForCharge(charge.id, payments);
          const balance = Math.max(0, Number(charge.monto) - paid);
          const state = chargeState(charge, payments);
          const percentage = Math.min(100, Math.round((paid / Number(charge.monto)) * 100));
          return (
            <li key={charge.id} className="p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,.8fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 break-words font-semibold text-slate-900">{residentName(residentsById[charge.residente_id])}</p>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATE_STYLE[state.tone]}`}>{state.label}</span>
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-700">{charge.concepto}</p>
                  <p className="mt-1 text-xs text-slate-500">Vence {formatDate(charge.fecha_vencimiento)}{charge.periodo ? ` · Período ${charge.periodo.slice(0, 7)}` : ""}</p>
                  {charge.observacion && <p className="mt-2 line-clamp-2 break-words text-xs text-slate-500">{charge.observacion}</p>}
                </div>
                <div>
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>Pagado {formatClp(paid)}</span><span>Total {formatClp(charge.monto)}</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Avance de pago de ${charge.concepto}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage}>
                    <div className="h-full rounded-full bg-teal-600" style={{ width: `${percentage}%` }} />
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800">Saldo: {formatClp(balance)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                  {canRegister && balance > 0 && charge.estado === "activo" && <Button onClick={() => onPay(charge)} className="bg-teal-700 text-white hover:bg-teal-800">Registrar pago</Button>}
                  {canVoid && charge.estado === "activo" && paid === 0 && <Button onClick={() => onVoid(charge)} className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">Anular</Button>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ShowMore visible={charges.length} total={totalCount} onClick={onShowMore} />
    </div>
  );
}

export function PaymentHistory({ id, payments, totalCount, charges, residentsById, deliveries, currentUserId, canRegister, canSend, canVoid, sendingId, onResend, onDocument, onVoid, onShowMore }) {
  if (!payments.length) {
    return (
      <div id={id} role="tabpanel" aria-labelledby="history-tab" className="px-5 py-14 text-center">
        <p className="font-semibold text-slate-700">Aún no hay pagos registrados</p>
        <p className="mt-1 text-sm text-slate-500">Los pagos aparecerán aquí con su documento y estado de envío.</p>
      </div>
    );
  }
  return (
    <div id={id} role="tabpanel" aria-labelledby="history-tab">
      <ul className="divide-y divide-slate-100">
        {payments.map((payment) => {
          const charge = charges.find((item) => item.id === payment.charge_id);
          const delivery = latestDelivery(payment.id, deliveries);
          const canCancelPending = payment.estado === "pendiente_documento"
            && (canVoid || (canRegister && payment.registrado_por === currentUserId));
          return (
            <li key={payment.id} className={`p-4 sm:p-5 ${payment.estado === "anulado" ? "bg-slate-50/70" : ""}`}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(220px,.7fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-semibold text-slate-900">{residentName(residentsById[payment.residente_id])}</p>
                    {payment.estado === "anulado" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">Anulado</span>}
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-600">{charge?.concepto ?? "Cobro"} · {PAYMENT_METHODS[payment.metodo_pago] ?? payment.metodo_pago}</p>
                  <p className="mt-1 break-words text-xs text-slate-500">{formatDate(payment.fecha_pago)}{payment.referencia ? ` · Ref. ${payment.referencia}` : ""}</p>
                  {payment.observacion && <p className="mt-1 break-words text-xs text-slate-500">{payment.observacion}</p>}
                </div>
                <div>
                  <p className="break-words text-xl font-bold text-slate-900">{formatClp(payment.monto)}</p>
                  {payment.estado === "registrado" && <DeliveryStatus delivery={delivery} />}
                  {payment.estado === "pendiente_documento" && <p className="mt-1 text-xs font-semibold text-amber-700">Documento pendiente</p>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                  {payment.estado === "registrado" && <Button onClick={() => onDocument(payment)} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Ver documento</Button>}
                  {canSend && payment.estado === "registrado" && <Button disabled={sendingId === payment.id} onClick={() => onResend(payment)} className="border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100">{sendingId === payment.id ? "Enviando..." : delivery?.estado === "enviado" ? "Reenviar" : "Enviar"}</Button>}
                  {canVoid && payment.estado === "registrado" && <Button onClick={() => onVoid(payment)} className="border border-rose-200 bg-white text-rose-600 hover:bg-rose-50">Anular</Button>}
                  {canCancelPending && <Button onClick={() => onVoid(payment)} className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">Cancelar incompleto</Button>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ShowMore visible={payments.length} total={totalCount} onClick={onShowMore} />
    </div>
  );
}

function DeliveryStatus({ delivery }) {
  if (!delivery) return <p className="mt-1 text-xs font-semibold text-amber-700">Correo pendiente</p>;
  return delivery.estado === "enviado"
    ? <p className="mt-1 text-xs font-semibold text-emerald-700">Comprobante enviado</p>
    : <p className="mt-1 text-xs font-semibold text-rose-700">Envío fallido</p>;
}
