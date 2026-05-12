import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import CrmTasksPanel from "./components/CrmTasksPanel";
import SuperAdminPageHeader from "./components/SuperAdminPageHeader";
import { completeCrmTask, createCrmTask, getAllEleams, getCrmTasks } from "./superadminService";

export default function SuperAdminTareas() {
  const [tasks, setTasks] = useState([]);
  const [eleams, setEleams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [t, e] = await Promise.all([
      getCrmTasks({ soloPendientes: false, limit: 300 }),
      getAllEleams(),
    ]);
    setTasks(t);
    setEleams(e);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (payload) => {
    const created = await createCrmTask(payload);
    setTasks((prev) => [created, ...prev]);
    return created;
  };

  const handleComplete = async (id) => {
    const updated = await completeCrmTask(id);
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updated } : task));
    return updated;
  };

  if (loading) return <Loading message="Cargando tareas..." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SuperAdminPageHeader
        title="Tareas CRM"
        description="Seguimientos comerciales, onboarding, renovaciones y soporte."
      />
      <CrmTasksPanel tasks={tasks} eleams={eleams} onCreate={handleCreate} onComplete={handleComplete} />
    </div>
  );
}

