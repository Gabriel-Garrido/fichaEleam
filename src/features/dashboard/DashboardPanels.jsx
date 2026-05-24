import { useState } from "react";
import HelpTooltip from "../../components/HelpTooltip";
import {
  STATUS,
  recordOverallLabel,
  recordOverallStatus,
} from "../vitalSigns/vitalRanges";
import {
  TIPO_LABEL, DEPENDENCIA_TONE, TURNOS,
  initials, timeAgo, daysUntil, riskTone,
} from "./dashboardUtils";
import {
  Card, AlertChip, BriefMetric, FilterPill,
  MiniVitals, SetupAction, Stat, SexoRow,
} from "./DashboardShared";

/* ─── Critical alerts strip ──────────────────────────────────── */

export function CriticalAlerts({ latestVitals, followUps, expiring, operational, assessments = [], loading, navigate }) {
  if (loading) return null;

  const critical = latestVitals.filter(
    (r) => r.ultimoSigno && recordOverallStatus(r.ultimoSigno) === "critical"
  );
  const docs7d = expiring.filter((d) => {
    const days = daysUntil(d.fecha_vencimiento);
    return days != null && days <= 7;
  });
  const emarUrgent = (operational?.emar?.pendiente_validacion ?? 0) + (operational?.emar?.vencidas ?? 0);
  const careUrgent = operational?.care?.vencidas ?? 0;
  const overdueAssessments = assessments.filter((a) => (a.dias_restantes ?? 0) < 0);
  const assessmentsCount = overdueAssessments.length;
  const totalAlertas = critical.length + followUps.length + docs7d.length + emarUrgent + careUrgent + assessmentsCount;

  if (!totalAlertas) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-emerald-600 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
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
        <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <h2 className="font-semibold text-rose-800">
          Atención inmediata · {totalAlertas} alerta{totalAlertas === 1 ? "" : "s"}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <AlertChip
          label="Medicamentos urgentes"
          value={emarUrgent}
          tone="rose"
          onClick={emarUrgent ? () => navigate("/turnos/emar") : null}
          hint={emarUrgent ? "Vencidos o registros sin validar" : "Al día"}
        />
        <AlertChip
          label="Tareas vencidas"
          value={careUrgent}
          tone="amber"
          onClick={careUrgent ? () => navigate("/turnos/tareas") : null}
          hint={careUrgent ? "Plan de cuidado por cerrar" : "Al día"}
        />
        <AlertChip
          label="Signos vitales críticos"
          value={critical.length}
          tone="rose"
          onClick={critical.length ? () => navigate("/vital-signs") : null}
          hint={critical.length ? critical.slice(0, 2).map((r) => `${r.nombre} ${r.apellido}`).join(" · ") : "Sin críticos"}
        />
        <AlertChip
          label="Seguimientos pendientes"
          value={followUps.length}
          tone="amber"
          onClick={followUps.length ? () => navigate("/observations") : null}
          hint={followUps.length ? "Observaciones marcadas para seguimiento" : "Al día"}
        />
        <AlertChip
          label="Documentos por vencer ≤ 7d"
          value={docs7d.length}
          tone="amber"
          onClick={docs7d.length ? () => navigate("/accreditation") : null}
          hint={docs7d.length ? "Renovar antes del vencimiento" : "Sin urgencias"}
        />
        <AlertChip
          label="Evaluaciones funcionales vencidas"
          value={assessmentsCount}
          tone="rose"
          onClick={assessmentsCount ? () => navigate(`/residents/${overdueAssessments[0].residente_id}`) : null}
          hint={assessmentsCount
            ? overdueAssessments.slice(0, 2).map((a) => `${a.residente_nombre}`).join(" · ")
            : "Barthel y Katz al día"}
        />
      </div>
    </div>
  );
}

/* ─── Management brief ────────────────────────────────────────── */

export function ManagementBrief({ loading, score, scoreTone, stale, followUps, expiring7, activity, operational, turno, navigate }) {
  if (loading) {
    return (
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </section>
    );
  }

  const currentActivity = activity?.[turno] ?? { signos: 0, observaciones: 0 };
  const turnoStatus = score >= 80 ? "Al día" : score >= 55 ? "Revisar" : "Prioritario";
  const turnoStatusDetail = score >= 80 ? "Sin bloqueos urgentes" : score >= 55 ? "Hay pendientes por cerrar" : "Resolver alertas primero";
  const turnoHealthHelp = "Mide qué tan despejado está el turno. Parte en 100% y baja si hay residentes sin control de signos hoy, signos fuera de rango, seguimientos abiertos o documentos SEREMI urgentes. Sirve para priorizar el trabajo, no reemplaza una evaluación clínica.";
  const nextActionHelp = "Se calcula con la alerta más accionable del momento: controles pendientes, seguimientos abiertos o documentos próximos a vencer.";
  const activityHelp = "Cuenta signos vitales y observaciones registrados durante el turno actual. Ayuda a confirmar si el equipo está dejando trazabilidad del trabajo.";
  const emarValidation = operational?.emar?.pendiente_validacion ?? 0;
  const emarOverdue = operational?.emar?.vencidas ?? 0;
  const careOverdue = operational?.care?.vencidas ?? 0;
  const carePending = operational?.care?.pendientes_operativos
    ?? ((operational?.care?.pendiente ?? 0) + (operational?.care?.reprogramada ?? 0));
  let nextAction;
  if (emarOverdue) {
    nextAction = { label: "Administrar medicamento vencido", hint: `${emarOverdue} medicamento${emarOverdue === 1 ? "" : "s"} fuera de horario`, path: "/turnos/emar", tone: "rose" };
  } else if (emarValidation) {
    nextAction = { label: "Validar medicamentos", hint: `${emarValidation} administraci${emarValidation === 1 ? "ón" : "ones"} requiere segundo usuario`, path: "/turnos/emar", tone: "rose" };
  } else if (careOverdue) {
    nextAction = { label: "Cerrar tareas vencidas", hint: `${careOverdue} tarea${careOverdue === 1 ? "" : "s"} de cuidado vencida${careOverdue === 1 ? "" : "s"}`, path: "/turnos/tareas", tone: "amber" };
  } else if (carePending) {
    nextAction = { label: "Completar tareas del turno", hint: `${carePending} tarea${carePending === 1 ? "" : "s"} pendiente${carePending === 1 ? "" : "s"}`, path: "/turnos/tareas", tone: "amber" };
  } else if (stale.length) {
    nextAction = { label: "Tomar controles pendientes", hint: `${stale.length} residente${stale.length === 1 ? "" : "s"} sin control hoy`, path: "/vital-signs/new", tone: "rose" };
  } else if (followUps.length) {
    nextAction = { label: "Cerrar seguimientos", hint: `${followUps.length} observaci${followUps.length === 1 ? "ón" : "ones"} por revisar`, path: "/observations", tone: "amber" };
  } else if (expiring7) {
    nextAction = { label: "Renovar documentos", hint: `${expiring7} vencen en 7 días o menos`, path: "/accreditation", tone: "amber" };
  } else {
    nextAction = { label: "Mantener seguimiento", hint: "Sin bloqueos urgentes; revisa el panel clínico si necesitas detalle", path: "/vital-signs", tone: "emerald" };
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Siguiente acción</p>
              <HelpTooltip label="Ayuda: siguiente acción">{nextActionHelp}</HelpTooltip>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{nextAction.label}</h2>
            <p className="text-sm text-slate-500 mt-1">{nextAction.hint}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(nextAction.path)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${nextAction.tone === "rose" ? "bg-rose-100 text-rose-700 focus:ring-rose-200" : nextAction.tone === "amber" ? "bg-amber-100 text-amber-800 focus:ring-amber-200" : "bg-emerald-100 text-emerald-700 focus:ring-emerald-200"}`}
          >
            Abrir
          </button>
        </div>
        {stale.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stale.slice(0, 4).map((r) => (
              <span key={r.id} className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs text-slate-600">
                <span className="h-5 w-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px] font-bold">
                  {initials(r.nombre, r.apellido)}
                </span>
                {r.apellido}
              </span>
            ))}
            {stale.length > 4 && (
              <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs text-slate-500">
                +{stale.length - 4} más
              </span>
            )}
          </div>
        )}
      </div>
      <BriefMetric
        label="Salud del turno"
        value={`${score}%`}
        status={turnoStatus}
        sub={turnoStatusDetail}
        tone={scoreTone}
        help={turnoHealthHelp}
      />
      <BriefMetric
        label="Registros del turno"
        value={currentActivity.signos + currentActivity.observaciones}
        sub={`${currentActivity.signos} signos · ${currentActivity.observaciones} observaciones`}
        tone={(currentActivity.signos + currentActivity.observaciones) > 0 ? "primary" : "slate"}
        help={activityHelp}
      />
    </section>
  );
}

/* ─── Risk matrix ─────────────────────────────────────────────── */

export function RiskMatrix({ clinicalSummary, highDependency, staleCount, followUpCount }) {
  const items = [
    { label: "Críticos",        value: clinicalSummary.critical, tone: clinicalSummary.critical ? "rose"    : "emerald" },
    { label: "Alta dependencia",value: highDependency,           tone: highDependency            ? "amber"   : "slate"   },
    { label: "Sin control hoy", value: staleCount,               tone: staleCount                ? "rose"    : "emerald" },
    { label: "Seguimientos",    value: followUpCount,            tone: followUpCount             ? "amber"   : "emerald" },
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

/* ─── First run panel ─────────────────────────────────────────── */

export function FirstRunPanel({ navigate }) {
  return (
    <section className="bg-white border border-teal-100 rounded-2xl shadow-sm p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-teal-700 font-semibold">Primeros pasos</p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Configura tu ELEAM para empezar a gestionar el turno</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Agrega residentes activos, registra el primer control y sube documentos base para que el dashboard entregue indicadores útiles.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:min-w-[460px]">
          <SetupAction label="Agregar residente" sub="Ficha clínica base"   onClick={() => navigate("/residents/new")} />
          <SetupAction label="Subir documento"   sub="Carpeta SEREMI"       onClick={() => navigate("/accreditation")} />
          <SetupAction label="Asignar camas"     sub="Habitaciones y camas" onClick={() => navigate("/camas")} />
        </div>
      </div>
    </section>
  );
}

/* ─── Clinical board ──────────────────────────────────────────── */

export function ClinicalBoard({ list, loading, error, navigate }) {
  const [filter, setFilter] = useState("all");

  if (error) {
    return (
      <Card title="Estado clínico actual">
        <p className="text-sm text-rose-700">No se pudo cargar el panel clínico.</p>
      </Card>
    );
  }

  const decorated = list.map((r) => ({
    ...r,
    status: r.ultimoSigno ? recordOverallStatus(r.ultimoSigno) : "sin",
  }));

  const counts = decorated.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    { critical: 0, warning: 0, normal: 0, unknown: 0, sin: 0 }
  );

  const filtered = decorated.filter((r) =>
    filter === "all" ? true : filter === "sin" ? !r.ultimoSigno : r.status === filter
  );

  const order = { critical: 0, warning: 1, unknown: 2, sin: 3, normal: 4 };
  filtered.sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));

  return (
    <Card
      title="Estado clínico actual"
      subtitle="Último signo vital de cada residente activo"
      action={
        <button type="button"
 onClick={() => navigate("/vital-signs/new")} className="text-xs text-teal-700 hover:underline">
          + Registrar →
        </button>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterPill active={filter === "all"}      onClick={() => setFilter("all")}                                label={`Todos · ${list.length}`}        tone="slate"   />
        <FilterPill active={filter === "critical"} onClick={() => setFilter(filter === "critical" ? "all" : "critical")} label={`Crítico · ${counts.critical}`}  tone="rose"    />
        <FilterPill active={filter === "warning"}  onClick={() => setFilter(filter === "warning"  ? "all" : "warning")}  label={`Atención · ${counts.warning}`}  tone="amber"   />
        <FilterPill active={filter === "normal"}   onClick={() => setFilter(filter === "normal"   ? "all" : "normal")}   label={`Normal · ${counts.normal}`}     tone="emerald" />
        <FilterPill active={filter === "sin"}      onClick={() => setFilter(filter === "sin"      ? "all" : "sin")}      label={`Sin datos · ${counts.sin}`}     tone="slate"   />
      </div>
      {loading ? (
        <div className="text-sm text-slate-400 py-6 text-center">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">
          {list.length === 0 ? "No hay residentes activos." : "No hay residentes en esta categoría."}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 -mx-2">
          {filtered.map((r) => <ClinicalRow key={r.id} r={r} navigate={navigate} />)}
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
      className="flex items-center gap-3 px-2 py-3 hover:bg-slate-50 rounded-xl cursor-pointer"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-bold">
        {initials(r.nombre, r.apellido)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-800 truncate text-sm">{r.apellido}, {r.nombre}</span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {overall.label}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {r.ubicacion_label && <span>{r.ubicacion_label}</span>}
          {r.ultimoSigno ? (
            <span>
              Último: {timeAgo(r.ultimoSigno.fecha_hora)}
              {r.ultimoSigno.turno && <span className="ml-1 capitalize text-slate-400">· {r.ultimoSigno.turno}</span>}
            </span>
          ) : (
            <span className="text-slate-400">Sin signos vitales registrados</span>
          )}
        </div>
      </div>
      {r.ultimoSigno ? (
        <MiniVitals s={r.ultimoSigno} status={status} />
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/vital-signs/new?residenteId=${r.id}`); }}
          className="text-xs text-teal-700 hover:underline shrink-0"
        >
          Registrar →
        </button>
      )}
    </li>
  );
}

/* ─── Dependency chart ────────────────────────────────────────── */

export function DependencyChart({ dist, total }) {
  if (!dist || total === 0) {
    return (
      <Card title="Dependencia" subtitle="Distribución de residentes activos">
        <p className="text-sm text-slate-400">Sin residentes activos.</p>
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
                <span className="text-slate-500 tabular-nums">{v} <span className="text-slate-400">· {pct}%</span></span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className={`h-2 rounded-full ${t.bg} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── Shift activity ──────────────────────────────────────────── */

export function ShiftActivity({ activity, turno }) {
  if (!activity) {
    return (
      <Card title="Actividad por turno" subtitle="Registros del día">
        <p className="text-sm text-slate-400">Sin datos.</p>
      </Card>
    );
  }
  const max = Math.max(1, ...TURNOS.map((t) => activity[t].signos + activity[t].observaciones));
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
                <span className={`capitalize ${isCurrent ? "font-semibold text-teal-700" : "text-slate-600"}`}>
                  {t} {isCurrent && <span className="text-[10px] uppercase tracking-wider">· actual</span>}
                </span>
                <span className="text-slate-500 tabular-nums">{a.signos} sv · {a.observaciones} obs</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                <div className="h-2 bg-teal-700"    style={{ width: `${(a.signos / max) * 100}%` }} />
                <div className="h-2 bg-teal-400"    style={{ width: `${(a.observaciones / max) * 100}%` }} />
                <div className="h-2"                style={{ width: `${100 - pct}%` }} />
              </div>
            </div>
          );
        })}
        <div className="flex gap-3 text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-teal-700" /> Signos vitales</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-teal-400" /> Observaciones</span>
        </div>
      </div>
    </Card>
  );
}

/* ─── Demographics ────────────────────────────────────────────── */

export function Demographics({ stats }) {
  if (!stats) {
    return (
      <Card title="Demografía">
        <p className="text-sm text-slate-400">Sin datos.</p>
      </Card>
    );
  }
  const totalActivos = stats.activos || 0;
  const fem  = stats.sexos?.femenino  ?? 0;
  const mas  = stats.sexos?.masculino ?? 0;
  const otro = stats.sexos?.otro      ?? 0;
  const pct = (n) => (totalActivos ? Math.round((n / totalActivos) * 100) : 0);
  return (
    <Card title="Demografía" subtitle="Residentes activos">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Stat label="Edad promedio" value={stats.edadPromedio != null ? `${stats.edadPromedio}` : "—"} sub="años" />
        <Stat label="Activos" value={totalActivos} sub={`${stats.total} totales`} />
      </div>
      <div className="space-y-2">
        <SexoRow label="Femenino" value={fem}  pct={pct(fem)}  color="bg-pink-400" />
        <SexoRow label="Masculino" value={mas} pct={pct(mas)}  color="bg-sky-400"  />
        {otro > 0 && <SexoRow label="Otro" value={otro} pct={pct(otro)} color="bg-slate-400" />}
      </div>
    </Card>
  );
}

/* ─── Bottom row cards ────────────────────────────────────────── */

export function FollowUpsCard({ items, navigate }) {
  return (
    <Card
      title="Seguimientos pendientes"
      subtitle={`${items.length} observaci${items.length === 1 ? "ón" : "ones"} con seguimiento`}
      tone="amber"
      action={items.length > 0 && (
        <button type="button"
 onClick={() => navigate("/observations")} className="text-xs text-amber-700 hover:underline">Ver todos →</button>
      )}
    >
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">Sin seguimientos pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((obs) => (
            <li key={obs.id} onClick={() => navigate(`/residents/${obs.residente_id}`)}
              className="bg-white rounded-xl border border-slate-100 px-3 py-2 cursor-pointer hover:bg-amber-50/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-slate-800 text-sm truncate">
                  {obs.residentes ? `${obs.residentes.apellido}, ${obs.residentes.nombre}` : "—"}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(obs.fecha_hora)}</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium">{TIPO_LABEL[obs.tipo] ?? obs.tipo}</div>
              <p className="text-xs text-slate-500 line-clamp-2">{obs.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function IncidentsCard({ items, navigate }) {
  return (
    <Card
      title="Incidentes y caídas"
      subtitle="Últimos 7 días"
      tone="rose"
      action={items.length > 0 && (
        <button type="button"
 onClick={() => navigate("/observations")} className="text-xs text-rose-700 hover:underline">Ver todos →</button>
      )}
    >
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">Sin incidentes registrados esta semana.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((obs) => (
            <li key={obs.id} onClick={() => navigate(`/residents/${obs.residente_id}`)}
              className="bg-white rounded-xl border border-slate-100 px-3 py-2 cursor-pointer hover:bg-rose-50/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-slate-800 text-sm truncate">
                  {obs.residentes ? `${obs.residentes.apellido}, ${obs.residentes.nombre}` : "—"}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(obs.fecha_hora)}</span>
              </div>
              <div className="text-[11px] text-rose-700 font-medium">{TIPO_LABEL[obs.tipo] ?? obs.tipo}</div>
              <p className="text-xs text-slate-500 line-clamp-2">{obs.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ExpiringDocsCard({ items, navigate }) {
  return (
    <Card
      title="Documentos por vencer"
      subtitle="Próximos 30 días"
      tone="amber"
      action={items.length > 0 && (
        <button type="button"
 onClick={() => navigate("/accreditation")} className="text-xs text-amber-700 hover:underline">Ver todos →</button>
      )}
    >
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">Sin vencimientos próximos.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((re) => {
            const daysLeft = Math.ceil((new Date(re.fecha_vencimiento) - new Date()) / 86400000);
            const urgent = daysLeft <= 7;
            const r = re.requisito;
            return (
              <li key={re.id} onClick={() => navigate(`/accreditation/requisito/${re.id}`)}
                className="bg-white rounded-xl border border-slate-100 px-3 py-2 cursor-pointer hover:bg-amber-50/50 transition-colors flex justify-between items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-800 text-sm truncate block">{r?.nombre ?? "—"}</span>
                  <span className="text-[11px] text-slate-400 truncate block">{r?.codigo} · {r?.ambito?.nombre ?? "—"}</span>
                </div>
                <span className={`text-xs font-bold tabular-nums shrink-0 px-2 py-0.5 rounded-full ${urgent ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
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

export function AccreditationCard({ acreditacion, navigate, loading }) {
  const ambitos = (acreditacion.ambitos ?? []).slice(0, 6);
  return (
    <div className="lg:col-span-2 bg-gradient-to-br from-white to-teal-50/40 rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">Carpeta SEREMI</p>
          <p className="text-sm text-slate-600">
            {acreditacion.cumple} de {acreditacion.total} requisitos al día
            {acreditacion.observacionesAbiertas ? ` · ${acreditacion.observacionesAbiertas} observación${acreditacion.observacionesAbiertas === 1 ? "" : "es"} abierta${acreditacion.observacionesAbiertas === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <span className="text-3xl font-bold text-teal-700 tabular-nums">
          {loading ? "…" : `${acreditacion.porcentaje}%`}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 bg-gradient-to-r from-teal-500 to-teal-700 rounded-full transition-all duration-700"
          style={{ width: `${acreditacion.porcentaje}%` }}
        />
      </div>
      {ambitos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          {ambitos.map((a) => {
            const tone = a.porcentaje >= 80 ? "border-emerald-200 bg-emerald-50" :
                         a.porcentaje >= 50 ? "border-amber-200 bg-amber-50" :
                                              "border-rose-200 bg-rose-50";
            return (
              <button type="button"
 key={a.codigo} onClick={() => navigate(`/accreditation/ambito/${a.codigo}`)}
                className={`text-left rounded-xl border p-2 hover:shadow-sm transition-all ${tone}`}
              >
                <p className="text-[10px] font-mono text-slate-500">{a.codigo}</p>
                <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-1">{a.nombre}</p>
                <p className="text-xs font-bold tabular-nums mt-0.5">{a.porcentaje}%</p>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between mt-4">
        <button type="button"
 onClick={() => navigate("/accreditation")} className="text-xs font-semibold text-teal-700 hover:underline">
          Abrir Carpeta SEREMI →
        </button>
        <button type="button"
 onClick={() => navigate("/accreditation/observaciones")} className="text-xs text-slate-500 hover:underline">
          Observaciones
        </button>
      </div>
    </div>
  );
}
