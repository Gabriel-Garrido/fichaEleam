import {
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  ESTADO_TONE,
  SEVERIDAD_LABEL,
  formatEventDateTime,
  severityTone,
} from "./eventosAdversosUtils";

// Card que muestra resumen del evento. Se usa en grid mobile y en lista detail
// del residente. En desktop la lista usa una tabla aparte (ver AdverseEventsList).
export default function AdverseEventCard({ event, onOpen, compact = false }) {
  const tone = severityTone(event.severidad);
  const residente = event.residente;
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(event)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(event); } }}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:border-teal-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      aria-label={`Evento adverso ${CATEGORIA_LABEL[event.categoria]} severidad ${SEVERIDAD_LABEL[event.severidad]}`}
    >
      <header className="flex flex-wrap items-start gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {SEVERIDAD_LABEL[event.severidad] ?? event.severidad}
        </span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ESTADO_TONE[event.estado] ?? ESTADO_TONE.registrado}`}>
          {ESTADO_LABEL[event.estado] ?? event.estado}
        </span>
        <span className="ml-auto text-xs text-slate-400 tabular-nums">
          {formatEventDateTime(event.fecha_evento, event.hora_evento)}
        </span>
      </header>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">
          {CATEGORIA_LABEL[event.categoria] ?? event.categoria}
        </p>
        {residente && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            {residente.apellido}, {residente.nombre}
            {event.lugar ? <> · {event.lugar}</> : null}
          </p>
        )}
        {!compact && (
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">{event.descripcion}</p>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        {event.requiere_seguimiento && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Requiere seguimiento
          </span>
        )}
        {event.notificado_familia && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
            Familia informada
          </span>
        )}
        {event.visible_familiar && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700">
            Visible en portal
          </span>
        )}
        <span className="ml-auto text-teal-700 group-hover:underline">Ver detalle →</span>
      </footer>
    </article>
  );
}
