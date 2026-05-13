import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createVitalSigns } from "./vitalSignsService";
import { getResidents } from "../residents/residentService";
import { isValidUUID } from "../../utils/validators";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import {
  STATUS,
  systolicStatus,
  diastolicStatus,
  heartRateStatus,
  respiratoryRateStatus,
  temperatureStatus,
  oxygenStatus,
  glucoseStatus,
  painStatus,
  recordOverallLabel,
} from "./vitalRanges";

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
  const rawId = searchParams.get("residenteId");
  const preselectedId = rawId && isValidUUID(rawId) ? rawId : null;

  const [form, setForm] = useState({ ...INITIAL, residente_id: preselectedId ?? "" });
  const [residents, setResidents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingRes, setLoadingRes] = useState(true);
  const [error, setError] = useState(null);

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

  // Resumen general en vivo a partir de lo que el usuario va escribiendo.
  const liveOverall = useMemo(() => {
    return recordOverallLabel({
      presion_sistolica: form.presion_sistolica,
      presion_diastolica: form.presion_diastolica,
      frecuencia_cardiaca: form.frecuencia_cardiaca,
      frecuencia_respiratoria: form.frecuencia_respiratoria,
      temperatura: form.temperatura,
      saturacion_oxigeno: form.saturacion_oxigeno,
      glucosa: form.glucosa,
      dolor_escala: form.dolor_escala,
    });
  }, [form]);

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

  const liveBadge = STATUS[liveOverall.status];
  const noActiveResidents = residents.length === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"

          onClick={() => navigate(-1)}
          className="text-teal-700 hover:underline text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-teal-700">
          Registrar Signos Vitales
        </h1>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {noActiveResidents && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-4 rounded-xl mb-5">
          <h2 className="font-semibold">No hay residentes activos para registrar signos vitales</h2>
          <p className="text-sm text-amber-800 mt-1">
            Agrega un residente activo o cambia el estado de una ficha existente antes de registrar controles.
          </p>
          <button            type="button"
            onClick={() => navigate("/residents/new")}
            className="mt-3 text-sm bg-white border border-amber-200 text-amber-800 px-4 py-2 rounded-xl hover:bg-amber-100"
          >
            Agregar residente
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Residente y turno */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">
            Datos generales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Residente *
              </label>
              <select
                name="residente_id"
                value={form.residente_id}
                onChange={handleChange}
                required
                disabled={noActiveResidents}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Fecha y hora *
              </label>
              <input
                type="datetime-local"
                name="fecha_hora"
                value={form.fecha_hora}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Turno</label>
              <select
                name="turno"
                value={form.turno}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
          </div>
        </section>

        {/* Signos vitales */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-2 gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-slate-700">Signos Vitales</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${liveBadge.badge}`}
              title="Estado general según los valores ingresados"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${liveBadge.dot}`} />
              {liveOverall.label}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumField
              label="P/A Sistólica"
              unit="mmHg"
              normal="100–139"
              name="presion_sistolica"
              value={form.presion_sistolica}
              onChange={handleChange}
              placeholder="120"
              status={systolicStatus(form.presion_sistolica)}
            />
            <NumField
              label="P/A Diastólica"
              unit="mmHg"
              normal="60–89"
              name="presion_diastolica"
              value={form.presion_diastolica}
              onChange={handleChange}
              placeholder="80"
              status={diastolicStatus(form.presion_diastolica)}
            />
            <NumField
              label="Frec. cardiaca"
              unit="lpm"
              normal="60–100"
              name="frecuencia_cardiaca"
              value={form.frecuencia_cardiaca}
              onChange={handleChange}
              placeholder="70"
              status={heartRateStatus(form.frecuencia_cardiaca)}
            />
            <NumField
              label="Frec. respiratoria"
              unit="rpm"
              normal="12–20"
              name="frecuencia_respiratoria"
              value={form.frecuencia_respiratoria}
              onChange={handleChange}
              placeholder="16"
              status={respiratoryRateStatus(form.frecuencia_respiratoria)}
            />
            <NumField
              label="Temperatura"
              unit="°C"
              normal="36.0–37.7"
              name="temperatura"
              value={form.temperatura}
              onChange={handleChange}
              step="0.1"
              placeholder="36.5"
              status={temperatureStatus(form.temperatura)}
            />
            <NumField
              label="SatO₂"
              unit="%"
              normal="≥ 95"
              name="saturacion_oxigeno"
              value={form.saturacion_oxigeno}
              onChange={handleChange}
              min="0"
              max="100"
              placeholder="98"
              status={oxygenStatus(form.saturacion_oxigeno)}
            />
            <NumField
              label="Glucosa"
              unit="mg/dL"
              normal="70–179"
              name="glucosa"
              value={form.glucosa}
              onChange={handleChange}
              placeholder="100"
              status={glucoseStatus(form.glucosa)}
            />
            <NumField
              label="Peso"
              unit="kg"
              name="peso"
              value={form.peso}
              onChange={handleChange}
              step="0.1"
              placeholder="65.0"
            />

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-600">Dolor (0-10)</label>
                <PainBadge value={form.dolor_escala} />
              </div>
              <input
                type="range"
                name="dolor_escala"
                value={form.dolor_escala || 0}
                onChange={handleChange}
                min="0"
                max="10"
                className="w-full accent-teal-700"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>0 Sin dolor</span>
                <span>10 Máximo</span>
              </div>
            </div>
          </div>
        </section>

        {/* Estado y observaciones */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">
            Estado y Observaciones
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Estado de conciencia
              </label>
              <select
                name="estado_conciencia"
                value={form.estado_conciencia}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="alerta">Alerta</option>
                <option value="somnoliento">Somnoliento/a</option>
                <option value="estuporoso">Estuporoso/a</option>
                <option value="coma">Coma</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                rows={3}
                placeholder="Notas adicionales del registro..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </section>

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || noActiveResidents}
            className="px-6 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Registro"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NumField({
  label,
  unit,
  normal,
  name,
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
  status,
}) {
  const s = status ? STATUS[status] : null;
  const showStatus = status && status !== "unknown";
  const ringClass = !showStatus
    ? "border-slate-300 focus:ring-teal-500"
    : status === "critical"
      ? "border-rose-300 focus:ring-rose-200"
      : status === "warning"
        ? "border-amber-300 focus:ring-amber-200"
        : "border-emerald-300 focus:ring-emerald-200";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-600">
          {label} {unit && <span className="text-slate-400 font-normal">({unit})</span>}
        </label>
        {showStatus && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${s.badge}`}
          >
            <span className={`h-1 w-1 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        )}
      </div>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ringClass}`}
      />
      {normal && (
        <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
          Normal: <span className="text-slate-500 normal-case">{normal}</span>
        </div>
      )}
    </div>
  );
}

function PainBadge({ value }) {
  const status = painStatus(value);
  if (status === "unknown") return null;
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${s.badge}`}
    >
      <span className={`h-1 w-1 rounded-full ${s.dot}`} />
      {value}/10 — {s.label}
    </span>
  );
}

export default VitalSignsForm;
