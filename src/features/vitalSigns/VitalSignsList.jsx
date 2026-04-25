import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getVitalSigns, deleteVitalSigns } from "./vitalSignsService";
import { getResidents } from "../residents/residentService";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function VitalSignsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("residenteId");

  const [records, setRecords]           = useState([]);
  const [residents, setResidents]       = useState([]);
  const [filtroResidente, setFiltroResidente] = useState(preselectedId ?? "");
  const [filtroDesde, setFiltroDesde]   = useState(firstOfMonth());
  const [filtroHasta, setFiltroHasta]   = useState(today());
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    getResidents()
      .then(setResidents)
      .catch(() => toast("No se pudo cargar la lista de residentes.", "warning"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVitalSigns(filtroResidente || null, {
        desde: filtroDesde || null,
        hasta: filtroHasta || null,
      });
      setRecords(data);
    } catch {
      setError("No se pudo cargar los registros de signos vitales.");
    } finally {
      setLoading(false);
    }
  }, [filtroResidente, filtroDesde, filtroHasta]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const clearFilters = () => {
    setFiltroResidente("");
    setFiltroDesde(firstOfMonth());
    setFiltroHasta(today());
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await deleteVitalSigns(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast("Registro eliminado.", "success");
    } catch {
      toast("No se pudo eliminar el registro.", "error");
    }
  };

  const formatPA = (s, d) => (s && d ? `${s}/${d}` : s || d || "—");

  if (loading) return <Loading message="Cargando registros..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">Signos Vitales</h1>
        <Button
          onClick={() =>
            navigate(
              preselectedId
                ? `/vital-signs/new?residenteId=${preselectedId}`
                : "/vital-signs/new"
            )
          }
          className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
        >
          + Nuevo Registro
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
              <option key={r.id} value={r.id}>
                {r.apellido}, {r.nombre}
              </option>
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
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 underline py-2"
        >
          Limpiar filtros
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📊</div>
          <p>No hay registros para el período seleccionado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Residente</th>
                <th className="px-4 py-3 text-left">Fecha/Hora</th>
                <th className="px-4 py-3 text-center">P/A</th>
                <th className="px-4 py-3 text-center">FC</th>
                <th className="px-4 py-3 text-center">FR</th>
                <th className="px-4 py-3 text-center">Temp.</th>
                <th className="px-4 py-3 text-center">SatO₂</th>
                <th className="px-4 py-3 text-center">Glucosa</th>
                <th className="px-4 py-3 text-center">Dolor</th>
                <th className="px-4 py-3 text-center">Turno</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {r.residentes
                      ? `${r.residentes.apellido}, ${r.residentes.nombre}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(r.fecha_hora).toLocaleString("es-CL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {formatPA(r.presion_sistolica, r.presion_diastolica)}
                  </td>
                  <td className="px-4 py-3 text-center">{r.frecuencia_cardiaca ?? "—"}</td>
                  <td className="px-4 py-3 text-center">{r.frecuencia_respiratoria ?? "—"}</td>
                  <td className={`px-4 py-3 text-center font-medium ${r.temperatura > 37.5 ? "text-red-600" : "text-gray-700"}`}>
                    {r.temperatura != null ? `${r.temperatura}°` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${r.saturacion_oxigeno != null && r.saturacion_oxigeno < 95 ? "text-red-600" : "text-gray-700"}`}>
                    {r.saturacion_oxigeno != null ? `${r.saturacion_oxigeno}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">{r.glucosa ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {r.dolor_escala != null ? (
                      <span className={`font-medium ${r.dolor_escala >= 7 ? "text-red-600" : r.dolor_escala >= 4 ? "text-yellow-600" : "text-green-600"}`}>
                        {r.dolor_escala}/10
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center capitalize text-gray-500">
                    {r.turno ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VitalSignsList;
