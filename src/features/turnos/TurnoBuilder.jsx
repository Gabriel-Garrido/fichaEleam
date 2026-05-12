import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../layout/PageLayout";
import {
  TURNOS,
  buildTurnoSummary,
  currentTurno,
  saveTurnoEntrega,
  todayIso,
  turnoLabel,
} from "./turnosService";

export default function TurnoBuilder() {
  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [summary, setSummary] = useState(null);
  const [notas, setNotas] = useState("");
  const [pendientes, setPendientes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    buildTurnoSummary({ fecha, turno })
      .then((data) => {
        if (alive) setSummary(data);
      })
      .catch((err) => {
        console.error(err);
        if (alive) setError("No pudimos preparar el resumen automático. Intenta nuevamente.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [fecha, turno]);

  const nextText = useMemo(() => {
    if (!summary) return "";
    const urgent = summary.signos_atencion?.filter((item) => item.status === "critical").length ?? 0;
    const sinSignos = summary.sin_signos_hoy?.length ?? 0;
    const seguimientos = summary.seguimientos?.length ?? 0;
    if (urgent) return `Priorizar ${urgent} residente${urgent > 1 ? "s" : ""} con signos críticos.`;
    if (sinSignos) return `Completar controles de ${sinSignos} residente${sinSignos > 1 ? "s" : ""}.`;
    if (seguimientos) return `Revisar ${seguimientos} seguimiento${seguimientos > 1 ? "s" : ""} pendiente${seguimientos > 1 ? "s" : ""}.`;
    return "Turno sin alertas urgentes. Mantén el registro actualizado.";
  }, [summary]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const saved = await saveTurnoEntrega({ fecha, turno, resumen: summary, notas, pendientes });
      navigate(`/turnos/${saved.id}`);
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar la entrega. Revisa permisos o conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Nueva entrega"
      eyebrow="Entrega de turno"
      description="Revisa lo importante, agrega notas breves y deja pendientes accionables."
      actions={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading || !summary}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar entrega"}
        </button>
      }
    >
      <div className="mb-4 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_160px_160px]">
        <div className="rounded-2xl bg-teal-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Siguiente foco</div>
          <div className="mt-1 text-sm font-semibold text-teal-950">{loading ? "Preparando resumen..." : nextText}</div>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Turno
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {TURNOS.map((t) => <option key={t} value={t}>{turnoLabel(t)}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSummary />
      ) : summary && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            <SummarySection title="Alertas clínicas" empty="Sin signos críticos o en atención.">
              {summary.signos_atencion?.map((item) => (
                <AlertRow key={item.id} item={item} />
              ))}
            </SummarySection>

            <SummarySection title="Faltan controles" empty="Todos los residentes activos tienen signos registrados hoy.">
              {summary.sin_signos_hoy?.map((residente) => (
                <ResidentRow key={residente.id} residente={residente} />
              ))}
            </SummarySection>

            <SummarySection title="Seguimientos" empty="No hay observaciones con seguimiento de hoy.">
              {summary.seguimientos?.map((item) => (
                <TextRow key={item.id} item={item} />
              ))}
            </SummarySection>

            <SummarySection title="Incidentes recientes" empty="No hay caídas ni incidentes recientes.">
              {summary.incidentes_recientes?.map((item) => (
                <TextRow key={item.id} item={item} />
              ))}
            </SummarySection>

            <SummarySection title="Carpeta SEREMI" empty="Sin vencimientos u observaciones abiertas cargadas en el resumen.">
              {[...(summary.seremi?.vencidos ?? []), ...(summary.seremi?.porVencer ?? [])].slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-950">{item.requisito?.nombre ?? item.nombre ?? "Requisito"}</div>
                  <div className="mt-1 text-xs text-slate-500">Vence: {item.fecha_vencimiento || "sin fecha"}</div>
                </div>
              ))}
              {(summary.seremi?.observaciones ?? []).slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
                  <div className="text-sm font-semibold text-orange-950">Observación abierta</div>
                  <p className="mt-1 text-sm leading-6 text-orange-800">{item.descripcion}</p>
                </div>
              ))}
            </SummarySection>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Notas del turno</h2>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={7}
                placeholder="Ej.: residente estable, familia informada, cambios de indicación..."
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Pendientes para siguiente turno</h2>
              <textarea
                value={pendientes}
                onChange={(e) => setPendientes(e.target.value)}
                rows={7}
                placeholder="Ej.: controlar presión a las 20:00, confirmar receta, llamar a familiar..."
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Actividad del turno</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <SmallMetric label="Signos" value={summary.actividad_turno?.signos ?? 0} />
                <SmallMetric label="Observaciones" value={summary.actividad_turno?.observaciones ?? 0} />
                <SmallMetric label="Residentes" value={summary.residentes_activos ?? 0} />
                <SmallMetric label="Fecha" value={turnoLabel(summary.turno)} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </PageLayout>
  );
}

function LoadingSummary() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />)}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100" />)}
      </div>
    </div>
  );
}

function SummarySection({ title, children, empty }) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-2">
        {hasContent ? children : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{empty}</div>
        )}
      </div>
    </div>
  );
}

function AlertRow({ item }) {
  const tone = item.status === "critical" ? "rose" : "amber";
  return (
    <div className={`rounded-2xl border p-3 ${tone === "rose" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-slate-950">{item.residente.nombre}</div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone === "rose" ? "bg-white text-rose-700" : "bg-white text-amber-800"}`}>
          {item.label}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {item.detalles?.map((detail) => (
          <span key={detail.key} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700">
            {detail.label}: {detail.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResidentRow({ residente }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
      <div>
        <div className="text-sm font-semibold text-slate-950">{residente.nombre}</div>
        <div className="text-xs text-slate-500">
          {[residente.habitacion && `Hab. ${residente.habitacion}`, residente.cama && `Cama ${residente.cama}`].filter(Boolean).join(" · ") || "Sin ubicación"}
        </div>
      </div>
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Sin signos hoy</span>
    </div>
  );
}

function TextRow({ item }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <div className="text-sm font-semibold text-slate-950">{item.residente?.nombre ?? "Residente"}</div>
      <p className="mt-1 text-sm leading-6 text-slate-600">{item.descripcion}</p>
    </div>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-lg font-semibold text-slate-950">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
