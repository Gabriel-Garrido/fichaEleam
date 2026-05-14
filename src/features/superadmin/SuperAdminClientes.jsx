import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Loading from "../../components/Loading";
import EleamFilters from "./components/EleamFilters";
import EleamTable from "./components/EleamTable";
import EleamEditModal from "./components/EleamEditModal";
import EleamCustomerDrawer from "./components/EleamCustomerDrawer";
import PaymentModal from "./components/PaymentModal";
import SuperAdminPageHeader from "./components/SuperAdminPageHeader";
import {
  createCrmTask,
  completeCrmTask,
  createEleamInteraction,
  getAllEleams,
  getCrmTasks,
  getEleamDetail,
  getEleamInteractions,
  getEleamPayments,
  updateEleam,
  registerPayment,
} from "./superadminService";

export default function SuperAdminClientes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [eleams, setEleams] = useState([]);
  const [tasks, setTasks] = useState([]);
  // Pre-populate crmEstado filter from ?estado= query param (sent by Dashboard pipeline cards)
  const [filters, setFilters] = useState(() => {
    const estado = searchParams.get("estado");
    return estado ? { crmEstado: estado } : {};
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editEleam, setEditEleam] = useState(null);
  const [drawerEleam, setDrawerEleam] = useState(null);
  const [byEleam, setByEleam] = useState({});
  const [loadingEleam, setLoadingEleam] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payForEleamId, setPayFor] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [e, t] = await Promise.all([
        getAllEleams(),
        getCrmTasks({ soloPendientes: false, limit: 200 }),
      ]);
      setEleams(e);
      setTasks(t);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar la cartera de clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Clear query param so refresh doesn't re-apply the filter
    if (searchParams.get("estado")) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const search = (filters.search ?? "").toLowerCase().trim();
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
      return true;
    });
  }, [eleams, filters]);

  const taskOverdueByEleam = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const out = {};
    for (const task of tasks) {
      if (!task.eleam_id || task.estado === "completada" || task.estado === "cancelada" || !task.fecha_vencimiento) continue;
      if (new Date(task.fecha_vencimiento) < today) out[task.eleam_id] = (out[task.eleam_id] ?? 0) + 1;
    }
    return out;
  }, [tasks]);

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
    const created = await createCrmTask(payload);
    setTasks((prev) => [created, ...prev]);
    return created;
  };

  if (loading) return <Loading message="Cargando clientes..." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SuperAdminPageHeader
        title="Clientes"
        description="Cartera ELEAM, salud comercial, tareas pendientes e historial por establecimiento."
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
      <EleamFilters filters={filters} setFilters={setFilters} count={filtered.length} />
      <div className="mt-4">
        <EleamTable eleams={filtered} onEdit={setEditEleam} onOpen={openDrawer} taskCountByEleam={taskOverdueByEleam} />
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
      />
    </div>
  );
}

