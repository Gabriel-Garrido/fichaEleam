import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";
import { formatDateTime, formatRelativeDays } from "../../utils/dateUtils";
import { TIPO_LABEL, calcAge } from "../residents/residentUtils";
import { VITAL_DEFS, recordOverallStatus, STATUS } from "../vitalSigns/vitalRanges";
import { summarizeFamilySnapshot } from "./familiarUtils";
import { useFamiliarResidentData } from "./useFamiliarResidentData";
import {
  IconChat,
  IconCheck,
  IconClipboard,
  IconHeart,
  IconPill,
  IconUsers,
} from "./portalIcons";

/* ─── Visit status helpers ───────────────────────────────────── */
const VISIT_STATUS = {
  pendiente:  { label: "Esperando validación", pill: "bg-amber-100 text-amber-800",   dot: "bg-amber-400" },
  activa:     { label: "En visita",            pill: "bg-teal-100 text-teal-800",     dot: "bg-teal-500 animate-pulse" },
  salida_pendiente: { label: "Salida por validar", pill: "bg-sky-100 text-sky-800",   dot: "bg-sky-500 animate-pulse" },
  completada: { label: "Completada",           pill: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  cancelada:  { label: "Cancelada",            pill: "bg-slate-100 text-slate-500",   dot: "bg-slate-300" },
};

const CARE_STATUS = {
  cumplida:     { label: "Cumplida",    color: "text-emerald-700 bg-emerald-50" },
  pendiente:    { label: "Pendiente",   color: "text-amber-700 bg-amber-50" },
  omitida:      { label: "Omitida",     color: "text-rose-600 bg-rose-50" },
  reprogramada: { label: "Reprogramada",color: "text-sky-700 bg-sky-50" },
  cancelada:    { label: "Cancelada",   color: "text-slate-500 bg-slate-50" },
};

const MED_STATUS = {
  administrado: { label: "Administrado", color: "text-emerald-700 bg-emerald-50" },
  validado:     { label: "Confirmado",   color: "text-teal-700 bg-teal-50" },
  pendiente:    { label: "Pendiente",    color: "text-amber-700 bg-amber-50" },
  pendiente_validacion: { label: "En revisión", color: "text-sky-700 bg-sky-50" },
  omitido:      { label: "No administrado", color: "text-rose-600 bg-rose-50" },
};

const CATEGORIA_META = {
  alimentacion:      { label: "Alimentación",       tone: "teal" },
  hidratacion:       { label: "Hidratación",         tone: "teal" },
  higiene:           { label: "Higiene",             tone: "sky" },
  bano:              { label: "Baño",                tone: "sky" },
  movilidad:         { label: "Movilidad",           tone: "violet" },
  cambios_posicion:  { label: "Cambios posición",    tone: "violet" },
  eliminacion:       { label: "Eliminación",         tone: "slate" },
  prevencion_caidas: { label: "Prev. caídas",        tone: "amber" },
  prevencion_up:     { label: "Prev. úlceras",       tone: "amber" },
  actividad:         { label: "Actividad",           tone: "emerald" },
  controles:         { label: "Controles",           tone: "rose" },
  otro:              { label: "Otro",                tone: "slate" },
};

const CATEGORIA_DOT = {
  teal:    "bg-teal-400",
  sky:     "bg-sky-400",
  violet:  "bg-violet-400",
  slate:   "bg-slate-300",
  amber:   "bg-amber-400",
  emerald: "bg-emerald-400",
  rose:    "bg-rose-400",
};

const OMISSION_LABEL = {
  rechazo:           "Rechazado por el residente",
  no_disponible:     "No disponible en este momento",
  contraindicado:    "Contraindicado clínicamente",
  residente_ausente: "Residente ausente o en traslado",
  otro:              "Omitido por el equipo",
};

const RIESGO_TONE = {
  bajo:  { pill: "bg-emerald-100 text-emerald-700", label: "Bajo" },
  medio: { pill: "bg-amber-100 text-amber-800",    label: "Medio" },
  alto:  { pill: "bg-rose-100 text-rose-700",      label: "Alto" },
};

/* ─── Reusable atoms ─────────────────────────────────────────── */

function SectionCard({ icon, title, badge, badgeColor, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-600">
            {icon}
          </span>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        {badge != null && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor ?? "bg-slate-100 text-slate-600"}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptySection({ message }) {
  return (
    <p className="text-sm text-slate-400 text-center py-4">{message}</p>
  );
}

function formatDateOnlyLabel(value) {
  if (!value) return "hoy";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
}

const CLINICAL_TOOLTIPS = {
  "Dependencia": "Nivel de apoyo que la persona necesita para sus actividades diarias.",
  "Barthel": "Índice de Barthel: escala del 0 al 100 que mide la independencia en actividades básicas. Mayor puntaje = mayor autonomía.",
  "Katz": "Escala de Katz: mide la independencia en 6 actividades básicas (baño, vestido, uso del WC, traslado, continencia, alimentación).",
};

/* ─── Resident selector ──────────────────────────────────────── */
function ResidentSelector({ residentes, activeId, onSelect }) {
  if (residentes.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1">
      {residentes.map((r) => (
        <button
          type="button"
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
            r.id === activeId
              ? "border-teal-700 bg-teal-700 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {r.nombre} {r.apellido}
        </button>
      ))}
    </div>
  );
}

function DateSelector({ value, onChange, loading }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Registros por día</p>
        <p className="text-sm text-slate-500">
          Hoy por defecto. Cambia la fecha para revisar registros de días anteriores.
        </p>
      </div>
      <label className="text-sm font-semibold text-slate-700">
        Fecha
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 sm:w-44"
        />
      </label>
    </section>
  );
}

/* ─── Hero header ────────────────────────────────────────────── */
function ResidentHero({ resident, eleam, onNavigateVisitas }) {
  const age = calcAge(resident?.fecha_nacimiento);
  const initials = `${resident?.nombre?.[0] ?? ""}${resident?.apellido?.[0] ?? ""}`.toUpperCase() || "R";

  const estadoBadge = {
    activo:       "bg-emerald-100 text-emerald-700",
    hospitalizado:"bg-amber-100 text-amber-800",
    egresado:     "bg-slate-100 text-slate-600",
    fallecido:    "bg-slate-100 text-slate-500",
  }[resident?.estado] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-600" />
      <div className="px-5 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 -mt-8">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-xl font-black text-teal-700 shadow-md ring-4 ring-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                {resident?.nombre} {resident?.apellido}
              </h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${estadoBadge}`}>
                {resident?.estado ?? "—"}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
              {age != null && <span>{age} años</span>}
              {resident?.parentesco && <span className="capitalize">{resident.parentesco}</span>}
              {resident?.ubicacion_label && <span>{resident.ubicacion_label}</span>}
              {eleam?.nombre && <span>{eleam.nombre}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateVisitas}
            className="tap-highlight-none w-full sm:w-auto sm:shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 min-h-11 sm:min-h-10 py-2 text-sm font-semibold text-white hover:bg-teal-800 active:bg-teal-900 transition-colors"
          >
            <IconUsers />
            Gestionar visitas
          </button>
        </div>
      </div>
    </div>
  );
}

function ResidentClinicalSummary({ resident, evaluaciones = {} }) {
  const barthelEval = evaluaciones?.barthel;
  const katzEval = evaluaciones?.katz;

  const barthelValue = resident?.indice_barthel != null
    ? `${resident.indice_barthel}/100`
    : null;
  const katzValue = resident?.escala_katz || null;

  const barthelSub = barthelEval?.fecha_evaluacion
    ? `Última evaluación ${formatRelativeDays(barthelEval.fecha_evaluacion)}`
    : null;
  const katzSub = katzEval?.fecha_evaluacion
    ? `Última evaluación ${formatRelativeDays(katzEval.fecha_evaluacion)}`
    : null;

  const rows = [
    ["Ingreso", resident?.fecha_ingreso, null],
    ["Previsión", resident?.prevision, null],
    ["Dependencia", resident?.nivel_dependencia, null],
    ["Barthel", barthelValue, barthelSub],
    ["Katz", katzValue, katzSub],
    ["Diagnóstico principal", resident?.diagnostico_principal, null],
    ["Diagnósticos secundarios", Array.isArray(resident?.diagnosticos_secundarios) ? resident.diagnosticos_secundarios.join(", ") : null, null],
    ["Alergias", Array.isArray(resident?.alergias) ? resident.alergias.join(", ") : null, null],
    ["Grupo sanguíneo", resident?.grupo_sanguineo, null],
  ].filter(([, value]) => value);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Ficha resumida</p>
        <h2 className="text-sm font-bold text-slate-900">Información clínica compartida por el equipo</h2>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value, sub]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400" title={CLINICAL_TOOLTIPS[label]}>{label}</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{value}</dd>
            {sub && <dd className="mt-1 text-[11px] font-normal text-slate-500">{sub}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ─── Care plan summary (family-safe) ───────────────────────── */

function CarePlanSummarySection({ carePlan }) {
  if (!carePlan) return null;
  const hasContent =
    carePlan.objetivos?.trim() ||
    carePlan.pauta_alimentacion?.trim() ||
    carePlan.pauta_hidratacion?.trim() ||
    carePlan.restricciones?.trim() ||
    carePlan.riesgo_caidas ||
    carePlan.riesgo_up;
  if (!hasContent) return null;

  const riesgoCaidas = RIESGO_TONE[carePlan.riesgo_caidas];
  const riesgoUp     = RIESGO_TONE[carePlan.riesgo_up];

  return (
    <SectionCard
      icon={<IconClipboard />}
      title="Plan de cuidado activo"
    >
      <p className="mb-4 text-xs text-slate-400">
        Este resumen fue compartido por el equipo clínico para mantenerte informado del plan de atención de tu familiar.
      </p>
      <div className="space-y-4">
        {carePlan.objetivos?.trim() && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Objetivos del cuidado</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{carePlan.objetivos}</p>
          </div>
        )}
        {(carePlan.pauta_alimentacion?.trim() || carePlan.pauta_hidratacion?.trim()) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {carePlan.pauta_alimentacion?.trim() && (
              <div className="rounded-xl bg-teal-50 border border-teal-100 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-500 mb-1">Alimentación</p>
                <p className="text-sm text-teal-800 leading-relaxed">{carePlan.pauta_alimentacion}</p>
              </div>
            )}
            {carePlan.pauta_hidratacion?.trim() && (
              <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500 mb-1">Hidratación</p>
                <p className="text-sm text-sky-800 leading-relaxed">{carePlan.pauta_hidratacion}</p>
              </div>
            )}
          </div>
        )}
        {carePlan.restricciones?.trim() && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">Alertas y restricciones</p>
            <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">{carePlan.restricciones}</p>
          </div>
        )}
        {(riesgoCaidas || riesgoUp) && (
          <div className="flex flex-wrap gap-2">
            {riesgoCaidas && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${riesgoCaidas.pill}`}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                Riesgo caídas: {riesgoCaidas.label}
              </span>
            )}
            {riesgoUp && (
              <span
                title="Úlceras Por Presión: lesiones en la piel causadas por presión prolongada en residentes con movilidad reducida."
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${riesgoUp.pill}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 7.5l16.5-4.125M12 6.75c-2.708 0-5.363.224-7.948.655C2.906 7.24 1.5 8.973 1.5 10.96v11.25m10.5-11.25c2.708 0 5.363.224 7.948.655C21.094 11.74 22.5 13.473 22.5 15.46v2.54M12 6.75v-.75" />
                </svg>
                Riesgo UPP: {riesgoUp.label}
              </span>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/* ─── Today's summary strip ──────────────────────────────────── */
function DaySummary({ care, medications, selectedDate }) {
  const s = summarizeFamilySnapshot({ care, medications });
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday  = !selectedDate || selectedDate === todayStr;

  const total   = care.length + medications.length;
  const done    = s.careDone + s.medicationsDone;
  const pct     = total > 0 ? Math.round((done / total) * 100) : null;
  const progTone =
    pct === null ? null :
    pct >= 80    ? { bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700" } :
    pct >= 40    ? { bar: "bg-amber-400",   pill: "bg-amber-100 text-amber-800"    } :
                   { bar: "bg-rose-400",    pill: "bg-rose-100 text-rose-700"      };

  const stats = [
    { label: "Cuidados cumplidos",    value: s.careDone,           tone: s.careDone > 0 ? "emerald" : "slate" },
    { label: "Cuidados pendientes",   value: s.carePending,        tone: s.carePending > 0 ? "amber" : "slate" },
    { label: "Medicamentos dados",    value: s.medicationsDone,    tone: s.medicationsDone > 0 ? "teal" : "slate" },
    { label: "Medicamentos pendientes",value: s.medicationsPending, tone: s.medicationsPending > 0 ? "amber" : "slate" },
  ];
  const tones = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber:   "bg-amber-50 border-amber-100 text-amber-800",
    teal:    "bg-teal-50 border-teal-100 text-teal-700",
    slate:   "bg-slate-50 border-slate-100 text-slate-600",
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {isToday ? "Hoy" : formatDateOnlyLabel(selectedDate)}
        </p>
        {progTone && pct !== null && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${progTone.pill}`}>
            {pct}% completado
          </span>
        )}
      </div>
      {progTone && total > 0 && (
        <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${progTone.bar}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 ${tones[s.tone]}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 leading-tight">{s.label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Vitals panel ───────────────────────────────────────────── */
function VitalsSection({ vitals }) {
  const latest = vitals?.[0];
  if (!latest) {
    return (
      <SectionCard icon={<IconHeart />} title="Signos recientes">
        <EmptySection message="El equipo aún no ha registrado controles de salud." />
      </SectionCard>
    );
  }
  const overall = recordOverallStatus(latest);
  const overallStyle = STATUS[overall] ?? STATUS.unknown;

  return (
    <SectionCard
      icon={<IconHeart />}
      title="Signos recientes"
      badge={overallStyle.label}
      badgeColor={overallStyle.badge}
    >
      <p className="text-xs text-slate-400 mb-3">Último control · {formatDateTime(latest.fecha_hora)}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {Object.entries(VITAL_DEFS).map(([key, def]) => {
          const status = def.statusFor(latest);
          const tone = STATUS[status] ?? STATUS.unknown;
          const field = {
            fc: "frecuencia_cardiaca", fr: "frecuencia_respiratoria",
            temp: "temperatura", spo2: "saturacion_oxigeno",
            glucosa: "glucosa", dolor: "dolor_escala",
          }[key] ?? key;
          const value = key === "presion"
            ? def.format(latest.presion_sistolica, latest.presion_diastolica)
            : def.format(latest[field]);
          return (
            <div key={key} className={`rounded-xl border p-3 ring-1 ${tone.ring} bg-white`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">{def.label}</p>
              <p className={`mt-0.5 text-base font-black ${tone.text}`}>
                {value}
                {def.unit && <span className="text-[10px] font-semibold text-slate-400 ml-1">{def.unit}</span>}
              </p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─── Visits summary panel ───────────────────────────────────── */
function VisitsSummarySection({ visits, onNavigateVisitas }) {
  const recentVisits = (visits ?? []).slice(0, 4);
  const hasActive = recentVisits.some((v) => v.estado === "activa");
  const hasExitPending = recentVisits.some((v) => v.estado === "salida_pendiente");
  const hasPending = recentVisits.some((v) => v.estado === "pendiente");

  return (
    <SectionCard
      icon={<IconUsers />}
      title="Visitas"
      badge={hasExitPending ? "Salida pendiente" : hasActive ? "En visita" : hasPending ? "Pendiente" : null}
      badgeColor={hasExitPending ? "bg-sky-100 text-sky-800" : hasActive ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-800"}
    >
      {recentVisits.length === 0 ? (
        <EmptySection message="Aún no tienes visitas registradas." />
      ) : (
        <ul className="divide-y divide-slate-100 -mx-1 px-1">
          {recentVisits.map((v) => {
            const st = VISIT_STATUS[v.estado] ?? VISIT_STATUS.completada;
            return (
              <li key={v.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {formatDateTime(v.fecha_hora)}
                  </p>
                  {v.duracion_min && (
                    <p className="text-xs text-slate-400">{v.duracion_min} min</p>
                  )}
                  {v.salida_anunciada_en && !v.salida_validada_en && (
                    <p className="text-xs text-sky-600">Salida anunciada</p>
                  )}
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.pill}`}>
                  {st.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={onNavigateVisitas}
        className="mt-3 w-full rounded-xl border border-teal-200 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
      >
        Ver historial completo →
      </button>
    </SectionCard>
  );
}

/* ─── Care section ───────────────────────────────────────────── */
const TURNO_LABEL = { mañana: "Mañana", tarde: "Tarde", noche: "Noche" };

function formatCareHour(item) {
  const hour = item?.hora?.slice(0, 5);
  return hour ?? null;
}

function TurnoProgressBar({ items }) {
  const total = items.length;
  const done  = items.filter((i) => i.estado === "cumplida").length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar   = pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : "bg-slate-200";
  const text  = pct === 100 ? "text-emerald-700" : pct > 0 ? "text-amber-700" : "text-slate-400";
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-semibold tabular-nums whitespace-nowrap ${text}`}>
        {done}/{total}
      </span>
    </div>
  );
}

function CareSection({ care }) {
  if (!care?.length) {
    return (
      <SectionCard icon={<IconClipboard />} title="Cuidados de hoy">
        <EmptySection message="El equipo aún no ha compartido cuidados para esta fecha." />
      </SectionCard>
    );
  }
  const done = care.filter((c) => c.estado === "cumplida").length;
  const byTurno = { mañana: [], tarde: [], noche: [] };
  for (const c of care) {
    if (byTurno[c.turno]) byTurno[c.turno].push(c);
    else byTurno["mañana"].push(c);
  }
  return (
    <SectionCard
      icon={<IconClipboard />}
      title="Cuidados de hoy"
      badge={`${done}/${care.length}`}
      badgeColor={done === care.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}
    >
      <div className="space-y-5">
        {(["mañana", "tarde", "noche"]).map((turno) => {
          const items = byTurno[turno];
          if (!items.length) return null;
          return (
            <div key={turno}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {TURNO_LABEL[turno]}
                </p>
              </div>
              <TurnoProgressBar items={items} />
              <ul className="space-y-2">
                {items.map((item) => {
                  const st = CARE_STATUS[item.estado] ?? CARE_STATUS.pendiente;
                  const isDone = item.estado === "cumplida";
                  const isOmitted = item.estado === "omitida";
                  const safeLabel = item.resumen || item.titulo;
                  const catMeta = CATEGORIA_META[item.categoria];
                  const dotColor = catMeta ? CATEGORIA_DOT[catMeta.tone] : CATEGORIA_DOT.slate;
                  const hour = formatCareHour(item);
                  return (
                    <li key={item.id} className={`flex items-start gap-3 rounded-xl p-3 ${isDone ? "bg-emerald-50/60" : isOmitted ? "bg-rose-50/50" : "bg-slate-50"}`}>
                      <div className={`mt-0.5 shrink-0 grid h-5 w-5 place-items-center rounded-full ${isDone ? "bg-emerald-500" : isOmitted ? "bg-rose-200" : "border-2 border-slate-200 bg-white"}`}>
                        {isDone && <span className="text-white"><IconCheck /></span>}
                        {!isDone && !isOmitted && catMeta && (
                          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                          {hour && (
                            <span className="text-[10px] font-semibold uppercase text-slate-400">{hour}</span>
                          )}
                          {catMeta && (
                            <span className="text-[10px] font-semibold text-slate-400">{catMeta.label}</span>
                          )}
                          {item.requiere_seguimiento && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              Seguimiento
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${isDone ? "text-slate-500 line-through" : isOmitted ? "text-slate-400" : "text-slate-800"}`}>
                          {safeLabel}
                        </p>
                        {isOmitted && item.motivo_omision && (
                          <p className="mt-0.5 text-xs text-rose-500">
                            {OMISSION_LABEL[item.motivo_omision] ?? "Omitido por el equipo"}
                          </p>
                        )}
                        {item.estado === "reprogramada" && item.reprogramada_para && (
                          <p className="mt-0.5 text-xs text-sky-600">
                            Nueva hora: {formatDateTime(item.reprogramada_para)}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                        {st.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─── Medications section ────────────────────────────────────── */
function MedicationSection({ medications }) {
  if (!medications?.length) {
    return (
      <SectionCard icon={<IconPill />} title="Medicamentos del día">
        <EmptySection message="El equipo aún no ha publicado medicamentos visibles para la familia en esta fecha." />
      </SectionCard>
    );
  }
  const given = medications.filter((m) => ["administrado", "validado"].includes(m.estado)).length;
  const byTurno = { mañana: [], tarde: [], noche: [] };
  for (const m of medications) {
    if (byTurno[m.turno]) byTurno[m.turno].push(m);
    else byTurno["mañana"].push(m);
  }
  return (
    <SectionCard
      icon={<IconPill />}
      title="Medicamentos del día"
      badge={`${given}/${medications.length}`}
      badgeColor={given === medications.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}
    >
      <div className="space-y-5">
        {(["mañana", "tarde", "noche"]).map((turno) => {
          const items = byTurno[turno];
          if (!items.length) return null;
          return (
            <div key={turno}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{TURNO_LABEL[turno]}</p>
              <TurnoProgressBar items={items.map((i) => ({ estado: ["administrado","validado"].includes(i.estado) ? "cumplida" : i.estado }))} />
              <ul className="space-y-2">
                {items.map((item) => {
                  const st = MED_STATUS[item.estado] ?? { label: item.estado, color: "text-slate-500 bg-slate-50" };
                  const isGiven = ["administrado", "validado"].includes(item.estado);
                  const isOmitted = item.estado === "omitido";
                  const hour = item.hora?.slice(0, 5);
                  return (
                    <li key={item.id} className={`flex items-center gap-3 rounded-xl p-3 ${isGiven ? "bg-emerald-50/60" : isOmitted ? "bg-rose-50/50" : "bg-slate-50"}`}>
                      <div className={`shrink-0 grid h-5 w-5 place-items-center rounded-full ${isGiven ? "bg-emerald-500" : isOmitted ? "bg-rose-200" : "border-2 border-slate-200 bg-white"}`}>
                        {isGiven && <span className="text-white"><IconCheck /></span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        {hour && (
                          <p className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">{hour}</p>
                        )}
                        <p className={`text-sm font-medium ${isGiven ? "text-slate-500" : isOmitted ? "text-slate-400" : "text-slate-800"}`}>
                          {item.resumen}
                        </p>
                        {item.via && (
                          <p className="text-xs text-slate-400">Vía {item.via}</p>
                        )}
                        {isOmitted && item.motivo_omision && (
                          <p className="mt-0.5 text-xs text-rose-500">
                            {OMISSION_LABEL[item.motivo_omision] ?? "Omitido por el equipo"}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                        {st.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─── Observations section ───────────────────────────────────── */
function ObservationsSection({ observations }) {
  if (!observations?.length) {
    return (
      <SectionCard icon={<IconChat />} title="Actualizaciones del equipo">
        <EmptySection message="El equipo aún no ha compartido actualizaciones para esta fecha." />
      </SectionCard>
    );
  }
  return (
    <SectionCard icon={<IconChat />} title="Actualizaciones del equipo" badge={observations.length} badgeColor="bg-slate-100 text-slate-600">
      <ul className="divide-y divide-slate-100 -mx-1 px-1">
        {observations.map((obs) => (
          <li key={obs.id} className="py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                  {TIPO_LABEL[obs.tipo] ?? obs.tipo}
                </span>
                {obs.requiere_seguimiento && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Seguimiento activo
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 line-clamp-3">{obs.resumen}</p>
              <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(obs.fecha_hora)}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ─── Main portal ────────────────────────────────────────────── */
export default function FamiliarPortal() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, eleam } = useAuth();
  const {
    residentes,
    activeId,
    activeResident,
    selectedDate,
    snapshot,
    loading,
    loadingSnapshot,
    error,
    selectResident,
    setSelectedDate,
  } = useFamiliarResidentData({ toast });

  const resident     = snapshot?.resident ?? activeResident;
  const vitals       = snapshot?.vitals ?? [];
  const observations = snapshot?.observations ?? [];
  const care         = snapshot?.care ?? [];
  const medications  = snapshot?.medications ?? [];
  const visits       = snapshot?.visits ?? [];
  const carePlan     = snapshot?.care_plan ?? null;
  const evaluaciones = snapshot?.evaluaciones ?? {};

  if (loading && residentes.length === 0) {
    return <Loading message="Cargando portal familiar..." />;
  }

  if (residentes.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-teal-50">
          <IconUsers />
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-800">Sin residentes asignados</h1>
        <p className="text-sm text-slate-500">
          Aún no estás vinculado a ningún residente. Pide al administrador del ELEAM que configure tu acceso.
        </p>
      </div>
    );
  }

  const greeting = profile?.nombre ? `Hola, ${profile.nombre.split(" ")[0]}` : "Portal familiar";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">Portal familiar</p>
          <h1 className="text-2xl font-bold text-slate-900">{greeting}</h1>
        </div>
      </div>

      <ResidentSelector residentes={residentes} activeId={activeId} onSelect={selectResident} />
      <DateSelector value={selectedDate} onChange={setSelectedDate} loading={loadingSnapshot} />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loadingSnapshot && !snapshot ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {resident && (
            <>
              <ResidentHero
                resident={resident}
                eleam={eleam}
                onNavigateVisitas={() => navigate("/familiar/visitas")}
              />
              <ResidentClinicalSummary resident={resident} evaluaciones={evaluaciones} />
              <CarePlanSummarySection carePlan={carePlan} />
            </>
          )}

          {loadingSnapshot && (
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-sm text-teal-700">
              Actualizando información…
            </div>
          )}

          {/* Today summary */}
          <DaySummary care={care} medications={medications} selectedDate={selectedDate} />

          {/* Two-column grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <VitalsSection vitals={vitals} />
            <VisitsSummarySection
              visits={visits}
              onNavigateVisitas={() => navigate("/familiar/visitas")}
            />
          </div>

          {/* Full-width care & medication */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <CareSection care={care} />
            <MedicationSection medications={medications} />
          </div>

          {/* Observations */}
          <ObservationsSection observations={observations} />
        </>
      )}
    </div>
  );
}
