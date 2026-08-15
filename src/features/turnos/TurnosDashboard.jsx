import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HelpTooltip from "../../components/HelpTooltip";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../layout/PageLayout";
import PersonnelNav from "../personnel/PersonnelNav";
import { TURNOS, listTurnoEntregas, turnoLabel } from "./turnosService";

const PAGE_SIZE = 25;
const EMPTY_FILTERS = { turno: "", desde: "", hasta: "" };

function formatDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function TurnosDashboard() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ append = false, offset = 0 } = {}) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const rows = await listTurnoEntregas({
        ...filters,
        turno: filters.turno || null,
        desde: filters.desde || null,
        hasta: filters.hasta || null,
        limit: PAGE_SIZE + 1,
        offset,
      });
      const page = rows.slice(0, PAGE_SIZE);
      setHasMore(rows.length > PAGE_SIZE);
      setItems((current) => append ? [...current, ...page] : page);
    } catch (loadError) {
      console.error(loadError);
      setError("No pudimos cargar el historial de entregas.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = (event) => {
    event.preventDefault();
    if (draftFilters.desde && draftFilters.hasta && draftFilters.desde > draftFilters.hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    if (JSON.stringify(draftFilters) === JSON.stringify(filters)) {
      load();
      return;
    }
    setFilters(draftFilters);
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };

  return (
    <PageLayout
      coachFeatureId="turnos"
      title="Entregas de turno"
      eyebrow="Continuidad del cuidado"
      description="Consulta quién entregó cada turno, cuándo se actualizó y qué información quedó para el equipo siguiente."
      actions={can("registrar_entregas_turno") ? (
        <button type="button" onClick={() => navigate("/operacion/turnos/nuevo")} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
          Registrar entrega
        </button>
      ) : null}
    >
      <PersonnelNav />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-1.5">
          <h2 className="text-base font-semibold text-slate-950">Historial de entregas</h2>
          <HelpTooltip label="Ayuda sobre trazabilidad">Cada registro conserva autor, última actualización y versiones anteriores. Los filtros se aplican al presionar Buscar para evitar consultas en cada cambio.</HelpTooltip>
        </div>
        <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[180px_180px_180px_auto] lg:items-end">
          <FilterSelect label="Turno" value={draftFilters.turno} onChange={(value) => setDraftFilters((current) => ({ ...current, turno: value }))} />
          <FilterDate label="Desde" value={draftFilters.desde} onChange={(value) => setDraftFilters((current) => ({ ...current, desde: value }))} />
          <FilterDate label="Hasta" value={draftFilters.hasta} onChange={(value) => setDraftFilters((current) => ({ ...current, hasta: value }))} />
          <div className="flex gap-2">
            <button type="submit" className="min-h-11 flex-1 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">Buscar</button>
            {(filters.turno || filters.desde || filters.hasta) && <button type="button" onClick={clearFilters} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Limpiar</button>}
          </div>
        </form>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : error && items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No se muestran entregas porque la consulta no terminó correctamente.</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-sm font-semibold text-slate-950">No hay entregas en este período</h3>
            <p className="mt-1 text-sm text-slate-500">Cambia los filtros o registra la entrega del turno actual.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const updated = item.actualizado_en && new Date(item.actualizado_en).getTime() - new Date(item.creado_en).getTime() > 1000;
              return (
                <button key={item.id} type="button" onClick={() => navigate(`/operacion/turnos/${item.id}`)} className="grid w-full gap-3 p-4 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{turnoLabel(item.turno)}</span>
                      <span className="text-sm font-semibold capitalize text-slate-950">{formatDate(item.fecha)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.pendientes || item.notas || "Sin información manual adicional."}</p>
                  </div>
                  <div className="text-xs leading-5 text-slate-500 sm:text-right">
                    <p><span className="font-semibold text-slate-700">Registró:</span> {item.creado_por_nombre || "Usuario no disponible"}</p>
                    <p>{updated ? `Actualizada ${formatDateTime(item.actualizado_en)}` : `Guardada ${formatDateTime(item.creado_en)}`}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {hasMore && <div className="flex justify-center"><button type="button" disabled={loadingMore} onClick={() => load({ append: true, offset: items.length })} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{loadingMore ? "Cargando…" : "Cargar entregas anteriores"}</button></div>}
    </PageLayout>
  );
}

function FilterSelect({ label, value, onChange }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="">Todos</option>{TURNOS.map((turno) => <option key={turno} value={turno}>{turnoLabel(turno)}</option>)}</select></label>;
}

function FilterDate({ label, value, onChange }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" /></label>;
}
