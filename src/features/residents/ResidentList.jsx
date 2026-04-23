import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getResidents, deleteResident } from "./residentService";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

const ESTADO_BADGE = {
  activo: "bg-green-100 text-green-800",
  hospitalizado: "bg-yellow-100 text-yellow-800",
  egresado: "bg-gray-100 text-gray-700",
  fallecido: "bg-red-100 text-red-800",
};

function ResidentList() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchResidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const data = await getResidents(filtroEstado || null);
      setResidents(data);
    } catch (err) {
      setError("Error al cargar residentes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteResident(id);
      setResidents((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError("Error al eliminar residente: " + err.message);
    }
  };

  const filtered = residents.filter((r) => {
    const full = `${r.nombre} ${r.apellido} ${r.rut ?? ""}`.toLowerCase();
    return full.includes(busqueda.toLowerCase());
  });

  if (loading) return <Loading message="Cargando residentes..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">Residentes</h1>
        <Button
          onClick={() => navigate("/residents/new")}
          className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-button-hover)] transition-all"
        >
          + Agregar Residente
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o RUT..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="hospitalizado">Hospitalizado</option>
          <option value="egresado">Egresado</option>
          <option value="fallecido">Fallecido</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">👴</div>
          <p className="text-lg">No se encontraron residentes.</p>
          <Button
            onClick={() => navigate("/residents/new")}
            className="mt-4 bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
          >
            Agregar primer residente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {r.apellido}, {r.nombre}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_BADGE[r.estado] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {r.estado}
                  </span>
                </div>
                <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                  {r.rut && <span>RUT: {r.rut}</span>}
                  {r.habitacion && <span>Hab. {r.habitacion}</span>}
                  {r.fecha_ingreso && (
                    <span>Ingreso: {new Date(r.fecha_ingreso).toLocaleDateString("es-CL")}</span>
                  )}
                  {r.nivel_dependencia && <span>Dep.: {r.nivel_dependencia}</span>}
                </div>
                {r.diagnostico_principal && (
                  <p className="text-sm text-gray-600 mt-1 italic">{r.diagnostico_principal}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={() => navigate(`/residents/${r.id}`)}
                  className="text-sm bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg hover:bg-[var(--color-button-hover)] transition-all"
                >
                  Ver
                </Button>
                <Button
                  onClick={() => navigate(`/residents/${r.id}/edit`)}
                  className="text-sm bg-white text-[var(--color-primary)] border border-[var(--color-primary)] px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Editar
                </Button>
                <Button
                  onClick={() => handleDelete(r.id, `${r.nombre} ${r.apellido}`)}
                  className="text-sm bg-white text-red-500 border border-red-300 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-all"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-400 mt-4 text-right">
        {filtered.length} residente{filtered.length !== 1 ? "s" : ""} mostrado{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export default ResidentList;
