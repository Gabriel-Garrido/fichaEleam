import { useCallback, useEffect, useMemo, useState } from "react";
import HelpTooltip from "../../components/HelpTooltip";
import MetricCard from "../../components/MetricCard";
import {
  TRACE_QUICK_RANGES,
  TRACE_STATUS_LABEL,
  TRACE_TYPE_LABEL,
  buildTraceSummary,
  filterTraceEvents,
  getTraceQuickRange,
  groupTraceEventsByDate,
  listResidentTraceability,
} from "./residentTraceabilityService";

const TRACE_FILTER_TYPES = ["todos", "cuidado", "medicamentos", "signos", "observaciones", "seguimientos", "visitas", "cama", "auditoria"];
const TRACE_FILTER_STATUSES = [
  ["", "Todos"],
  ["pendiente", "Pendientes"],
  ["pendiente_validacion", "Por validar"],
  ["realizado", "Realizados"],
  ["reprogramada", "Reprogramados"],
  ["omitida", "Omitidos"],
  ["cancelada", "Cancelados"],
  ["resuelto", "Resueltos"],
];

function traceToneClasses(tone) {
  return {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  }[tone] ?? "border-slate-200 bg-slate-50 text-slate-700";
}

function formatTraceDay(value) {
  if (!value || value === "sin_fecha") return "Sin fecha";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTraceTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "--:--";
  return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatTraceDateTime(value) {
  if (!value) return "Sin actividad";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Sin actividad";
  return date.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function rangeLabel(rangeKey, desde, hasta) {
  const quick = TRACE_QUICK_RANGES[rangeKey]?.label;
  if (quick && rangeKey !== "todo") return quick;
  if (rangeKey === "todo") return "Todo el historial";
  return [desde, hasta].filter(Boolean).join(" a ") || "Rango personalizado";
}

export default function ResidentTraceabilityTab({ residenteId }) {
  const initialRange = getTraceQuickRange("30d");
  const [rangeKey, setRangeKey] = useState(initialRange.rangeKey);
  const [desde, setDesde] = useState(initialRange.desde);
  const [hasta, setHasta] = useState(initialRange.hasta);
  const [tipo, setTipo] = useState("todos");
  const [estado, setEstado] = useState("");
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listResidentTraceability({
        residenteId,
        desde,
        hasta,
        tipos: tipo === "todos" ? [] : [tipo],
        estado: estado && !["pendiente", "realizado"].includes(estado) ? estado : null,
        limit: 300,
      });
      setEvents(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la trazabilidad del residente.");
    } finally {
      setLoading(false);
    }
  }, [desde, estado, hasta, residenteId, tipo]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => filterTraceEvents(events, { query, type: tipo, status: estado }),
    [estado, events, query, tipo]
  );
  const summary = useMemo(() => buildTraceSummary(filtered), [filtered]);
  const pendingHighlights = useMemo(
    () => filtered.filter((event) => event.statusGroup === "pendiente").slice(0, 3),
    [filtered]
  );
  const grouped = useMemo(() => groupTraceEventsByDate(filtered), [filtered]);
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const applyQuickRange = (key) => {
    const next = getTraceQuickRange(key);
    setRangeKey(next.rangeKey);
    setDesde(next.desde);
    setHasta(next.hasta);
  };

  const resetToLast30Days = () => {
    setTipo("todos");
    setEstado("");
    setQuery("");
    applyQuickRange("30d");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              Bitácora del residente
              <HelpTooltip label="Ayuda: trazabilidad">
                Muestra qué pasó, cuándo ocurrió, quién lo registró y qué queda pendiente. Los registros internos se muestran resumidos.
              </HelpTooltip>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {rangeLabel(rangeKey, desde, hasta)} · {summary.total} evento{summary.total === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[560px]">
            <MetricCard size="sm" label="Eventos" value={summary.total} />
            <MetricCard size="sm" label="Pendientes" value={summary.pending} tone={summary.pending ? "amber" : "slate"} />
            <MetricCard size="sm" label="Por validar" value={summary.validation} tone={summary.validation ? "sky" : "slate"} />
            <MetricCard size="sm" label="Última actividad" value={formatTraceDateTime(summary.latest?.occurredAt)} compact />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {Object.entries(TRACE_QUICK_RANGES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyQuickRange(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                rangeKey === key
                  ? "border-teal-600 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:hidden"
          >
            {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} mt-4 gap-4 lg:grid`}>
          <div className="grid gap-3 sm:grid-cols-[140px_140px_minmax(0,1fr)]">
            <label className="text-sm font-medium text-slate-700">
              Desde
              <input
                type="date"
                value={desde}
                onChange={(event) => { setRangeKey("custom"); setDesde(event.target.value); }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Hasta
              <input
                type="date"
                value={hasta}
                onChange={(event) => { setRangeKey("custom"); setHasta(event.target.value); }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Buscar
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por acción, responsable, detalle o estado..."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
          </div>

          <TraceChipGroup label="Tipo" value={tipo} onChange={setTipo} options={TRACE_FILTER_TYPES.map((key) => [key, key === "todos" ? "Todo" : TRACE_TYPE_LABEL[key]])} />
          <TraceChipGroup label="Estado" value={estado} onChange={setEstado} options={TRACE_FILTER_STATUSES} />
        </div>
      </section>

      {pendingHighlights.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-950">Pendientes destacados</h3>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {pendingHighlights.map((event) => (
              <TraceEventItem key={`pending-${event.key}`} event={event} compact />
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-4 p-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <TraceEmptyState onReset={resetToLast30Days} />
        ) : (
          <div className="divide-y divide-slate-100">
            {days.map((day) => (
              <div key={day} className="p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{formatTraceDay(day)}</h3>
                <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                  {grouped[day].map((event) => (
                    <TraceEventItem key={event.key} event={event} />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TraceChipGroup({ label, value, options, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([key, optionLabel]) => (
          <button
            key={key || "all"}
            type="button"
            onClick={() => onChange(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              value === key
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function TraceEventItem({ event, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const longDetail = (event.detail?.length ?? 0) > 140;
  const detail = compact || !longDetail || expanded ? event.detail : `${event.detail.slice(0, 140)}...`;
  return (
    <li className={`relative rounded-xl border border-slate-100 bg-white p-3 shadow-sm ${compact ? "" : "bg-slate-50/60"}`}>
      {!compact && <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-white bg-teal-500 ring-2 ring-slate-200" />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">{formatTraceTime(event.occurredAt)}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${traceToneClasses(event.typeTone)}`}>
              {event.typeLabel}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${traceToneClasses(event.statusTone)}`}>
              {event.statusLabel}
            </span>
          </div>
          <h4 className="mt-1 text-sm font-semibold text-slate-950">{event.title}</h4>
          {detail && <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>}
          {longDetail && !compact && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1 text-xs font-semibold text-teal-700 hover:underline"
            >
              {expanded ? "Ver menos" : "Ver detalle"}
            </button>
          )}
          {event.entityLabel && (
            <p className="mt-1 text-[11px] text-slate-400">{event.entityLabel}</p>
          )}
        </div>
        {event.actorName && (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
            {event.actorName}
          </span>
        )}
      </div>
    </li>
  );
}

function TraceEmptyState({ onReset }) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50 text-teal-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-950">No hay eventos en este rango</p>
      <p className="mt-1 text-sm text-slate-500">Amplía el rango o cambia el tipo de actividad.</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
      >
        Ver últimos 30 días
      </button>
    </div>
  );
}
