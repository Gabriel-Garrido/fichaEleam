import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getResidentById } from "./residentService";
import { getVitalSigns } from "../vitalSigns/vitalSignsService";
import { getObservations } from "../observations/observationsService";
import { useAuth } from "../../context/AuthContext";
import { isValidUUID } from "../../utils/validators";
import { formatDateTime } from "../../utils/dateUtils";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import VitalCard from "../vitalSigns/VitalCard";
import CarePlanTab from "../carePlans/CarePlanTab";
import EmarResidentTab from "../emar/EmarResidentTab";
import {
  listCareTasks,
  completeCareTask,
  todayIso,
  currentTurno,
  CARE_CATEGORY_LABEL,
  OMISSION_REASONS,
} from "../carePlans/carePlansService";
import {
  getVisits,
  getPendingVisits,
  validateVisitEntry,
  registerVisitExit,
  cancelVisit,
  logVisit,
} from "../familiar/familiarService";
import {
  VITAL_DEFS,
  STATUS,
  recordOverallLabel,
} from "../vitalSigns/vitalRanges";

import {
  ESTADO_BADGE,
  DEPENDENCIA_TONE,
  TIPO_LABEL,
  TIPO_BADGE,
  initials,
  calcAge,
  getAllergySummary,
} from "./residentUtils";

function daysSince(date) {
  if (!date) return null;
  // Parse "YYYY-MM-DD" as local midnight to avoid off-by-one for UTC-negative timezones.
  const [y, m, d] = String(date).split("-").map(Number);
  if (!y || !m || !d) return null;
  const local = new Date(y, m - 1, d);
  if (isNaN(local)) return null;
  return Math.floor((Date.now() - local.getTime()) / 86400000);
}

function formatFollowUpLabel(record) {
  const parts = [];

  if (record.seguimiento_fecha) {
    parts.push(
      new Date(`${record.seguimiento_fecha}T12:00:00`).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
      })
    );
  }

  if (record.seguimiento_turno) parts.push(record.seguimiento_turno);

  return parts.length ? `Seguimiento · ${parts.join(" · ")}` : "Seguimiento pendiente";
}

function ResidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canFeature, can } = useAuth();
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("info");

  useEffect(() => {
    if (!isValidUUID(id)) {
      setError("ID de residente inválido.");
      setLoading(false);
      return;
    }
    getResidentById(id)
      .then(setResident)
      .catch((err) => setError("Error al cargar residente: " + err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading message="Cargando residente..." />;
  if (error)   return <div className="p-8 text-rose-600">{error}</div>;
  if (!resident) return <div className="p-8 text-slate-500">Residente no encontrado.</div>;

  const age = calcAge(resident.fecha_nacimiento);
  const stayDays = daysSince(resident.fecha_ingreso);
  const allergies = getAllergySummary(resident.alergias);

  const tabs = [
    { id: "info",          label: "Información" },
    { id: "signos",        label: "Signos Vitales" },
    { id: "observaciones", label: "Observaciones" },
    canFeature("care-plans") && { id: "tareas",  label: "Tareas hoy" },
    canFeature("care-plans") && { id: "care",    label: "Plan de cuidado" },
    canFeature("emar")       && { id: "emar",    label: "eMAR" },
    can("registrar_visitas") && { id: "visitas", label: "Visitas" },
  ].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={() => navigate("/residents")}
        className="text-teal-700 hover:underline text-sm mb-4 inline-flex items-center gap-1"
      >
        ← Volver a residentes
      </button>

      {/* Header card */}
      <div className="relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="h-20 bg-gradient-to-r from-teal-200 via-teal-500 to-teal-700" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-teal-700 shadow-md ring-4 ring-white">
              {initials(resident.nombre, resident.apellido)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 truncate">
                  {resident.nombre} {resident.apellido}
                </h1>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
                    ESTADO_BADGE[resident.estado] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {resident.estado}
                </span>
              </div>
              <div className="text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {age != null && <span>{age} años</span>}
                {resident.sexo && <span className="capitalize">{resident.sexo}</span>}
                {resident.rut && <span>RUT: {resident.rut}</span>}
                {resident.habitacion && (
                  <span>
                    Hab. {resident.habitacion}
                    {resident.cama ? ` · Cama ${resident.cama}` : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(`/residents/${id}/edit`)}
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 shadow-sm"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => navigate(`/vital-signs/new?residenteId=${id}`)}
                className="rounded-xl bg-white text-teal-700 border border-teal-600 px-4 py-2 text-sm font-semibold hover:bg-teal-50"
              >
                + Signos
              </button>
              <button
                type="button"
                onClick={() => navigate(`/observations/new?residenteId=${id}`)}
                className="rounded-xl bg-white text-teal-700 border border-teal-600 px-4 py-2 text-sm font-semibold hover:bg-teal-50"
              >
                + Observación
              </button>
            </div>
          </div>

          {/* Quick info strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <QuickStat
              label="Ingreso"
              value={
                resident.fecha_ingreso
                  ? new Date(resident.fecha_ingreso + "T12:00:00").toLocaleDateString("es-CL")
                  : "—"
              }
              sub={stayDays != null ? `${stayDays} días en ELEAM` : undefined}
            />
            <QuickStat
              label="Dependencia"
              value={resident.nivel_dependencia ?? "—"}
              tone={DEPENDENCIA_TONE[resident.nivel_dependencia]}
              capitalize
            />
            <QuickStat
              label="Índice Barthel"
              value={resident.indice_barthel != null ? `${resident.indice_barthel}/100` : "—"}
            />
            <QuickStat
              label="Diagnóstico"
              value={resident.diagnostico_principal || "—"}
              truncate
            />
          </div>

          {allergies.hasRealAllergies && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0 text-rose-500 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div className="text-sm text-rose-700">
                <span className="font-semibold">Alergias:</span>{" "}
                {allergies.label}
              </div>
            </div>
          )}

          {allergies.hasExplicitNoKnownAllergies && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <div className="text-sm font-medium text-emerald-700">
                {allergies.label}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs — overflow-x-auto prevents cut-off on mobile */}
      <div className="mb-6 -mx-1 overflow-x-auto">
        <div className="flex min-w-max border-b border-slate-200 px-1">
          {tabs.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "info"          && <InfoTab resident={resident} />}
      {tab === "signos"        && <SignosTab residenteId={id} navigate={navigate} />}
      {tab === "observaciones" && <ObservacionesTab residenteId={id} navigate={navigate} />}
      {tab === "tareas"        && <TareasTab residenteId={id} />}
      {tab === "care"          && <CarePlanTab resident={resident} />}
      {tab === "emar"          && <EmarResidentTab resident={resident} />}
      {tab === "visitas"       && <VisitasTab residenteId={id} />}
    </div>
  );
}

function QuickStat({ label, value, sub, tone, capitalize, truncate }) {
  return (
    <div className={`rounded-xl border bg-white px-3 py-2.5 ${tone || "border-slate-100"}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
        {label}
      </div>
      <div
        className={`text-sm font-semibold text-slate-800 ${capitalize ? "capitalize" : ""} ${
          truncate ? "truncate" : ""
        }`}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Info Tab ──────────────────────────────────────────────── */

function InfoTab({ resident }) {
  const allergies = getAllergySummary(resident.alergias);
  const InfoRow = ({ label, value }) =>
    value ? (
      <div>
        <dt className="text-xs text-slate-400 uppercase tracking-wide">{label}</dt>
        <dd className="text-sm text-slate-700 mt-0.5">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">Datos Personales</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow
            label="Fecha nacimiento"
            value={
              resident.fecha_nacimiento
                ? new Date(resident.fecha_nacimiento + "T12:00:00").toLocaleDateString("es-CL")
                : null
            }
          />
          <InfoRow label="Sexo"            value={resident.sexo} />
          <InfoRow label="Nacionalidad"    value={resident.nacionalidad} />
          <InfoRow label="Estado civil"    value={resident.estado_civil} />
          <InfoRow label="Previsión"       value={resident.prevision} />
          <InfoRow label="Grupo sanguíneo" value={resident.grupo_sanguineo} />
        </dl>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">Información Clínica</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Diagnóstico principal" value={resident.diagnostico_principal} />
          <InfoRow label="Nivel de dependencia"  value={resident.nivel_dependencia} />
          <InfoRow
            label="Índice de Barthel"
            value={resident.indice_barthel != null ? `${resident.indice_barthel}/100` : null}
          />
          <InfoRow label="Escala Katz" value={resident.escala_katz} />
          {(allergies.hasRealAllergies || allergies.hasExplicitNoKnownAllergies) && (
            <div>
              <dt className="text-xs text-slate-400 uppercase tracking-wide">Alergias</dt>
              <dd className="flex flex-wrap gap-1 mt-1">
                {allergies.hasRealAllergies ? allergies.items.map((a) => (
                  <span key={a} className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
                    {a}
                  </span>
                )) : (
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                    {allergies.label}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">Contacto de Emergencia</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Nombre"           value={resident.nombre_contacto} />
          <InfoRow label="Parentesco"       value={resident.parentesco_contacto} />
          <InfoRow label="Teléfono"         value={resident.telefono_contacto} />
          <InfoRow label="Dirección anterior" value={resident.direccion_anterior} />
        </dl>
      </section>

      {(resident.estado === "egresado" || resident.estado === "fallecido") &&
        resident.fecha_egreso && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-700 mb-4 border-b border-slate-100 pb-2">Egreso</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                label="Fecha de egreso"
                value={new Date(resident.fecha_egreso + "T12:00:00").toLocaleDateString("es-CL")}
              />
              <InfoRow label="Motivo de egreso" value={resident.motivo_egreso} />
            </dl>
          </section>
        )}
    </div>
  );
}

/* ─── Signos Vitales Tab (lazy-loaded) ──────────────────────── */

function SignosTab({ residenteId, navigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const loaded                = useRef(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getVitalSigns(residenteId, { limit: 5 })
      .then((d) => { setRecords(d); loaded.current = true; })
      .catch(() => setError("No se pudo cargar los signos vitales."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loaded.current) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenteId]);

  if (loading) return <Loading message="Cargando signos vitales..." />;

  const latest = records[0];
  const overall = latest ? recordOverallLabel(latest) : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700">Signos vitales recientes</h3>
        <div className="flex gap-3">
          <button type="button"
 onClick={load} className="text-xs text-slate-500 hover:text-slate-700 underline">
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => navigate(`/vital-signs?residenteId=${residenteId}`)}
            className="text-xs text-teal-700 hover:underline"
          >
            Ver todos →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 mb-3">No hay registros de signos vitales.</p>
          <button
            type="button"
            onClick={() => navigate(`/vital-signs/new?residenteId=${residenteId}`)}
            className="text-sm bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800"
          >
            Registrar ahora
          </button>
        </div>
      ) : (
        <>
          {/* Snapshot del último registro con tarjetas grandes */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Último registro</div>
                <div className="text-sm font-medium text-slate-700">
                  {new Date(latest.fecha_hora).toLocaleString("es-CL", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                  {latest.turno && (
                    <span className="ml-2 text-slate-400 capitalize">· Turno {latest.turno}</span>
                  )}
                </div>
              </div>
              {overall && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS[overall.status].badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS[overall.status].dot}`} />
                  {overall.label}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
              <VitalCard
                icon={VITAL_DEFS.presion.icon}
                label={VITAL_DEFS.presion.label}
                value={VITAL_DEFS.presion.format(latest.presion_sistolica, latest.presion_diastolica)}
                unit={VITAL_DEFS.presion.unit}
                status={VITAL_DEFS.presion.statusFor(latest)}
                normal={VITAL_DEFS.presion.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.fc.icon}
                label={VITAL_DEFS.fc.label}
                value={VITAL_DEFS.fc.format(latest.frecuencia_cardiaca)}
                unit={VITAL_DEFS.fc.unit}
                status={VITAL_DEFS.fc.statusFor(latest)}
                normal={VITAL_DEFS.fc.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.fr.icon}
                label={VITAL_DEFS.fr.label}
                value={VITAL_DEFS.fr.format(latest.frecuencia_respiratoria)}
                unit={VITAL_DEFS.fr.unit}
                status={VITAL_DEFS.fr.statusFor(latest)}
                normal={VITAL_DEFS.fr.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.temp.icon}
                label={VITAL_DEFS.temp.label}
                value={VITAL_DEFS.temp.format(latest.temperatura)}
                status={VITAL_DEFS.temp.statusFor(latest)}
                normal={VITAL_DEFS.temp.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.spo2.icon}
                label={VITAL_DEFS.spo2.label}
                value={VITAL_DEFS.spo2.format(latest.saturacion_oxigeno)}
                status={VITAL_DEFS.spo2.statusFor(latest)}
                normal={VITAL_DEFS.spo2.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.glucosa.icon}
                label={VITAL_DEFS.glucosa.label}
                value={VITAL_DEFS.glucosa.format(latest.glucosa)}
                unit={VITAL_DEFS.glucosa.unit}
                status={VITAL_DEFS.glucosa.statusFor(latest)}
                normal={VITAL_DEFS.glucosa.normal}
              />
              <VitalCard
                icon={VITAL_DEFS.dolor.icon}
                label={VITAL_DEFS.dolor.label}
                value={VITAL_DEFS.dolor.format(latest.dolor_escala)}
                status={VITAL_DEFS.dolor.statusFor(latest)}
                normal={VITAL_DEFS.dolor.normal}
              />
            </div>
          </section>

          {/* Histórico breve */}
          {records.length > 1 && (
            <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                Registros anteriores
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Fecha/Hora</th>
                      <th className="px-3 py-2.5 text-center">P/A</th>
                      <th className="px-3 py-2.5 text-center">FC</th>
                      <th className="px-3 py-2.5 text-center">Temp</th>
                      <th className="px-3 py-2.5 text-center">SatO₂</th>
                      <th className="px-3 py-2.5 text-center">Dolor</th>
                      <th className="px-3 py-2.5 text-center">Turno</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.slice(1).map((r) => (
                      <HistoryRow key={r.id} r={r} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function HistoryRow({ r }) {
  const cellTone = (status) => {
    const s = STATUS[status];
    if (status === "critical") return `font-semibold ${s.text}`;
    if (status === "warning") return `font-medium ${s.text}`;
    if (status === "unknown") return "text-slate-300";
    return "text-slate-700";
  };
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2.5 text-slate-600">
        {new Date(r.fecha_hora).toLocaleString("es-CL", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.presion.statusFor(r))}`}>
        {VITAL_DEFS.presion.format(r.presion_sistolica, r.presion_diastolica)}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.fc.statusFor(r))}`}>
        {VITAL_DEFS.fc.format(r.frecuencia_cardiaca)}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.temp.statusFor(r))}`}>
        {VITAL_DEFS.temp.format(r.temperatura)}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.spo2.statusFor(r))}`}>
        {VITAL_DEFS.spo2.format(r.saturacion_oxigeno)}
      </td>
      <td className={`px-3 py-2.5 text-center tabular-nums ${cellTone(VITAL_DEFS.dolor.statusFor(r))}`}>
        {VITAL_DEFS.dolor.format(r.dolor_escala)}
      </td>
      <td className="px-3 py-2.5 text-center capitalize text-slate-400">{r.turno ?? "—"}</td>
    </tr>
  );
}

/* ─── Observaciones Tab (lazy-loaded) ───────────────────────── */

function ObservacionesTab({ residenteId, navigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const loaded                = useRef(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getObservations(residenteId, { limit: 5 })
      .then((d) => { setRecords(d); loaded.current = true; })
      .catch(() => setError("No se pudo cargar las observaciones."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loaded.current) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenteId]);

  if (loading) return <Loading message="Cargando observaciones..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-700">Últimas 5 observaciones</h3>
        <div className="flex gap-2">
          <button type="button"
 onClick={load} className="text-xs text-slate-500 hover:text-slate-700 underline">
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => navigate(`/observations?residenteId=${residenteId}`)}
            className="text-xs text-teal-700 hover:underline"
          >
            Ver todas →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 mb-3">No hay observaciones registradas.</p>
          <button
            type="button"
            onClick={() => navigate(`/observations/new?residenteId=${residenteId}`)}
            className="text-sm bg-teal-700 text-white px-4 py-2 rounded-xl hover:bg-teal-800"
          >
            Nueva observación
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-slate-100 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    TIPO_BADGE[r.tipo] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {TIPO_LABEL[r.tipo] ?? r.tipo}
                </span>
                {r.requiere_seguimiento && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                    {formatFollowUpLabel(r)}
                  </span>
                )}
                <span className="text-xs text-slate-400 capitalize">{r.turno}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {new Date(r.fecha_hora).toLocaleString("es-CL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-700">{r.descripcion}</p>
              {r.acciones_tomadas && (
                <p className="text-xs text-slate-400 italic mt-1">
                  Acciones: {r.acciones_tomadas}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Visitas Tab (staff: validate entry & exit) ────────────── */

const VF_STATUS = {
  pendiente:  { label: "Esperando validación", pill: "bg-amber-100 text-amber-800",    dot: "bg-amber-400 animate-pulse" },
  activa:     { label: "En visita",            pill: "bg-teal-100 text-teal-800",      dot: "bg-teal-500 animate-pulse" },
  completada: { label: "Completada",           pill: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500" },
  cancelada:  { label: "Cancelada",            pill: "bg-slate-100 text-slate-500",    dot: "bg-slate-300" },
};

function VisitasTab({ residenteId }) {
  const toast = useToast();
  const [visitas, setVisitas]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [busyId, setBusyId]         = useState(null);
  const [exitModal, setExitModal]   = useState(null);
  const [exitNotes, setExitNotes]   = useState("");
  const [logModal, setLogModal]     = useState(false);
  const [logForm, setLogForm]       = useState({ notas: "" });
  const loaded                      = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getVisits(residenteId, 50);
      setVisitas(data);
      loaded.current = true;
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [residenteId]);

  useEffect(() => {
    if (loaded.current) return;
    load();
  }, [load]);

  const doValidateEntry = async (visitId) => {
    setBusyId(visitId);
    try {
      const updated = await validateVisitEntry(visitId);
      setVisitas((prev) => prev.map((v) => v.id === visitId ? { ...v, ...updated } : v));
      toast("Ingreso validado correctamente.", "success");
    } catch {
      toast("No se pudo validar el ingreso.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doRegisterExit = async () => {
    if (!exitModal) return;
    setBusyId(exitModal.id);
    try {
      const updated = await registerVisitExit({ visitId: exitModal.id, notas: exitNotes });
      setVisitas((prev) => prev.map((v) => v.id === exitModal.id ? { ...v, ...updated } : v));
      toast("Salida registrada.", "success");
      setExitModal(null);
      setExitNotes("");
    } catch {
      toast("No se pudo registrar la salida.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doLogVisit = async () => {
    setBusyId("log");
    try {
      const created = await logVisit({ residenteId, notas: logForm.notas });
      setVisitas((prev) => [created, ...prev]);
      toast("Visita registrada.", "success");
      setLogModal(false);
      setLogForm({ notas: "" });
    } catch {
      toast("No se pudo registrar la visita.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doCancel = async (visitId) => {
    setBusyId(visitId);
    try {
      const updated = await cancelVisit(visitId);
      setVisitas((prev) => prev.map((v) => v.id === visitId ? { ...v, ...updated } : v));
      toast("Visita cancelada.", "success");
    } catch {
      toast("No se pudo cancelar.", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading message="Cargando visitas..." />;

  const pending  = visitas.filter((v) => v.estado === "pendiente");
  const active   = visitas.filter((v) => v.estado === "activa");
  const history  = visitas.filter((v) => !["pendiente", "activa"].includes(v.estado));

  return (
    <div className="space-y-5">
      {/* Header with manual log button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Registro de visitas</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {pending.length > 0 && `${pending.length} esperando validación · `}
            {active.length > 0 && `${active.length} en curso · `}
            {visitas.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setLogModal(true)}
            className="rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
          >
            + Registrar visita
          </button>
        </div>
      </div>

      {/* Pending visits — need entry validation */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Esperando validación de ingreso
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((v) => (
              <div key={v.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {v.profiles?.nombre ?? "Familiar"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Anunció llegada: {formatDateTime(v.fecha_hora)}
                  </p>
                  {v.notas && <p className="text-xs text-slate-500 italic mt-0.5">{v.notas}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => doValidateEntry(v.id)}
                    disabled={busyId === v.id}
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    {busyId === v.id ? "..." : "Validar ingreso"}
                  </button>
                  <button
                    type="button"
                    onClick={() => doCancel(v.id)}
                    disabled={busyId === v.id}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active visits — need exit registration */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 border border-teal-200 px-2.5 py-1 text-xs font-semibold text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              En visita ahora
            </span>
          </div>
          <div className="space-y-2">
            {active.map((v) => (
              <div key={v.id} className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {v.profiles?.nombre ?? "Familiar"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ingresó: {formatDateTime(v.fecha_hora)}
                    {v.validado_en && ` · Validado: ${formatDateTime(v.validado_en)}`}
                  </p>
                  {v.notas && <p className="text-xs text-slate-500 italic mt-0.5">{v.notas}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setExitModal(v)}
                  disabled={!!busyId}
                  className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  Registrar salida
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Visit history */}
      {history.length > 0 && (
        <section className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Historial
          </div>
          <ul className="divide-y divide-slate-100">
            {history.map((v) => {
              const st = VF_STATUS[v.estado] ?? VF_STATUS.completada;
              return (
                <li key={v.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="pt-1.5 shrink-0">
                    <span className={`block h-2.5 w-2.5 rounded-full ${st.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">
                        {v.profiles?.nombre ?? "Familiar"}
                      </p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.pill}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-slate-400">
                      <span>{formatDateTime(v.fecha_hora)}</span>
                      {v.duracion_min && <span>{v.duracion_min} min</span>}
                      {v.salida_hora && <span>Salida: {formatDateTime(v.salida_hora)}</span>}
                    </div>
                    {v.notas && <p className="text-xs text-slate-400 italic mt-0.5">{v.notas}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {visitas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-sm text-slate-500">Sin visitas registradas para este residente.</p>
        </div>
      )}

      {/* Exit registration modal */}
      {exitModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-800">Registrar salida</h3>
            <p className="text-sm text-slate-600">
              <span className="font-medium">{exitModal.profiles?.nombre ?? "Familiar"}</span>
              <span className="text-slate-400"> · ingresó {formatDateTime(exitModal.fecha_hora)}</span>
            </p>
            <div>
              <label htmlFor="exit-notes" className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                Notas (opcional)
              </label>
              <textarea
                id="exit-notes"
                rows={2}
                value={exitNotes}
                onChange={(e) => setExitNotes(e.target.value)}
                placeholder="Observaciones sobre la visita..."
                className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setExitModal(null); setExitNotes(""); }}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doRegisterExit}
                disabled={!!busyId}
                className="flex-1 rounded-xl bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {busyId ? "Guardando..." : "Confirmar salida"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual log modal */}
      {logModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-800">Registrar visita completada</h3>
            <p className="text-sm text-slate-500">
              Registra una visita que ya ocurrió. La hora de entrada y salida se guardan como ahora.
            </p>
            <div>
              <label htmlFor="log-notes" className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                Notas (opcional)
              </label>
              <textarea
                id="log-notes"
                rows={2}
                value={logForm.notas}
                onChange={(e) => setLogForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Familiar visitó al residente..."
                className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setLogModal(false); setLogForm({ notas: "" }); }}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doLogVisit}
                disabled={busyId === "log"}
                className="flex-1 rounded-xl bg-teal-700 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {busyId === "log" ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tareas de hoy Tab (lazy-loaded) ───────────────────────── */

const PRIORITY_DOT = {
  alta:  "bg-rose-500",
  media: "bg-amber-400",
  baja:  "bg-slate-300",
};

const TASK_STATUS_STYLE = {
  pendiente:    { pill: "bg-amber-100 text-amber-800",    label: "Pendiente" },
  cumplida:     { pill: "bg-emerald-100 text-emerald-800", label: "Cumplida" },
  omitida:      { pill: "bg-rose-100 text-rose-700",      label: "Omitida" },
  reprogramada: { pill: "bg-sky-100 text-sky-700",        label: "Reprogramada" },
  cancelada:    { pill: "bg-slate-100 text-slate-500",    label: "Cancelada" },
};

const TURNO_LABEL = { mañana: "Mañana", tarde: "Tarde", noche: "Noche" };
const TURNO_COLOR = {
  mañana: "bg-amber-50 border-amber-200 text-amber-800",
  tarde:  "bg-sky-50 border-sky-200 text-sky-800",
  noche:  "bg-violet-50 border-violet-200 text-violet-800",
};

function TareasTab({ residenteId }) {
  const { can } = useAuth();
  const canComplete = can("completar_tareas_cuidado");

  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [busyId, setBusyId]         = useState(null);
  const [omitTask, setOmitTask]     = useState(null);
  const [omitReason, setOmitReason] = useState("rechazo");
  const [omitNotes, setOmitNotes]   = useState("");
  const loaded = useRef(false);

  const today = todayIso();
  const turno = currentTurno();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await listCareTasks({ residenteId, fecha: today, generate: true });
      setTasks(data);
      loaded.current = true;
    } catch {
      setError("No se pudieron cargar las tareas del día.");
    } finally {
      setLoading(false);
    }
  }, [residenteId, today]);

  useEffect(() => {
    if (loaded.current) return;
    load();
  }, [load]);

  const doComplete = async (taskId) => {
    setBusyId(taskId);
    try {
      await completeCareTask({ id: taskId, estado: "cumplida" });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, estado: "cumplida" } : t));
    } finally {
      setBusyId(null);
    }
  };

  const doOmit = async () => {
    if (!omitTask) return;
    setBusyId(omitTask.id);
    try {
      await completeCareTask({
        id: omitTask.id,
        estado: "omitida",
        motivoOmision: omitReason,
        notas: omitNotes.trim() || null,
      });
      setTasks((prev) => prev.map((t) => t.id === omitTask.id ? { ...t, estado: "omitida" } : t));
      setOmitTask(null);
      setOmitNotes("");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading message="Cargando tareas del día..." />;

  if (error) return (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
      <span>{error}</span>
      <button type="button" onClick={() => load()} className="underline text-xs ml-auto">Reintentar</button>
    </div>
  );

  const carryOver  = tasks.filter((t) => t._arrastre);
  const todayTasks = tasks.filter((t) => !t._arrastre);
  const byTurno    = { mañana: [], tarde: [], noche: [] };
  for (const t of todayTasks) {
    if (byTurno[t.turno]) byTurno[t.turno].push(t);
  }

  const total   = tasks.length;
  const done    = tasks.filter((t) => t.estado === "cumplida").length;
  const omitted = tasks.filter((t) => t.estado === "omitida").length;
  const pending = tasks.filter((t) => t.estado === "pendiente").length;

  if (total === 0) return (
    <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-600">Sin tareas programadas para hoy</p>
      <p className="text-xs text-slate-400 mt-1">Configura el plan de cuidado en la pestaña "Plan de cuidado"</p>
    </div>
  );

  const progress = Math.round(((done + omitted) / total) * 100);

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">Progreso del día</p>
            <p className="text-sm font-semibold text-slate-700 capitalize">
              Turno actual: {TURNO_LABEL[turno]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-700">{progress}%</p>
            <p className="text-xs text-slate-400">{done + omitted} de {total} completadas</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
          <div
            className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-4 text-xs flex-wrap">
          <span className="flex items-center gap-1 text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {pending} pendiente{pending !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {done} cumplida{done !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 text-rose-600">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            {omitted} omitida{omitted !== 1 ? "s" : ""}
          </span>
          <button type="button" onClick={() => load(true)} className="ml-auto text-slate-400 hover:text-slate-600 underline">
            Actualizar
          </button>
        </div>
      </div>

      {/* Carry-over tasks */}
      {carryOver.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Arrastre de turnos anteriores
            </span>
          </div>
          <div className="space-y-2">
            {carryOver.map((task) => (
              <TareaCard
                key={task.id}
                task={task}
                canComplete={canComplete}
                busyId={busyId}
                onComplete={doComplete}
                onOmit={setOmitTask}
                isCarryOver
              />
            ))}
          </div>
        </section>
      )}

      {/* Tasks grouped by turno */}
      {["mañana", "tarde", "noche"].map((t) => {
        const list = byTurno[t];
        if (list.length === 0) return null;
        const isCurrent = t === turno;
        return (
          <section key={t}>
            <div className={`inline-flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${TURNO_COLOR[t]} ${isCurrent ? "ring-2 ring-offset-1 ring-teal-400" : ""}`}>
              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />}
              {TURNO_LABEL[t]}
              {isCurrent && <span className="font-normal opacity-75">(turno actual)</span>}
            </div>
            <div className="space-y-2">
              {list.map((task) => (
                <TareaCard
                  key={task.id}
                  task={task}
                  canComplete={canComplete}
                  busyId={busyId}
                  onComplete={doComplete}
                  onOmit={setOmitTask}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Omit confirmation sheet */}
      {omitTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-800">Omitir tarea</h3>
            <p className="text-sm text-slate-600 font-medium">{omitTask.actividad?.titulo}</p>
            <div>
              <label htmlFor="omit-reason" className="text-xs text-slate-500 uppercase tracking-wide block mb-1">
                Motivo de omisión
              </label>
              <select
                id="omit-reason"
                value={omitReason}
                onChange={(e) => setOmitReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {OMISSION_REASONS.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="omit-notes" className="text-xs text-slate-500 uppercase tracking-wide block mb-1">
                Notas adicionales (opcional)
              </label>
              <textarea
                id="omit-notes"
                rows={2}
                value={omitNotes}
                onChange={(e) => setOmitNotes(e.target.value)}
                placeholder="Detalles relevantes..."
                className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setOmitTask(null); setOmitNotes(""); }}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doOmit}
                disabled={!!busyId}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busyId ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TareaCard({ task, canComplete, busyId, onComplete, onOmit, isCarryOver }) {
  const status   = TASK_STATUS_STYLE[task.estado] ?? { pill: "bg-slate-100 text-slate-500", label: task.estado };
  const priority = task.actividad?.prioridad;
  const isBusy   = busyId === task.id;
  const isPending = task.estado === "pendiente";

  return (
    <div className={`bg-white rounded-xl border px-4 py-3 flex gap-3 ${isCarryOver ? "border-rose-200 bg-rose-50/30" : "border-slate-100"}`}>
      <div className="pt-1.5 shrink-0">
        <span
          className={`block w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[priority] ?? "bg-slate-200"}`}
          title={priority ? `Prioridad ${priority}` : ""}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-800 leading-snug flex-1">
            {task.actividad?.titulo ?? "Tarea"}
          </span>
          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.pill}`}>
            {status.label}
          </span>
        </div>

        {task.actividad?.instrucciones && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{task.actividad.instrucciones}</p>
        )}

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {task.hora && (
            <span className="text-xs text-slate-400">{task.hora.slice(0, 5)}</span>
          )}
          {CARE_CATEGORY_LABEL[task.actividad?.categoria] && (
            <span className="text-xs text-slate-400">{CARE_CATEGORY_LABEL[task.actividad.categoria]}</span>
          )}
          {task.motivo_omision && (
            <span className="text-xs text-rose-500 italic">
              {OMISSION_REASONS.find(([v]) => v === task.motivo_omision)?.[1] ?? task.motivo_omision}
            </span>
          )}
        </div>
      </div>

      {canComplete && isPending ? (
        <div className="shrink-0 flex flex-col gap-1.5 ml-1">
          <button
            type="button"
            onClick={() => onComplete(task.id)}
            disabled={isBusy}
            className="rounded-lg bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {isBusy ? "..." : "Cumplir"}
          </button>
          <button
            type="button"
            onClick={() => onOmit(task)}
            disabled={isBusy}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Omitir
          </button>
        </div>
      ) : task.estado === "cumplida" ? (
        <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 ml-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4 text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

export default ResidentDetails;
