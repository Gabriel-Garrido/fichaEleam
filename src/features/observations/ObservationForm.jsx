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

const TURNOS = ["mañana", "tarde", "noche"];

function dateFromDateTime(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

function defaultFollowUp(fechaHora, turno) {
  const baseDate = dateFromDateTime(fechaHora);
  const base = new Date(`${baseDate}T12:00:00`);
  if (turno === "mañana") return { fecha: baseDate, turno: "tarde" };
  if (turno === "tarde") return { fecha: baseDate, turno: "noche" };
  base.setDate(base.getDate() + 1);
  return { fecha: base.toISOString().slice(0, 10), turno: "mañana" };
}

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
    seguimiento_fecha: "",
    seguimiento_turno: "",
    visible_familiar: false,
    resumen_familiar: "",
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
    setForm((prev) => {
      if (name === "requiere_seguimiento") {
        if (!checked) {
          return {
            ...prev,
            requiere_seguimiento: false,
            seguimiento_fecha: "",
            seguimiento_turno: "",
          };
        }
        const next = defaultFollowUp(prev.fecha_hora, prev.turno);
        return {
          ...prev,
          requiere_seguimiento: true,
          seguimiento_fecha: prev.seguimiento_fecha || next.fecha,
          seguimiento_turno: prev.seguimiento_turno || next.turno,
        };
      }

      if (name === "visible_familiar" && !checked) {
        return { ...prev, visible_familiar: false, resumen_familiar: "" };
      }

      const nextValue = type === "checkbox" ? checked : value;
      const nextForm = { ...prev, [name]: nextValue };
      if ((name === "fecha_hora" || name === "turno") && prev.requiere_seguimiento) {
        const next = defaultFollowUp(
          name === "fecha_hora" ? value : prev.fecha_hora,
          name === "turno" ? value : prev.turno
        );
        nextForm.seguimiento_fecha = next.fecha;
        nextForm.seguimiento_turno = next.turno;
      }
      return nextForm;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.residente_id) { setError("Debe seleccionar un residente."); return; }
    if (!form.descripcion.trim()) { setError("La descripción es obligatoria."); return; }
    if (form.requiere_seguimiento && (!form.seguimiento_fecha || !form.seguimiento_turno)) {
      setError("Indica fecha y turno para dejar el seguimiento como tarea pendiente.");
      return;
    }
    if (form.visible_familiar && !form.resumen_familiar.trim()) {
      setError("Escribe un resumen para familia antes de publicar esta observación.");
      return;
    }
    setSaving(true);
    try {
      await createObservation({
        ...form,
        seguimiento_fecha: form.requiere_seguimiento ? form.seguimiento_fecha : null,
        seguimiento_turno: form.requiere_seguimiento ? form.seguimiento_turno : null,
        seguimiento_estado: "pendiente",
        visible_familiar: form.visible_familiar,
        resumen_familiar: form.visible_familiar ? form.resumen_familiar : null,
      });
      toast("Observación guardada correctamente.", "success");
      if (preselectedId) navigate(`/residents/${preselectedId}`);
      else navigate("/observations");
    } catch (err) {
      const message = err?.message || "No se pudo guardar la observación.";
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingRes) return <Loading message="Cargando..." />;
  const noActiveResidents = residents.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button type="button"
 onClick={() => navigate(-1)} className="text-teal-700 hover:underline text-sm">
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-teal-700">Nueva Observación</h1>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4">{error}</div>}

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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="visible_familiar"
                  checked={form.visible_familiar}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 accent-teal-700"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Publicar en portal familiar</span>
                  <span className="block text-xs text-slate-500">
                    Desactivado por defecto. Al publicar, solo se mostrará el resumen escrito para la familia.
                  </span>
                </span>
              </label>
              {form.visible_familiar && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Resumen para familia *</label>
                  <textarea
                    name="resumen_familiar"
                    value={form.resumen_familiar}
                    onChange={handleChange}
                    required={form.visible_familiar}
                    rows={3}
                    placeholder="Escribe una versión clara y segura para el portal familiar..."
                    className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="requiere_seguimiento" checked={form.requiere_seguimiento} onChange={handleChange}
                className="w-4 h-4 accent-teal-700" />
              <span className="text-sm text-slate-700">Requiere seguimiento</span>
            </label>
            {form.requiere_seguimiento && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-amber-900 mb-1">Fecha del seguimiento *</label>
                    <input
                      type="date"
                      name="seguimiento_fecha"
                      value={form.seguimiento_fecha}
                      onChange={handleChange}
                      required={form.requiere_seguimiento}
                      className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-amber-900 mb-1">Turno del seguimiento *</label>
                    <select
                      name="seguimiento_turno"
                      value={form.seguimiento_turno}
                      onChange={handleChange}
                      required={form.requiere_seguimiento}
                      className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option value="">Seleccionar turno...</option>
                      {TURNOS.map((turno) => (
                        <option key={turno} value={turno}>{turno.charAt(0).toUpperCase() + turno.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-xs text-amber-800">
                  Esta observación aparecerá como pendiente en la entrega del turno seleccionado hasta que sea resuelta o cancelada.
                </p>
              </div>
            )}
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
