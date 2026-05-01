import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getResidentById } from "./residentService";
import { getVitalSigns } from "../vitalSigns/vitalSignsService";
import { getObservations } from "../observations/observationsService";
import { isValidUUID } from "../../utils/validators";
import Loading from "../../components/Loading";
import Button from "../../components/Button";
import VitalCard from "../vitalSigns/VitalCard";
import {
  VITAL_DEFS,
  STATUS,
  recordOverallLabel,
} from "../vitalSigns/vitalRanges";

const ESTADO_BADGE = {
  activo:        "bg-emerald-100 text-emerald-800 border border-emerald-200",
  hospitalizado: "bg-amber-100 text-amber-800 border border-amber-200",
  egresado:      "bg-gray-100 text-gray-700 border border-gray-200",
  fallecido:     "bg-rose-100 text-rose-800 border border-rose-200",
};

const DEPENDENCIA_TONE = {
  leve:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderado: "bg-amber-50 text-amber-700 border-amber-200",
  severo:   "bg-orange-50 text-orange-700 border-orange-200",
  total:    "bg-rose-50 text-rose-700 border-rose-200",
};

const TIPO_LABEL = {
  observacion_general: "General", caida: "Caída", incidente: "Incidente",
  curacion: "Curación", visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento", cambio_posicion: "Cambio posición",
  higiene: "Higiene", alimentacion: "Alimentación", eliminacion: "Eliminación",
  actividad: "Actividad", otro: "Otro",
};

const TIPO_BADGE = {
  caida:                      "bg-rose-100 text-rose-700",
  incidente:                  "bg-orange-100 text-orange-700",
  visita_medica:              "bg-blue-100 text-blue-700",
  curacion:                   "bg-purple-100 text-purple-700",
  administracion_medicamento: "bg-amber-100 text-amber-700",
  observacion_general:        "bg-gray-100 text-gray-700",
};

function initials(nombre = "", apellido = "") {
  return ((nombre[0] || "") + (apellido[0] || "")).toUpperCase() || "?";
}

function calcAge(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const fn = new Date(fechaNacimiento);
  if (isNaN(fn)) return null;
  const today = new Date();
  let age = today.getFullYear() - fn.getFullYear();
  const m = today.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < fn.getDate())) age--;
  return age;
}

function daysSince(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function ResidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  if (error)   return <div className="p-8 text-red-600">{error}</div>;
  if (!resident) return <div className="p-8 text-gray-500">Residente no encontrado.</div>;

  const age = calcAge(resident.fecha_nacimiento);
  const stayDays = daysSince(resident.fecha_ingreso);

  const tabs = [
    { id: "info",          label: "Información" },
    { id: "signos",        label: "Signos Vitales" },
    { id: "observaciones", label: "Observaciones" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate("/residents")}
        className="text-[var(--color-primary)] hover:underline text-sm mb-4 inline-flex items-center gap-1"
      >
        ← Volver a residentes
      </button>

      {/* Header card — moderno con avatar, datos clave y acciones */}
      <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="h-20 bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-accent)]" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-[var(--color-primary)] shadow-md ring-4 ring-white">
              {initials(resident.nombre, resident.apellido)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-800 truncate">
                  {resident.nombre} {resident.apellido}
                </h1>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
                    ESTADO_BADGE[resident.estado] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {resident.estado}
                </span>
              </div>
              <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {age != null && <span>{age} años</span>}
                {resident.sexo && <span className="capitalize">{resident.sexo}</span>}
                {resident.rut && <span>RUT: {resident.rut}</span>}
                {resident.habitacion && (
                  <span>
                    🛏️ Hab. {resident.habitacion}
                    {resident.cama ? ` · Cama ${resident.cama}` : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => navigate(`/residents/${id}/edit`)}
                className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)] text-sm shadow-sm"
              >
                Editar
              </Button>
              <Button
                onClick={() => navigate(`/vital-signs/new?residenteId=${id}`)}
                className="bg-white text-[var(--color-primary)] border border-[var(--color-primary)] px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                + Signos
              </Button>
              <Button
                onClick={() => navigate(`/observations/new?residenteId=${id}`)}
                className="bg-white text-[var(--color-primary)] border border-[var(--color-primary)] px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                + Observación
              </Button>
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

          {resident.alergias?.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <span aria-hidden className="text-rose-500">⚠️</span>
              <div className="text-sm text-rose-700">
                <span className="font-semibold">Alergias:</span>{" "}
                {resident.alergias.join(", ")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info"          && <InfoTab resident={resident} />}
      {tab === "signos"        && <SignosTab residenteId={id} navigate={navigate} />}
      {tab === "observaciones" && <ObservacionesTab residenteId={id} navigate={navigate} />}
    </div>
  );
}

function QuickStat({ label, value, sub, tone, capitalize, truncate }) {
  return (
    <div className={`rounded-xl border bg-white px-3 py-2.5 ${tone || "border-gray-100"}`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
        {label}
      </div>
      <div
        className={`text-sm font-semibold text-gray-800 ${capitalize ? "capitalize" : ""} ${
          truncate ? "truncate" : ""
        }`}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Info Tab ──────────────────────────────────────────────── */

function InfoTab({ resident }) {
  const InfoRow = ({ label, value }) =>
    value ? (
      <div>
        <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
        <dd className="text-sm text-gray-700 mt-0.5">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Datos Personales</h3>
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

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Información Clínica</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Diagnóstico principal" value={resident.diagnostico_principal} />
          <InfoRow label="Nivel de dependencia"  value={resident.nivel_dependencia} />
          <InfoRow
            label="Índice de Barthel"
            value={resident.indice_barthel != null ? `${resident.indice_barthel}/100` : null}
          />
          <InfoRow label="Escala Katz" value={resident.escala_katz} />
          {resident.alergias?.length > 0 && (
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Alergias</dt>
              <dd className="flex flex-wrap gap-1 mt-1">
                {resident.alergias.map((a) => (
                  <span key={a} className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
                    {a}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Contacto de Emergencia</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Nombre"           value={resident.nombre_contacto} />
          <InfoRow label="Parentesco"       value={resident.parentesco_contacto} />
          <InfoRow label="Teléfono"         value={resident.telefono_contacto} />
          <InfoRow label="Dirección anterior" value={resident.direccion_anterior} />
        </dl>
      </section>

      {(resident.estado === "egresado" || resident.estado === "fallecido") &&
        resident.fecha_egreso && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-700 mb-4 border-b pb-2">Egreso</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                label="Fecha de egreso"
                value={new Date(resident.fecha_egreso).toLocaleDateString("es-CL")}
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
        <h3 className="font-semibold text-gray-700">Signos vitales recientes</h3>
        <div className="flex gap-3">
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Actualizar
          </button>
          <button
            onClick={() => navigate(`/vital-signs?residenteId=${residenteId}`)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Ver todos →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm mb-3">No hay registros de signos vitales.</p>
          <button
            onClick={() => navigate(`/vital-signs/new?residenteId=${residenteId}`)}
            className="text-sm bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
          >
            Registrar ahora
          </button>
        </div>
      ) : (
        <>
          {/* Snapshot del último registro con tarjetas grandes */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400">Último registro</div>
                <div className="text-sm font-medium text-gray-700">
                  {new Date(latest.fecha_hora).toLocaleString("es-CL", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                  {latest.turno && (
                    <span className="ml-2 text-gray-400 capitalize">· Turno {latest.turno}</span>
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
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                Registros anteriores
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
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
                  <tbody className="divide-y divide-gray-100">
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
    if (status === "unknown") return "text-gray-300";
    return "text-gray-700";
  };
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2.5 text-gray-600">
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
      <td className="px-3 py-2.5 text-center capitalize text-gray-400">{r.turno ?? "—"}</td>
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
        <h3 className="font-semibold text-gray-700">Últimas 5 observaciones</h3>
        <div className="flex gap-2">
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Actualizar
          </button>
          <button
            onClick={() => navigate(`/observations?residenteId=${residenteId}`)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Ver todas →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm mb-3">No hay observaciones registradas.</p>
          <button
            onClick={() => navigate(`/observations/new?residenteId=${residenteId}`)}
            className="text-sm bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-button-hover)]"
          >
            Nueva observación
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-lg border border-gray-100 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    TIPO_BADGE[r.tipo] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {TIPO_LABEL[r.tipo] ?? r.tipo}
                </span>
                {r.requiere_seguimiento && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    ⚠ Seguimiento
                  </span>
                )}
                <span className="text-xs text-gray-400 capitalize">{r.turno}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(r.fecha_hora).toLocaleString("es-CL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-700">{r.descripcion}</p>
              {r.acciones_tomadas && (
                <p className="text-xs text-gray-400 italic mt-1">
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

export default ResidentDetails;
