import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createObservation } from "./observationsService";
import { getResidents } from "../residents/residentService";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

const TIPOS = [
  ["observacion_general", "Observación general"],
  ["caida", "Caída"],
  ["incidente", "Incidente"],
  ["curacion", "Curación / Procedimiento"],
  ["visita_medica", "Visita médica"],
  ["administracion_medicamento", "Administración de medicamento"],
  ["cambio_posicion", "Cambio de posición"],
  ["higiene", "Higiene y cuidados"],
  ["alimentacion", "Alimentación"],
  ["eliminacion", "Eliminación"],
  ["actividad", "Actividad recreativa / rehabilitación"],
  ["otro", "Otro"],
];

function ObservationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("residenteId");

  const [form, setForm] = useState({
    residente_id: preselectedId ?? "",
    fecha_hora: new Date().toISOString().slice(0, 16),
    turno: "mañana",
    tipo: "observacion_general",
    descripcion: "",
    acciones_tomadas: "",
    requiere_seguimiento: false,
  });
  const [residents, setResidents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingRes, setLoadingRes] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getResidents("activo").then(setResidents).catch(() => setResidents([])).finally(() => setLoadingRes(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.residente_id) { setError("Debe seleccionar un residente."); return; }
    if (!form.descripcion.trim()) { setError("La descripción es obligatoria."); return; }
    setSaving(true);
    try {
      await createObservation(form);
      if (preselectedId) navigate(`/residents/${preselectedId}`);
      else navigate("/observations");
    } catch (err) {
      setError("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingRes) return <Loading message="Cargando..." />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-[var(--color-primary)] hover:underline text-sm">
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">Nueva Observación</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Datos generales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Residente *</label>
              <select name="residente_id" value={form.residente_id} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="">Seleccionar residente...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Fecha y hora *</label>
              <input type="datetime-local" name="fecha_hora" value={form.fecha_hora} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Turno</label>
              <select name="turno" value={form.turno} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de observación *</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                {TIPOS.map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Descripción</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Descripción *</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} required rows={4}
                placeholder="Describa detalladamente la observación..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Acciones tomadas</label>
              <textarea name="acciones_tomadas" value={form.acciones_tomadas} onChange={handleChange} rows={3}
                placeholder="Describa las acciones realizadas..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="requiere_seguimiento" checked={form.requiere_seguimiento} onChange={handleChange}
                className="w-4 h-4 accent-[var(--color-primary)]" />
              <span className="text-sm text-gray-700">Requiere seguimiento</span>
            </label>
          </div>
        </section>

        <div className="flex gap-4 justify-end">
          <Button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar Observación"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ObservationForm;
