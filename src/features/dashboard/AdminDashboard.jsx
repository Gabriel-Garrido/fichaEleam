import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import HelpTooltip from "../../components/HelpTooltip";
import { loadDashboard } from "./dashboardService";
import {
  STATUS,
  recordOverallLabel,
  recordOverallStatus,
} from "../vitalSigns/vitalRanges";

const TIPO_LABEL = {
  observacion_general: "General", caida: "Caída", incidente: "Incidente",
  curacion: "Curación", visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento", cambio_posicion: "Cambio posición",
  higiene: "Higiene", alimentacion: "Alimentación", eliminacion: "Eliminación",
  actividad: "Actividad", otro: "Otro",
};

const DEPENDENCIA_TONE = {
  leve:           { bg: "bg-emerald-500", text: "text-emerald-700",  label: "Leve" },
  moderado:       { bg: "bg-amber-500",   text: "text-amber-700",    label: "Moderado" },
  severo:         { bg: "bg-orange-500",  text: "text-orange-700",   label: "Severo" },
  total:          { bg: "bg-rose-500",    text: "text-rose-700",     label: "Total" },
  sin_clasificar: { bg: "bg-gray-400",    text: "text-gray-600",     label: "Sin clasificar" },
};

const TURNOS = ["mañana", "tarde", "noche"];

function currentShift() {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return "mañana";
  if (h >= 15 && h < 23) return "tarde";
  return "noche";
}

function initials(nombre = "", apellido = "") {
  return ((nombre[0] || "") + (apellido[0] || "")).toUpperCase() || "?";
}

function timeAgo(date) {
  if (!date) return null;
  const diffMs = Date.now() - new Date(date).getTime();
  if (diffMs < 0) return "ahora";
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}

function todayDateLong() {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function isSameDay(date) {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, eleam } = useAuth();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const stats   = data?.residentStats ?? null;
  const errors  = data?.errors ?? {};
  const turno   = currentShift();

  const acreditacion = useMemo(() => {
    const s = data?.acreditacionSummary;
    if (!s) return {
      porcentaje: 0, total: 0, cumple: 0, pendientes: 0,
      vencidos: 0, observacionesAbiertas: 0, ambitos: [],
    };
    return {
      porcentaje:            s.porcentaje ?? 0,
      total:                 s.total ?? 0,
      cumple:                s.cumple ?? 0,
      pendientes:            s.pendientes ?? 0,
      vencidos:              (s.vencidos ?? []).length,
      porVencer:             (s.porVencer ?? []).length,
      observacionesAbiertas: (s.observaciones ?? []).length,
      ambitos:               s.ambitos ?? [],
    };
  }, [data]);

  // Estado clínico agregado de los residentes activos basado en su último signo vital
  const clinicalSummary = useMemo(() => {
    const list = data?.latestVitalsByResident ?? [];
    const out = { critical: 0, warning: 0, normal: 0, sinDatos: 0, total: list.length };
    for (const r of list) {
      if (!r.ultimoSigno) { out.sinDatos++; continue; }
      const s = recordOverallStatus(r.ultimoSigno);
      if (s in out) out[s]++; else out.sinDatos++;
    }
    return out;
  }, [data]);

  // Cobertura: % de residentes activos con al menos un signo vital tomado hoy
  const cobertura = useMemo(() => {
    const list = data?.latestVitalsByResident ?? [];
    if (!list.length) return null;
    const conHoy = list.filter(
      (r) => r.ultimoSigno && isSameDay(r.ultimoSigno.fecha_hora)
    ).length;
    return { hoy: conHoy, total: list.length, pct: Math.round((conHoy / list.length) * 100) };
  }, [data]);

  const management = useMemo(() => {
    const list = data?.latestVitalsByResident ?? [];
    const stale = list.filter((r) => !r.ultimoSigno || !isSameDay(r.ultimoSigno.fecha_hora));
    const highDependency = list.filter(
      (r) => r.nivel_dependencia === "severo" || r.nivel_dependencia === "total"
    ).length;
    const expiring7 = (data?.expiringDocuments ?? []).filter((d) => {
      const days = daysUntil(d.fecha_vencimiento);
      return days != null && days <= 7;
    }).length;
    const totalAlerts =
      clinicalSummary.critical +
      clinicalSummary.warning +
      stale.length +
      (data?.pendingFollowUps ?? []).length +
      expiring7;
    const score = Math.max(0, 100 -
      clinicalSummary.critical * 18 -
      clinicalSummary.warning * 8 -
      stale.length * 7 -
      (data?.pendingFollowUps ?? []).length * 5 -
      expiring7 * 6
    );
    return {
      stale,
      highDependency,
      expiring7,
      totalAlerts,
      score,
      scoreTone: score >= 80 ? "emerald" : score >= 55 ? "amber" : "rose",
    };
  }, [data, clinicalSummary]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Hero header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary)] rounded-3xl p-5 sm:p-8 text-white shadow-lg">
        <div className="relative">
          <div className="text-xs uppercase tracking-wider text-white/70 font-medium">
            {todayDateLong()} · Turno actual: <span className="capitalize">{turno}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">
            {profile?.nombre ? `Hola, ${profile.nombre}` : "Hola"}
          </h1>
          {eleam?.nombre && (
            <p className="text-white/85 text-sm font-medium">{eleam.nombre}</p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm text-white/90">
            <span>📊 <strong className="text-white">{loading ? "…" : data?.signosHoy ?? 0}</strong> signos vitales hoy</span>
            <span>📋 <strong className="text-white">{loading ? "…" : data?.observacionesHoy ?? 0}</strong> observaciones hoy</span>
            {cobertura && (
              <span>🩺 <strong className="text-white">{cobertura.pct}%</strong> de residentes con control hoy</span>
            )}
          </div>
        </div>
      </header>

      {!loading && (stats?.total ?? 0) === 0 && (
        <FirstRunPanel navigate={navigate} />
      )}

      <ManagementBrief
        loading={loading}
        score={management.score}
        scoreTone={management.scoreTone}
        stale={management.stale}
        followUps={data?.pendingFollowUps ?? []}
        expiring7={management.expiring7}
        activity={data?.activityByShift}
        turno={turno}
        navigate={navigate}
      />

      {/* Top KPIs */}
      {!errors.residentStats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Residentes activos"
            help="Residentes que hoy forman parte de la operación del ELEAM. Los egresados y fallecidos quedan en historial."
            value={loading ? "…" : stats?.activos ?? 0}
            sub={
              stats
                ? `${stats.hospitalizados} hospitalizados · ${stats.total} totales`
                : "—"
            }
            icon="👴"
            tone="primary"
            onClick={() => navigate("/residents")}
          />
          <KpiCard
            title="Estado clínico"
            help="Cuenta residentes cuyo último control vital está fuera de rango. Entra aquí para priorizar controles."
            value={loading ? "…" : (clinicalSummary.critical + clinicalSummary.warning) || 0}
            sub={
              loading
                ? "—"
                : clinicalSummary.critical > 0
                  ? `${clinicalSummary.critical} crítico${clinicalSummary.critical === 1 ? "" : "s"} · ${clinicalSummary.warning} en atención`
                  : clinicalSummary.warning > 0
                    ? `${clinicalSummary.warning} requieren atención`
                    : "Todos en rango normal"
            }
            icon="❤️"
            tone={
              clinicalSummary.critical > 0
                ? "rose"
                : clinicalSummary.warning > 0
                  ? "amber"
                  : "emerald"
            }
            onClick={() => navigate("/vital-signs")}
          />
          <KpiCard
            title="Cobertura signos hoy"
            help="Porcentaje de residentes activos con al menos un registro de signos vitales durante el día actual."
            value={cobertura ? `${cobertura.pct}%` : "—"}
            sub={
              cobertura
                ? `${cobertura.hoy} de ${cobertura.total} residentes`
                : "Sin residentes activos"
            }
            icon="📈"
            tone={
              !cobertura
                ? "gray"
                : cobertura.pct >= 80
                  ? "emerald"
                  : cobertura.pct >= 40
                    ? "amber"
                    : "rose"
            }
            onClick={() => navigate("/vital-signs/new")}
          />
          <KpiCard
            title="Cumplimiento SEREMI"
            help="Avance de requisitos de acreditación marcados como cumple, sin contar los que no aplican."
            value={loading ? "…" : `${acreditacion.porcentaje}%`}
            sub={`${acreditacion.cumple} de ${acreditacion.total} requisitos al día${
              acreditacion.vencidos ? ` · ${acreditacion.vencidos} vencido${acreditacion.vencidos === 1 ? "" : "s"}` : ""
            }`}
            icon="🏥"
            tone={
              acreditacion.porcentaje >= 80
                ? "emerald"
                : acreditacion.porcentaje >= 40
                  ? "amber"
                  : "rose"
            }
            onClick={() => navigate("/accreditation")}
          />
        </section>
      )}

      {/* Critical alerts strip */}
      <CriticalAlerts
        latestVitals={data?.latestVitalsByResident ?? []}
        followUps={data?.pendingFollowUps ?? []}
        expiring={data?.expiringDocuments ?? []}
        loading={loading}
        navigate={navigate}
      />

      <ClinicalBoard
        list={data?.latestVitalsByResident ?? []}
        loading={loading}
        error={errors.latestVitals}
        navigate={navigate}
      />

      <details className="group bg-white rounded-2xl border border-gray-100 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Contexto adicional</h2>
            <p className="text-xs text-gray-500">Indicadores para revisar después de resolver las prioridades del turno.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 group-open:hidden">
            Ver
          </span>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 group-open:inline-flex">
            Ocultar
          </span>
        </summary>
        <div className="space-y-6 border-t border-gray-100 p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RiskMatrix
              clinicalSummary={clinicalSummary}
              highDependency={management.highDependency}
              staleCount={management.stale.length}
              followUpCount={(data?.pendingFollowUps ?? []).length}
            />
            <DependencyChart dist={stats?.dependencia} total={stats?.activos ?? 0} />
            <ShiftActivity activity={data?.activityByShift} turno={turno} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FollowUpsCard
              items={data?.pendingFollowUps ?? []}
              navigate={navigate}
            />
            <IncidentsCard
              items={data?.recentIncidents ?? []}
              navigate={navigate}
            />
            <ExpiringDocsCard
              items={data?.expiringDocuments ?? []}
              navigate={navigate}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Demographics stats={stats} />
            <AccreditationCard
              acreditacion={acreditacion}
              navigate={navigate}
              loading={loading}
            />
          </div>
        </div>
      </details>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Acciones principales
          <HelpTooltip className="ml-2" label="Ayuda sobre acciones rápidas">
            Mantén visibles solo las tareas más repetidas del turno. Las consultas secundarias quedan agrupadas abajo.
          </HelpTooltip>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon="👴" label="Agregar residente"        onClick={() => navigate("/residents/new")} />
          <QuickAction icon="📊" label="Registrar signos vitales" onClick={() => navigate("/vital-signs/new")} />
          <QuickAction icon="📋" label="Nueva observación"        onClick={() => navigate("/observations/new")} />
          <QuickAction icon="📁" label="Carpeta SEREMI"           onClick={() => navigate("/accreditation/carpeta")} />
        </div>
        <details className="group mt-3 rounded-xl border border-gray-100 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-700">
            <span>Más accesos</span>
            <span className="text-xs text-gray-400 group-open:hidden">Ver</span>
            <span className="hidden text-xs text-gray-400 group-open:inline">Ocultar</span>
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-100 p-3">
            <QuickAction icon="👥" label="Ver residentes"           onClick={() => navigate("/residents")} />
            <QuickAction icon="💓" label="Historial signos"         onClick={() => navigate("/vital-signs")} />
            <QuickAction icon="📝" label="Ver observaciones"        onClick={() => navigate("/observations")} />
            <QuickAction icon="🏥" label="Panel acreditación"       onClick={() => navigate("/accreditation")} />
          </div>
        </details>
      </section>
    </div>
  );
}

/* ─── KPI ────────────────────────────────────────────────────── */

const KPI_TONE = {
  primary: { bg: "bg-white",        accent: "text-[var(--color-primary)]", chip: "bg-teal-50 text-teal-700" },
  emerald: { bg: "bg-white",        accent: "text-emerald-700",            chip: "bg-emerald-50 text-emerald-700" },
  amber:   { bg: "bg-white",        accent: "text-amber-700",              chip: "bg-amber-50 text-amber-700" },
  rose:    { bg: "bg-white",        accent: "text-rose-700",               chip: "bg-rose-50 text-rose-700" },
  gray:    { bg: "bg-white",        accent: "text-gray-700",               chip: "bg-gray-100 text-gray-600" },
};

function KpiCard({ title, value, sub, icon, tone = "primary", onClick, help }) {
  const t = KPI_TONE[tone];
  return (
    <article
      className={`group text-left ${t.bg} rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-400 font-medium inline-flex items-center gap-1.5">
          <span>{title}</span>
          {help && (
            <HelpTooltip label={`Ayuda: ${title}`}>
              {help}
            </HelpTooltip>
          )}
        </span>
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm ${t.chip}`}>
          {icon}
        </span>
      </div>
      <button type="button" onClick={onClick} className="mt-2 block w-full text-left">
        <div className={`text-3xl font-bold tabular-nums ${t.accent}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{sub}</div>
      </button>
    </article>
  );
}

/* ─── Critical alerts ─────────────────────────────────────── */

function CriticalAlerts({ latestVitals, followUps, expiring, loading, navigate }) {
  if (loading) return null;

  const critical = latestVitals.filter(
    (r) => r.ultimoSigno && recordOverallStatus(r.ultimoSigno) === "critical"
  );
  const docs7d = expiring.filter((d) => {
    const days = daysUntil(d.fecha_vencimiento);
    return days != null && days <= 7;
  });
  const totalAlertas = critical.length + followUps.length + docs7d.length;
  if (!totalAlertas) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-emerald-600 text-lg">✓</span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Sin alertas críticas</p>
          <p className="text-xs text-emerald-700/80">
            Todos los residentes están en rango y no hay tareas urgentes pendientes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-rose-600 text-lg">🚨</span>
        <h2 className="font-semibold text-rose-800">
          Atención inmediata · {totalAlertas} alerta{totalAlertas === 1 ? "" : "s"}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AlertChip
          label="Signos vitales críticos"
          value={critical.length}
          tone="rose"
          onClick={critical.length ? () => navigate("/vital-signs") : null}
          hint={
            critical.length
              ? critical
                  .slice(0, 2)
                  .map((r) => `${r.nombre} ${r.apellido}`)
                  .join(" · ")
              : "Sin críticos"
          }
        />
        <AlertChip
          label="Seguimientos pendientes"
          value={followUps.length}
          tone="amber"
          onClick={followUps.length ? () => navigate("/observations") : null}
          hint={
            followUps.length ? "Observaciones marcadas para seguimiento" : "Al día"
          }
        />
        <AlertChip
          label="Documentos por vencer ≤ 7d"
          value={docs7d.length}
          tone="amber"
          onClick={docs7d.length ? () => navigate("/accreditation") : null}
          hint={docs7d.length ? "Renovar antes del vencimiento" : "Sin urgencias"}
        />
      </div>
    </div>
  );
}

const ALERT_TONE = {
  rose:  { bg: "bg-white", text: "text-rose-700",  border: "border-rose-200",  dot: "bg-rose-500"  },
  amber: { bg: "bg-white", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
};

function AlertChip({ label, value, tone, onClick, hint }) {
  const t = ALERT_TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left ${t.bg} border ${t.border} rounded-xl p-3 ${
        onClick ? "hover:shadow-md transition-all cursor-pointer" : "opacity-80"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
        <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
          {label}
        </span>
      </div>
      <div className={`text-2xl font-bold mt-1 ${t.text}`}>{value}</div>
      <div className="text-xs text-gray-500 line-clamp-1">{hint}</div>
    </button>
  );
}

/* ─── Management brief ───────────────────────────────────── */

function ManagementBrief({ loading, score, scoreTone, stale, followUps, expiring7, activity, turno, navigate }) {
  if (loading) {
    return (
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </section>
    );
  }

  const currentActivity = activity?.[turno] ?? { signos: 0, observaciones: 0 };
  const nextAction = stale.length
    ? { label: "Tomar controles pendientes", hint: `${stale.length} residente${stale.length === 1 ? "" : "s"} sin control hoy`, path: "/vital-signs/new", tone: "rose" }
    : followUps.length
      ? { label: "Cerrar seguimientos", hint: `${followUps.length} observaci${followUps.length === 1 ? "ón" : "ones"} por revisar`, path: "/observations", tone: "amber" }
      : expiring7
        ? { label: "Renovar documentos", hint: `${expiring7} vencen en 7 días o menos`, path: "/accreditation", tone: "amber" }
        : { label: "Revisar panel clínico", hint: "Turno sin bloqueos urgentes", path: "/vital-signs", tone: "emerald" };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <button
        type="button"
        onClick={() => navigate(nextAction.path)}
        className="lg:col-span-2 text-left bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Prioridad del turno</p>
            <h2 className="text-lg font-bold text-gray-900 mt-1">{nextAction.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{nextAction.hint}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${nextAction.tone === "rose" ? "bg-rose-100 text-rose-700" : nextAction.tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
            Abrir
          </span>
        </div>
        {stale.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stale.slice(0, 4).map((r) => (
              <span key={r.id} className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-100 px-2.5 py-1 text-xs text-gray-600">
                <span className="h-5 w-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[10px] font-bold">
                  {initials(r.nombre, r.apellido)}
                </span>
                {r.apellido}
              </span>
            ))}
          </div>
        )}
      </button>

      <BriefMetric
        label="Índice operativo"
        value={`${score}%`}
        sub={score >= 80 ? "Turno controlado" : score >= 55 ? "Requiere seguimiento" : "Riesgo operativo alto"}
        tone={scoreTone}
      />
      <BriefMetric
        label="Actividad turno actual"
        value={currentActivity.signos + currentActivity.observaciones}
        sub={`${currentActivity.signos} signos · ${currentActivity.observaciones} observaciones`}
        tone={(currentActivity.signos + currentActivity.observaciones) > 0 ? "primary" : "gray"}
      />
    </section>
  );
}

function BriefMetric({ label, value, sub, tone }) {
  const toneClass = {
    primary: "text-[var(--color-primary)] bg-teal-50",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-800 bg-amber-50",
    rose: "text-rose-700 bg-rose-50",
    gray: "text-gray-600 bg-gray-50",
  }[tone] ?? "text-gray-700 bg-gray-50";
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <div className={`inline-flex mt-2 rounded-xl px-3 py-1 text-3xl font-bold tabular-nums ${toneClass}`}>
        {value}
      </div>
      <p className="text-xs text-gray-500 mt-2">{sub}</p>
    </div>
  );
}

function RiskMatrix({ clinicalSummary, highDependency, staleCount, followUpCount }) {
  const items = [
    { label: "Críticos", value: clinicalSummary.critical, tone: clinicalSummary.critical ? "rose" : "emerald" },
    { label: "Alta dependencia", value: highDependency, tone: highDependency ? "amber" : "gray" },
    { label: "Sin control hoy", value: staleCount, tone: staleCount ? "rose" : "emerald" },
    { label: "Seguimientos", value: followUpCount, tone: followUpCount ? "amber" : "emerald" },
  ];
  return (
    <Card title="Mapa de riesgo" subtitle="Lectura rápida para priorizar el turno">
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className={`rounded-xl border p-3 ${riskTone(item.tone)}`}>
            <div className="text-2xl font-bold tabular-nums">{item.value}</div>
            <div className="text-[11px] font-medium">{item.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FirstRunPanel({ navigate }) {
  return (
    <section className="bg-white border border-teal-100 rounded-2xl shadow-sm p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-primary)] font-semibold">
            Primeros pasos
          </p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Configura tu ELEAM para empezar a gestionar el turno
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Agrega residentes activos, registra el primer control y sube documentos base para que el dashboard entregue indicadores útiles.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:min-w-[460px]">
          <SetupAction label="Agregar residente" sub="Ficha clínica base" onClick={() => navigate("/residents/new")} />
          <SetupAction label="Subir documento" sub="Carpeta SEREMI" onClick={() => navigate("/accreditation")} />
          <SetupAction label="Ver demo" sub="Ejemplo completo" onClick={() => navigate("/demo")} />
        </div>
      </div>
    </section>
  );
}

function SetupAction({ label, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-gray-100 bg-gray-50 hover:bg-teal-50 hover:border-teal-200 px-4 py-3 transition-colors"
    >
      <div className="font-semibold text-gray-800 text-sm">{label}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </button>
  );
}

function riskTone(tone) {
  return {
    rose: "bg-rose-50 border-rose-100 text-rose-700",
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    gray: "bg-gray-50 border-gray-100 text-gray-600",
  }[tone];
}

/* ─── Clinical board (lista de residentes con su último signo) ─── */

function ClinicalBoard({ list, loading, error, navigate }) {
  const [filter, setFilter] = useState("all"); // all | critical | warning | normal | sin

  if (error) {
    return (
      <Card title="Estado clínico actual">
        <p className="text-sm text-rose-700">No se pudo cargar el panel clínico.</p>
      </Card>
    );
  }

  const decorated = list.map((r) => {
    const status = r.ultimoSigno ? recordOverallStatus(r.ultimoSigno) : "sin";
    return { ...r, status };
  });

  const counts = decorated.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    { critical: 0, warning: 0, normal: 0, unknown: 0, sin: 0 }
  );

  const filtered = decorated.filter((r) =>
    filter === "all"
      ? true
      : filter === "sin"
        ? !r.ultimoSigno
        : r.status === filter
  );

  // Orden: critical → warning → sin datos → normal
  const order = { critical: 0, warning: 1, unknown: 2, sin: 3, normal: 4 };
  filtered.sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));

  return (
    <Card
      title="Estado clínico actual"
      subtitle="Último signo vital de cada residente activo"
      action={
        <button
          onClick={() => navigate("/vital-signs/new")}
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          + Registrar →
        </button>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label={`Todos · ${list.length}`} tone="gray" />
        <FilterPill active={filter === "critical"} onClick={() => setFilter(filter === "critical" ? "all" : "critical")} label={`Crítico · ${counts.critical}`} tone="rose" />
        <FilterPill active={filter === "warning"} onClick={() => setFilter(filter === "warning" ? "all" : "warning")} label={`Atención · ${counts.warning}`} tone="amber" />
        <FilterPill active={filter === "normal"} onClick={() => setFilter(filter === "normal" ? "all" : "normal")} label={`Normal · ${counts.normal}`} tone="emerald" />
        <FilterPill active={filter === "sin"} onClick={() => setFilter(filter === "sin" ? "all" : "sin")} label={`Sin datos · ${counts.sin}`} tone="gray" />
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-6 text-center">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500 py-6 text-center">
          {list.length === 0
            ? "No hay residentes activos."
            : "No hay residentes en esta categoría."}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 -mx-2">
          {filtered.map((r) => (
            <ClinicalRow key={r.id} r={r} navigate={navigate} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ClinicalRow({ r, navigate }) {
  const status = r.ultimoSigno ? recordOverallStatus(r.ultimoSigno) : "unknown";
  const overall = r.ultimoSigno ? recordOverallLabel(r.ultimoSigno) : { status: "unknown", label: "Sin registro" };
  const s = STATUS[overall.status];

  return (
    <li
      onClick={() => navigate(`/residents/${r.id}`)}
      className="flex items-center gap-3 px-2 py-3 hover:bg-gray-50 rounded-lg cursor-pointer"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] text-white text-sm font-bold">
        {initials(r.nombre, r.apellido)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800 truncate text-sm">
            {r.apellido}, {r.nombre}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {overall.label}
          </span>
        </div>
        <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {r.habitacion && <span>Hab. {r.habitacion}{r.cama ? ` · Cama ${r.cama}` : ""}</span>}
          {r.ultimoSigno ? (
            <span>
              Último: {timeAgo(r.ultimoSigno.fecha_hora)}
              {r.ultimoSigno.turno && <span className="ml-1 capitalize text-gray-400">· {r.ultimoSigno.turno}</span>}
            </span>
          ) : (
            <span className="text-gray-400">Sin signos vitales registrados</span>
          )}
        </div>
      </div>
      {r.ultimoSigno ? (
        <MiniVitals s={r.ultimoSigno} status={status} />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/vital-signs/new?residenteId=${r.id}`);
          }}
          className="text-xs text-[var(--color-primary)] hover:underline shrink-0"
        >
          Registrar →
        </button>
      )}
    </li>
  );
}

function MiniVitals({ s }) {
  const Pill = ({ label, value }) =>
    value ? (
      <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 tabular-nums">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-gray-700">{value}</span>
      </span>
    ) : null;
  const pa = s.presion_sistolica && s.presion_diastolica
    ? `${s.presion_sistolica}/${s.presion_diastolica}`
    : null;
  return (
    <div className="hidden md:flex gap-1 shrink-0">
      <Pill label="P/A" value={pa} />
      <Pill label="FC" value={s.frecuencia_cardiaca} />
      <Pill label="T°" value={s.temperatura != null ? `${s.temperatura}°` : null} />
      <Pill label="SpO₂" value={s.saturacion_oxigeno != null ? `${s.saturacion_oxigeno}%` : null} />
    </div>
  );
}

/* ─── Filter pill ─────────────────────────────────────────── */

const FILTER_TONE = {
  gray:    "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
  rose:    "bg-white text-rose-700 border-rose-200 hover:bg-rose-50",
  amber:   "bg-white text-amber-800 border-amber-200 hover:bg-amber-50",
  emerald: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
};

function FilterPill({ active, onClick, label, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${FILTER_TONE[tone]} ${
        active ? "ring-2 ring-offset-1 ring-[var(--color-secondary)]" : ""
      }`}
    >
      {label}
    </button>
  );
}

/* ─── Dependency chart ────────────────────────────────────── */

function DependencyChart({ dist, total }) {
  if (!dist || total === 0) {
    return (
      <Card title="Dependencia" subtitle="Distribución de residentes activos">
        <p className="text-sm text-gray-400">Sin residentes activos.</p>
      </Card>
    );
  }
  const order = ["leve", "moderado", "severo", "total", "sin_clasificar"];
  return (
    <Card title="Dependencia" subtitle="Distribución de residentes activos">
      <div className="space-y-2.5">
        {order.map((k) => {
          const v = dist[k] ?? 0;
          if (v === 0 && k === "sin_clasificar") return null;
          const pct = total ? Math.round((v / total) * 100) : 0;
          const t = DEPENDENCIA_TONE[k];
          return (
            <div key={k}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className={`${t.text} font-medium`}>{t.label}</span>
                <span className="text-gray-500 tabular-nums">
                  {v} <span className="text-gray-400">· {pct}%</span>
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${t.bg} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── Shift activity ──────────────────────────────────────── */

function ShiftActivity({ activity, turno }) {
  if (!activity) {
    return (
      <Card title="Actividad por turno" subtitle="Registros del día">
        <p className="text-sm text-gray-400">Sin datos.</p>
      </Card>
    );
  }
  const max = Math.max(
    1,
    ...TURNOS.map((t) => activity[t].signos + activity[t].observaciones)
  );
  return (
    <Card title="Actividad por turno" subtitle="Registros del día">
      <div className="space-y-3">
        {TURNOS.map((t) => {
          const a = activity[t];
          const total = a.signos + a.observaciones;
          const pct = (total / max) * 100;
          const isCurrent = t === turno;
          return (
            <div key={t}>
              <div className="flex justify-between text-xs mb-1">
                <span className={`capitalize ${isCurrent ? "font-semibold text-[var(--color-primary)]" : "text-gray-600"}`}>
                  {t} {isCurrent && <span className="text-[10px] uppercase tracking-wider">· actual</span>}
                </span>
                <span className="text-gray-500 tabular-nums">
                  {a.signos} sv · {a.observaciones} obs
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                <div
                  className="h-2 bg-[var(--color-primary)]"
                  style={{ width: `${(a.signos / max) * 100}%` }}
                />
                <div
                  className="h-2 bg-[var(--color-secondary)]"
                  style={{ width: `${(a.observaciones / max) * 100}%` }}
                />
                <div
                  className="h-2"
                  style={{ width: `${100 - pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex gap-3 text-[11px] text-gray-400 pt-1">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--color-primary)]" /> Signos vitales</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--color-secondary)]" /> Observaciones</span>
        </div>
      </div>
    </Card>
  );
}

/* ─── Demographics ────────────────────────────────────────── */

function Demographics({ stats }) {
  if (!stats) {
    return (
      <Card title="Demografía">
        <p className="text-sm text-gray-400">Sin datos.</p>
      </Card>
    );
  }
  const totalActivos = stats.activos || 0;
  const fem = stats.sexos?.femenino ?? 0;
  const mas = stats.sexos?.masculino ?? 0;
  const otro = stats.sexos?.otro ?? 0;
  const pct = (n) => (totalActivos ? Math.round((n / totalActivos) * 100) : 0);
  return (
    <Card title="Demografía" subtitle="Residentes activos">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Stat label="Edad promedio" value={stats.edadPromedio != null ? `${stats.edadPromedio}` : "—"} sub="años" />
        <Stat label="Activos" value={totalActivos} sub={`${stats.total} totales`} />
      </div>
      <div className="space-y-2">
        <SexoRow label="Femenino" value={fem} pct={pct(fem)} color="bg-pink-400" />
        <SexoRow label="Masculino" value={mas} pct={pct(mas)} color="bg-sky-400" />
        {otro > 0 && <SexoRow label="Otro" value={otro} pct={pct(otro)} color="bg-gray-400" />}
      </div>
    </Card>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{label}</div>
      <div className="text-2xl font-bold text-gray-800 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function SexoRow({ label, value, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500 tabular-nums">{value} · {pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Bottom row cards ────────────────────────────────────── */

function FollowUpsCard({ items, navigate }) {
  return (
    <Card
      title="Seguimientos pendientes"
      subtitle={`${items.length} observaci${items.length === 1 ? "ón" : "ones"} con seguimiento`}
      icon="⚠️"
      tone="amber"
      action={
        items.length > 0 && (
          <button
            onClick={() => navigate("/observations")}
            className="text-xs text-amber-700 hover:underline"
          >
            Ver todos →
          </button>
        )
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Sin seguimientos pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((obs) => (
            <li
              key={obs.id}
              onClick={() => navigate(`/residents/${obs.residente_id}`)}
              className="bg-white rounded-lg border border-gray-100 px-3 py-2 cursor-pointer hover:bg-amber-50/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-800 text-sm truncate">
                  {obs.residentes ? `${obs.residentes.apellido}, ${obs.residentes.nombre}` : "—"}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {timeAgo(obs.fecha_hora)}
                </span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium">
                {TIPO_LABEL[obs.tipo] ?? obs.tipo}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{obs.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function IncidentsCard({ items, navigate }) {
  return (
    <Card
      title="Incidentes y caídas"
      subtitle="Últimos 7 días"
      icon="🚨"
      tone="rose"
      action={
        items.length > 0 && (
          <button
            onClick={() => navigate("/observations")}
            className="text-xs text-rose-700 hover:underline"
          >
            Ver todos →
          </button>
        )
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Sin incidentes registrados esta semana.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((obs) => (
            <li
              key={obs.id}
              onClick={() => navigate(`/residents/${obs.residente_id}`)}
              className="bg-white rounded-lg border border-gray-100 px-3 py-2 cursor-pointer hover:bg-rose-50/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-800 text-sm truncate">
                  {obs.residentes ? `${obs.residentes.apellido}, ${obs.residentes.nombre}` : "—"}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {timeAgo(obs.fecha_hora)}
                </span>
              </div>
              <div className="text-[11px] text-rose-700 font-medium">
                {TIPO_LABEL[obs.tipo] ?? obs.tipo}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{obs.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ExpiringDocsCard({ items, navigate }) {
  return (
    <Card
      title="Documentos por vencer"
      subtitle="Próximos 30 días"
      icon="📅"
      tone="amber"
      action={
        items.length > 0 && (
          <button
            onClick={() => navigate("/accreditation")}
            className="text-xs text-amber-700 hover:underline"
          >
            Ver todos →
          </button>
        )
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Sin vencimientos próximos.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((re) => {
            const daysLeft = Math.ceil(
              (new Date(re.fecha_vencimiento) - new Date()) / 86400000
            );
            const urgent = daysLeft <= 7;
            const r = re.requisito;
            return (
              <li
                key={re.id}
                onClick={() => navigate(`/accreditation/requisito/${re.id}`)}
                className="bg-white rounded-lg border border-gray-100 px-3 py-2 cursor-pointer hover:bg-amber-50/50 transition-colors flex justify-between items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800 text-sm truncate block">
                    {r?.nombre ?? "—"}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate block">
                    {r?.codigo} · {r?.ambito?.nombre ?? "—"}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold tabular-nums shrink-0 px-2 py-0.5 rounded-full ${
                    urgent ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {daysLeft <= 0 ? "Hoy" : `${daysLeft}d`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function AccreditationCard({ acreditacion, navigate, loading }) {
  const ambitos = (acreditacion.ambitos ?? []).slice(0, 6);
  return (
    <div className="lg:col-span-2 bg-gradient-to-br from-white to-teal-50/40 rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
            Carpeta SEREMI
          </p>
          <p className="text-sm text-gray-600">
            {acreditacion.cumple} de {acreditacion.total} requisitos al día
            {acreditacion.observacionesAbiertas
              ? ` · ${acreditacion.observacionesAbiertas} observación${acreditacion.observacionesAbiertas === 1 ? "" : "es"} abierta${acreditacion.observacionesAbiertas === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <span className="text-3xl font-bold text-[var(--color-primary)] tabular-nums">
          {loading ? "…" : `${acreditacion.porcentaje}%`}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] rounded-full transition-all duration-700"
          style={{ width: `${acreditacion.porcentaje}%` }}
        />
      </div>

      {/* Mini-grid de ámbitos (atajos) */}
      {ambitos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          {ambitos.map((a) => {
            const tone = a.porcentaje >= 80 ? "border-emerald-200 bg-emerald-50" :
                         a.porcentaje >= 50 ? "border-amber-200 bg-amber-50" :
                                              "border-rose-200 bg-rose-50";
            return (
              <button
                key={a.codigo}
                onClick={() => navigate(`/accreditation/ambito/${a.codigo}`)}
                className={`text-left rounded-lg border p-2 hover:shadow-sm transition-all ${tone}`}
              >
                <p className="text-[10px] font-mono text-gray-500">{a.codigo}</p>
                <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-1">
                  {a.nombre}
                </p>
                <p className="text-xs font-bold tabular-nums mt-0.5">{a.porcentaje}%</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => navigate("/accreditation")}
          className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
        >
          Abrir Carpeta SEREMI →
        </button>
        <button
          onClick={() => navigate("/accreditation/observaciones")}
          className="text-xs text-gray-500 hover:underline"
        >
          Observaciones
        </button>
      </div>
    </div>
  );
}

/* ─── Reusable Card shell + QuickAction ───────────────────── */

const CARD_TONE = {
  default: "border-gray-100",
  amber:   "border-amber-100",
  rose:    "border-rose-100",
};

function Card({ title, subtitle, action, icon, tone = "default", children }) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm border ${CARD_TONE[tone]} p-5`}>
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            {icon && <span aria-hidden>{icon}</span>}
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-[var(--color-secondary)] hover:-translate-y-0.5 transition-all"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">
        {label}
      </span>
    </button>
  );
}
