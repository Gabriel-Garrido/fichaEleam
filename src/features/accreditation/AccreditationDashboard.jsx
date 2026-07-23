import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmptyState from "../../components/EmptyState";
import Loading from "../../components/Loading";
import PageLayout from "../../layout/PageLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { friendlyError } from "../../utils/errorMessages";
import { formatDate } from "../../utils/dateUtils";
import { getObservaciones, getOperationalEvidence, getRequisitosEleam } from "./accreditationService";
import { buildComplianceAreas, simpleRequirementStatus } from "./accreditationOverview";

export default function AccreditationDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { eleam, profile, can, canFeature } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [observations, setObservations] = useState([]);
  const [operationalEvidence, setOperationalEvidence] = useState([]);
  const [openArea, setOpenArea] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.eleam_id) {
      setLoading(false);
      return;
    }
    try {
      const [items, openObservations, calculatedEvidence] = await Promise.all([
        getRequisitosEleam(),
        getObservaciones({ soloAbiertas: true }),
        getOperationalEvidence(),
      ]);
      setRequirements(items);
      setObservations(openObservations);
      setOperationalEvidence(calculatedEvidence);
    } catch (error) {
      toast(friendlyError(error, "No se pudo cargar la carpeta de cumplimiento."), "error");
    } finally {
      setLoading(false);
    }
  }, [profile?.eleam_id, toast]);

  useEffect(() => { load(); }, [load]);

  const areas = useMemo(
    () => buildComplianceAreas(requirements, observations, operationalEvidence),
    [requirements, observations, operationalEvidence],
  );
  const totals = useMemo(() => areas.reduce((summary, area) => ({
    total: summary.total + area.items.length,
    ready: summary.ready + area.ready,
    compliant: summary.compliant + area.compliant,
    notApplicable: summary.notApplicable + area.notApplicable,
    pending: summary.pending + area.pending,
    overdue: summary.overdue + area.overdue,
  }), { total: 0, ready: 0, compliant: 0, notApplicable: 0, pending: 0, overdue: 0 }), [areas]);
  const applicable = totals.total - totals.notApplicable;
  const percentage = totals.total === 0 ? 0 : applicable > 0 ? Math.round((totals.compliant / applicable) * 100) : 100;

  if (loading) return <Loading message="Ordenando la carpeta de cumplimiento..." />;

  if (!profile?.eleam_id) {
    return (
      <PageLayout title="Cumplimiento" description="Esta sección requiere un ELEAM asociado.">
        <EmptyState title="No hay un establecimiento asociado" description="Contacta a soporte para revisar tu cuenta." />
      </PageLayout>
    );
  }

  const permissions = {
    canEditDocuments: can("subir_acreditacion") || can("editar_acreditacion"),
    canProtocols: can("gestionar_cumplimiento"),
    canEmergencies: can("gestionar_emergencias") || can("registrar_simulacros"),
    canClaims: can("gestionar_reclamos"),
    canOpenSource: (path) => {
      if (path.startsWith("/residents") || path.startsWith("/operacion")) return canFeature("residents");
      if (path.startsWith("/personal")) return canFeature("personnel");
      if (path.startsWith("/establecimiento")) return canFeature("establishment");
      return canFeature("compliance");
    },
  };

  return (
    <PageLayout
      eyebrow="Carpeta para fiscalización"
      title="Cumplimiento"
      description={`Todo ordenado por ámbito, igual que en el reporte${eleam?.nombre ? ` · ${eleam.nombre}` : ""}.`}
      actions={<Link to="/cumplimiento/reporte" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto">Ver y emitir reporte</Link>}
      className="space-y-5"
    >
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Estado de la carpeta</p>
            <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
              <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">{percentage}% al día</h2>
              <p className="pb-1 text-sm text-slate-500">{totals.ready} de {totals.total} puntos revisados</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Avance de la carpeta" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage}>
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${percentage}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <SummaryNumber value={totals.pending} label="Por revisar" tone={totals.pending ? "amber" : "emerald"} />
            <SummaryNumber value={totals.overdue} label="Vencidos" tone={totals.overdue ? "rose" : "slate"} />
          </div>
        </div>
      </section>

      <section aria-labelledby="areas-title">
        <div className="mb-3">
          <h2 id="areas-title" className="text-lg font-bold text-slate-950">Ámbitos de la carpeta</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Abre un ámbito para revisar sus puntos. Solo puede quedar uno abierto para mantener la pantalla ordenada.</p>
        </div>

        {areas.length === 0 ? (
          <EmptyState title="La carpeta todavía está vacía" description="No encontramos ámbitos configurados para este establecimiento." />
        ) : (
          <div className="space-y-3">
            {areas.map((group, index) => (
              <AreaSection
                key={group.area.codigo}
                group={group}
                number={index + 1}
                isOpen={openArea === group.area.codigo}
                onToggle={() => setOpenArea((current) => current === group.area.codigo ? null : group.area.codigo)}
                onOpenRequirement={(id) => navigate(`/cumplimiento/requisito/${id}`)}
                permissions={permissions}
              />
            ))}
          </div>
        )}
      </section>
    </PageLayout>
  );
}

function AreaSection({ group, number, isOpen, onToggle, onOpenRequirement, permissions }) {
  const { area, items, ready, pending, percentage, overdue, observed } = group;
  const status = pending === 0
    ? { label: "Completo", cls: "bg-emerald-100 text-emerald-800" }
    : overdue > 0
      ? { label: `${overdue} vencido${overdue === 1 ? "" : "s"}`, cls: "bg-rose-100 text-rose-800" }
      : { label: `${pending} por revisar`, cls: "bg-amber-100 text-amber-800" };

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${isOpen ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-200"}`}>
      <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-controls={`area-${area.codigo}`} className="flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50 sm:items-center sm:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-sm font-black text-teal-700">{String(number).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-950">{area.nombre}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
            {observed > 0 && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">{observed} con observación</span>}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${percentage}%` }} /></div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">{ready}/{items.length} al día</span>
          </div>
        </div>
        <span className={`mt-1 text-xl text-slate-400 transition-transform sm:mt-0 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
      </button>

      {isOpen && (
        <div id={`area-${area.codigo}`} className="border-t border-slate-100 bg-slate-50/60 p-3 sm:p-5">
          {area.descripcion && <p className="mb-4 text-sm leading-6 text-slate-600">{area.descripcion}</p>}
          <AreaTools areaCode={area.codigo} permissions={permissions} />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {items.map((item, itemIndex) => (
              <RequirementItem
                key={item.id}
                item={item}
                isLast={itemIndex === items.length - 1}
                canEdit={permissions.canEditDocuments}
                canOpenSource={permissions.canOpenSource(item.operationalEvidence?.ruta_origen ?? "")}
                onOpen={() => onOpenRequirement(item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function RequirementItem({ item, isLast, canEdit, canOpenSource, onOpen }) {
  const status = simpleRequirementStatus(item);
  const toneClass = {
    emerald: "bg-emerald-100 text-emerald-800",
    slate: "bg-slate-100 text-slate-700",
    rose: "bg-rose-100 text-rose-800",
    orange: "bg-orange-100 text-orange-800",
    violet: "bg-violet-100 text-violet-800",
    sky: "bg-sky-100 text-sky-800",
    amber: "bg-amber-100 text-amber-800",
  }[status.tone];
  const ready = item.effectiveReady;
  const action = !canEdit ? "Ver" : ready ? "Ver respaldo" : "Completar";
  const calculated = item.operationalEvidence;

  return (
    <div className={`grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center ${isLast ? "" : "border-b border-slate-100"}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{status.label}</span>
          {item.requisito?.obligatorio && <span className="text-xs font-medium text-slate-500">Obligatorio</span>}
          {item.openObservations > 0 && <span className="text-xs font-semibold text-orange-700">{item.openObservations} observación{item.openObservations === 1 ? "" : "es"}</span>}
        </div>
        <h4 className="mt-2 font-semibold text-slate-950">{item.requisito?.nombre}</h4>
        <p className="mt-1 text-sm leading-5 text-slate-500">{status.help}</p>
        {calculated && (
          <div className={`mt-3 rounded-xl border p-3 ${calculated.completa_requisito ? "border-teal-200 bg-teal-50/70" : "border-sky-200 bg-sky-50/70"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${calculated.completa_requisito ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                  {calculated.completa_requisito ? "Calculado con registros" : "Avance desde registros"}
                </span>
                <span className="text-sm font-semibold text-slate-800">{calculated.resumen}</span>
              </div>
              <span className="text-sm font-black tabular-nums text-slate-900">
                {calculated.denominador > 0 ? `${calculated.numerador}/${calculated.denominador} · ${calculated.porcentaje}%` : "Sin datos"}
              </span>
            </div>
            {calculated.denominador > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-label={calculated.resumen} aria-valuemin="0" aria-valuemax="100" aria-valuenow={calculated.porcentaje}>
                <div className={`h-full rounded-full ${calculated.porcentaje === 100 ? "bg-emerald-600" : "bg-amber-500"}`} style={{ width: `${calculated.porcentaje}%` }} />
              </div>
            )}
            {!calculated.completa_requisito && <p className="mt-2 text-xs leading-5 text-slate-600">Este cálculo ayuda a revisar el punto, pero no reemplaza los respaldos que faltan.</p>}
            {canOpenSource && calculated.ruta_origen && (
              <Link to={calculated.ruta_origen} className="mt-2 inline-flex text-xs font-semibold text-teal-800 hover:text-teal-950">Revisar registros →</Link>
            )}
          </div>
        )}
        {item.requisito?.medio_verificador && <p className="mt-1 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-600">Respaldo esperado:</span> {item.requisito.medio_verificador}</p>}
        {item.fecha_vencimiento && <p className="mt-1 text-xs font-medium text-slate-500">Vence: {formatDate(item.fecha_vencimiento)}</p>}
      </div>
      <button type="button" onClick={onOpen} className={`min-h-11 w-full rounded-xl px-4 py-2 text-sm font-semibold sm:w-auto ${ready ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-teal-700 text-white hover:bg-teal-800"}`}>{action}</button>
    </div>
  );
}

function AreaTools({ areaCode, permissions }) {
  const tools = [];
  if (areaCode === "DS20-A25" && permissions.canProtocols) tools.push({ to: "/cumplimiento/protocolos", label: "Protocolos" });
  if (areaCode === "DS20-A25" && permissions.canEmergencies) tools.push({ to: "/cumplimiento/emergencias", label: "Emergencias y simulacros" });
  if (areaCode === "DS20-A27" && permissions.canClaims) tools.push({ to: "/cumplimiento/reclamos", label: "Reclamos y respuestas" });
  if (tools.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <span className="w-full text-xs font-semibold uppercase tracking-wide text-slate-500 sm:w-auto sm:self-center">Registros de este ámbito</span>
      {tools.map((tool) => <Link key={tool.to} to={tool.to} className="inline-flex min-h-10 items-center rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">{tool.label} →</Link>)}
    </div>
  );
}

function SummaryNumber({ value, label, tone }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return <div className={`min-w-28 rounded-xl border px-3 py-2 ${tones[tone]}`}><p className="text-xl font-black tabular-nums">{value}</p><p className="text-xs font-semibold">{label}</p></div>;
}
