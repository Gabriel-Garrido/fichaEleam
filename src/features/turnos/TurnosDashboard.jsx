import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../layout/PageLayout";
import { listTurnoEntregas, turnoLabel } from "./turnosService";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function summaryCount(summary, key) {
  const value = summary?.[key];
  return Array.isArray(value) ? value.length : 0;
}

export default function TurnosDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listTurnoEntregas()
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch((err) => {
        console.error(err);
        if (alive) setError("No pudimos cargar el historial de entregas.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  return (
    <PageLayout
      title="Entrega de turno"
      eyebrow="Cuidado diario"
      description="Resumen breve para que el siguiente equipo parta con prioridades claras."
      actions={
        <button
          type="button"
          onClick={() => navigate("/turnos/nueva")}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
        >
          Nueva entrega
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Historial</h2>
              <p className="text-sm text-slate-500">Últimas entregas guardadas por fecha y turno.</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-xl text-teal-800">⇄</div>
              <h3 className="mt-3 text-sm font-semibold text-slate-950">Aún no hay entregas guardadas</h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                Puedes crear la primera con datos automáticos. Si no hay registros todavía, quedará como checklist inicial.
              </p>
              <button
                type="button"
                onClick={() => navigate("/turnos/nueva")}
                className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Preparar entrega
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/turnos/${item.id}`)}
                  className="grid w-full gap-3 py-4 text-left hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                        {turnoLabel(item.turno)}
                      </span>
                      <span className="text-sm font-semibold text-slate-950">{formatDate(item.fecha)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {item.pendientes || item.notas || "Sin notas manuales."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                    <Metric label="Sin signos" value={summaryCount(item.resumen_json, "sin_signos_hoy")} />
                    <Metric label="Atención" value={summaryCount(item.resumen_json, "signos_atencion")} />
                    <Metric label="Seguim." value={summaryCount(item.resumen_json, "seguimientos")} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Cómo usarlo</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <Step n="1" text="Revisa alertas y residentes sin control." />
            <Step n="2" text="Agrega notas breves y pendientes concretos." />
            <Step n="3" text="Guarda e imprime si el equipo lo requiere." />
          </div>
        </aside>
      </section>
    </PageLayout>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-base font-semibold text-slate-950">{value}</div>
      <div>{label}</div>
    </div>
  );
}

function Step({ n, text }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
        {n}
      </span>
      <span>{text}</span>
    </div>
  );
}

