import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createVitalSigns } from "./vitalSignsService";
import { getResidents } from "../residents/residentService";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

const INITIAL = {
  residente_id: "",
  fecha_hora: new Date().toISOString().slice(0, 16),
  turno: "mañana",
  presion_sistolica: "",
  presion_diastolica: "",
  frecuencia_cardiaca: "",
  frecuencia_respiratoria: "",
  temperatura: "",
  saturacion_oxigeno: "",
  glucosa: "",
  peso: "",
  dolor_escala: "",
  estado_conciencia: "alerta",
  observaciones: "",
};

function VitalSignsForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("residenteId");

  const [form, setForm] = useState({ ...INITIAL, residente_id: preselectedId ?? "" });
  const [residents, setResidents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingRes, setLoadingRes] = useState(true);
  const [error, setError] = useState(null); // inline errors only (resident required)

  useEffect(() => {
    getResidents("activo")
      .then(setResidents)
      .catch(() => setResidents([]))
      .finally(() => setLoadingRes(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.residente_id) {
      setError("Debe seleccionar un residente.");
      return;
    }
    setSaving(true);
    try {
      const toNum = (v) => (v !== "" ? parseFloat(v) : null);
      const toInt = (v) => (v !== "" ? parseInt(v) : null);
      const payload = {
        residente_id: form.residente_id,
        fecha_hora: form.fecha_hora,
        turno: form.turno,
        presion_sistolica: toInt(form.presion_sistolica),
        presion_diastolica: toInt(form.presion_diastolica),
        frecuencia_cardiaca: toInt(form.frecuencia_cardiaca),
        frecuencia_respiratoria: toInt(form.frecuencia_respiratoria),
        temperatura: toNum(form.temperatura),
        saturacion_oxigeno: toInt(form.saturacion_oxigeno),
        glucosa: toInt(form.glucosa),
        peso: toNum(form.peso),
        dolor_escala: toInt(form.dolor_escala),
        estado_conciencia: form.estado_conciencia || null,
        observaciones: form.observaciones || null,
      };
      await createVitalSigns(payload);
      toast("Signos vitales registrados correctamente.", "success");
      if (preselectedId) {
        navigate(`/residents/${preselectedId}`);
      } else {
        navigate("/vital-signs");
      }
    } catch {
      toast("No se pudo guardar el registro.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingRes) return <Loading message="Cargando residentes..." />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-[var(--color-primary)] hover:underline text-sm">
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">Registrar Signos Vitales</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Residente y turno */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Datos generales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Residente *</label>
              <select
                name="residente_id"
                value={form.residente_id}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
              >
                <option value="">Seleccionar residente...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.apellido}, {r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Fecha y hora *</label>
              <input
                type="datetime-local"
                name="fecha_hora"
                value={form.fecha_hora}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Turno</label>
              <select
                name="turno"
                value={form.turno}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
          </div>
        </section>

        {/* Signos vitales */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Signos Vitales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumField label="P/A Sistólica (mmHg)" name="presion_sistolica" value={form.presion_sistolica} onChange={handleChange} placeholder="120" />
            <NumField label="P/A Diastólica (mmHg)" name="presion_diastolica" value={form.presion_diastolica} onChange={handleChange} placeholder="80" />
            <NumField label="FC (lpm)" name="frecuencia_cardiaca" value={form.frecuencia_cardiaca} onChange={handleChange} placeholder="70" />
            <NumField label="FR (rpm)" name="frecuencia_respiratoria" value={form.frecuencia_respiratoria} onChange={handleChange} placeholder="16" />
            <NumField label="Temperatura (°C)" name="temperatura" value={form.temperatura} onChange={handleChange} step="0.1" placeholder="36.5" />
            <NumField label="SatO₂ (%)" name="saturacion_oxigeno" value={form.saturacion_oxigeno} onChange={handleChange} min="0" max="100" placeholder="98" />
            <NumField label="Glucosa (mg/dL)" name="glucosa" value={form.glucosa} onChange={handleChange} placeholder="100" />
            <NumField label="Peso (kg)" name="peso" value={form.peso} onChange={handleChange} step="0.1" placeholder="65.0" />
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Dolor (0-10)</label>
              <input
                type="range"
                name="dolor_escala"
                value={form.dolor_escala}
                onChange={handleChange}
                min="0"
                max="10"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0 Sin dolor</span>
                <span className="font-semibold text-gray-700">{form.dolor_escala || 0}</span>
                <span>10 Máximo</span>
              </div>
            </div>
          </div>
        </section>

        {/* Estado y observaciones */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Estado y Observaciones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Estado de conciencia</label>
              <select
                name="estado_conciencia"
                value={form.estado_conciencia}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
              >
                <option value="alerta">Alerta</option>
                <option value="somnoliento">Somnoliento/a</option>
                <option value="estuporoso">Estuporoso/a</option>
                <option value="coma">Coma</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Observaciones</label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                rows={3}
                placeholder="Notas adicionales del registro..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
              />
            </div>
          </div>
        </section>

        <div className="flex gap-4 justify-end">
          <Button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar Registro"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NumField({ label, name, value, onChange, placeholder, step, min, max }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
      />
    </div>
  );
}

export default VitalSignsForm;
