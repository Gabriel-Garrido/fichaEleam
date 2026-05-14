import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getObservations, deleteObservation } from "./observationsService";
import { getResidents } from "../residents/residentService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import PageLayout from "../../layout/PageLayout";
import { TIPO_LABEL, TIPO_BADGE } from "../residents/residentUtils";

const TIPOS = [
  ["", "Todos los tipos"],
  ...Object.entries(TIPO_LABEL),
];

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ObservationList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canDelete = can("eliminar_observaciones");
  const canCreate = can("crear_observaciones");
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("residenteId");

  const [records, setRecords]                 = useState([]);
  const [residents, setResidents]             = useState([]);
  const [filtroResidente, setFiltroResidente] = useState(preselectedId ?? "");
  const [filtroTipo, setFiltroTipo]           = useState("");
  const [filtroDesde, setFiltroDesde]         = useState(firstOfMonth());
  const [filtroHasta, setFiltroHasta]         = useState(today());
  const [soloSeguimiento, setSoloSeguimiento] = useState(false);
  const [filtersOpen, setFiltersOpen]         = useState(!!preselectedId);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);

  useEffect(() => {
    getResidents()
      .then(setResidents)
      .catch(() => toast("No se pudo cargar la lista de residentes.", "warning"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getObservations(filtroResidente || null, {
        desde:            filtroDesde || null,
        hasta:            filtroHasta || null,
        tipo:             filtroTipo  || null,
        soloSeguimiento,
      });
      setRecords(data);
    } catch {
      setError("No se pudo cargar las observaciones.");
    } finally {
      setLoading(false);
    }
  }, [filtroResidente, filtroDesde, filtroHasta, filtroTipo, soloSeguimiento]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const clearFilters = () => {
    setFiltroResidente("");
    setFiltroTipo("");
    setFiltroDesde(firstOfMonth());
    setFiltroHasta(today());
    setSoloSeguimiento(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta observación?")) return;
    try {
      await deleteObservation(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast("Observación eliminada.", "success");
    } catch {
      toast("No se pudo eliminar la observación.", "error");
    }
  };

  const hasActiveFilters = !!(filtroResidente || filtroTipo || soloSeguimiento);

  if (loading) return <Loading message="Cargando observaciones..." />;

  return (
    <PageLayout
      title="Observaciones"
      eyebrow="Cuidado diario"
      description={`${records.length} registro${records.length === 1 ? "" : "s"} en el período seleccionado${soloSeguimiento ? " · solo seguimientos" : ""}. Usa seguimiento para dejar pendientes claros al próximo turno.`}
      actions={
        canCreate ? (
          <Button
            onClick={() =>
              navigate(
                preselectedId
                  ? `/observations/new?residenteId=${preselectedId}`
                  : "/observations/new"
              )
            }
            className="w-full sm:w-auto bg-teal-700 text-white px-6 py-2 rounded-xl hover:bg-teal-800"
          >
            + Nueva Observación
          </Button>
        ) : null
      }
    >

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={fetchRecords} className="underline text-sm ml-2">Reintentar</button>
        </div>
      )}

      {/* Filters — controlled open/close so re-renders don't collapse the panel */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-5">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
          aria-expanded={filtersOpen}
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              Filtros
              {hasActiveFilters && (
                <span className="inline-flex h-2 w-2 rounded-full bg-teal-500" aria-label="Filtros activos" />
              )}
            </p>
            <p className="text-xs text-slate-500">
              {hasActiveFilters ? "Hay filtros activos" : "Mes actual por defecto"}
            </p>
          </div>
          <span className={`flex items-center gap-1 text-xs font-semibold transition-colors ${filtersOpen ? "text-slate-500" : "text-teal-700"}`}>
            {filtersOpen ? "Cerrar" : "Ajustar"}
            <svg
              className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </span>
        </button>

        {filtersOpen && (
          <div className="border-t border-slate-100 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label htmlFor="obs-residente" className="block text-xs text-slate-500 mb-1">Residente</label>
                <select
                  id="obs-residente"
                  value={filtroResidente}
                  onChange={(e) => setFiltroResidente(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Todos los residentes</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="obs-tipo" className="block text-xs text-slate-500 mb-1">Tipo</label>
                <select
                  id="obs-tipo"
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {TIPOS.map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="obs-desde" className="block text-xs text-slate-500 mb-1">Desde</label>
                <input
                  id="obs-desde"
                  type="date"
                  value={filtroDesde}
                  onChange={(e) => setFiltroDesde(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label htmlFor="obs-hasta" className="block text-xs text-slate-500 mb-1">Hasta</label>
                <input
                  id="obs-hasta"
                  type="date"
                  value={filtroHasta}
                  onChange={(e) => setFiltroHasta(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <label htmlFor="obs-seguimiento" className="flex items-center gap-2 cursor-pointer rounded-xl border border-slate-200 px-3 py-2">
                <input
                  id="obs-seguimiento"
                  type="checkbox"
                  checked={soloSeguimiento}
                  onChange={(e) => setSoloSeguimiento(e.target.checked)}
                  className="w-4 h-4 accent-teal-700"
                />
                <span className="text-sm text-slate-600 whitespace-nowrap">Solo seguimientos</span>
              </label>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-slate-500">
                Usa "Solo seguimientos" para preparar la entrega de turno.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="self-start text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-slate-100">
          <svg className="mx-auto mb-4 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
          <p>No hay observaciones para los filtros seleccionados.</p>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="mt-2 text-sm text-teal-600 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-semibold text-slate-800">
                      {r.residentes
                        ? `${r.residentes.apellido}, ${r.residentes.nombre}`
                        : "—"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        TIPO_BADGE[r.tipo] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {TIPO_LABEL[r.tipo] ?? r.tipo}
                    </span>
                    {r.requiere_seguimiento && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        Seguimiento
                      </span>
                    )}
                    <span className="text-xs text-slate-400 capitalize">{r.turno}</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-1">{r.descripcion}</p>
                  {r.acciones_tomadas && (
                    <p className="text-sm text-slate-500 italic">
                      Acciones: {r.acciones_tomadas}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                  <span className="text-xs text-slate-400">
                    {new Date(r.fecha_hora).toLocaleString("es-CL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="text-rose-400 hover:text-rose-600 text-xs"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}

export default ObservationList;
