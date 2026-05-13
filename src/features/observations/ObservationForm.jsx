import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createObservation } from "./observationsService";
import { getResidents } from "../residents/residentService";
import { isValidUUID } from "../../utils/validators";
import { useToast } from "../../components/Toast";
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
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const rawId = searchParams.get("residenteId");
  const preselectedId = rawId && isValidUUID(rawId) ? rawId : null;

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
      toast("Observación guardada correctamente.", "success");
      if (preselectedId) navigate(`/residents/${preselectedId}`);
      else navigate("/observations");
    } catch {
      toast("No se pudo guardar la observación.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingRes) return <Loading message="Cargando..." />;
  const noActiveResidents = residents.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-teal-700 hover:underline text-sm">
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-teal-700">Nueva Observación</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>}

      {noActiveResidents && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-4 rounded-xl mb-5">
          <h2 className="font-semibold">No hay residentes activos para registrar observaciones</h2>
          <p className="text-sm text-amber-800 mt-1">
            Primero agrega un residente activo para asociar el registro de turno.
          </p>
          <button
            type="button"
            onClick={() => navigate("/residents/new")}
            className="mt-3 text-sm bg-white border border-amber-200 text-amber-800 px-4 py-2 rounded-xl hover:bg-amber-100"
          >
            Agregar residente
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Datos generales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Residente *</label>
              <select name="residente_id" value={form.residente_id} onChange={handleChange} required
                disabled={noActiveResidents}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Seleccionar residente...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha y hora *</label>
              <input type="datetime-local" name="fecha_hora" value={form.fecha_hora} onChange={handleChange} required
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Turno</label>
              <select name="turno" value={form.turno} onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de observación *</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} required
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {TIPOS.map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Descripción</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Descripción *</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} required rows={4}
                placeholder="Describa detalladamente la observación..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Acciones tomadas</label>
              <textarea name="acciones_tomadas" value={form.acciones_tomadas} onChange={handleChange} rows={3}
                placeholder="Describa las acciones realizadas..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="requiere_seguimiento" checked={form.requiere_seguimiento} onChange={handleChange}
                className="w-4 h-4 accent-teal-700" />
              <span className="text-sm text-slate-700">Requiere seguimiento</span>
            </label>
          </div>
        </section>

        <div className="flex gap-4 justify-end">
          <Button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50">
            Cancelar
          </Button>
          <Button type="submit"
            className="px-6 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50"
            disabled={saving || noActiveResidents}>
            {saving ? "Guardando..." : "Guardar Observación"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ObservationForm;
