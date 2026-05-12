import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../layout/PageLayout";
import { getTurnoEntrega, turnoLabel } from "./turnosService";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function TurnoPrintable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getTurnoEntrega(id)
      .then((data) => {
        if (alive) setItem(data);
      })
      .catch((err) => {
        console.error(err);
        if (alive) setError("No pudimos abrir la entrega.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [id]);

  return (
    <PageLayout
      title="Entrega guardada"
      eyebrow="Entrega de turno"
      description={item ? `${turnoLabel(item.turno)} · ${formatDate(item.fecha)}` : ""}
      actions={
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => navigate("/turnos")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Imprimir
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
      ) : error || !item ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error || "Entrega no encontrada."}
        </div>
      ) : (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none">
          <div className="grid gap-4 md:grid-cols-3">
            <PrintMetric label="Residentes activos" value={item.resumen_json?.residentes_activos ?? 0} />
            <PrintMetric label="Sin signos hoy" value={item.resumen_json?.sin_signos_hoy?.length ?? 0} />
            <PrintMetric label="Alertas clínicas" value={item.resumen_json?.signos_atencion?.length ?? 0} />
          </div>

          <PrintableSection title="Pendientes para siguiente turno">
            {item.pendientes || "Sin pendientes manuales."}
          </PrintableSection>

          <PrintableSection title="Notas del turno">
            {item.notas || "Sin notas manuales."}
          </PrintableSection>

          <PrintableList title="Alertas clínicas" items={item.resumen_json?.signos_atencion} render={(row) => (
            <div>
              <strong>{row.residente?.nombre}</strong> · {row.label}
              {row.detalles?.length > 0 && (
                <div className="mt-1 text-xs text-slate-500">
                  {row.detalles.map((d) => `${d.label}: ${d.value}`).join(" · ")}
                </div>
              )}
            </div>
          )} />

          <PrintableList title="Faltan controles" items={item.resumen_json?.sin_signos_hoy} render={(row) => (
            <div><strong>{row.nombre}</strong></div>
          )} />

          <PrintableList title="Seguimientos" items={item.resumen_json?.seguimientos} render={(row) => (
            <div><strong>{row.residente?.nombre}</strong> · {row.descripcion}</div>
          )} />

          <PrintableList title="Incidentes recientes" items={item.resumen_json?.incidentes_recientes} render={(row) => (
            <div><strong>{row.residente?.nombre}</strong> · {row.descripcion}</div>
          )} />
        </article>
      )}
    </PageLayout>
  );
}

function PrintMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-2xl font-semibold text-slate-950">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function PrintableSection({ title, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {children}
      </p>
    </section>
  );
}

function PrintableList({ title, items = [], render }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {items?.length ? (
        <div className="mt-2 space-y-2">
          {items.map((item, index) => (
            <div key={item.id ?? index} className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
              {render(item)}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Sin registros.</p>
      )}
    </section>
  );
}

