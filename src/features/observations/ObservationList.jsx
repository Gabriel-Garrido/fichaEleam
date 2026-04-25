import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getObservations, deleteObservation } from "./observationsService";
import { getResidents } from "../residents/residentService";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

const TIPO_BADGE = {
  caida:                      "bg-red-100 text-red-700",
  incidente:                  "bg-orange-100 text-orange-700",
  visita_medica:              "bg-blue-100 text-blue-700",
  curacion:                   "bg-purple-100 text-purple-700",
  administracion_medicamento: "bg-yellow-100 text-yellow-700",
  observacion_general:        "bg-gray-100 text-gray-700",
};

const TIPOS = [
  ["", "Todos los tipos"],
  ["observacion_general", "General"],
  ["caida", "Caída"],
  ["incidente", "Incidente"],
  ["curacion", "Curación"],
  ["visita_medica", "Visita médica"],
  ["administracion_medicamento", "Medicamento"],
  ["cambio_posicion", "Cambio posición"],
  ["higiene", "Higiene"],
  ["alimentacion", "Alimentación"],
  ["eliminacion", "Eliminación"],
  ["actividad", "Actividad"],
  ["otro", "Otro"],
];

const TIPO_LABEL = Object.fromEntries(TIPOS.filter(([v]) => v));

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
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("residenteId");

  const [records, setRecords]                 = useState([]);
  const [residents, setResidents]             = useState([]);
  const [filtroResidente, setFiltroResidente] = useState(preselectedId ?? "");
  const [filtroTipo, setFiltroTipo]           = useState("");
  const [filtroDesde, setFiltroDesde]         = useState(firstOfMonth());
  const [filtroHasta, setFiltroHasta]         = useState(today());
  const [soloSeguimiento, setSoloSeguimiento] = useState(false);
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

  if (loading) return <Loading message="Cargando observaciones..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">Observaciones Diarias</h1>
        <Button
          onClick={() =>
            navigate(
              preselectedId
                ? `/observations/new?residenteId=${preselectedId}`
                : "/observations/new"
            )
          }
          className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
        >
          + Nueva Observación
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchRecords} className="underline text-sm ml-2">Reintentar</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Residente</label>
          <select
            value={filtroResidente}
            onChange={(e) => setFiltroResidente(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
          >
            <option value="">Todos los residentes</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
          >
            {TIPOS.map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer py-2">
          <input
            type="checkbox"
            checked={soloSeguimiento}
            onChange={(e) => setSoloSeguimiento(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm text-gray-600 whitespace-nowrap">Solo seguimientos</span>
        </label>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 underline py-2"
        >
          Limpiar
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📋</div>
          <p>No hay observaciones para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-semibold text-gray-800">
                      {r.residentes
                        ? `${r.residentes.apellido}, ${r.residentes.nombre}`
                        : "—"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        TIPO_BADGE[r.tipo] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {TIPO_LABEL[r.tipo] ?? r.tipo}
                    </span>
                    {r.requiere_seguimiento && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        ⚠ Seguimiento
                      </span>
                    )}
                    <span className="text-xs text-gray-400 capitalize">{r.turno}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{r.descripcion}</p>
                  {r.acciones_tomadas && (
                    <p className="text-sm text-gray-500 italic">
                      Acciones: {r.acciones_tomadas}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-gray-400">
                    {new Date(r.fecha_hora).toLocaleString("es-CL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ObservationList;
