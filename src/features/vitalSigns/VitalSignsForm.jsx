import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createVitalSigns } from "./vitalSignsService";
import { CARE_TURNOS, currentTurno, nextFollowUpSlot } from "../carePlans/carePlansService";
import { getResidents } from "../residents/residentService";
import { isValidUUID } from "../../utils/validators";
import { useToast } from "../../components/Toast";
import { scrollToFirstError, userFacingFormError } from "../../utils/formValidation";
import { ErrorSummary } from "../../components/forms/FormKit";
import Button from "../../components/Button";
import { FeatureCoach } from "../featureCoach";
import { validateVitalSignsForm } from "./vitalSignsFormSchema";
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

const INPUT_CLS = "w-full min-h-11 sm:min-h-10 border rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 hover:border-slate-400 border-slate-300 transition-all placeholder:text-slate-400";
const SELECT_CLS = INPUT_CLS + " appearance-none";

function VitalSignsForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const rawId = searchParams.get("residenteId");
  const preselectedId = rawId && isValidUUID(rawId) ? rawId : null;

  const [form, setForm] = useState(() => ({
    ...INITIAL,
    residente_id: preselectedId ?? "",
    fecha_hora: nowLocalISO(),
    // El turno parte alineado con la hora actual; el usuario puede cambiarlo.
    turno: currentTurno(),
  }));
  const [residents, setResidents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingRes, setLoadingRes] = useState(true);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    getResidents("activo")
      .then(setResidents)
      .catch(() => setResidents([]))
      .finally(() => setLoadingRes(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
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
    const result = validateVitalSignsForm(form);
    setFieldErrors(result.errors);
    if (!result.ok) {
      scrollToFirstError(result.errors);
      return;
    }
    setSaving(true);
    try {
      await createVitalSigns(result.data);
      toast("Signos vitales registrados correctamente.", "success");
      if (preselectedId) {
        navigate(`/residents/${preselectedId}`);
      } else {
        navigate("/vital-signs");
      }
    } catch (err) {
      console.error("createVitalSigns failed:", err);
      const message = userFacingFormError(err, "No se pudo guardar el registro. Revisa los datos e intenta nuevamente.");
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingRes) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  const liveBadge = STATUS[liveOverall.status];
  const noActiveResidents = residents.length === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <FeatureCoach featureId="vital-signs-new" standalone />
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(-1)}
          className="tap-highlight-none flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="hidden sm:inline">Volver</span>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-700">Signos vitales</p>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">Registrar control</h1>
        </div>
      </div>

      {/* Reference guide */}
      <section className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-teal-700 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
          <h2 className="text-sm font-semibold text-teal-800">Rangos de referencia — personas mayores</h2>
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
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-4a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM7.25 6a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0V6z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {noActiveResidents && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-4 rounded-2xl mb-5">
          <h2 className="font-semibold text-sm">No hay residentes activos para registrar signos vitales</h2>
          <p className="text-xs text-amber-800 mt-1">
            Agrega un residente activo o cambia el estado de una ficha existente antes de registrar controles.
          </p>
          <button type="button" onClick={() => navigate("/residents/new")}
            className="tap-highlight-none mt-3 text-sm bg-white border border-amber-200 text-amber-800 px-4 py-2 rounded-xl hover:bg-amber-100">
            Agregar residente
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorSummary errors={fieldErrors} />
        {/* Residente y turno */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
            <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <h2 className="text-sm font-semibold text-slate-800">Datos generales</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="residente_id" className="block text-sm font-medium text-slate-700 mb-1.5">
                Residente <span className="text-rose-500 text-xs">*</span>
              </label>
              <div className="relative">
                <select id="residente_id" name="residente_id" value={form.residente_id} onChange={handleChange}
                  required disabled={noActiveResidents} aria-invalid={fieldErrors.residente_id ? "true" : "false"} className={`${SELECT_CLS} ${fieldErrors.residente_id ? "border-rose-400 bg-rose-50" : ""}`}>
                  <option value="">Seleccionar residente…</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              {fieldErrors.residente_id && <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.residente_id}</p>}
            </div>
            <div>
              <label htmlFor="fecha_hora" className="block text-sm font-medium text-slate-700 mb-1.5">
                Fecha y hora <span className="text-rose-500 text-xs">*</span>
              </label>
              <input id="fecha_hora" type="datetime-local" name="fecha_hora" value={form.fecha_hora}
                onChange={handleChange} required
                aria-invalid={fieldErrors.fecha_hora ? "true" : "false"}
                className={`${INPUT_CLS} ${fieldErrors.fecha_hora ? "border-rose-400 bg-rose-50" : ""}`} />
              {fieldErrors.fecha_hora && <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.fecha_hora}</p>}
            </div>
            <div>
              <label htmlFor="turno" className="block text-sm font-medium text-slate-700 mb-1.5">
                Turno <span className="text-rose-500 text-xs">*</span>
              </label>
              <div className="relative">
                <select id="turno" name="turno" value={form.turno} onChange={handleChange} className={SELECT_CLS}>
                  <option value="mañana">Mañana</option>
                  <option value="tarde">Tarde</option>
                  <option value="noche">Noche</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Signos vitales */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-50 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-800">Signos vitales</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${liveBadge.badge}`}
              title="Estado general según los valores ingresados"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${liveBadge.dot}`} />
              {liveOverall.label}
            </span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumField
              label="P/A Sistólica"
              unit="mmHg"
              normal="100–139"
              name="presion_sistolica"
              value={form.presion_sistolica}
              onChange={handleChange}
              placeholder="120"
              status={systolicStatus(form.presion_sistolica)}
              error={fieldErrors.presion_sistolica}
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
              error={fieldErrors.presion_diastolica}
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
              error={fieldErrors.frecuencia_cardiaca}
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
              error={fieldErrors.frecuencia_respiratoria}
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
              error={fieldErrors.temperatura}
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
              error={fieldErrors.saturacion_oxigeno}
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
              error={fieldErrors.glucosa}
            />
            <NumField
              label="Peso"
              unit="kg"
              name="peso"
              value={form.peso}
              onChange={handleChange}
              step="0.1"
              placeholder="65.0"
              error={fieldErrors.peso}
            />

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1 gap-2">
                <label className="text-sm font-medium text-slate-600">Escala de dolor (0–10)</label>
                <div className="flex items-center gap-2">
                  {form.dolor_escala === "" ? (
                    <span className="text-xs text-slate-400">No evaluado</span>
                  ) : (
                    <>
                      <PainBadge value={form.dolor_escala} />
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, dolor_escala: "" }))}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </>
                  )}
                </div>
              </div>
              <input
                type="range"
                name="dolor_escala"
                value={form.dolor_escala === "" ? 0 : form.dolor_escala}
                onChange={handleChange}
                min="0"
                max="10"
                className={`w-full accent-teal-700 ${form.dolor_escala === "" ? "opacity-50" : ""}`}
                aria-invalid={fieldErrors.dolor_escala ? "true" : "false"}
                aria-label="Escala de dolor de 0 a 10; mueve el control para evaluar"
              />
              {fieldErrors.dolor_escala && <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.dolor_escala}</p>}
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
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
            <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <h2 className="text-sm font-semibold text-slate-800">Estado y observaciones</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="estado_conciencia" className="block text-sm font-medium text-slate-700 mb-1.5">Estado de conciencia</label>
              <div className="relative">
                <select id="estado_conciencia" name="estado_conciencia" value={form.estado_conciencia} onChange={handleChange} className={SELECT_CLS}>
                  <option value="alerta">Alerta</option>
                  <option value="somnoliento">Somnoliento/a</option>
                  <option value="estuporoso">Estuporoso/a</option>
                  <option value="coma">Coma</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Escala AVPU simplificada: Alerta → Voz → Dolor → No responde.</p>
            </div>
            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
              <textarea id="observaciones" name="observaciones" value={form.observaciones} onChange={handleChange} rows={4}
                placeholder="Notas clínicas adicionales, contexto del control o alertas relevantes…"
                className="w-full rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none transition-all placeholder:text-slate-400" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
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
              <div>
                <label htmlFor="seguimiento_fecha" className="block text-sm font-medium text-amber-950 mb-1.5">Fecha del seguimiento <span className="text-rose-500 text-xs">*</span></label>
                <input id="seguimiento_fecha" type="date" name="seguimiento_fecha" value={form.seguimiento_fecha}
                  onChange={handleChange} required
                  aria-invalid={fieldErrors.seguimiento_fecha ? "true" : "false"}
                  className={`w-full min-h-11 sm:min-h-10 rounded-xl border bg-white px-3 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all ${fieldErrors.seguimiento_fecha ? "border-rose-400" : "border-amber-200"}`} />
                {fieldErrors.seguimiento_fecha && <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.seguimiento_fecha}</p>}
              </div>
              <div>
                <label htmlFor="seguimiento_turno" className="block text-sm font-medium text-amber-950 mb-1.5">Turno del seguimiento <span className="text-rose-500 text-xs">*</span></label>
                <div className="relative">
                  <select id="seguimiento_turno" name="seguimiento_turno" value={form.seguimiento_turno} onChange={handleChange} required
                    aria-invalid={fieldErrors.seguimiento_turno ? "true" : "false"}
                    className={`w-full min-h-11 sm:min-h-10 rounded-xl border bg-white px-3 py-2.5 sm:py-2 pr-9 text-base sm:text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 appearance-none transition-all ${fieldErrors.seguimiento_turno ? "border-rose-400" : "border-amber-200"}`}>
                    {CARE_TURNOS.map((turno) => <option key={turno} value={turno}>{turno}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                {fieldErrors.seguimiento_turno && <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.seguimiento_turno}</p>}
              </div>
              <p className="sm:col-span-2 text-xs leading-5 text-amber-800">
                Al guardar se registrarán los signos vitales y se creará una observación pendiente para la entrega del turno definido. Desde tareas diarias se podrá finalizar o continuar el seguimiento.
              </p>
            </div>
          )}
        </section>

        <div className="flex gap-3 justify-end pb-8">
          <Button type="button" onClick={() => navigate(-1)}
            className="flex-1 sm:flex-none border border-slate-300 bg-white text-slate-600 hover:bg-slate-50">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || noActiveResidents}
            className="flex-1 sm:flex-none bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50 font-semibold">
            {saving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando…
              </span>
            ) : "Guardar registro"}
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
  error,
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
        <label htmlFor={name} className="text-sm font-medium text-slate-600">
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
        id={name}
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        aria-invalid={error ? "true" : "false"}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${error ? "border-rose-400 bg-rose-50 focus:ring-rose-100" : ringClass}`}
      />
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
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
