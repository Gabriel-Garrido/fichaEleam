import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import HelpTooltip from "../../components/HelpTooltip";
import PageLayout from "../../layout/PageLayout";
import { loadDashboard } from "./dashboardService";
import { recordOverallStatus } from "../vitalSigns/vitalRanges";
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
  const { profile, eleam, rol } = useAuth();

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
    if (!s) return { porcentaje: 0, total: 0, cumple: 0, pendientes: 0, vencidos: 0, observacionesAbiertas: 0, ambitos: [] };
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
    const totalAlerts =
      clinicalSummary.critical +
      clinicalSummary.warning +
      stale.length +
      (data?.pendingFollowUps ?? []).length +
      expiring7;
    const score = Math.max(0, 100 -
      clinicalSummary.critical * 18 -
      clinicalSummary.warning  * 8 -
      stale.length             * 7 -
      (data?.pendingFollowUps ?? []).length * 5 -
      expiring7                * 6
    );
    return {
      stale, highDependency, expiring7, totalAlerts, score,
      scoreTone: score >= 80 ? "emerald" : score >= 55 ? "amber" : "rose",
    };
  }, [data, clinicalSummary]);

  return (
    <PageLayout
      title={profile?.nombre ? `Hola, ${profile.nombre}` : "Inicio"}
      eyebrow={`${todayDateLong()} · turno ${turno}`}
      description={`${eleam?.nombre ? `${eleam.nombre}. ` : ""}${loading ? "Cargando actividad del día..." : `${data?.signosHoy ?? 0} signos vitales y ${data?.observacionesHoy ?? 0} observaciones registradas hoy${cobertura ? ` · ${cobertura.pct}% de cobertura` : ""}.`}`}
      actions={
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            onClick={() => navigate("/turnos/nueva")}
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
          >
            Entrega de turno
          </button>
          <button
            type="button"
            onClick={() => navigate("/vital-signs/new")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Registrar control
          </button>
        </div>
      }
      className="space-y-6"
    >

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

      {/* Top KPIs — orden según rol */}
      {!errors.residentStats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                title="Cumplimiento SEREMI"
                help="Avance de requisitos de acreditación marcados como cumple."
                value={loading ? "…" : `${acreditacion.porcentaje}%`}
                sub={`${acreditacion.cumple} de ${acreditacion.total} requisitos${acreditacion.vencidos ? ` · ${acreditacion.vencidos} vencido${acreditacion.vencidos === 1 ? "" : "s"}` : ""}`}
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
                tone={!cobertura ? "gray" : cobertura.pct >= 80 ? "emerald" : cobertura.pct >= 40 ? "amber" : "rose"}
                onClick={() => navigate("/vital-signs/new")}
              />
              <KpiCard
                title="Cumplimiento SEREMI"
                help="Avance de requisitos de acreditación marcados como cumple, sin contar los que no aplican."
                value={loading ? "…" : `${acreditacion.porcentaje}%`}
                sub={`${acreditacion.cumple} de ${acreditacion.total} requisitos al día${acreditacion.vencidos ? ` · ${acreditacion.vencidos} vencido${acreditacion.vencidos === 1 ? "" : "s"}` : ""}`}
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
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 group-open:hidden">Ver</span>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 group-open:inline-flex">Ocultar</span>
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

      {/* Quick actions — rol-specific */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Acciones principales
          <HelpTooltip className="ml-2" label="Ayuda sobre acciones rápidas">
            Tareas más repetidas del turno. Las consultas secundarias quedan agrupadas abajo.
          </HelpTooltip>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction iconId="shift"        label="Entrega de turno"         onClick={() => navigate("/turnos/nueva")} />
          <QuickAction iconId="vitals"       label="Registrar signos vitales" onClick={() => navigate("/vital-signs/new")} />
          <QuickAction iconId="observations" label="Nueva observación"        onClick={() => navigate("/observations/new")} />
          {rol !== "funcionario" && (
            <QuickAction iconId="accreditation" label="Carpeta SEREMI" onClick={() => navigate("/accreditation/carpeta")} />
          )}
          {rol === "funcionario" && (
            <QuickAction iconId="residents" label="Ver residentes" onClick={() => navigate("/residents")} />
          )}
        </div>
        <details className="group mt-3 rounded-xl border border-gray-100 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-700">
            <span>Más accesos</span>
            <span className="text-xs text-gray-400 group-open:hidden">Ver</span>
            <span className="hidden text-xs text-gray-400 group-open:inline">Ocultar</span>
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-100 p-3">
            <QuickAction iconId="residents"    label="Agregar residente"  onClick={() => navigate("/residents/new")} />
            <QuickAction iconId="residents"    label="Ver residentes"     onClick={() => navigate("/residents")} />
            <QuickAction iconId="vitals"       label="Historial signos"   onClick={() => navigate("/vital-signs")} />
            <QuickAction iconId="observations" label="Ver observaciones"  onClick={() => navigate("/observations")} />
            <QuickAction iconId="accreditation" label="Panel acreditación" onClick={() => navigate("/accreditation")} />
            {rol !== "funcionario" && (
              <QuickAction iconId="team" label="Gestionar equipo" onClick={() => navigate("/equipo")} />
            )}
          </div>
        </details>
      </section>
    </PageLayout>
  );
}
