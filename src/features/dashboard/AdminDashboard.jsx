import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import HelpTooltip from "../../components/HelpTooltip";
import PageLayout from "../../layout/PageLayout";
import { WelcomeModal, hasSeenWelcome, markWelcomeSeen } from "../welcome";
import OnboardingSteps from "./OnboardingSteps";
import { loadDashboard } from "./dashboardService";
import { recordOverallStatus } from "../vitalSigns/vitalRanges";
import { getOpenAdverseEventsCount } from "../adverseEvents/eventosAdversosService";
import {
  currentShift, todayDateLong, daysUntil, isSameDay,
} from "./dashboardUtils";
import { KpiCard, QuickAction } from "./DashboardShared";
import {
  CriticalAlerts, ManagementBrief, RiskMatrix, FirstRunPanel,
  ClinicalBoard, DependencyChart, ShiftActivity, Demographics,
  FollowUpsCard, IncidentsCard, ExpiringDocsCard, AccreditationCard,
} from "./DashboardPanels";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, eleam, rol, can, canFeature, isAdminEleam } = useAuth();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [adverseCount, setAdverseCount] = useState({ total: 0, gravesOCriticos: 0 });
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (isAdminEleam && profile?.id && !hasSeenWelcome(profile.id)) {
      setShowWelcome(true);
    }
  }, [isAdminEleam, profile?.id]);

  const closeWelcome = () => {
    if (profile?.id) markWelcomeSeen(profile.id);
    setShowWelcome(false);
  };

  useEffect(() => {
    setLoadError(false);
    loadDashboard()
      .then(setData)
      .catch((err) => { console.error("loadDashboard", err); setLoadError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!eleam?.id) { setAdverseCount({ total: 0, gravesOCriticos: 0 }); return; }
    let cancelled = false;
    getOpenAdverseEventsCount(eleam.id)
      .then((counts) => { if (!cancelled) setAdverseCount(counts); })
      .catch(() => { if (!cancelled) setAdverseCount({ total: 0, gravesOCriticos: 0 }); });
    return () => { cancelled = true; };
  }, [eleam?.id]);

  const stats   = data?.residentStats ?? null;
  const errors  = data?.errors ?? {};
  const turno   = currentShift();
  const operational = data?.operationalSummary ?? null;
  const beds = data?.bedSummary ?? null;

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
    const expiring7 = (data?.expiringDocuments ?? []).filter((d) => {
      const days = daysUntil(d.fecha_vencimiento);
      return days != null && days <= 7;
    }).length;
    const emarValidation = data?.operationalSummary?.emar?.pendiente_validacion ?? 0;
    const emarOverdue = data?.operationalSummary?.emar?.vencidas ?? 0;
    const careOverdue = data?.operationalSummary?.care?.vencidas ?? 0;
    const carePending = data?.operationalSummary?.care?.pendientes_operativos
      ?? ((data?.operationalSummary?.care?.pendiente ?? 0) + (data?.operationalSummary?.care?.reprogramada ?? 0));
    const totalAlerts =
      clinicalSummary.critical +
      clinicalSummary.warning +
      stale.length +
      (data?.pendingFollowUps ?? []).length +
      expiring7 +
      emarValidation +
      emarOverdue +
      careOverdue;
    const score = Math.max(0, 100 -
      clinicalSummary.critical * 18 -
      clinicalSummary.warning  * 8 -
      stale.length             * 7 -
      (data?.pendingFollowUps ?? []).length * 5 -
      expiring7                * 6 -
      emarOverdue              * 18 -
      emarValidation           * 14 -
      careOverdue              * 8 -
      carePending              * 2
    );
    return {
      stale, highDependency, expiring7, totalAlerts, score,
      scoreTone: score >= 80 ? "emerald" : score >= 55 ? "amber" : "rose",
    };
  }, [data, clinicalSummary]);

  const canUse = (featureId, permission = null) =>
    canFeature(featureId) && (!permission || can(permission));

  const headerActions = [
    canUse("turnos") && {
      key: "shift",
      label: "Entrega de turno",
      className: "rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800",
      onClick: () => navigate("/turnos/nueva"),
    },
    canUse("vital-signs", "crear_signos_vitales") && {
      key: "vitals",
      label: "Registrar control",
      className: "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50",
      onClick: () => navigate("/vital-signs/new"),
    },
  ].filter(Boolean);

  const mainQuickActions = [
    canUse("turnos") && { iconId: "shift", label: "Entrega de turno", route: "/turnos/nueva" },
    canUse("care-plans") && { iconId: "tasks", label: "Tareas diarias", route: "/turnos/tareas" },
    canUse("emar", "administrar_medicamentos") && { iconId: "meds", label: "Medicamentos del turno", route: "/turnos/emar" },
    canUse("vital-signs", "crear_signos_vitales") && { iconId: "vitals", label: "Registrar signos vitales", route: "/vital-signs/new" },
    canUse("observations", "crear_observaciones") && { iconId: "observations", label: "Nueva observación", route: "/observations/new" },
    rol !== "funcionario" && canUse("accreditation") && { iconId: "accreditation", label: "Carpeta SEREMI", route: "/accreditation/carpeta" },
    rol === "funcionario" && canUse("residents") && { iconId: "residents", label: "Ver residentes", route: "/residents" },
  ].filter(Boolean);

  const extraQuickActions = [
    canUse("residents", "crear_residentes") && { iconId: "residents", label: "Agregar residente", route: "/residents/new" },
    canUse("residents") && { iconId: "residents", label: "Ver residentes", route: "/residents" },
    canUse("vital-signs") && { iconId: "vitals", label: "Historial signos", route: "/vital-signs" },
    canUse("observations") && { iconId: "observations", label: "Ver observaciones", route: "/observations" },
    canUse("accreditation") && { iconId: "accreditation", label: "Panel acreditación", route: "/accreditation" },
    rol !== "funcionario" && canUse("team") && { iconId: "team", label: "Gestionar equipo", route: "/equipo" },
  ].filter(Boolean);

  const showOnboarding = isAdminEleam && !loading && !loadError && (stats?.total ?? 0) === 0;

  if (showOnboarding) {
    return (
      <PageLayout
        title={profile?.nombre ? `Hola, ${profile.nombre}` : "Inicio"}
        eyebrow={`${todayDateLong()} · turno ${turno}`}
        description={`${eleam?.nombre ? `${eleam.nombre}. ` : ""}Configura tu ELEAM en pocos pasos para empezar a gestionar el día.`}
        className="space-y-6"
      >
        <WelcomeModal
          open={showWelcome}
          onClose={closeWelcome}
          adminName={profile?.nombre}
          eleamName={eleam?.nombre}
          isDemo={eleam?.plan === "demo"}
        />
        <OnboardingSteps eleamName={eleam?.nombre} isDemo={eleam?.plan === "demo"} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={profile?.nombre ? `Hola, ${profile.nombre}` : "Inicio"}
      eyebrow={`${todayDateLong()} · turno ${turno}`}
      description={`${eleam?.nombre ? `${eleam.nombre}. ` : ""}${loading ? "Cargando actividad del día..." : `${data?.signosHoy ?? 0} signos vitales y ${data?.observacionesHoy ?? 0} observaciones registradas hoy${cobertura ? ` · ${cobertura.pct}% de cobertura` : ""}.`}`}
      actions={
        headerActions.length > 0 ? (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            {headerActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className={action.className}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null
      }
      className="space-y-6"
    >
      <WelcomeModal
        open={showWelcome}
        onClose={closeWelcome}
        adminName={profile?.nombre}
        eleamName={eleam?.nombre}
        isDemo={eleam?.plan === "demo"}
      />

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-800">No se pudo cargar el resumen del día</p>
          <p className="text-xs text-rose-600 mt-1">Revisa tu conexión y recarga la página para reintentar.</p>
          <button
            type="button"
            onClick={() => { setLoadError(false); setLoading(true); loadDashboard().then(setData).catch((err) => { console.error("loadDashboard", err); setLoadError(true); }).finally(() => setLoading(false)); }}
            className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !loadError && (stats?.total ?? 0) === 0 && (
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
        operational={operational}
        turno={turno}
        navigate={navigate}
      />

      <OperationalTurnPanel
        loading={loading}
        summary={operational}
        navigate={navigate}
      />

      {/* Top KPIs — orden según rol */}
      {!errors.residentStats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {rol === "funcionario" ? (
            <>
              <KpiCard
                title="Alertas críticas"
                help="Residentes con signos vitales en rango crítico en su último control. Atender primero."
                value={loading ? "…" : clinicalSummary.critical || 0}
                sub={loading ? "—" : clinicalSummary.critical > 0 ? `+ ${clinicalSummary.warning} en atención` : clinicalSummary.warning > 0 ? `${clinicalSummary.warning} requieren atención` : "Todos en rango normal"}
                icon="vitals"
                tone={clinicalSummary.critical > 0 ? "rose" : clinicalSummary.warning > 0 ? "amber" : "emerald"}
                onClick={() => navigate("/vital-signs")}
              />
              <KpiCard
                title="Sin control hoy"
                help="Residentes activos sin ningún signo vital registrado durante el día de hoy."
                value={loading ? "…" : management.stale.length}
                sub={cobertura ? `${cobertura.hoy} de ${cobertura.total} con cobertura (${cobertura.pct}%)` : "Sin residentes activos"}
                icon="observations"
                tone={management.stale.length > 0 ? "amber" : "emerald"}
                onClick={() => navigate("/vital-signs/new")}
              />
              <KpiCard
                title="Residentes activos"
                help="Residentes que hoy forman parte de la operación del ELEAM."
                value={loading ? "…" : stats?.activos ?? 0}
                sub={stats ? `${stats.hospitalizados} hospitalizados · ${stats.total} totales` : "—"}
                icon="residents"
                tone="primary"
                onClick={() => navigate("/residents")}
              />
              <KpiCard
                title="Ocupación camas"
                help="Camas operativas ocupadas o reservadas por hospitalización."
                value={loading || errors.beds ? "…" : `${beds?.porcentajeOcupacion ?? 0}%`}
                sub={beds ? `${beds.disponibles} disponibles · ${beds.residentesSinCama} residentes sin cama` : "Sin inventario de camas"}
                icon="beds"
                tone={(beds?.disponibles ?? 0) > 0 ? "emerald" : "amber"}
                onClick={() => navigate("/camas")}
              />
              <KpiCard
                title="Carpeta SEREMI DS 20"
                help="Avance de requisitos con evidencia vigente, sin contar los que no aplican."
                value={loading ? "…" : `${acreditacion.porcentaje}%`}
                sub={`${acreditacion.vigente} de ${acreditacion.total} requisitos vigentes${acreditacion.vencidos ? ` · ${acreditacion.vencidos} vencido${acreditacion.vencidos === 1 ? "" : "s"}` : ""}`}
                icon="accreditation"
                tone={acreditacion.porcentaje >= 80 ? "emerald" : acreditacion.porcentaje >= 40 ? "amber" : "rose"}
                onClick={() => navigate("/accreditation")}
              />
            </>
          ) : (
            <>
              <KpiCard
                title="Residentes activos"
                help="Residentes que hoy forman parte de la operación del ELEAM. Los egresados y fallecidos quedan en historial."
                value={loading ? "…" : stats?.activos ?? 0}
                sub={stats ? `${stats.hospitalizados} hospitalizados · ${stats.total} totales` : "—"}
                icon="residents"
                tone="primary"
                onClick={() => navigate("/residents")}
              />
              <KpiCard
                title="Ocupación camas"
                help="Camas operativas ocupadas o reservadas por hospitalización."
                value={loading || errors.beds ? "…" : `${beds?.porcentajeOcupacion ?? 0}%`}
                sub={beds ? `${beds.disponibles} disponibles · ${beds.residentesSinCama} residentes sin cama` : "Sin inventario de camas"}
                icon="beds"
                tone={(beds?.disponibles ?? 0) > 0 ? "emerald" : "amber"}
                onClick={() => navigate("/camas")}
              />
              <KpiCard
                title="Estado clínico"
                help="Cuenta residentes cuyo último control vital está fuera de rango. Entra aquí para priorizar controles."
                value={loading ? "…" : (clinicalSummary.critical + clinicalSummary.warning) || 0}
                sub={loading ? "—" : clinicalSummary.critical > 0 ? `${clinicalSummary.critical} crítico${clinicalSummary.critical === 1 ? "" : "s"} · ${clinicalSummary.warning} en atención` : clinicalSummary.warning > 0 ? `${clinicalSummary.warning} requieren atención` : "Todos en rango normal"}
                icon="vitals"
                tone={clinicalSummary.critical > 0 ? "rose" : clinicalSummary.warning > 0 ? "amber" : "emerald"}
                onClick={() => navigate("/vital-signs")}
              />
              <KpiCard
                title="Cobertura signos hoy"
                help="Porcentaje de residentes activos con al menos un registro de signos vitales durante el día actual."
                value={cobertura ? `${cobertura.pct}%` : "—"}
                sub={cobertura ? `${cobertura.hoy} de ${cobertura.total} residentes` : "Sin residentes activos"}
                icon="observations"
                tone={!cobertura ? "slate" : cobertura.pct >= 80 ? "emerald" : cobertura.pct >= 40 ? "amber" : "rose"}
                onClick={() => navigate("/vital-signs/new")}
              />
              <KpiCard
                title="Carpeta SEREMI DS 20"
                help="Avance de requisitos con evidencia vigente, sin contar los que no aplican."
                value={loading ? "…" : `${acreditacion.porcentaje}%`}
                sub={`${acreditacion.vigente} de ${acreditacion.total} requisitos vigentes${acreditacion.vencidos ? ` · ${acreditacion.vencidos} vencido${acreditacion.vencidos === 1 ? "" : "s"}` : ""}`}
                icon="accreditation"
                tone={acreditacion.porcentaje >= 80 ? "emerald" : acreditacion.porcentaje >= 40 ? "amber" : "rose"}
                onClick={() => navigate("/accreditation")}
              />
            </>
          )}
        </section>
      )}

      <CriticalAlerts
        latestVitals={data?.latestVitalsByResident ?? []}
        followUps={data?.pendingFollowUps ?? []}
        expiring={data?.expiringDocuments ?? []}
        operational={operational}
        assessments={data?.pendingAssessments ?? []}
        adverseEvents={adverseCount}
        loading={loading}
        navigate={navigate}
      />

      <ClinicalBoard
        list={data?.latestVitalsByResident ?? []}
        loading={loading}
        error={errors.latestVitals}
        navigate={navigate}
      />

      <details className="group bg-white rounded-2xl border border-slate-100 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Contexto adicional</h2>
            <p className="text-xs text-slate-500">Indicadores para revisar después de resolver las prioridades del turno.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 group-open:hidden">Ver</span>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 group-open:inline-flex">Ocultar</span>
        </summary>
        <div className="space-y-6 border-t border-slate-100 p-4 sm:p-5">
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
            <FollowUpsCard  items={data?.pendingFollowUps ?? []}  navigate={navigate} />
            <IncidentsCard  items={data?.recentIncidents ?? []}   navigate={navigate} />
            <ExpiringDocsCard items={data?.expiringDocuments ?? []} navigate={navigate} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Demographics stats={stats} />
            <AccreditationCard acreditacion={acreditacion} navigate={navigate} loading={loading} />
          </div>
        </div>
      </details>

      {mainQuickActions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Acciones principales
            <HelpTooltip className="ml-2" label="Ayuda sobre acciones rápidas">
              Tareas disponibles para tu rol y permisos actuales. Las consultas secundarias quedan agrupadas abajo.
            </HelpTooltip>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mainQuickActions.map((action) => (
              <QuickAction
                key={action.route}
                iconId={action.iconId}
                label={action.label}
                onClick={() => navigate(action.route)}
              />
            ))}
          </div>
          {extraQuickActions.length > 0 && (
            <details className="group mt-3 rounded-xl border border-slate-100 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700">
                <span>Más accesos</span>
                <span className="text-xs text-slate-400 group-open:hidden">Ver</span>
                <span className="hidden text-xs text-slate-400 group-open:inline">Ocultar</span>
              </summary>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 p-3">
                {extraQuickActions.map((action) => (
                  <QuickAction
                    key={action.route}
                    iconId={action.iconId}
                    label={action.label}
                    onClick={() => navigate(action.route)}
                  />
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </PageLayout>
  );
}

function OperationalTurnPanel({ loading, summary, navigate }) {
  if (loading || !summary) return null;

  const care = summary.care ?? {};
  const emar = summary.emar ?? {};
  const emarPending = (emar.pendiente ?? 0) + (emar.pendiente_validacion ?? 0);
  const carePending = care.pendientes_operativos ?? ((care.pendiente ?? 0) + (care.reprogramada ?? 0));
  const emarTone = (emar.vencidas ?? 0) || (emar.pendiente_validacion ?? 0) ? "rose" : emarPending ? "amber" : "emerald";
  const careTone = (care.vencidas ?? 0) ? "rose" : carePending ? "amber" : "emerald";

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <OperationalCard
        title="Medicamentos del turno"
        value={emarPending}
        tone={emarTone}
        sub={`${emar.pendiente ?? 0} pendientes · ${emar.pendiente_validacion ?? 0} por validar · ${emar.vencidas ?? 0} vencidos`}
        action="Abrir medicamentos"
        onClick={() => navigate("/turnos/emar")}
      />
      <OperationalCard
        title="Tareas de cuidado"
        value={carePending}
        tone={careTone}
        sub={`${care.pendiente ?? 0} pendientes · ${care.reprogramada ?? 0} reprogramadas · ${care.vencidas ?? 0} vencidas`}
        action="Abrir tareas"
        onClick={() => navigate("/turnos/tareas")}
      />
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
