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
import LeadsPanel           from "./components/LeadsPanel";
import LandingMetrics       from "./components/LandingMetrics";

import { daysUntil } from "./utils/superadminFormatters";

function SectionHeader({ title, description, right }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {right}
    </div>
  );
}

// Container liviano. Toda la lógica vive en useSuperAdminData
// y los componentes reutilizables. Aquí solo coordinamos estado UI
// (filtros, modales abiertos).
export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const data = useSuperAdminData();
  const {
    metrics, eleams, payments, tasks,
    loading, error, byEleam, loadingEleam,
    leads, activeInDemo, contactRequests, landingMetrics, leadsLoading,
    refresh,
    loadEleamDetail, updateEleam, registerPayment,
    createTask, completeTask, createInteraction,
    loadLeads, updateLead, grantDemoAccess,
  } = data;

  const [filters, setFilters]       = useState({});
  const [editEleam, setEditEleam]   = useState(null);
  const [showPay, setShowPay]       = useState(false);
  const [payForEleamId, setPayFor]  = useState("");
  const [drawerEleam, setDrawer]    = useState(null);
  const [leadsTab, setLeadsTab]     = useState("leads"); // leads | metricas

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

  const crmSummary = useMemo(() => {
    const overdueTasks = Object.values(taskOverdueByEleam).reduce((acc, n) => acc + n, 0);
    return [
      { label: "Clientes filtrados", value: filtered.length, sub: `${eleams.length} en cartera` },
      { label: "Solicitan contacto", value: contactRequests.length, sub: "Leads demo" },
      { label: "Tareas vencidas", value: overdueTasks, sub: "Seguimiento CRM" },
    ];
  }, [contactRequests.length, eleams.length, filtered.length, taskOverdueByEleam]);

  const openDrawer = async (eleam) => {
    setDrawer(eleam.id);
    if (!byEleam[eleam.id]) await loadEleamDetail(eleam.id);
  };

  if (loading) return <Loading message="Cargando panel superadmin..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Superadmin CRM
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Cartera ELEAM y seguimiento comercial
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Revisa salud comercial, conversion de leads, pagos y tareas pendientes desde una sola vista.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/superadmin/blog")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              Blog
            </button>
            <button
              type="button"
              onClick={() => { setPayFor(""); setShowPay(true); }}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              + Registrar pago
            </button>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              Refrescar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          {crmSummary.map((item) => (
            <div key={item.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{item.value}</p>
              <p className="text-xs text-slate-500">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-sm mb-4">
          {error}
        </div>
      )}

      <SectionHeader
        title="Resumen ejecutivo"
        description="Metricas agrupadas por negocio, pipeline y uso operativo. Cada ayuda explica fuente y utilidad."
      />
      <SuperAdminMetrics
        leadsNuevos={leads.filter((l) => {
          const d = new Date(l.creado_en);
          return d > new Date(Date.now() - 7 * 86400000);
        }).length}
        activeInDemoCount={activeInDemo.length}
        metrics={metrics}
        onFilterRisk={()  => setFilters((p) => ({ ...p, riesgo: "alto" }))}
        onFilterLeads={() => setFilters((p) => ({ ...p, crmEstado: "lead" }))}
      />

      <CrmPipeline
        eleams={eleams}
        activeState={filters.crmEstado ?? null}
        onPickState={(state) => setFilters((p) => ({ ...p, crmEstado: state }))}
      />

      <SectionHeader
        title="Cartera de clientes"
        description="Filtra y abre cada ELEAM para revisar pagos, tareas, interacciones y estado de cuenta."
      />
      <EleamFilters filters={filters} setFilters={setFilters} count={filtered.length} />

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

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Leads y demo guiado</h2>
              <p className="text-xs text-slate-500">
                Seguimiento de prospectos captados desde la landing y actividad del demo.
              </p>
            </div>
            {contactRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {contactRequests.length} solicitan contacto
              </span>
            )}
            {activeInDemo.length > 0 && (
              <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                {activeInDemo.length} en demo
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {["leads", "metricas"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setLeadsTab(tab);
                  if (tab === "leads" && leads.length === 0) loadLeads();
                  if (tab === "metricas" && leads.length === 0) loadLeads();
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  leadsTab === tab
                    ? "bg-slate-700 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab === "leads" ? "Leads" : "Métricas Landing"}
              </button>
            ))}
          </div>
        </div>
        {leadsTab === "leads" ? (
          <LeadsPanel
            leads={leads}
            activeInDemo={activeInDemo}
            contactRequests={contactRequests}
            loading={leadsLoading}
            onGrantDemo={grantDemoAccess}
            onUpdateLead={updateLead}
            onLoadLeads={loadLeads}
          />
        ) : (
          <LandingMetrics metrics={landingMetrics} activeInDemo={activeInDemo} />
        )}
      </section>

      <section className="space-y-2">
        <SectionHeader
          title="Ultimos pagos"
          description="Pagos completados o registrados para conciliar activacion y renovaciones."
        />
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
