import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import HelpTooltip from "../../components/HelpTooltip";
import { ContentLoading } from "../../components/Loading";
import PageLayout from "../../layout/PageLayout";
import { loadDashboard } from "./dashboardService";
import { recordOverallStatus } from "../vitalSigns/vitalRanges";
import { getOpenAdverseEventsCount } from "../adverseEvents/eventosAdversosService";
import {
  CARE_TURN_PERMISSIONS,
  MEDICATION_TURN_PERMISSIONS,
} from "../permissions/accessRules";
import {
  currentShift, todayDateLong, isSameDay,
} from "./dashboardUtils";
import { KpiCard, QuickAction } from "./DashboardShared";
import {
  CriticalAlerts, RiskMatrix, DependencyChart, ShiftActivity, Demographics,
} from "./DashboardPanels";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, eleam, can, canFeature } = useAuth();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [adverseCount, setAdverseCount] = useState({ total: 0, gravesOCriticos: 0 });
  const [adverseLoading, setAdverseLoading] = useState(true);
  const [adverseError, setAdverseError] = useState(false);
  const canUse = (featureId, permission = null) =>
    canFeature(featureId) && (!permission || can(permission));
  const canResidents = canFeature("residents");
  const canOpenTurnTasks = canResidents
    && CARE_TURN_PERMISSIONS.some((permission) => can(permission));
  const canWorkOnCare = canUse("residents", "completar_tareas_cuidado");
  const canResolveFollowUps = canUse("residents", "crear_observaciones");
  const canWorkOnMedications = canResidents
    && MEDICATION_TURN_PERMISSIONS.some((permission) => can(permission));
  const dashboardAccess = useMemo(() => ({
    residents: canResidents,
    compliance: canFeature("compliance"),
    personnel: canFeature("personnel"),
    operational: canOpenTurnTasks || canWorkOnMedications,
  }), [canFeature, canOpenTurnTasks, canResidents, canWorkOnMedications]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setLoading(true);
    setData(null);
    loadDashboard(dashboardAccess)
      .then((nextData) => { if (!cancelled) setData(nextData); })
      .catch((err) => {
        if (!cancelled) {
          console.error("loadDashboard", err);
          setLoadError(true);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dashboardAccess, reloadKey]);

  useEffect(() => {
    if (!eleam?.id || !canResidents) { setAdverseCount({ total: 0, gravesOCriticos: 0 }); setAdverseLoading(false); return; }
    let cancelled = false;
    setAdverseLoading(true);
    setAdverseError(false);
    getOpenAdverseEventsCount(eleam.id)
      .then((counts) => { if (!cancelled) setAdverseCount(counts); })
      .catch(() => { if (!cancelled) setAdverseError(true); })
      .finally(() => { if (!cancelled) setAdverseLoading(false); });
    return () => { cancelled = true; };
  }, [canResidents, eleam?.id]);

  const stats   = data?.residentStats ?? null;
  const errors  = data?.errors ?? {};
  const turno   = currentShift();
  const operational = data?.operationalSummary ?? null;

  const acreditacion = useMemo(() => {
    const s = data?.acreditacionSummary;
    if (!s) return { porcentaje: 0, total: 0, vigente: 0, pendientes: 0, vencidos: 0, observacionesAbiertas: 0, ambitos: [] };
    return {
      porcentaje:            s.porcentaje ?? 0,
      total:                 s.total ?? 0,
      vigente:               s.vigente ?? 0,
      pendientes:            s.pendientes ?? 0,
      vencidos:              (s.vencidos ?? []).length,
      porVencer:             (s.porVencer ?? []).length,
      observacionesAbiertas: (s.observaciones ?? []).length,
      requisitosConEvidencia:s.requisitosConEvidencia ?? 0,
      evidenciasVigentes:    s.evidenciasVigentes ?? 0,
      ambitos:               s.ambitos ?? [],
    };
  }, [data]);

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

  const cobertura = useMemo(() => {
    const list = data?.latestVitalsByResident ?? [];
    if (!list.length) return null;
    const conHoy = list.filter((r) => r.ultimoSigno && isSameDay(r.ultimoSigno.fecha_hora)).length;
    return { hoy: conHoy, total: list.length, pct: Math.round((conHoy / list.length) * 100) };
  }, [data]);

  const management = useMemo(() => {
    const list = data?.latestVitalsByResident ?? [];
    const stale = list.filter((r) => !r.ultimoSigno || !isSameDay(r.ultimoSigno.fecha_hora));
    const highDependency = list.filter(
      (r) => r.nivel_dependencia === "severo" || r.nivel_dependencia === "total"
    ).length;
    return { stale, highDependency };
  }, [data]);

  const mainQuickActions = [
    canUse("residents", "registrar_entregas_turno") && { iconId: "shift", label: "Entrega de turno", description: "Deja el resumen para el siguiente equipo.", route: "/operacion/turnos/nuevo" },
    canOpenTurnTasks && { iconId: "tasks", label: "Tareas del turno", description: "Revisa los registros y pendientes que puedes realizar.", route: "/operacion/cuidados" },
    canWorkOnMedications && { iconId: "meds", label: "Medicamentos", description: "Administra o valida lo programado.", route: "/operacion/medicamentos" },
  ].filter(Boolean);
  const initialLoading = (loading || adverseLoading) && !loadError;

  return (
    <PageLayout
      title="Resumen del día"
      eyebrow={`${todayDateLong()} · turno ${turno}`}
      description={`${profile?.nombre ? `Hola, ${profile.nombre}. ` : ""}${eleam?.nombre ? `${eleam.nombre}: ` : ""}revisa las prioridades y continúa con el trabajo del turno.`}
      className="space-y-5"
    >
      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-800">No se pudo cargar el resumen del día</p>
          <p className="text-xs text-rose-600 mt-1">Revisa tu conexión y recarga la página para reintentar.</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {mainQuickActions.length > 0 && (
        <section aria-labelledby="dashboard-actions-title">
          <div className="mb-3 flex items-center gap-1.5">
            <h2 id="dashboard-actions-title" className="text-sm font-bold text-slate-800">Acciones del turno</h2>
            <HelpTooltip label="Ayuda sobre acciones del turno">
              Se muestran sólo las acciones disponibles para tu rol. Las consultas y configuraciones permanecen en el menú lateral.
            </HelpTooltip>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {mainQuickActions.map((action) => (
              <QuickAction
                key={action.route}
                iconId={action.iconId}
                label={action.label}
                description={action.description}
                onClick={() => navigate(action.route)}
              />
            ))}
          </div>
        </section>
      )}

      {initialLoading ? (
        <ContentLoading message="Cargando el resumen del día..." cards={4} rows={4} />
      ) : data ? (<>
      <CriticalAlerts
        latestVitals={data?.latestVitalsByResident ?? []}
        followUps={data?.pendingFollowUps ?? []}
        expiring={data?.expiringDocuments ?? []}
        operational={operational}
        assessments={data?.pendingAssessments ?? []}
        ds20Residents={data?.ds20Residents ?? []}
        ds20Staffing={data?.ds20Staffing ?? []}
        adverseEvents={adverseCount}
        loading={loading}
        incomplete={adverseError || Object.values(errors).some(Boolean)}
        navigate={navigate}
        canFeature={canFeature}
        canCare={canWorkOnCare}
        canFollowUps={canResolveFollowUps}
        canMedications={canWorkOnMedications}
      />

      <section aria-labelledby="dashboard-status-title">
        <div className="mb-3 flex items-center gap-1.5">
          <h2 id="dashboard-status-title" className="text-sm font-bold text-slate-800">Estado de hoy</h2>
          <HelpTooltip label="Ayuda sobre el estado de hoy">
            Indicadores breves para confirmar cobertura y detectar brechas. Selecciona una tarjeta para revisar el detalle.
          </HelpTooltip>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {canUse("residents") && !errors.residentStats && <KpiCard
            title="Residentes activos"
            help="Personas que actualmente forman parte de la operación del ELEAM."
            value={loading ? "…" : stats?.activos ?? 0}
            sub={stats ? `${stats.hospitalizados} hospitalizados` : "—"}
            icon="residents"
            tone="primary"
            onClick={() => navigate("/residents")}
          />}
          {canUse("residents") && <KpiCard
            title="Requieren atención"
            help="Residentes cuyo último control de signos vitales está fuera del rango esperado."
            value={loading ? "…" : clinicalSummary.critical + clinicalSummary.warning}
            sub={loading ? "—" : clinicalSummary.critical ? `${clinicalSummary.critical} críticos · ${clinicalSummary.warning} en atención` : clinicalSummary.warning ? `${clinicalSummary.warning} en atención` : "Sin alertas clínicas"}
            icon="vitals"
            tone={clinicalSummary.critical ? "rose" : clinicalSummary.warning ? "amber" : "emerald"}
            onClick={() => navigate("/vital-signs")}
          />}
          {canUse("residents") && <KpiCard
            title="Controles de hoy"
            help="Residentes activos con al menos un registro de signos vitales durante el día."
            value={loading ? "…" : cobertura ? `${cobertura.pct}%` : "—"}
            sub={cobertura ? `${cobertura.hoy} de ${cobertura.total} residentes` : "Sin residentes activos"}
            icon="observations"
            tone={!cobertura ? "slate" : cobertura.pct >= 80 ? "emerald" : cobertura.pct >= 40 ? "amber" : "rose"}
            onClick={() => navigate(can("crear_signos_vitales") ? "/vital-signs/new" : "/vital-signs")}
          />}
          {canUse("compliance") && <KpiCard
            title="Documentación DS 20"
            help="Requisitos aplicables que actualmente cuentan con evidencia vigente."
            value={loading ? "…" : `${acreditacion.porcentaje}%`}
            sub={`${acreditacion.vigente} de ${acreditacion.total} vigentes${acreditacion.vencidos ? ` · ${acreditacion.vencidos} vencidos` : ""}`}
            icon="accreditation"
            tone={acreditacion.porcentaje >= 80 ? "emerald" : acreditacion.porcentaje >= 40 ? "amber" : "rose"}
            onClick={() => navigate("/cumplimiento")}
          />}
        </div>
      </section>

      {canUse("residents") && (canWorkOnCare || canWorkOnMedications) && <OperationalTurnPanel
        loading={loading}
        summary={operational}
        navigate={navigate}
        canCare={canWorkOnCare}
        canMedications={canWorkOnMedications}
      />}

      {canUse("residents") && <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Más información</h2>
            <p className="text-xs text-slate-500">Distribución de residentes y actividad registrada por turno.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 group-open:hidden">Ver</span>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 group-open:inline-flex">Ocultar</span>
        </summary>
        <div className="border-t border-slate-100 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RiskMatrix
              clinicalSummary={clinicalSummary}
              highDependency={management.highDependency}
              staleCount={management.stale.length}
              followUpCount={(data?.pendingFollowUps ?? []).length}
            />
            <DependencyChart dist={stats?.dependencia} total={stats?.activos ?? 0} />
            <ShiftActivity activity={data?.activityByShift} turno={turno} />
            <Demographics stats={stats} />
          </div>
        </div>
      </details>}
      </>) : null}
    </PageLayout>
  );
}

function OperationalTurnPanel({ loading, summary, navigate, canCare, canMedications }) {
  if (loading || !summary) return null;

  const care = summary.care ?? {};
  const emar = summary.emar ?? {};
  const emarPending = (emar.pendiente ?? 0) + (emar.pendiente_validacion ?? 0);
  const carePending = care.pendientes_operativos ?? ((care.pendiente ?? 0) + (care.reprogramada ?? 0));
  const emarTone = (emar.vencidas ?? 0) || (emar.pendiente_validacion ?? 0) ? "rose" : emarPending ? "amber" : "emerald";
  const careTone = (care.vencidas ?? 0) ? "rose" : carePending ? "amber" : "emerald";

  return (
    <section aria-labelledby="dashboard-work-title">
      <h2 id="dashboard-work-title" className="mb-3 text-sm font-bold text-slate-800">Trabajo del turno</h2>
      <div className={`grid grid-cols-1 gap-3 ${canCare && canMedications ? "lg:grid-cols-2" : ""}`}>
      {canMedications && <OperationalCard
        title="Medicamentos del turno"
        value={emarPending}
        tone={emarTone}
        sub={`${emar.pendiente ?? 0} pendientes · ${emar.pendiente_validacion ?? 0} por validar · ${emar.vencidas ?? 0} vencidos`}
        action="Abrir medicamentos"
        onClick={() => navigate("/operacion/medicamentos")}
      />}
      {canCare && <OperationalCard
        title="Cuidados del turno"
        value={carePending}
        tone={careTone}
        sub={`${care.pendiente ?? 0} pendientes · ${care.reprogramada ?? 0} reprogramadas · ${care.vencidas ?? 0} vencidas`}
        action="Abrir tareas"
        onClick={() => navigate("/operacion/cuidados")}
      />}
      </div>
    </section>
  );
}

function OperationalCard({ title, value, sub, tone, action, onClick }) {
  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone] ?? "border-slate-200 bg-white text-slate-900";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</p>
          <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
          <p className="mt-1 text-sm opacity-80">{sub}</p>
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">{action}</span>
      </div>
    </button>
  );
}
