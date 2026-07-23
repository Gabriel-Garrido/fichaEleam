import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Button from "../../components/Button";
import FilterBar from "../../components/FilterBar";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../layout/PageLayout";
import {
  getResidentPaymentDocumentUrl,
  getResidentPaymentSnapshot,
  resendResidentPaymentReceipt,
  sendResidentPaymentReminder,
} from "./residentPaymentService";
import {
  buildPaymentSummary,
  chargeState,
  formatClp,
  paymentTotalsByCharge,
  residentName,
} from "./residentPaymentUtils";
import { ChargeList, PaymentHistory, SummaryCard, TabButton } from "./ResidentPaymentLists";
import {
  BillingProfilesModal,
  ChargeModal,
  PaymentModal,
  VoidModal,
} from "./ResidentPaymentModals";

const PAGE_SIZE = 40;

function residentMap(residents) {
  return Object.fromEntries(residents.map((resident) => [resident.id, resident]));
}

export default function ResidentPaymentsPage() {
  const { can, user } = useAuth();
  const toast = useToast();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("charges");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const [sort, setSort] = useState("priority");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [chargeLimit, setChargeLimit] = useState(PAGE_SIZE);
  const [paymentLimit, setPaymentLimit] = useState(PAGE_SIZE);
  const [showCharge, setShowCharge] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [payCharge, setPayCharge] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [remindingResidentId, setRemindingResidentId] = useState(null);

  const canRegister = can("registrar_pagos_residentes");
  const canSend = can("enviar_comprobantes_pagos");
  const canVoid = can("anular_pagos_residentes");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSnapshot(await getResidentPaymentSnapshot());
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "No se pudo cargar la cobranza.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const residentsById = useMemo(
    () => residentMap(snapshot?.residents ?? []),
    [snapshot?.residents],
  );
  const summary = useMemo(() => buildPaymentSummary(snapshot?.charges, snapshot?.payments), [snapshot]);
  const paymentTotals = useMemo(() => paymentTotalsByCharge(snapshot?.payments), [snapshot?.payments]);
  const indexedCharges = useMemo(
    () => (snapshot?.charges ?? []).map((charge) => ({
      ...charge,
      pagado_registrado: paymentTotals.get(charge.id) ?? 0,
    })),
    [paymentTotals, snapshot?.charges],
  );
  const chargesById = useMemo(
    () => Object.fromEntries(indexedCharges.map((charge) => [charge.id, charge])),
    [indexedCharges],
  );
  const deliveriesByPayment = useMemo(() => {
    const index = new Map();
    for (const delivery of snapshot?.deliveries ?? []) {
      if (!index.has(delivery.payment_id)) index.set(delivery.payment_id, delivery);
    }
    return index;
  }, [snapshot?.deliveries]);
  const deferredSearch = useDeferredValue(search);
  const query = deferredSearch.trim().toLocaleLowerCase("es-CL");

  const charges = useMemo(() => indexedCharges.filter((charge) => {
    const state = chargeState(charge);
    const resident = residentsById[charge.residente_id];
    const haystack = `${residentName(resident)} ${charge.concepto} ${charge.observacion ?? ""}`
      .toLocaleLowerCase("es-CL");
    if (query && !haystack.includes(query)) return false;
    if (status === "open" && !["pendiente", "parcial", "vencido"].includes(state.key)) return false;
    if (status !== "all" && status !== "open" && state.key !== status) return false;
    return true;
  }).sort((left, right) => {
    if (sort === "resident") return residentName(residentsById[left.residente_id]).localeCompare(residentName(residentsById[right.residente_id]), "es");
    if (sort === "recent") return String(right.fecha_vencimiento).localeCompare(String(left.fecha_vencimiento));
    const rank = { vencido: 0, parcial: 1, pendiente: 2, pagado: 3, anulado: 4 };
    return (rank[chargeState(left).key] - rank[chargeState(right).key])
      || String(left.fecha_vencimiento).localeCompare(String(right.fecha_vencimiento));
  }), [indexedCharges, query, residentsById, sort, status]);

  const payments = useMemo(() => (snapshot?.payments ?? []).filter((payment) => {
    const resident = residentsById[payment.residente_id];
    const charge = chargesById[payment.charge_id];
    const haystack = `${residentName(resident)} ${charge?.concepto ?? ""} ${payment.referencia ?? ""} ${payment.observacion ?? ""}`
      .toLocaleLowerCase("es-CL");
    if (query && !haystack.includes(query)) return false;
    const delivery = deliveriesByPayment.get(payment.id);
    if (historyStatus === "active" && payment.estado !== "registrado") return false;
    if (historyStatus === "void" && payment.estado !== "anulado") return false;
    if (historyStatus === "email_pending" && (payment.estado !== "registrado" || delivery?.estado === "enviado")) return false;
    if (historyFrom && payment.fecha_pago < historyFrom) return false;
    if (historyTo && payment.fecha_pago > historyTo) return false;
    return true;
  }), [chargesById, deliveriesByPayment, historyFrom, historyStatus, historyTo, query, residentsById, snapshot?.payments]);

  useEffect(() => {
    setChargeLimit(PAGE_SIZE);
    setPaymentLimit(PAGE_SIZE);
  }, [query, status, tab]);

  const resend = async (payment) => {
    setSendingId(payment.id);
    try {
      await resendResidentPaymentReceipt(payment.id);
      toast("Comprobante enviado nuevamente.", "success");
      await load();
    } catch (sendError) {
      toast(sendError.message, "error");
    } finally {
      setSendingId(null);
    }
  };

  const sendReminder = async (charge) => {
    setRemindingResidentId(charge.residente_id);
    try {
      await sendResidentPaymentReminder(charge.residente_id);
      toast("Recordatorio de pago enviado.", "success");
      await load();
    } catch (sendError) {
      toast(sendError.message, "error");
    } finally {
      setRemindingResidentId(null);
    }
  };

  const openDocument = async (payment) => {
    const target = window.open("about:blank", "_blank");
    if (!target) {
      toast("Permite ventanas emergentes para abrir el documento.", "warning");
      return;
    }
    target.opener = null;
    try {
      target.location = await getResidentPaymentDocumentUrl(payment.documento_path);
    } catch (documentError) {
      target.close();
      toast(documentError.message, "error");
    }
  };

  const changeTabFromKeyboard = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextTab = event.key === "ArrowLeft" || event.key === "Home" ? "charges" : "history";
    setTab(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`${nextTab === "charges" ? "charges" : "history"}-tab`)?.focus());
  };

  if (loading && !snapshot) return <Loading message="Cargando cobranza..." />;

  return (
    <PageLayout
      eyebrow="Administración"
      title="Cobranza"
      description="Registra mensualidades y otros cobros, recibe abonos y conserva cada respaldo en un historial ordenado."
    >
      <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        FichaEleam solo registra y comunica pagos. La boleta o factura debe emitirse fuera de la app y adjuntarse al registrar el abono.
      </div>

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold underline">Reintentar</button>
        </div>
      )}

      <section aria-label="Resumen de cobranza" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Por cobrar" value={formatClp(summary.pending)} detail="Saldo de cobros activos" tone="amber" />
        <SummaryCard label="Vencido" value={formatClp(summary.overdue)} detail="Saldo pendiente después del vencimiento" tone="rose" />
        <SummaryCard label="Recibido este mes" value={formatClp(summary.collectedMonth)} detail="Pagos registrados y vigentes" tone="teal" />
        <SummaryCard
          label="Cobros activos"
          value={(snapshot?.charges ?? []).filter((charge) => charge.estado === "activo").length}
          detail={`${snapshot?.payments?.filter((payment) => payment.estado === "registrado").length ?? 0} pagos en el historial`}
        />
      </section>

      <section aria-busy={loading} className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div role="tablist" aria-label="Contenido de cobranza" onKeyDown={changeTabFromKeyboard} className="inline-flex w-full rounded-xl bg-slate-100 p-1 sm:w-fit">
            <TabButton id="charges-tab" controls="charges-panel" active={tab === "charges"} onClick={() => setTab("charges")}>Cobros</TabButton>
            <TabButton id="history-tab" controls="history-panel" active={tab === "history"} onClick={() => setTab("history")}>Historial de pagos</TabButton>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            {canRegister && (
              <>
                <Button onClick={() => setShowProfiles(true)} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Mensualidades</Button>
                <Button onClick={() => setShowCharge(true)} className="bg-teal-700 text-white hover:bg-teal-800">Crear cobro</Button>
              </>
            )}
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/60 p-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tab === "charges" ? "Buscar por residente, concepto u observación" : "Buscar por residente, concepto o referencia"}
            filters={tab === "charges" ? [
              { name: "status", type: "select", label: "Estado", options: [["open", "Pendientes y vencidos"], ["vencido", "Vencidos"], ["pendiente", "Pendientes"], ["parcial", "Pago parcial"], ["pagado", "Pagados"], ["anulado", "Anulados"], ["all", "Todos"]] },
              { name: "sort", type: "select", label: "Orden", options: [["priority", "Prioridad"], ["recent", "Vencimiento más reciente"], ["resident", "Nombre del residente"]] },
            ] : [
              { name: "historyStatus", type: "select", label: "Estado", options: [["all", "Todos"], ["active", "Registrados"], ["email_pending", "Correo pendiente"], ["void", "Anulados"]] },
              { name: "historyDate", type: "dateRange", label: "Fecha del pago", nameDesde: "historyFrom", nameHasta: "historyTo" },
            ]}
            values={{ status, sort, historyStatus, historyFrom, historyTo }}
            onFilterChange={(name, value) => {
              if (name === "status") setStatus(value || "open");
              if (name === "sort") setSort(value || "priority");
              if (name === "historyStatus") setHistoryStatus(value || "all");
              if (name === "historyFrom") setHistoryFrom(value);
              if (name === "historyTo") setHistoryTo(value);
            }}
            onClearAll={() => {
              setStatus("open");
              setSort("priority");
              setHistoryStatus("all");
              setHistoryFrom("");
              setHistoryTo("");
            }}
            resultCount={tab === "charges" ? Math.min(chargeLimit, charges.length) : Math.min(paymentLimit, payments.length)}
            totalCount={tab === "charges" ? charges.length : payments.length}
            loading={loading}
          />
        </div>

        {loading && snapshot && <p aria-live="polite" className="border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-500">Actualizando información…</p>}

        {tab === "charges" ? (
          <ChargeList
            id="charges-panel"
            charges={charges.slice(0, chargeLimit)}
            totalCount={charges.length}
            payments={[]}
            residentsById={residentsById}
            canRegister={canRegister}
            canSend={canSend}
            canVoid={canVoid}
            reminders={snapshot?.reminders ?? []}
            remindingResidentId={remindingResidentId}
            onPay={setPayCharge}
            onReminder={sendReminder}
            onVoid={(charge) => setVoidTarget({ type: "charge", item: charge })}
            onShowMore={() => setChargeLimit((current) => current + PAGE_SIZE)}
          />
        ) : (
          <PaymentHistory
            id="history-panel"
            payments={payments.slice(0, paymentLimit)}
            totalCount={payments.length}
            charges={indexedCharges}
            residentsById={residentsById}
            deliveries={snapshot?.deliveries ?? []}
            currentUserId={user?.id}
            canRegister={canRegister}
            canSend={canSend}
            canVoid={canVoid}
            sendingId={sendingId}
            onResend={resend}
            onDocument={openDocument}
            onVoid={(payment) => setVoidTarget({ type: "payment", item: payment })}
            onShowMore={() => setPaymentLimit((current) => current + PAGE_SIZE)}
          />
        )}
      </section>

      <ChargeModal
        isOpen={showCharge}
        residents={snapshot?.residents ?? []}
        contacts={snapshot?.contacts ?? []}
        onClose={() => setShowCharge(false)}
        onSaved={async () => { setShowCharge(false); await load(); }}
      />
      <BillingProfilesModal
        isOpen={showProfiles}
        profiles={snapshot?.billingProfiles ?? []}
        residentsById={residentsById}
        onClose={() => setShowProfiles(false)}
        onSaved={load}
      />
      <PaymentModal
        charge={payCharge}
        resident={payCharge ? residentsById[payCharge.residente_id] : null}
        contact={snapshot?.contacts?.find((item) => item.residente_id === payCharge?.residente_id)}
        paid={payCharge?.pagado_registrado ?? 0}
        eleamId={snapshot?.eleamId}
        canSend={canSend}
        onClose={() => setPayCharge(null)}
        onSaved={async (result) => {
          setPayCharge(null);
          if (result.emailSent) toast("Pago registrado y comprobante enviado.", "success");
          else if (result.emailSkipped) toast("Pago registrado. Una persona con permiso de envío puede enviar el comprobante desde el historial.", "success");
          else toast("Pago registrado. El correo no pudo enviarse; puedes reenviarlo desde el historial.", "warning");
          await load();
          setTab("history");
        }}
      />
      <VoidModal
        target={voidTarget}
        onClose={() => setVoidTarget(null)}
        onSaved={async () => { setVoidTarget(null); await load(); }}
      />
    </PageLayout>
  );
}
