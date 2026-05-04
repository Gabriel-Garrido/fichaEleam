import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "../../components/Loading";
import { useSuperAdminData } from "./hooks/useSuperAdminData";

import SuperAdminMetrics    from "./components/SuperAdminMetrics";
import CrmPipeline          from "./components/CrmPipeline";
import EleamFilters         from "./components/EleamFilters";
import EleamTable           from "./components/EleamTable";
import EleamEditModal       from "./components/EleamEditModal";
import PaymentModal         from "./components/PaymentModal";
import RecentPaymentsTable  from "./components/RecentPaymentsTable";
import CrmTasksPanel        from "./components/CrmTasksPanel";
import EleamCustomerDrawer  from "./components/EleamCustomerDrawer";

import { daysUntil } from "./utils/superadminFormatters";

// Container liviano. Toda la lógica vive en useSuperAdminData
// y los componentes reutilizables. Aquí solo coordinamos estado UI
// (filtros, modales abiertos).
export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const data = useSuperAdminData();
  const {
    metrics, eleams, payments, tasks,
    loading, error, byEleam, loadingEleam,
    refresh,
    loadEleamDetail, updateEleam, registerPayment,
    createTask, completeTask, createInteraction,
  } = data;

  const [filters, setFilters]       = useState({});
  const [editEleam, setEditEleam]   = useState(null);
  const [showPay, setShowPay]       = useState(false);
  const [payForEleamId, setPayFor]  = useState("");
  const [drawerEleam, setDrawer]    = useState(null);

  // Conteo de tareas vencidas por ELEAM (para badge de salud y tabla)
  const taskOverdueByEleam = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const out = {};
    for (const t of tasks) {
      if (!t.eleam_id) continue;
      if (t.estado === "completada" || t.estado === "cancelada") continue;
      if (!t.fecha_vencimiento) continue;
      if (new Date(t.fecha_vencimiento) < today) {
        out[t.eleam_id] = (out[t.eleam_id] ?? 0) + 1;
      }
    }
    return out;
  }, [tasks]);

  const filtered = useMemo(() => {
    const search = (filters.search ?? "").toLowerCase().trim();
    return eleams.filter((e) => {
      if (search) {
        const hay = (e.nombre + " " + (e.email_admin ?? "")).toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (filters.crmEstado  && e.crm_estado    !== filters.crmEstado)  return false;
      if (filters.plan       && e.plan          !== filters.plan)       return false;
      if (filters.riesgo     && e.riesgo_churn  !== filters.riesgo)     return false;
      if (filters.pagoActivo === "si" && !e.pago_activo) return false;
      if (filters.pagoActivo === "no" &&  e.pago_activo) return false;
      return true;
    });
  }, [eleams, filters]);

  const openDrawer = async (eleam) => {
    setDrawer(eleam.id);
    if (!byEleam[eleam.id]) await loadEleamDetail(eleam.id);
  };

  if (loading) return <Loading message="Cargando panel superadmin..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 mb-6 text-white flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Panel Superadmin · CRM SaaS</h1>
          <p className="text-slate-300 text-sm">
            Gestiona clientes ELEAM, pipeline comercial, pagos y tareas de seguimiento.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate("/superadmin/blog")}
            className="border border-white/40 text-white text-sm px-4 py-2 rounded-lg hover:bg-white/10"
          >
            Blog
          </button>
          <button
            onClick={() => { setPayFor(""); setShowPay(true); }}
            className="bg-white text-slate-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            + Registrar pago
          </button>
          <button
            onClick={refresh}
            className="border border-white/40 text-white text-sm px-4 py-2 rounded-lg hover:bg-white/10"
          >
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Métricas */}
      <SuperAdminMetrics
        metrics={metrics}
        onFilterRisk={()  => setFilters((p) => ({ ...p, riesgo: "alto" }))}
        onFilterLeads={() => setFilters((p) => ({ ...p, crmEstado: "lead" }))}
      />

      {/* Pipeline visual */}
      <CrmPipeline
        eleams={eleams}
        activeState={filters.crmEstado ?? null}
        onPickState={(state) => setFilters((p) => ({ ...p, crmEstado: state }))}
      />

      {/* Filtros */}
      <EleamFilters filters={filters} setFilters={setFilters} count={filtered.length} />

      {/* Layout 2 columnas: tabla + side panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 space-y-4">
          <EleamTable
            eleams={filtered}
            onEdit={(e) => setEditEleam(e)}
            onOpen={openDrawer}
            taskCountByEleam={taskOverdueByEleam}
          />
        </div>

        <aside className="space-y-4">
          <CrmTasksPanel
            tasks={tasks}
            eleams={eleams}
            onCreate={createTask}
            onComplete={completeTask}
          />
        </aside>
      </div>

      {/* Pagos recientes */}
      <section className="space-y-2">
        <h2 className="font-semibold text-gray-700">Últimos pagos</h2>
        <RecentPaymentsTable payments={payments} onSelectEleam={(id) => {
          const e = eleams.find((x) => x.id === id);
          if (e) openDrawer(e);
        }} />
      </section>

      {/* Modales y drawer */}
      <EleamEditModal
        eleam={editEleam}
        onClose={() => setEditEleam(null)}
        onSave={updateEleam}
      />
      <PaymentModal
        isOpen={showPay}
        onClose={() => setShowPay(false)}
        eleams={eleams}
        defaultEleamId={payForEleamId}
        onRegister={registerPayment}
      />
      <EleamCustomerDrawer
        eleamId={drawerEleam}
        slot={drawerEleam ? byEleam[drawerEleam] : null}
        loading={loadingEleam}
        onClose={() => setDrawer(null)}
        onEdit={(e) => { setEditEleam(e); }}
        onRegisterPayment={(eleamId) => { setPayFor(eleamId); setShowPay(true); }}
        onCreateTask={createTask}
        onCompleteTask={completeTask}
        onCreateInteraction={createInteraction}
      />

      {/* Filtro vencimiento útil para detectar churn (futuro) */}
      <ChurnHint eleams={eleams} taskOverdueByEleam={taskOverdueByEleam} />
    </div>
  );
}

// Pequeño hint visual en la parte inferior con ELEAMs activos cuyo
// vencimiento está próximo (≤14d). No requiere componente nuevo.
function ChurnHint({ eleams, taskOverdueByEleam }) {
  const upcoming = eleams.filter((e) => {
    if (!e.pago_activo) return false;
    const d = daysUntil(e.fecha_vencimiento_suscripcion);
    return d != null && d >= 0 && d <= 14;
  });
  if (upcoming.length === 0) return null;
  return (
    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">
      <strong>Renovaciones próximas (≤14d):</strong>{" "}
      {upcoming.slice(0, 6).map((e, i) => (
        <span key={e.id}>
          {i > 0 ? ", " : ""}{e.nombre}
          {(taskOverdueByEleam[e.id] ?? 0) > 0 ? " ⚠" : ""}
        </span>
      ))}
      {upcoming.length > 6 ? ` y ${upcoming.length - 6} más` : ""}
    </div>
  );
}
