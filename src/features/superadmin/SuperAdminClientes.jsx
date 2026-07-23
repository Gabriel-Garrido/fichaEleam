import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useFilterParams } from "../../hooks/useFilterParams";
import EleamFilters from "./components/EleamFilters";
import EleamTable from "./components/EleamTable";
import EleamEditModal from "./components/EleamEditModal";
import EleamCustomerDrawer from "./components/EleamCustomerDrawer";
import PortfolioUsageOverview from "./components/PortfolioUsageOverview";
import PaymentModal from "./components/PaymentModal";
import SuperAdminPageHeader from "./components/SuperAdminPageHeader";
import { indexPortfolioUsage, usageDaysSince } from "./utils/portfolioUsage";
import {
  createCrmTask,
  completeCrmTask,
  createEleamInteraction,
  getAllEleams,
  getCrmTasks,
  getEleamDetail,
  getEleamInteractions,
  getEleamPayments,
  getPortfolioUsage,
  resendDemoAccessForEleam,
  updateEleam,
  registerPayment,
} from "./superadminService";

export default function SuperAdminClientes() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [eleams, setEleams] = useState([]);
  // Mapeo bidireccional URL ↔ filtros (claves cortas en URL, mismo shape para EleamFilters).
  const [urlFilters, setUrlFilter] = useFilterParams({
    schema: { search: "string", crmEstado: "string", plan: "string", riesgo: "string", pagoActivo: "string", uso: "string" },
    defaults: { search: "", crmEstado: "", plan: "", riesgo: "", pagoActivo: "", uso: "" },
  });
  const filters = useMemo(() => ({
    search: urlFilters.search || undefined,
    crmEstado: urlFilters.crmEstado || (searchParams.get("estado") ?? undefined),
    plan: urlFilters.plan || undefined,
    riesgo: urlFilters.riesgo || undefined,
    pagoActivo: urlFilters.pagoActivo || undefined,
    uso: urlFilters.uso || undefined,
  }), [urlFilters, searchParams]);
  const setFilters = useCallback((next) => {
    const value = typeof next === "function" ? next(filters) : next;
    setUrlFilter({
      search: value?.search ?? "",
      crmEstado: value?.crmEstado ?? "",
      plan: value?.plan ?? "",
      riesgo: value?.riesgo ?? "",
      pagoActivo: value?.pagoActivo ?? "",
      uso: value?.uso ?? "",
    });
  }, [filters, setUrlFilter]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editEleam, setEditEleam] = useState(null);
  const [drawerEleam, setDrawerEleam] = useState(null);
  const [byEleam, setByEleam] = useState({});
  const [loadingEleam, setLoadingEleam] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payForEleamId, setPayFor] = useState("");
  const [usageDays, setUsageDays] = useState(30);
  const [portfolioUsage, setPortfolioUsage] = useState([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState("");
  const [resendingDemoId, setResendingDemoId] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setUsageLoading(true);
    setError("");
    setUsageError("");
    try {
      const [eleamsResult, usageResult] = await Promise.allSettled([
        getAllEleams(),
        getPortfolioUsage(usageDays),
      ]);
      if (eleamsResult.status === "rejected") throw eleamsResult.reason;
      setEleams(eleamsResult.value);
      if (usageResult.status === "fulfilled") {
        setPortfolioUsage(usageResult.value);
      } else {
        console.error(usageResult.reason);
        setUsageError("No pudimos cargar el uso general. Revisa que el esquema actualizado esté aplicado.");
      }
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar la cartera de clientes.");
    } finally {
      setLoading(false);
      setUsageLoading(false);
    }
  };

  const handleUsageDays = async (nextDays) => {
    setUsageDays(nextDays);
    setUsageLoading(true);
    setUsageError("");
    try {
      setPortfolioUsage(await getPortfolioUsage(nextDays));
    } catch (err) {
      console.error(err);
      setUsageError("No pudimos actualizar la ventana de uso.");
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Migrar el viejo ?estado= (link desde el pipeline del dashboard) a crmEstado en URL.
    const legacyEstado = searchParams.get("estado");
    if (legacyEstado) {
      setUrlFilter("crmEstado", legacyEstado);
      const next = new URLSearchParams(searchParams);
      next.delete("estado");
      setSearchParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const search = (filters.search ?? "").toLowerCase().trim();
    const usageByEleam = indexPortfolioUsage(portfolioUsage);
    return eleams.filter((e) => {
      if (search) {
        const hay = `${e.nombre} ${e.email_admin ?? ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (filters.crmEstado && e.crm_estado !== filters.crmEstado) return false;
      if (filters.plan && e.plan !== filters.plan) return false;
      if (filters.riesgo && e.riesgo_churn !== filters.riesgo) return false;
      if (filters.pagoActivo === "si" && !e.pago_activo) return false;
      if (filters.pagoActivo === "no" && e.pago_activo) return false;
      if (filters.uso) {
        const usage = usageByEleam[e.id];
        const lastDays = usageDaysSince(usage?.ultimaActividad);
        if (filters.uso === "con_uso" && !(usage?.registros > 0)) return false;
        if (filters.uso === "sin_uso" && !(usage?.usuariosTotales > 0 && usage?.registros === 0)) return false;
        if (filters.uso === "activos_7d" && !(lastDays != null && lastDays <= 7)) return false;
        if (filters.uso === "sin_activar" && !(usage?.usuariosSinPrimerIngreso > 0)) return false;
      }
      return true;
    });
  }, [eleams, filters, portfolioUsage]);

  const openDrawer = async (eleam) => {
    setDrawerEleam(eleam.id);
    if (byEleam[eleam.id]) return;
    setLoadingEleam(true);
    try {
      const [detail, payments, interactions, eleamTasks] = await Promise.all([
        getEleamDetail(eleam.id),
        getEleamPayments(eleam.id, 30),
        getEleamInteractions(eleam.id, 50),
        getCrmTasks({ eleamId: eleam.id, limit: 100 }),
      ]);
      setByEleam((prev) => ({ ...prev, [eleam.id]: { detail, payments, interactions, tasks: eleamTasks } }));
    } catch (err) {
      console.error(err);
      toast("No pudimos cargar el detalle de este ELEAM.", "error");
      setDrawerEleam(null);
    } finally {
      setLoadingEleam(false);
    }
  };

  const handleUpdateEleam = async (id, payload) => {
    const updated = await updateEleam(id, payload);
    setEleams((prev) => prev.map((item) => item.id === id ? updated : item));
    setByEleam((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), detail: updated } }));
    return updated;
  };

  const handleRegisterPayment = async (payload) => {
    const result = await registerPayment(payload);
    await refresh();
    return result;
  };

  const handleCreateTask = async (payload) => {
    return createCrmTask(payload);
  };

  const handleResendDemoAccess = async (eleam) => {
    if (!eleam?.id || resendingDemoId) return;
    setResendingDemoId(eleam.id);
    try {
      const result = await resendDemoAccessForEleam(eleam.id);
      if (result._email_sent) {
        toast(`Instrucciones de acceso reenviadas a ${result.email}.`, "success");
      } else {
        toast(
          result._email_error
            ? `El enlace se renovó, pero el correo no pudo enviarse: ${result._email_error}`
            : "El enlace se renovó, pero el servicio de correo no confirmó el envío.",
          "warning",
        );
      }
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudieron reenviar las instrucciones del demo.", "error");
    } finally {
      setResendingDemoId(null);
    }
  };

  if (loading) return <Loading message="Cargando clientes..." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SuperAdminPageHeader
        title="Uso por ELEAM"
        description="Compara el uso de la app en todos los establecimientos. Selecciona uno para ver sus usuarios y actividad en detalle."
        actions={
          <>
            <button type="button" onClick={refresh} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Refrescar
            </button>
            <button type="button" onClick={() => { setPayFor(""); setShowPay(true); }} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              Registrar pago
            </button>
          </>
        }
      />
      {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="mt-4">
        <EleamFilters filters={filters} setFilters={setFilters} count={filtered.length} />
      </div>
      <PortfolioUsageOverview
        eleams={filtered}
        usage={portfolioUsage}
        days={usageDays}
        loading={usageLoading}
        error={usageError}
        onDaysChange={handleUsageDays}
      />
      <div className="mt-4">
        <EleamTable
          eleams={filtered}
          onOpen={openDrawer}
          portfolioUsage={portfolioUsage}
          usageDays={usageDays}
          onResendDemoAccess={handleResendDemoAccess}
          resendingDemoId={resendingDemoId}
        />
      </div>
      <EleamEditModal eleam={editEleam} onClose={() => setEditEleam(null)} onSave={handleUpdateEleam} />
      <PaymentModal isOpen={showPay} onClose={() => setShowPay(false)} eleams={eleams} defaultEleamId={payForEleamId} onRegister={handleRegisterPayment} />
      <EleamCustomerDrawer
        eleamId={drawerEleam}
        slot={drawerEleam ? byEleam[drawerEleam] : null}
        loading={loadingEleam}
        onClose={() => setDrawerEleam(null)}
        onEdit={setEditEleam}
        onRegisterPayment={(eleamId) => { setPayFor(eleamId); setShowPay(true); }}
        onCreateTask={handleCreateTask}
        onCompleteTask={completeCrmTask}
        onCreateInteraction={createEleamInteraction}
        usageDays={usageDays}
      />
    </div>
  );
}

