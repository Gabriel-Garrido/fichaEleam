import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "../../components/Badge";
import EmptyState from "../../components/EmptyState";
import HelpTooltip from "../../components/HelpTooltip";
import { CHILE_TIME_ZONE } from "../../utils/dateUtils";
import {
  TRACE_QUICK_RANGES,
  TRACE_TYPE_LABEL,
  getResidentTraceDetail,
  getTraceQuickRange,
  groupTraceEventsByDate,
  listResidentTraceability,
} from "./residentTraceabilityService";

const PAGE_SIZE = 25;
const TRACE_FILTER_TYPES = ["todos", "datos", "cama", "salud", "cuidado", "medicamentos", "signos", "observaciones", "seguimientos"];
const TRACE_FILTER_STATUSES = [
  ["", "Todos los estados"],
  ["pendiente", "Pendientes"],
  ["realizado", "Realizados"],
  ["reprogramada", "Reprogramados"],
  ["omitida", "No realizados"],
  ["cancelada", "Cancelados"],
];

function initialFilters() {
  const range = getTraceQuickRange("30d");
  return { rangeKey: range.rangeKey, desde: range.desde, hasta: range.hasta, tipo: "todos", estado: "", query: "" };
}

function sameFilters(left, right) {
  return ["rangeKey", "desde", "hasta", "tipo", "estado", "query"]
    .every((key) => left[key] === right[key]);
}

function formatTraceDay(value) {
  if (!value || value === "sin_fecha") return "Sin fecha";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatTraceDateTime(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Fecha no disponible";
  return date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: CHILE_TIME_ZONE });
}

export default function ResidentTraceabilityTab({ residenteId, refreshKey = 0 }) {
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [events, setEvents] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openEvent, setOpenEvent] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(null);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async ({ append = false, offset = 0 } = {}) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const data = await listResidentTraceability({
        residenteId,
        desde: filters.desde,
        hasta: filters.hasta,
        tipos: filters.tipo === "todos" ? [] : [filters.tipo],
        estado: filters.estado || null,
        query: filters.query,
        limit: PAGE_SIZE + 1,
        offset,
      });
      const page = data.slice(0, PAGE_SIZE);
      setHasMore(data.length > PAGE_SIZE);
      setEvents((current) => append ? [...current, ...page] : page);
      if (!append) {
        setOpenEvent(null);
        setDetails({});
      }
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el historial del residente.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, residenteId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const grouped = useMemo(() => groupTraceEventsByDate(events), [events]);
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const applyQuickRange = (key) => {
    setError("");
    const range = getTraceQuickRange(key);
    const next = { ...filters, rangeKey: range.rangeKey, desde: range.desde, hasta: range.hasta };
    setDraft(next);
    setFilters((current) => sameFilters(current, next) ? current : next);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    if (draft.desde && draft.hasta && draft.desde > draft.hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    setError("");
    setFilters((current) => sameFilters(current, draft) ? current : { ...draft });
  };

  const clearFilters = () => {
    setError("");
    const next = initialFilters();
    setDraft(next);
    setFilters((current) => sameFilters(current, next) ? current : next);
  };

  const activeFilterCount = Number(filters.tipo !== "todos") + Number(Boolean(filters.estado)) + Number(Boolean(filters.query));

  const toggleDetail = async (event) => {
    if (openEvent === event.key) {
      setOpenEvent(null);
      return;
    }
    setOpenEvent(event.key);
    setDetailError("");
    if (details[event.key] || !event.hasDetail) return;
    setDetailLoading(event.key);
    try {
      const detail = await getResidentTraceDetail({
        residenteId,
        entity: event.entity,
        eventId: event.entityId ?? event.id,
      });
      setDetails((current) => ({ ...current, [event.key]: detail }));
    } catch (loadError) {
      console.error(loadError);
      setDetailError("No se pudo cargar el detalle de este registro.");
    } finally {
      setDetailLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">Historial del residente</h2>
              <HelpTooltip label="Ayuda sobre el historial">Cada registro conserva fecha y responsable. Los detalles se consultan sólo al abrirlo para mantener la pantalla rápida.</HelpTooltip>
            </div>
            <p className="mt-1 text-sm text-slate-500">Cambios de datos, cama, salud y actividad clínica ordenados desde el más reciente.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {events.length} registro{events.length === 1 ? "" : "s"} cargado{events.length === 1 ? "" : "s"}
          </span>
        </div>

        <form onSubmit={applyFilters} className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">
              Buscar en el historial
              <input type="search" value={draft.query} onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))} placeholder="Ej.: cambio de cama o nombre del responsable" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            </label>
            <button type="submit" className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 sm:self-end">Buscar</button>
          </div>

          <div className="flex flex-wrap items-center gap-2" aria-label="Periodo del historial">
            <span className="mr-1 text-xs font-semibold text-slate-500">Período</span>
            {Object.entries(TRACE_QUICK_RANGES).map(([key, item]) => (
              <button key={key} type="button" onClick={() => applyQuickRange(key)} className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${draft.rangeKey === key ? "bg-teal-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{item.label}</button>
            ))}
            <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {showFilters ? "Ocultar filtros" : `Filtros${activeFilterCount ? ` (${activeFilterCount})` : ""}`}
            </button>
          </div>

          {showFilters && (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect label="Tipo de registro" value={draft.tipo} onChange={(value) => setDraft((current) => ({ ...current, tipo: value }))} options={TRACE_FILTER_TYPES.map((value) => [value, value === "todos" ? "Todos los tipos" : TRACE_TYPE_LABEL[value]])} />
              <FilterSelect label="Estado" value={draft.estado} onChange={(value) => setDraft((current) => ({ ...current, estado: value }))} options={TRACE_FILTER_STATUSES} />
              <FilterDate label="Desde" value={draft.desde} onChange={(value) => setDraft((current) => ({ ...current, rangeKey: "custom", desde: value }))} />
              <FilterDate label="Hasta" value={draft.hasta} onChange={(value) => setDraft((current) => ({ ...current, rangeKey: "custom", hasta: value }))} />
              <div className="flex flex-wrap justify-end gap-2 sm:col-span-2 lg:col-span-4">
                <button type="button" onClick={clearFilters} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Limpiar</button>
                <button type="submit" className="min-h-10 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">Aplicar filtros</button>
              </div>
            </div>
          )}
        </form>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4" role="status"><p className="text-xs text-slate-500">Cargando historial…</p>{[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : events.length === 0 ? (
          <div className="p-5"><EmptyState tone="teal" title="No hay registros en este periodo" description="Amplía el periodo o limpia los filtros para consultar otras acciones." action={{ label: "Limpiar filtros", onClick: clearFilters }} /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {days.map((day) => (
              <section key={day} className="p-3 sm:p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{formatTraceDay(day)}</h3>
                <ol className="divide-y divide-slate-100">
                  {grouped[day].map((event) => (
                    <TraceEventRow
                      key={event.key}
                      event={event}
                      open={openEvent === event.key}
                      detail={details[event.key]}
                      loading={detailLoading === event.key}
                      error={openEvent === event.key ? detailError : ""}
                      onClick={() => toggleDetail(event)}
                    />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </section>

      {hasMore && <div className="flex justify-center"><button type="button" disabled={loadingMore} onClick={() => load({ append: true, offset: events.length })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">{loadingMore ? "Cargando…" : "Cargar registros anteriores"}</button></div>}
    </div>
  );
}

function TraceEventRow({ event, open, detail, loading, error, onClick }) {
  return (
    <li>
      <button type="button" onClick={onClick} aria-expanded={open} className="grid w-full gap-2 px-1 py-3 text-left hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-950">{event.title}</h4>
            <Badge tone={mapTraceToneToBadge(event.typeTone)} size="xs">{event.typeLabel}</Badge>
            {event.statusGroup === "pendiente" && <Badge tone="amber" size="xs">{event.statusLabel}</Badge>}
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatTraceDateTime(event.occurredAt)} · {event.actorName || "Responsable no disponible"}</p>
        </div>
        <span className="text-xs font-semibold text-teal-700">{open ? "Ocultar detalle" : "Ver detalle"}</span>
      </button>
      {open && (
        <div className="mx-1 mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mx-3 sm:p-4">
          {loading ? <p className="text-sm text-slate-500">Cargando detalle…</p> : error ? <p className="text-sm text-rose-700">{error}</p> : <TraceDetail value={detail} />}
        </div>
      )}
    </li>
  );
}

function TraceDetail({ value }) {
  if (!value || typeof value !== "object" || Object.keys(value).length === 0) return <p className="text-sm text-slate-500">Este registro no tiene información adicional.</p>;
  return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{detailEntries(value).map(([label, content], index) => <div key={`${label}-${index}`} className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-sm text-slate-800">{content}</dd></div>)}</dl>;
}

function detailEntries(value, prefix = "") {
  return Object.entries(value).flatMap(([key, item]) => {
    if (key === "id" || key.endsWith("_id")) return [];
    const label = [prefix, humanizeKey(key)].filter(Boolean).join(" · ");
    if (item && typeof item === "object" && !Array.isArray(item)) {
      if (Object.hasOwn(item, "anterior") || Object.hasOwn(item, "nuevo")) {
        return [[label, `${formatDetailValue(item.anterior)} → ${formatDetailValue(item.nuevo)}`]];
      }
      return detailEntries(item, label);
    }
    return [[label, formatDetailValue(item)]];
  });
}

function humanizeKey(value) {
  const labels = { datos_iniciales: "Datos registrados", datos_anteriores: "Datos anteriores", cambios: "Cambios", seccion: "Sección", accion: "Acción", tipo: "Categoría", descripcion: "Evolución observada", acciones_tomadas: "Atención, respuesta y plan", motivo_omision: "Motivo", requiere_seguimiento: "Requiere seguimiento", seguimiento_fecha: "Fecha de seguimiento", seguimiento_turno: "Turno de seguimiento", seguimiento_estado: "Estado del seguimiento", reprogramada_para: "Reprogramada para", fecha_programada: "Fecha", fecha_realizada: "Fecha de atención", centro_atencion: "Centro o lugar de atención", especialidad: "Atención o especialidad", profesional: "Profesional que atendió", acompanante: "Quién acompañó", familia_informada: "Familia o persona significativa informada", coordinacion_familia: "Coordinación realizada", resultado: "Observaciones e indicaciones", proximo_control: "Próximo control", presion_arterial: "Presión arterial", saturacion_oxigeno: "Saturación de oxígeno", frecuencia_cardiaca: "Frecuencia cardíaca", frecuencia_respiratoria: "Frecuencia respiratoria" };
  return labels[value] ?? value.replaceAll("_", " ").replace(/^./, (char) => char.toUpperCase());
}

function formatDetailValue(value) {
  if (value == null || value === "") return "Sin información";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Sin información";
  const labels = { observacion_general: "Estado general", cambio_clinico: "Cambio clínico o síntoma", dolor: "Dolor", piel_heridas: "Piel o heridas", conducta_animo: "Conducta o estado de ánimo", control: "Control de salud", derivacion: "Derivación", urgencia: "Atención de urgencia", teleconsulta: "Teleconsulta", otro: "Otra atención", programado: "Programada", realizado: "Realizada", cancelado: "Cancelada", inasistente: "No asistió" };
  if (labels[value]) return labels[value];
  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(value))) return "Registro vinculado";
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(String(value))) {
    const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
    if (!Number.isNaN(date.valueOf())) return date.toLocaleString("es-CL", String(value).length === 10 ? { dateStyle: "medium", timeZone: CHILE_TIME_ZONE } : { dateStyle: "medium", timeStyle: "short", timeZone: CHILE_TIME_ZONE });
  }
  return String(value);
}

function FilterDate({ label, value, onChange }) {
  return <label className="text-xs font-semibold text-slate-600">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal" /></label>;
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="text-xs font-semibold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function mapTraceToneToBadge(tone) {
  if (tone === "rose") return "rose";
  if (tone === "amber") return "amber";
  if (tone === "sky" || tone === "indigo") return "sky";
  if (tone === "emerald") return "emerald";
  if (tone === "teal" || tone === "violet") return "primary";
  return "slate";
}
