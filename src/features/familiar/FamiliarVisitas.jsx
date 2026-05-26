import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { friendlyError } from "../../utils/errorMessages";
import PageLayout from "../../layout/PageLayout";
import Button from "../../components/Button";
import FilterBar from "../../components/FilterBar";
import HelpTooltip from "../../components/HelpTooltip";
import { useFilterParams } from "../../hooks/useFilterParams";
import { getMyVisits, requestVisit, announceVisitExit, cancelVisit } from "./familiarService";
import { useFamiliarResidentData } from "./useFamiliarResidentData";
import { formatDateTime } from "../../utils/dateUtils";

const VISIT_STATUS_OPTIONS = [
  ["pendiente", "Esperando validación"],
  ["activa", "En visita"],
  ["salida_pendiente", "Salida por validar"],
  ["completada", "Completadas"],
  ["cancelada", "Canceladas"],
];

const VISIT_STATUS = {
  pendiente:  { label: "Esperando validación", pill: "bg-amber-100 text-amber-800",    dot: "bg-amber-400 animate-pulse" },
  activa:     { label: "En visita",            pill: "bg-teal-100 text-teal-800",      dot: "bg-teal-500 animate-pulse" },
  salida_pendiente: { label: "Salida por validar", pill: "bg-sky-100 text-sky-800",    dot: "bg-sky-500 animate-pulse" },
  completada: { label: "Completada",           pill: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500" },
  cancelada:  { label: "Cancelada",            pill: "bg-slate-100 text-slate-500",    dot: "bg-slate-300" },
};

export default function FamiliarVisitas() {
  const navigate   = useNavigate();
  const toast      = useToast();
  const [visitas, setVisitas]       = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const [announcingExit, setAnnouncingExit] = useState(false);
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [announceNotes, setAnnounceNotes] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [visitFilters, setVisitFilter, clearVisitFilters] = useFilterParams({
    schema: { q: "string", estado: "string", desde: "date", hasta: "date" },
    defaults: { q: "", estado: "", desde: "", hasta: "" },
  });
  const visitSearch = visitFilters.q ?? "";
  const visitEstado = visitFilters.estado ?? "";
  const visitDesde  = visitFilters.desde ?? "";
  const visitHasta  = visitFilters.hasta ?? "";

  const filteredVisitas = useMemo(() => {
    const q = visitSearch.trim().toLowerCase();
    return visitas.filter((v) => {
      if (visitEstado && v.estado !== visitEstado) return false;
      const fecha = (v.fecha_hora ?? "").slice(0, 10);
      if (visitDesde && fecha && fecha < visitDesde) return false;
      if (visitHasta && fecha && fecha > visitHasta) return false;
      if (q) {
        const text = [v.notas, v.estado].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [visitas, visitSearch, visitEstado, visitDesde, visitHasta]);

  const {
    residentes,
    activeId,
    activeResident,
    loading,
    selectResident,
  } = useFamiliarResidentData({ toast });

  const loadVisits = useCallback(async (id) => {
    if (!id) return;
    setLoadingVisits(true);
    try {
      const v = await getMyVisits(id, 100);
      setVisitas(v);
    } catch (e) {
      toast(friendlyError(e, "No se pudieron cargar las visitas."), "error");
    } finally {
      setLoadingVisits(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeId) loadVisits(activeId);
  }, [activeId, loadVisits]);

  const handleAnnounce = async () => {
    if (!activeId) return;
    setAnnouncing(true);
    try {
      await requestVisit({ residenteId: activeId, notas: announceNotes });
      toast("Llegada anunciada. Un funcionario validará tu ingreso.", "success");
      setShowAnnounce(false);
      setAnnounceNotes("");
      await loadVisits(activeId);
    } catch (err) {
      toast(friendlyError(err, "No se pudo registrar la solicitud."), "error");
    } finally {
      setAnnouncing(false);
    }
  };

  const handleCancel = async (visitId) => {
    setCancelling(visitId);
    try {
      await cancelVisit(visitId);
      toast("Visita cancelada.", "success");
      setVisitas((prev) => prev.map((v) => v.id === visitId ? { ...v, estado: "cancelada" } : v));
    } catch (err) {
      toast(friendlyError(err, "No se pudo cancelar."), "error");
    } finally {
      setCancelling(null);
    }
  };

  const handleAnnounceExit = async (visitId) => {
    setAnnouncingExit(true);
    try {
      await announceVisitExit(visitId);
      toast("Salida anunciada. Un funcionario validará tu salida.", "success");
      await loadVisits(activeId);
    } catch (err) {
      toast(friendlyError(err, "No se pudo anunciar la salida."), "error");
    } finally {
      setAnnouncingExit(false);
    }
  };

  if (loading) return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  if (residentes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Sin residentes asignados</h1>
        <p className="text-slate-500 text-sm">Pide al administrador del ELEAM que cree el vínculo.</p>
      </div>
    );
  }

  const pendingVisit = visitas.find((v) => v.estado === "pendiente");
  const activeVisit = visitas.find((v) => v.estado === "activa");
  const exitPendingVisit = visitas.find((v) => v.estado === "salida_pendiente");
  const hasOpenVisit = Boolean(pendingVisit || activeVisit || exitPendingVisit);

  return (
    <PageLayout
      coachFeatureId="familiar-visitas"
      title="Mis visitas"
      eyebrow="Portal familiar"
      description={`Historial de visitas a ${activeResident?.nombre ?? "tu familiar"} ${activeResident?.apellido ?? ""}.`}
      size="lg"
      actions={
        <Button
          onClick={() => navigate("/familiar")}
          className="border border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
          title="Volver al portal"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span className="hidden sm:inline">Volver al portal</span>
        </Button>
      }
      className="space-y-5"
    >
      {residentes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {residentes.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => selectResident(r.id)}
              className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                r.id === activeId
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {r.nombre} {r.apellido}
            </button>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-semibold text-teal-800">¿Cómo funciona el registro de visitas?</p>
          <HelpTooltip label="Ayuda sobre visitas">
            No debes elegir fechas ni horarios. El sistema registra la hora real cuando anuncias llegada o salida y cuando el funcionario valida cada paso.
          </HelpTooltip>
        </div>
        <ol className="text-sm text-teal-700 space-y-1 list-none">
          <li className="flex items-start gap-2">
            <span className="shrink-0 grid h-5 w-5 place-items-center rounded-full bg-teal-700 text-white text-[10px] font-bold mt-0.5">1</span>
            Anuncia tu llegada con el botón de abajo.
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 grid h-5 w-5 place-items-center rounded-full bg-teal-700 text-white text-[10px] font-bold mt-0.5">2</span>
            Un funcionario del ELEAM valida tu ingreso.
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 grid h-5 w-5 place-items-center rounded-full bg-teal-700 text-white text-[10px] font-bold mt-0.5">3</span>
            Al terminar, anuncia tu salida desde este mismo portal.
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 grid h-5 w-5 place-items-center rounded-full bg-teal-700 text-white text-[10px] font-bold mt-0.5">4</span>
            Un funcionario valida tu salida y queda guardado el registro.
          </li>
        </ol>
      </div>

      {/* Announce panel */}
      {!hasOpenVisit && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800">Anunciar visita</h2>
              <HelpTooltip label="Ayuda: anunciar visita">
                Usa este botón cuando llegues al ELEAM. La visita queda pendiente hasta que un funcionario valide tu ingreso.
              </HelpTooltip>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Notifica al equipo que llegaste. La hora se registra automáticamente.
            </p>
          </div>
          <div className="p-5">
            {showAnnounce ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="announce-notes" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notas para el equipo (opcional)
                  </label>
                  <textarea
                    id="announce-notes"
                    rows={3}
                    value={announceNotes}
                    onChange={(e) => setAnnounceNotes(e.target.value)}
                    placeholder="Algún detalle del equipo debería saber…"
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Ej.: <em>Llegué al portón principal. Traje ropa para el fin de semana.</em>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAnnounce(false); setAnnounceNotes(""); }}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAnnounce}
                    disabled={announcing}
                    className="flex-1 rounded-xl bg-teal-700 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    {announcing ? "Enviando…" : "Anunciar visita"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAnnounce(true)}
                className="w-full rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition-colors"
              >
                Anunciar visita
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active/pending notice */}
      {hasOpenVisit && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-3 w-3 rounded-full bg-teal-500 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-teal-800">
                  {activeVisit ? "Visita en curso" : exitPendingVisit ? "Salida pendiente de validación" : "Solicitud pendiente de validación"}
                </p>
                <HelpTooltip label="Ayuda: estado de visita">
                  Mientras haya una visita abierta no puedes iniciar otra. Si tu ingreso ya fue validado, al terminar debes anunciar tu salida.
                </HelpTooltip>
              </div>
              <p className="text-xs text-teal-700 mt-0.5">
                {activeVisit
                  ? "Cuando termines, anuncia tu salida para que un funcionario la valide."
                  : exitPendingVisit
                    ? "Tu salida ya fue anunciada. Espera la validación del funcionario."
                    : "Un funcionario del ELEAM validará tu ingreso en breve."}
              </p>
            </div>
          </div>
          {activeVisit && (
            <button
              type="button"
              onClick={() => handleAnnounceExit(activeVisit.id)}
              disabled={announcingExit}
              className="w-full rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50 sm:w-auto"
            >
              {announcingExit ? "Enviando…" : "Anunciar salida"}
            </button>
          )}
        </div>
      )}

      {/* Visit history */}
      <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Historial de visitas</h2>
          <button
            type="button"
            onClick={() => loadVisits(activeId)}
            disabled={loadingVisits}
            className="text-xs text-slate-400 hover:text-slate-600 underline disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>
        {visitas.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100">
            <FilterBar
              search={visitSearch}
              onSearchChange={(v) => setVisitFilter("q", v)}
              searchPlaceholder="Buscar en notas o estado..."
              filters={[
                {
                  type: "select",
                  name: "estado",
                  label: "Estado",
                  options: VISIT_STATUS_OPTIONS,
                  placeholder: "Todos los estados",
                },
                {
                  type: "dateRange",
                  name: "fecha",
                  nameDesde: "desde",
                  nameHasta: "hasta",
                  label: "Período",
                },
              ]}
              values={visitFilters}
              onFilterChange={setVisitFilter}
              onClearAll={clearVisitFilters}
              resultCount={filteredVisitas.length}
              totalCount={visitas.length}
              loading={loadingVisits}
            />
          </div>
        )}
        <div className="p-5">
          {loadingVisits ? (
            <p className="text-sm text-slate-400 text-center py-4">Cargando historial...</p>
          ) : visitas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aún no tienes visitas registradas.</p>
          ) : filteredVisitas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No hay visitas con esos filtros.</p>
          ) : (
            <ul className="-mx-1 divide-y divide-slate-100 px-1">
              {filteredVisitas.map((v) => <VisitItem key={v.id} v={v} cancelling={cancelling} handleCancel={handleCancel} />)}
            </ul>
          )}
        </div>
      </section>
    </PageLayout>
  );
}

function VisitItem({ v, cancelling, handleCancel }) {
  const [expanded, setExpanded] = useState(false);
  const st = VISIT_STATUS[v.estado] ?? VISIT_STATUS.completada;
  const canCancel = v.estado === "pendiente";
  const hasDetails =
    v.salida_anunciada_en || v.salida_validada_en || v.salida_hora || v.validado_en || v.notas;

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="shrink-0 pt-1">
        <span className={`block h-2.5 w-2.5 rounded-full ${st.dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{formatDateTime(v.fecha_hora)}</p>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.pill}`}>{st.label}</span>
          {v.duracion_min && <span className="text-xs text-slate-400">{v.duracion_min} min</span>}
        </div>
        {hasDetails && (
          <>
            {!expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-1 text-xs font-medium text-teal-700 hover:underline sm:hidden"
              >
                Ver detalles
              </button>
            )}
            <div className={`${expanded ? "block" : "hidden sm:block"} mt-1 space-y-1`}>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                {v.salida_anunciada_en && <span>Salida anunciada {formatDateTime(v.salida_anunciada_en)}</span>}
                {v.salida_validada_en && <span>Salida validada {formatDateTime(v.salida_validada_en)}</span>}
                {v.salida_hora && !v.salida_validada_en && <span>Salida: {formatDateTime(v.salida_hora)}</span>}
                {v.validado_en && <span>Ingreso validado {formatDateTime(v.validado_en)}</span>}
              </div>
              {v.notas && <p className="text-xs italic text-slate-500">{v.notas}</p>}
            </div>
          </>
        )}
      </div>
      {canCancel && (
        <button
          type="button"
          onClick={() => handleCancel(v.id)}
          disabled={cancelling === v.id}
          className="shrink-0 text-xs font-medium text-rose-500 underline transition-colors hover:text-rose-700 disabled:opacity-50"
        >
          {cancelling === v.id ? "…" : "Cancelar"}
        </button>
      )}
    </li>
  );
}
