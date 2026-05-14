import { useCallback, useEffect, useMemo, useState } from "react";
import { friendlyError } from "../../utils/errorMessages";
import { getFamiliarResidentSnapshot, getMyResidentes } from "./familiarService";

export function useFamiliarResidentData({ toast } = {}) {
  const [residentes, setResidentes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [error, setError] = useState(null);

  const activeResident = useMemo(
    () => residentes.find((resident) => resident.id === activeId) ?? residentes[0] ?? null,
    [activeId, residentes],
  );

  const loadSnapshot = useCallback(async (residentId) => {
    if (!residentId) {
      setSnapshot(null);
      return null;
    }

    setLoadingSnapshot(true);
    setError(null);
    try {
      const data = await getFamiliarResidentSnapshot(residentId);
      setSnapshot(data);
      return data;
    } catch (err) {
      const message = friendlyError(err, "No se pudo cargar la información del residente.");
      setError(message);
      toast?.(message, "error");
      return null;
    } finally {
      setLoadingSnapshot(false);
    }
  }, [toast]);

  const selectResident = useCallback((residentId) => {
    setActiveId(residentId);
    return loadSnapshot(residentId);
  }, [loadSnapshot]);

  const reload = useCallback(() => loadSnapshot(activeId), [activeId, loadSnapshot]);

  useEffect(() => {
    let mounted = true;
    setLoadingResidents(true);
    setError(null);

    getMyResidentes()
      .then(async (rows) => {
        if (!mounted) return;
        setResidentes(rows);
        const firstId = rows[0]?.id ?? null;
        setActiveId(firstId);
        if (firstId) await loadSnapshot(firstId);
      })
      .catch((err) => {
        if (!mounted) return;
        const message = friendlyError(err, "No se pudo cargar la información. Recarga la página.");
        setError(message);
        toast?.(message, "error");
      })
      .finally(() => {
        if (mounted) setLoadingResidents(false);
      });

    return () => {
      mounted = false;
    };
  }, [loadSnapshot, toast]);

  return {
    residentes,
    activeId,
    activeResident,
    snapshot,
    loading: loadingResidents || (loadingSnapshot && !snapshot),
    loadingSnapshot,
    error,
    selectResident,
    reload,
  };
}
