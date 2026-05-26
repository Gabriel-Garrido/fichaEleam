import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/Button";
import HelpTooltip from "../../../components/HelpTooltip";
import { LeadsSkeletonList } from "../../../components/Skeleton";
import { useToast } from "../../../components/Toast";
import { userFacingFormError } from "../../../utils/formValidation";
import { getProspectLists, getProspects } from "../crmEmailService";
import ProspectFormModal from "./ProspectFormModal";
import {
  CRM_FUNNEL_STAGES,
  OBJECTION_LIBRARY,
  DEFAULT_CALL_SCRIPT,
  digitalizationLabel,
  renderTemplate,
  stageGuideText,
  stageLabel,
  stageTone,
} from "./crmSalesPlaybook";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isPastDate(value) {
  if (!value) return false;
  return new Date(`${value}T00:00:00`) < startOfToday();
}

function StageBadge({ stage }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${stageTone(stage)}`}>
      {stageLabel(stage)}
    </span>
  );
}

function Metric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-700",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    teal: "border-teal-200 bg-teal-50 text-teal-900",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone] ?? tones.slate}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function SalesFunnelPanel({ onStartCampaign }) {
  const toast = useToast();
  const [prospects, setProspects] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prospectData, listData] = await Promise.all([
        getProspects({ includeNoContactar: true, limit: 1000 }),
        getProspectLists(),
      ]);
      setProspects(prospectData);
      setLists(listData);
      setSelected((prev) => prospectData.find((p) => p.id === prev?.id) ?? prospectData[0] ?? null);
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo cargar el funnel comercial."), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(CRM_FUNNEL_STAGES.map((stage) => [stage, []]));
    for (const prospect of prospects) {
      const stage = CRM_FUNNEL_STAGES.includes(prospect.estado) ? prospect.estado : "nuevo";
      map[stage].push(prospect);
    }
    return map;
  }, [prospects]);

  const metrics = useMemo(() => {
    const open = prospects.filter((p) => !["ganado", "perdido", "no_contactar"].includes(p.estado));
    return {
      total: prospects.length,
      open: open.length,
      noNext: open.filter((p) => !p.proxima_accion_fecha).length,
      overdue: open.filter((p) => isPastDate(p.proxima_accion_fecha)).length,
      demos: prospects.filter((p) => ["demo_agendada", "demo_realizada", "prueba_activa"].includes(p.estado)).length,
      won: prospects.filter((p) => p.estado === "ganado").length,
    };
  }, [prospects]);

  const visible = activeStage ? grouped[activeStage] ?? [] : prospects;
  const selectedGuide = selected ? stageGuideText(selected.estado) : "";
  const callScript = selected ? renderTemplate(DEFAULT_CALL_SCRIPT, selected) : DEFAULT_CALL_SCRIPT;

  const openEditor = (prospect) => {
    setEditing(prospect);
    setFormOpen(true);
  };

  if (loading) return <LeadsSkeletonList count={6} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric label="Prospectos" value={metrics.total} />
        <Metric label="Pipeline abierto" value={metrics.open} tone="teal" />
        <Metric label="Sin próxima acción" value={metrics.noNext} tone={metrics.noNext ? "amber" : "slate"} />
        <Metric label="Tareas vencidas" value={metrics.overdue} tone={metrics.overdue ? "rose" : "slate"} />
        <Metric label="Demos / prueba" value={metrics.demos} tone="teal" />
        <Metric label="Ganados" value={metrics.won} tone="emerald" />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Funnel comercial</h3>
            <p className="text-xs text-slate-500">Haz clic en una etapa para filtrar y ver la guía de venta correspondiente.</p>
          </div>
          <HelpTooltip label="Métricas de funnel">
            Conversión por etapa: mira el volumen que avanza entre columnas.
            Prospectos sin próxima acción: deben quedar con fecha antes de cerrar la jornada.
            Velocidad de etapa: si se estancan, registra objeción o mueve a perdido/no contactar.
          </HelpTooltip>
        </div>
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          {CRM_FUNNEL_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage((current) => (current === stage ? "" : stage))}
              className={`rounded-xl border p-3 text-left transition-colors ${
                activeStage === stage ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 hover:bg-white"
              }`}
              title={stageGuideText(stage)}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{stageLabel(stage)}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{grouped[stage]?.length ?? 0}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{activeStage ? stageLabel(activeStage) : "Todos los prospectos"}</h3>
              <p className="text-xs text-slate-500">{visible.length} prospecto{visible.length === 1 ? "" : "s"} en vista</p>
            </div>
            {visible.length > 0 && (
              <Button type="button" onClick={() => onStartCampaign?.(visible.filter((p) => p.email && !p.no_contactar).map((p) => p.id))} className="bg-teal-700 text-white hover:bg-teal-800">
                Campaña con vista
              </Button>
            )}
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">ELEAM</th>
                  <th className="px-3 py-2">Etapa</th>
                  <th className="px-3 py-2">Fit</th>
                  <th className="px-3 py-2">Digitalización</th>
                  <th className="px-3 py-2">Próxima acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => (
                  <tr key={p.id} className={`cursor-pointer hover:bg-slate-50 ${selected?.id === p.id ? "bg-teal-50/60" : ""}`} onClick={() => setSelected(p)}>
                    <td className="max-w-xs px-3 py-2">
                      <p className="truncate font-semibold text-slate-900">{p.eleam_nombre}</p>
                      <p className="truncate text-[11px] text-slate-500">{p.dolor_principal || p.email || p.telefono || "Sin dolor registrado"}</p>
                    </td>
                    <td className="px-3 py-2"><StageBadge stage={p.estado} /></td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-slate-700">{p.fit_score ?? 50}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{digitalizationLabel(p.digitalizacion_estado)}</td>
                    <td className={`px-3 py-2 text-xs ${isPastDate(p.proxima_accion_fecha) ? "font-semibold text-rose-700" : "text-slate-500"}`}>
                      {p.proxima_accion_fecha || "Sin fecha"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-900">{selected.eleam_nombre}</h3>
                  <p className="text-xs text-slate-500">{selected.comuna || "Sin comuna"} · {digitalizationLabel(selected.digitalizacion_estado)}</p>
                </div>
                <StageBadge stage={selected.estado} />
              </div>

              <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs leading-5 text-teal-900">
                <p className="font-bold">Guía de etapa</p>
                <p className="mt-1 whitespace-pre-line">{selectedGuide}</p>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Checklist de calificación</p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <ChecklistItem done={Boolean(selected.dolor_principal)} label="Dolor principal documentado" />
                  <ChecklistItem done={Boolean(selected.decision_maker_nombre || selected.decision_maker_cargo)} label="Decisor o influenciador identificado" />
                  <ChecklistItem done={Boolean(selected.num_residentes)} label="Tamaño del ELEAM estimado" />
                  <ChecklistItem done={selected.digitalizacion_estado !== "desconocido"} label="Estado de digitalización conocido" />
                  <ChecklistItem done={Boolean(selected.proxima_accion_fecha)} label="Próxima acción con fecha" />
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Workspace de llamada</p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">{callScript}</pre>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Objeciones</p>
                <div className="space-y-2">
                  {OBJECTION_LIBRARY.slice(0, 3).map((item) => (
                    <div key={item.objection} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-bold text-slate-800">{item.objection}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{item.response}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" onClick={() => openEditor(selected)} className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                  Abrir ficha 360
                </Button>
                <Button type="button" onClick={() => onStartCampaign?.([selected.id])} className="bg-teal-700 text-white hover:bg-teal-800">
                  Campaña a este prospecto
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Selecciona un prospecto para ver su ficha 360.</p>
          )}
        </aside>
      </div>

      <ProspectFormModal
        isOpen={formOpen}
        prospect={editing}
        lists={lists}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); }}
      />
    </div>
  );
}

function ChecklistItem({ done, label }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
        {done ? "✓" : "·"}
      </span>
      <span>{label}</span>
    </li>
  );
}
