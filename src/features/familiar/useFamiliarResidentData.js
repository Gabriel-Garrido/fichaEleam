import { useCallback, useEffect, useMemo, useState } from "react";
import { friendlyError } from "../../utils/errorMessages";
import { getFamiliarResidentSnapshot, getMyResidentes } from "./familiarService";

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useFamiliarResidentData({ toast } = {}) {
  const [residentes, setResidentes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedDate, setSelectedDateState] = useState(todayIso());
  const [snapshot, setSnapshot] = useState(null);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [error, setError] = useState(null);

  const activeResident = useMemo(
    () => residentes.find((resident) => resident.id === activeId) ?? residentes[0] ?? null,
    [activeId, residentes],
  );

  const loadSnapshot = useCallback(async (residentId, fecha) => {
    if (!residentId) {
      setSnapshot(null);
      return null;
    }

    setLoadingSnapshot(true);
    setError(null);
    try {
      const data = await getFamiliarResidentSnapshot(residentId, fecha);
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
    return loadSnapshot(residentId, selectedDate);
  }, [loadSnapshot, selectedDate]);

  const reload = useCallback(() => loadSnapshot(activeId, selectedDate), [activeId, loadSnapshot, selectedDate]);

  const setSelectedDate = useCallback((fecha) => {
    setSelectedDateState(fecha);
    return loadSnapshot(activeId, fecha);
  }, [activeId, loadSnapshot]);

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
        if (firstId) await loadSnapshot(firstId, todayIso());
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
    selectedDate,
    snapshot,
    loading: loadingResidents || (loadingSnapshot && !snapshot),
    loadingSnapshot,
    error,
    selectResident,
    setSelectedDate,
    reload,
  };
}
