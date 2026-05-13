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

  const load = async (filters = {}) => {
    setLoading(true);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SuperAdminPageHeader
        title="Leads y demo"
        description="Prospectos captados desde la landing, actividad del demo guiado y conversión."
        actions={
          <button type="button" onClick={() => load()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Refrescar
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["leads", "Leads"],
          ["metricas", "Métricas landing"],
        ].map(([key, label]) => (
          <button
            type="button"

            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {label}
          </button>
        ))}
        {contactRequests.length > 0 && (
          <span className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {contactRequests.length} solicitan contacto
          </span>
        )}
        {activeInDemo.length > 0 && (
          <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
            {activeInDemo.length} en demo
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

