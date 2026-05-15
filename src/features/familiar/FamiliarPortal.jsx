import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";
import { formatDateTime } from "../../utils/dateUtils";
import { TIPO_LABEL, calcAge } from "../residents/residentUtils";
import { VITAL_DEFS, recordOverallStatus, STATUS } from "../vitalSigns/vitalRanges";
import { summarizeFamilySnapshot } from "./familiarUtils";
import { useFamiliarResidentData } from "./useFamiliarResidentData";

/* ─── Iconos inline ─────────────────────────────────────────── */
const IconHeart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);
const IconClipboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);
const IconPill = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V19.5m0 2.25-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
  </svg>
);
const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0z" />
  </svg>
);
const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

/* ─── Visit status helpers ───────────────────────────────────── */
const VISIT_STATUS = {
  pendiente:  { label: "Esperando validación", pill: "bg-amber-100 text-amber-800",   dot: "bg-amber-400" },
  activa:     { label: "En visita",            pill: "bg-teal-100 text-teal-800",     dot: "bg-teal-500 animate-pulse" },
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
  validado:     { label: "Validado",     color: "text-teal-700 bg-teal-50" },
  pendiente:    { label: "Pendiente",    color: "text-amber-700 bg-amber-50" },
  omitido:      { label: "Omitido",      color: "text-rose-600 bg-rose-50" },
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
              {resident?.habitacion && (
                <span>Hab. {resident.habitacion}{resident.cama ? ` · Cama ${resident.cama}` : ""}</span>
              )}
              {eleam?.nombre && <span>{eleam.nombre}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateVisitas}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 transition-colors"
          >
            <IconUsers />
            Gestionar visitas
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Today's summary strip ──────────────────────────────────── */
function DaySummary({ care, medications }) {
  const s = summarizeFamilySnapshot({ care, medications });
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-xl border p-3 ${tones[s.tone]}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 leading-tight">{s.label}</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Vitals panel ───────────────────────────────────────────── */
function VitalsSection({ vitals }) {
  const latest = vitals?.[0];
  if (!latest) {
    return (
      <SectionCard icon={<IconHeart />} title="Salud reciente">
        <EmptySection message="El equipo aún no ha registrado controles de salud." />
      </SectionCard>
    );
  }
  const overall = recordOverallStatus(latest);
  const overallStyle = STATUS[overall] ?? STATUS.unknown;

  return (
    <SectionCard
      icon={<IconHeart />}
      title="Salud reciente"
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
  const hasPending = recentVisits.some((v) => v.estado === "pendiente");

  return (
    <SectionCard
      icon={<IconUsers />}
      title="Mis visitas recientes"
      badge={hasActive ? "En visita" : hasPending ? "Pendiente" : null}
      badgeColor={hasActive ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-800"}
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

function CareSection({ care }) {
  if (!care?.length) {
    return (
      <SectionCard icon={<IconClipboard />} title="Cuidados de hoy">
        <EmptySection message="Sin cuidados programados para hoy." />
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
      <div className="space-y-4">
        {(["mañana", "tarde", "noche"]).map((turno) => {
          const items = byTurno[turno];
          if (!items.length) return null;
          return (
            <div key={turno}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                {TURNO_LABEL[turno]}
              </p>
              <ul className="space-y-2">
                {items.map((item) => {
                  const st = CARE_STATUS[item.estado] ?? CARE_STATUS.pendiente;
                  const isDone = item.estado === "cumplida";
                  return (
                    <li key={item.id} className={`flex items-start gap-3 rounded-xl p-3 ${isDone ? "bg-emerald-50/60" : "bg-slate-50"}`}>
                      <div className={`mt-0.5 shrink-0 grid h-5 w-5 place-items-center rounded-full ${isDone ? "bg-emerald-500" : "border-2 border-slate-200 bg-white"}`}>
                        {isDone && <span className="text-white"><IconCheck /></span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDone ? "text-slate-500 line-through" : "text-slate-800"}`}>
                          {item.titulo}
                        </p>
                        {item.resumen && item.resumen !== item.titulo && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.resumen}</p>
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
      <SectionCard icon={<IconPill />} title="Medicación de hoy">
        <EmptySection message="Sin medicación programada para hoy." />
      </SectionCard>
    );
  }
  const given = medications.filter((m) => ["administrado", "validado"].includes(m.estado)).length;
  return (
    <SectionCard
      icon={<IconPill />}
      title="Medicación de hoy"
      badge={`${given}/${medications.length}`}
      badgeColor={given === medications.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}
    >
      <ul className="space-y-2">
        {medications.map((item) => {
          const st = MED_STATUS[item.estado] ?? { label: item.estado, color: "text-slate-500 bg-slate-50" };
          const isGiven = ["administrado", "validado"].includes(item.estado);
          return (
            <li key={item.id} className={`flex items-center gap-3 rounded-xl p-3 ${isGiven ? "bg-emerald-50/60" : "bg-slate-50"}`}>
              <div className={`shrink-0 grid h-5 w-5 place-items-center rounded-full ${isGiven ? "bg-emerald-500" : "border-2 border-slate-200 bg-white"}`}>
                {isGiven && <span className="text-white"><IconCheck /></span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isGiven ? "text-slate-500" : "text-slate-800"}`}>
                  {item.resumen}
                </p>
                {item.via && (
                  <p className="text-xs text-slate-400">Vía {item.via}</p>
                )}
              </div>
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                {st.label}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/* ─── Observations section ───────────────────────────────────── */
function ObservationsSection({ observations }) {
  const ObsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );

  if (!observations?.length) {
    return (
      <SectionCard icon={<ObsIcon />} title="Actualizaciones del equipo">
        <EmptySection message="Sin actualizaciones del equipo aún." />
      </SectionCard>
    );
  }
  return (
    <SectionCard icon={<ObsIcon />} title="Actualizaciones del equipo" badge={observations.length} badgeColor="bg-slate-100 text-slate-600">
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
    snapshot,
    loading,
    loadingSnapshot,
    error,
    selectResident,
  } = useFamiliarResidentData({ toast });

  const resident     = snapshot?.resident ?? activeResident;
  const vitals       = snapshot?.vitals ?? [];
  const observations = snapshot?.observations ?? [];
  const care         = snapshot?.care ?? [];
  const medications  = snapshot?.medications ?? [];
  const visits       = snapshot?.visits ?? [];

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

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loadingSnapshot && !snapshot ? (
        <Loading message="Cargando información..." />
      ) : (
        <>
          {resident && (
            <ResidentHero
              resident={resident}
              eleam={eleam}
              onNavigateVisitas={() => navigate("/familiar/visitas")}
            />
          )}

          {loadingSnapshot && (
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-sm text-teal-700">
              Actualizando información…
            </div>
          )}

          {/* Today summary */}
          <DaySummary care={care} medications={medications} />

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
