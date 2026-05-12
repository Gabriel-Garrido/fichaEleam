import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "../../components/Loading";
import SuperAdminMetrics from "./components/SuperAdminMetrics";
import CrmPipeline from "./components/CrmPipeline";
import SuperAdminPageHeader from "./components/SuperAdminPageHeader";
import { getActiveInDemo, getAllEleams, getContactRequests, getCrmTasks, getMetrics } from "./superadminService";
import { daysUntil } from "./utils/superadminFormatters";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [eleams, setEleams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeInDemo, setActiveInDemo] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [m, e, t, active, contacts] = await Promise.all([
        getMetrics(),
        getAllEleams(),
        getCrmTasks({ soloPendientes: true, limit: 80 }),
        getActiveInDemo(),
        getContactRequests(),
      ]);
      setMetrics(m);
      setEleams(e);
      setTasks(t);
      setActiveInDemo(active);
      setContactRequests(contacts);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar el resumen superadmin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const renewals = useMemo(() => eleams.filter((e) => {
    if (!e.pago_activo) return false;
    const days = daysUntil(e.fecha_vencimiento_suscripcion);
    return days != null && days >= 0 && days <= 14;
  }), [eleams]);

  const overdueTasks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return tasks.filter((task) =>
      task.fecha_vencimiento &&
      task.estado !== "completada" &&
      task.estado !== "cancelada" &&
      new Date(task.fecha_vencimiento) < today
    );
  }, [tasks]);

  if (loading) return <Loading message="Cargando resumen superadmin..." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SuperAdminPageHeader
        title="Resumen ejecutivo"
        description="Vista breve para decidir dónde actuar: cartera, leads, renovaciones y tareas críticas."
        actions={
          <>
            <button type="button" onClick={() => navigate("/superadmin/clientes")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Ver clientes
            </button>
            <button type="button" onClick={() => navigate("/superadmin/permisos")} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              Permisos
            </button>
          </>
        }
      />

      {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <SuperAdminMetrics
        leadsNuevos={contactRequests.length}
        activeInDemoCount={activeInDemo.length}
        metrics={metrics}
        onFilterRisk={() => navigate("/superadmin/clientes")}
        onFilterLeads={() => navigate("/superadmin/leads")}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <SummaryCard title="Acciones pendientes" value={tasks.length} sub={`${overdueTasks.length} vencidas`} action="Abrir tareas" onClick={() => navigate("/superadmin/tareas")} />
        <SummaryCard title="Solicitan contacto" value={contactRequests.length} sub="Desde demo guiado" action="Abrir leads" onClick={() => navigate("/superadmin/leads")} />
        <SummaryCard title="Renovaciones próximas" value={renewals.length} sub="Vencen en 14 días" action="Ver clientes" onClick={() => navigate("/superadmin/clientes")} />
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">Pipeline comercial</h2>
          <p className="text-sm text-slate-500">Distribución por estado CRM. Para operar la cartera, entra a Clientes.</p>
        </div>
        <CrmPipeline eleams={eleams} activeState={null} onPickState={() => navigate("/superadmin/clientes")} />
      </section>
    </div>
  );
}

function SummaryCard({ title, value, sub, action, onClick }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
      <button type="button" onClick={onClick} className="mt-4 text-sm font-semibold text-teal-700 hover:text-teal-900">
        {action}
      </button>
    </article>
  );
}

