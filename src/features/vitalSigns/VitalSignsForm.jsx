import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createVitalSigns } from "./vitalSignsService";
import { CARE_TURNOS, nextFollowUpSlot } from "../carePlans/carePlansService";
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

function nowLocalISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const INITIAL = {
  residente_id: "",
  fecha_hora: "",
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
  requiere_seguimiento: false,
  seguimiento_fecha: "",
  seguimiento_turno: "",
};

function followUpFromControl(fechaHora, turno) {
  const fecha = String(fechaHora || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  return nextFollowUpSlot(fecha, turno || "mañana");
}

function VitalSignsForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const rawId = searchParams.get("residenteId");
  const preselectedId = rawId && isValidUUID(rawId) ? rawId : null;

  const [form, setForm] = useState(() => ({ ...INITIAL, residente_id: preselectedId ?? "", fecha_hora: nowLocalISO() }));
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
        const next = followUpFromControl(prev.fecha_hora, prev.turno);
        return {
          ...prev,
          requiere_seguimiento: true,
          seguimiento_fecha: prev.seguimiento_fecha || next.fecha,
          seguimiento_turno: prev.seguimiento_turno || next.turno,
        };
      }

      const nextForm = { ...prev, [name]: type === "checkbox" ? checked : value };
      if ((name === "fecha_hora" || name === "turno") && prev.requiere_seguimiento) {
        const next = followUpFromControl(
          name === "fecha_hora" ? value : prev.fecha_hora,
          name === "turno" ? value : prev.turno
        );
        nextForm.seguimiento_fecha = next.fecha;
        nextForm.seguimiento_turno = next.turno;
      }
      return nextForm;
    });
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
    if (form.requiere_seguimiento && (!form.seguimiento_fecha || !form.seguimiento_turno)) {
      setError("Indica fecha y turno para dejar el seguimiento como pendiente clínico.");
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
        requiere_seguimiento: form.requiere_seguimiento,
        seguimiento_fecha: form.requiere_seguimiento ? form.seguimiento_fecha : null,
        seguimiento_turno: form.requiere_seguimiento ? form.seguimiento_turno : null,
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

      {/* Reference guide */}
      <section className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-teal-700 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
          <h2 className="text-sm font-semibold text-teal-800">Rangos de referencia — adultos mayores</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
          <div><span className="font-semibold text-teal-800">P/A</span> <span className="text-teal-700">100–139 / 60–89</span></div>
          <div><span className="font-semibold text-teal-800">FC</span> <span className="text-teal-700">60–100 lpm</span></div>
          <div><span className="font-semibold text-teal-800">FR</span> <span className="text-teal-700">12–20 rpm</span></div>
          <div><span className="font-semibold text-teal-800">Temperatura</span> <span className="text-teal-700">36.0–37.7 °C</span></div>
          <div><span className="font-semibold text-teal-800">SatO₂</span> <span className="text-teal-700">≥ 95 %</span></div>
          <div><span className="font-semibold text-teal-800">Glucosa</span> <span className="text-teal-700">70–179 mg/dL</span></div>
          <div><span className="font-semibold text-teal-800">Dolor</span> <span className="text-teal-700">0–3 normal · 4–6 moderado · 7–10 severo</span></div>
          <div><span className="font-semibold text-teal-800">Conciencia</span> <span className="text-teal-700">Alerta normal</span></div>
        </div>
        <p className="mt-2 text-[11px] text-teal-600">Valores fuera de rango se resaltan en ámbar (atención) o rojo (crítico). Registra solo los parámetros disponibles.</p>
      </section>

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
        {/* Residente y turno */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="border-b pb-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-700">Datos generales</h2>
            <p className="text-xs text-slate-500 mt-0.5">Selecciona el residente, la hora exacta del control y el turno en curso.</p>
          </div>
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
          <div className="flex items-start justify-between mb-4 border-b pb-2 gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-slate-700">Signos Vitales</h2>
              <p className="text-xs text-slate-500 mt-0.5">El estado general (pill a la derecha) refleja el peor valor ingresado.</p>
            </div>
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
                <label className="text-sm font-medium text-slate-600">Escala de dolor (0–10)</label>
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
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-400">0 — Sin dolor</span>
                <span className="text-amber-500">4–6 Moderado</span>
                <span className="text-rose-500">7–10 Severo</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Usa la escala numérica verbal: pregunta "¿del 0 al 10, cuánto le duele?"</p>
            </div>
          </div>
        </section>

        {/* Estado y observaciones */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="border-b pb-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-700">Estado y Observaciones</h2>
            <p className="text-xs text-slate-500 mt-0.5">Registra el nivel de conciencia y cualquier nota relevante para la continuidad del cuidado.</p>
          </div>
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
              <p className="mt-1 text-[11px] text-slate-400">Escala AVPU simplificada: Alerta → Voz → Dolor → No responde.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                rows={4}
                placeholder="Notas clínicas adicionales, contexto del control o alertas relevantes..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <label className="flex items-start gap-3 text-sm text-amber-950">
            <input
              type="checkbox"
              name="requiere_seguimiento"
              checked={form.requiere_seguimiento}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            <span>
              Crear seguimiento pendiente
              <span className="block text-xs leading-5 text-amber-800">
                Úsalo si el equipo debe reevaluar signos, dolor, conciencia o respuesta a una intervención en un turno posterior.
              </span>
            </span>
          </label>
          {form.requiere_seguimiento && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-amber-950">
                Fecha del seguimiento *
                <input
                  type="date"
                  name="seguimiento_fecha"
                  value={form.seguimiento_fecha}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="block text-sm font-medium text-amber-950">
                Turno del seguimiento *
                <select
                  name="seguimiento_turno"
                  value={form.seguimiento_turno}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                >
                  {CARE_TURNOS.map((turno) => <option key={turno} value={turno}>{turno}</option>)}
                </select>
              </label>
              <p className="sm:col-span-2 text-xs leading-5 text-amber-800">
                Al guardar se registrarán los signos vitales y se creará una observación pendiente para la entrega del turno definido. Desde tareas diarias se podrá finalizar o continuar el seguimiento.
              </p>
            </div>
          )}
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
