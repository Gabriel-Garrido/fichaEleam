import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../layout/PageLayout";
import PersonnelNav from "../personnel/PersonnelNav";
import { getTurnoEntrega, listTurnoEntregaAudit, turnoLabel } from "./turnosService";
import { PENDING_REASON_LABEL } from "./turnPendingUtils";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function TurnoPrintable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([getTurnoEntrega(id), listTurnoEntregaAudit(id)])
      .then(([data, history]) => {
        if (!alive) return;
        const creation = [...history].reverse().find((entry) => entry.accion === "creada");
        const latest = history[0];
        setItem(data ? {
          ...data,
          creado_por_nombre: creation?.realizado_por_nombre ?? null,
          actualizado_por_nombre: latest?.realizado_por_nombre ?? null,
        } : null);
        setAudit(history);
      })
      .catch((loadError) => {
        console.error(loadError);
        if (alive) setError("No pudimos abrir la entrega.");
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  return (
    <PageLayout
      coachFeatureId="turnos-detalle"
      title="Detalle de la entrega"
      eyebrow="Entrega de turno"
      description={item ? `${turnoLabel(item.turno)} · ${formatDate(item.fecha)}` : ""}
      headerClassName="print:hidden"
      className="print:max-w-none print:p-0"
      actions={<div className="flex gap-2 print:hidden"><button type="button" onClick={() => navigate("/operacion/turnos")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Volver</button><button type="button" onClick={() => window.print()} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Imprimir</button></div>}
    >
      <style>{`@media print { @page { size: A4 portrait; margin: 9mm; } body { background: white !important; } .turno-print { font-size: 9pt; line-height: 1.25; } .turno-print-section { break-inside: auto; margin-top: 3mm !important; } .turno-print-heading { break-after: avoid; } .turno-print-row { break-inside: avoid; } }`}</style>
      <div className="print:hidden"><PersonnelNav /></div>
      {loading ? <div className="h-80 animate-pulse rounded-2xl bg-slate-100" /> : error || !item ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || "Entrega no encontrada."}</div>
      ) : <TurnoDocument item={item} audit={audit} />}
    </PageLayout>
  );
}

function TurnoDocument({ item, audit }) {
  const summary = item.resumen_json ?? {};
  const carePending = summary.tareas_cuidado?.resumen?.pendientes_operativos
    ?? ((summary.tareas_cuidado?.resumen?.pendiente ?? 0) + (summary.tareas_cuidado?.resumen?.reprogramada ?? 0));
  const medicationPending = (summary.emar?.resumen?.pendiente ?? 0) + (summary.emar?.resumen?.pendiente_validacion ?? 0);
  const medicines = [
    ...(summary.emar?.por_validar ?? []).map((row) => ({ ...row, estado_impresion: "Por validar" })),
    ...(summary.emar?.pendientes ?? []).map((row) => ({ ...row, estado_impresion: "Pendiente" })),
  ];
  const pendingDecisions = summary.gestion_pendientes?.decisiones ?? [];

  return (
    <article className="turno-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-6">
      <header className="border-b-2 border-slate-900 pb-3 print:pb-2">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700 print:text-[8pt]">FichaEleam · continuidad del cuidado</p><h1 className="mt-1 text-2xl font-bold text-slate-950 print:text-[16pt]">Entrega de turno</h1></div>
          <div className="text-right text-sm text-slate-600 print:text-[8.5pt]"><p className="font-semibold capitalize text-slate-900">{turnoLabel(item.turno)} · {formatDate(item.fecha)}</p><p>Registró: {item.creado_por_nombre || "Usuario no disponible"}</p></div>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-5 gap-2 print:mt-2 print:gap-1">
        <PrintMetric label="Residentes" value={summary.residentes_activos ?? 0} />
        <PrintMetric label="Sin control" value={summary.sin_signos_hoy?.length ?? 0} />
        <PrintMetric label="Alertas" value={summary.signos_atencion?.length ?? 0} />
        <PrintMetric label="Cuidados" value={carePending} />
        <PrintMetric label="Medicamentos" value={medicationPending} />
      </div>

      {(item.pendientes || item.notas) && <CompactSection title="Información para el siguiente turno">
        {item.pendientes && <p className="whitespace-pre-wrap">{item.pendientes}</p>}
        {item.notas && <p className={`whitespace-pre-wrap ${item.pendientes ? "mt-2 border-t border-slate-200 pt-2" : ""}`}>{item.notas}</p>}
      </CompactSection>}

      <CompactList title="Medicamentos" items={medicines} render={(row) => <><strong>{row.residente?.nombre}</strong> · {row.medicamento}{row.dosis ? ` · ${row.dosis}` : ""}<Meta>{row.estado_impresion}{row.hora ? ` · ${row.hora.slice(0, 5)}` : ""}</Meta></>} />
      <CompactList
        title={pendingDecisions.length ? "Decisiones sobre cuidados pendientes" : "Cuidados pendientes"}
        items={pendingDecisions.length ? pendingDecisions : summary.tareas_cuidado?.pendientes}
        render={(row) => pendingDecisions.length ? (
          <>
            <strong>{row.residente}</strong> · {row.actividad}
            <Meta>
              {row.accion === "traspasar" ? `Traspasada a ${turnoLabel(row.turno_destino)}` : "No realizada"}
              {row.motivo ? ` · ${PENDING_REASON_LABEL[row.motivo] ?? row.motivo}` : ""}
            </Meta>
          </>
        ) : <><strong>{row.residente?.nombre}</strong> · {row.titulo}<Meta>{row.hora?.slice(0, 5) ?? "Sin hora"}{row.estado === "reprogramada" ? " · Reprogramada" : ""}</Meta></>}
      />
      <CompactList title="Alertas clínicas" items={summary.signos_atencion} render={(row) => <><strong>{row.residente?.nombre}</strong> · {row.label}{row.detalles?.length > 0 && <Meta>{row.detalles.map((detail) => `${detail.label}: ${detail.value}`).join(" · ")}</Meta>}</>} />
      <CompactList title="Seguimientos" items={summary.seguimientos} render={(row) => <><strong>{row.residente?.nombre}</strong> · {row.descripcion}<Meta>Turno {row.seguimiento_turno ?? "sin indicar"}{row.acciones_tomadas ? ` · Acciones: ${row.acciones_tomadas}` : ""}</Meta></>} />
      <CompactList title="Controles pendientes" items={summary.sin_signos_hoy} columns={2} render={(row) => <><strong>{row.nombre}</strong>{row.ubicacion_label ? ` · ${row.ubicacion_label}` : ""}</>} />
      <CompactList title="Incidentes recientes" items={summary.incidentes_recientes} render={(row) => <><strong>{row.residente?.nombre}</strong> · {row.descripcion}</>} />

      <footer className="mt-5 border-t border-slate-300 pt-2 text-xs text-slate-500 print:mt-3 print:text-[7.5pt]">
        <p>Guardada: {formatDateTime(item.creado_en)} · Última actualización: {formatDateTime(item.actualizado_en)} por {item.actualizado_por_nombre || item.creado_por_nombre || "usuario no disponible"} · {audit.length} versión{audit.length === 1 ? "" : "es"} registrada{audit.length === 1 ? "" : "s"}.</p>
        <p className="mt-1">Documento de apoyo a la continuidad del cuidado. Los registros clínicos originales permanecen en la ficha de cada residente.</p>
      </footer>

      <section className="mt-5 rounded-2xl border border-slate-200 p-4 print:hidden">
        <h2 className="text-sm font-semibold text-slate-950">Trazabilidad</h2>
        <p className="mt-1 text-xs text-slate-500">Historial de creación y actualizaciones conservado automáticamente.</p>
        <ol className="mt-3 divide-y divide-slate-100">{audit.map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="font-medium text-slate-700">{entry.accion === "creada" ? "Entrega creada" : "Entrega actualizada"}</span><span className="text-right text-xs text-slate-500">{entry.realizado_por_nombre || "Usuario no disponible"} · {formatDateTime(entry.realizado_en)}</span></li>)}</ol>
      </section>
    </article>
  );
}

function PrintMetric({ label, value }) {
  return <div className="rounded-lg bg-slate-50 px-2 py-2 text-center print:rounded-none print:border print:border-slate-300 print:bg-white print:py-1"><div className="text-xl font-bold text-slate-950 print:text-[12pt]">{value}</div><div className="text-[11px] text-slate-500 print:text-[7pt]">{label}</div></div>;
}

function CompactSection({ title, children }) {
  return <section className="turno-print-section mt-5"><h2 className="turno-print-heading border-b border-slate-300 pb-1 text-sm font-bold text-slate-950">{title}</h2><div className="turno-print-row mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-5 text-slate-700 print:mt-1 print:rounded-none print:border print:border-slate-300 print:bg-white print:p-2">{children}</div></section>;
}

function CompactList({ title, items = [], render, columns = 1 }) {
  if (!items?.length) return null;
  return <section className="turno-print-section mt-5"><h2 className="turno-print-heading border-b border-slate-300 pb-1 text-sm font-bold text-slate-950">{title} <span className="font-normal text-slate-400">({items.length})</span></h2><div className={`mt-1 ${columns === 2 ? "grid grid-cols-1 gap-x-4 sm:grid-cols-2 print:grid-cols-2" : ""}`}>{items.map((item, index) => <div key={item.id ?? index} className="turno-print-row border-b border-slate-100 py-2 text-sm leading-5 text-slate-700 print:py-1">{render(item)}</div>)}</div></section>;
}

function Meta({ children }) {
  return <span className="ml-2 text-xs text-slate-500 print:text-[7.5pt]">{children}</span>;
}
