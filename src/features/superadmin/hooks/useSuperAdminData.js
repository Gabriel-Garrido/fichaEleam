import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../../components/Toast";
import {
  getMetrics,
  getAllEleams,
  getRecentPayments,
  getCrmTasks,
  getEleamInteractions,
  getEleamPayments,
  getEleamDetail,
  updateEleam,
  registerPayment,
  createCrmTask,
  completeCrmTask,
  updateCrmTask,
  createEleamInteraction,
  getLeads,
  updateLead,
  grantDemoAccess,
  getActiveInDemo,
  getContactRequests,
  getLandingMetrics,
} from "../superadminService";

// Hook centralizado: carga, refresh, mutaciones para el panel
// superadmin. Mantiene estado local y deja que los componentes solo
// rendericen.
export function useSuperAdminData() {
  const toast = useToast();
  const [metrics, setMetrics]         = useState(null);
  const [eleams, setEleams]           = useState([]);
  const [payments, setPayments]       = useState([]);
  const [tasks, setTasks]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [leads, setLeads]             = useState([]);
  const [activeInDemo, setActiveInDemo] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [landingMetrics, setLandingMetrics]   = useState(null);
  const [leadsLoading, setLeadsLoading]       = useState(false);

  // Cache por ELEAM: { [eleamId]: { detail, payments, interactions, tasks } }
  const [byEleam, setByEleam]     = useState({});
  const [loadingEleam, setLoadingEleam] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [m, e, p, t] = await Promise.allSettled([
      getMetrics(),
      getAllEleams(),
      getRecentPayments(20),
      getCrmTasks({ soloPendientes: false, limit: 200 }),
    ]);
    if (m.status === "fulfilled") setMetrics(m.value);
    if (e.status === "fulfilled") setEleams(e.value);
    if (p.status === "fulfilled") setPayments(p.value);
    if (t.status === "fulfilled") setTasks(t.value);
    if (e.status === "rejected" && m.status === "rejected") {
      setError("No tienes acceso a los datos del panel superadmin.");
      toast("Sin acceso a datos. Verifica permisos.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Leads loader ────────────────────────────────────────────
  const loadLeads = useCallback(async (filters = {}) => {
    setLeadsLoading(true);
    try {
      const [l, active, contacts, lm] = await Promise.allSettled([
        getLeads(filters),
        getActiveInDemo(),
        getContactRequests(),
        getLandingMetrics(30),
      ]);
      if (l.status       === "fulfilled") setLeads(l.value);
      if (active.status  === "fulfilled") setActiveInDemo(active.value);
      if (contacts.status=== "fulfilled") setContactRequests(contacts.value);
      if (lm.status      === "fulfilled") setLandingMetrics(lm.value);
    } catch (e) {
      toast(e.message || "Error cargando leads", "error");
    } finally {
      setLeadsLoading(false);
    }
  }, [toast]);

  const handleUpdateLead = useCallback(async (id, payload) => {
    const updated = await updateLead(id, payload);
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  }, []);

  const handleGrantDemoAccess = useCallback(async (leadId) => {
    const updated = await grantDemoAccess(leadId);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
    return updated;
  }, []);

  // ── ELEAM detail loader (lazy, cacheado por id) ─────────────
  const loadEleamDetail = useCallback(async (eleamId) => {
    if (!eleamId) return null;
    setLoadingEleam(true);
    try {
      const [detail, eleamPayments, eleamInteractions, eleamTasks] =
        await Promise.all([
          getEleamDetail(eleamId),
          getEleamPayments(eleamId, 30),
          getEleamInteractions(eleamId, 50),
          getCrmTasks({ eleamId, limit: 100 }),
        ]);
      const slot = {
        detail,
        payments: eleamPayments,
        interactions: eleamInteractions,
        tasks: eleamTasks,
      };
      setByEleam((prev) => ({ ...prev, [eleamId]: slot }));
      return slot;
    } catch (e) {
      toast(e.message || "Error cargando ficha del ELEAM", "error");
      return null;
    } finally {
      setLoadingEleam(false);
    }
  }, [toast]);

  // ── Mutations ───────────────────────────────────────────────
  const handleUpdateEleam = useCallback(async (id, payload) => {
    const updated = await updateEleam(id, payload);
    setEleams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setByEleam((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), detail: updated },
    }));
    return updated;
  }, []);

  const handleRegisterPayment = useCallback(async (payload) => {
    const result = await registerPayment(payload);
    await refresh();
    if (payload.eleam_id) {
      // Refrescar la cache del ELEAM para que el drawer vea el pago.
      await loadEleamDetail(payload.eleam_id);
    }
    return result;
  }, [refresh, loadEleamDetail]);

  const handleCreateTask = useCallback(async (payload) => {
    const created = await createCrmTask(payload);
    setTasks((prev) => [created, ...prev]);
    if (created.eleam_id) {
      setByEleam((prev) => {
        const slot = prev[created.eleam_id];
        if (!slot) return prev;
        return { ...prev, [created.eleam_id]: { ...slot, tasks: [created, ...(slot.tasks ?? [])] } };
      });
    }
    return created;
  }, []);

  const handleCompleteTask = useCallback(async (id) => {
    const updated = await completeCrmTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    if (updated.eleam_id) {
      setByEleam((prev) => {
        const slot = prev[updated.eleam_id];
        if (!slot) return prev;
        return {
          ...prev,
          [updated.eleam_id]: {
            ...slot,
            tasks: (slot.tasks ?? []).map((t) => (t.id === id ? { ...t, ...updated } : t)),
          },
        };
      });
    }
    return updated;
  }, []);

  const handleUpdateTask = useCallback(async (id, payload) => {
    const updated = await updateCrmTask(id, payload);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    return updated;
  }, []);

  const handleCreateInteraction = useCallback(async (payload) => {
    const created = await createEleamInteraction(payload);
    if (created.eleam_id) {
      setByEleam((prev) => {
        const slot = prev[created.eleam_id];
        if (!slot) return prev;
        return {
          ...prev,
          [created.eleam_id]: { ...slot, interactions: [created, ...(slot.interactions ?? [])] },
        };
      });
      // Actualizar ultimo_contacto en la lista principal de ELEAMs.
      setEleams((prev) => prev.map((e) =>
        e.id === created.eleam_id ? { ...e, ultimo_contacto: created.creado_en } : e
      ));
    }
    return created;
  }, []);

  return {
    // estado
    metrics, eleams, payments, tasks, loading, error,
    byEleam, loadingEleam,
    leads, activeInDemo, contactRequests, landingMetrics, leadsLoading,
    // operaciones
    refresh,
    loadEleamDetail,
    loadLeads,
    updateEleam:        handleUpdateEleam,
    registerPayment:    handleRegisterPayment,
    createTask:         handleCreateTask,
    completeTask:       handleCompleteTask,
    updateTask:         handleUpdateTask,
    createInteraction:  handleCreateInteraction,
    updateLead:         handleUpdateLead,
    grantDemoAccess:    handleGrantDemoAccess,
  };
}
