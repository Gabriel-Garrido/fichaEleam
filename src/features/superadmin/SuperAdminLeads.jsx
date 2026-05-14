import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import LeadsPanel from "./components/LeadsPanel";
import LandingMetrics from "./components/LandingMetrics";
import SuperAdminPageHeader from "./components/SuperAdminPageHeader";
import { getActiveInDemo, getContactRequests, getLandingMetrics, getLeads, grantDemoAccess, updateLead } from "./superadminService";

export default function SuperAdminLeads() {
  const [tab, setTab] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [activeInDemo, setActiveInDemo] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [landingMetrics, setLandingMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (filters = {}, silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    const [l, active, contacts, metrics] = await Promise.all([
      getLeads(filters),
      getActiveInDemo(),
      getContactRequests(),
      getLandingMetrics(30),
    ]);
    setLeads(l);
    setActiveInDemo(active);
    setContactRequests(contacts);
    setLandingMetrics(metrics);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpdateLead = async (id, payload) => {
    const updated = await updateLead(id, payload);
    setLeads((prev) => prev.map((lead) => lead.id === id ? updated : lead));
    return updated;
  };

  const handleGrantDemo = async (id) => {
    const updated = await grantDemoAccess(id);
    setLeads((prev) => prev.map((lead) => lead.id === id ? updated : lead));
    return updated;
  };

  if (loading) return <Loading message="Cargando leads..." />;

  const TABS = [
    { key: "leads",    label: "Leads", badge: leads.length },
    { key: "metricas", label: "Métricas landing" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <SuperAdminPageHeader
        title="Leads y demo"
        description="Prospectos captados desde la landing, actividad del demo guiado y métricas de conversión."
        actions={
          <button
            type="button"
            onClick={() => load({}, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <svg className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refrescar
          </button>
        }
      />

      {/* Tab bar */}
      <div className="mb-5 flex items-center gap-2 flex-wrap border-b border-slate-100 pb-3">
        {TABS.map(({ key, label, badge }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`relative inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
            {badge != null && badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}

        {/* Live status pills */}
        {contactRequests.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {contactRequests.length} solicitan contacto
          </span>
        )}
        {activeInDemo.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            {activeInDemo.length} en demo ahora
          </span>
        )}
      </div>

      {tab === "leads" ? (
        <LeadsPanel
          leads={leads}
          activeInDemo={activeInDemo}
          contactRequests={contactRequests}
          loading={false}
          onGrantDemo={handleGrantDemo}
          onUpdateLead={handleUpdateLead}
          onLoadLeads={load}
        />
      ) : (
        <LandingMetrics metrics={landingMetrics} activeInDemo={activeInDemo} />
      )}
    </div>
  );
}
