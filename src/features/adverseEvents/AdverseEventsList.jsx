import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../layout/PageLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import FilterBar from "../../components/FilterBar";
import { useFilterParams } from "../../hooks/useFilterParams";
import { LeadsSkeletonList } from "../../components/Skeleton";
import { userFacingFormError } from "../../utils/formValidation";
import { getResidents } from "../residents/residentService";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  ESTADOS,
  SEVERIDADES,
  SEVERIDAD_LABEL,
  formatEventDateTime,
  severityTone,
} from "./eventosAdversosUtils";
import { listAdverseEvents } from "./eventosAdversosService";
import AdverseEventCard from "./AdverseEventCard";

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const CATEGORIA_OPTIONS = CATEGORIAS.map((c) => [c, CATEGORIA_LABEL[c]]);
const SEVERIDAD_OPTIONS = SEVERIDADES.map((s) => [s, SEVERIDAD_LABEL[s]]);
const ESTADO_OPTIONS = ESTADOS.map((e) => [e, ESTADO_LABEL[e]]);

const DATE_PRESETS = [
  { label: "Hoy", desde: today(), hasta: today() },
  { label: "Últ. 7 días", desde: daysAgoIso(6), hasta: today() },
  { label: "Este mes", desde: firstOfMonth(), hasta: today() },
];

export default function AdverseEventsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can, isAdminEleam } = useAuth();
  const canCreate = isAdminEleam || can("crear_eventos_adversos");

  const [filters, setFilter, clearFilters] = useFilterParams({
    schema: {
      q: "string",
      categoria: "string",
      severidad: "string",
      estado: "string",
      residenteId: "string",
      desde: "date",
      hasta: "date",
      pendientes: "boolean",
    },
    defaults: {
      q: "",
      categoria: "",
      severidad: "",
      estado: "",
      residenteId: "",
      desde: "",
      hasta: "",
      pendientes: false,
    },
  });

  const [events, setEvents] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResidents()
      .then(setResidents)
      .catch(() => setResidents([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdverseEvents({
        search: filters.q || null,
        categoria: filters.categoria || null,
        severidad: filters.severidad || null,
        estado: filters.estado || null,
        residenteId: filters.residenteId || null,
        desde: filters.desde || null,
        hasta: filters.hasta || null,
        soloPendientesCierre: filters.pendientes === true,
      });
      setEvents(data);
    } catch (err) {
      toast(userFacingFormError(err, "No se pudieron cargar los eventos adversos."), "error");
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => { load(); }, [load]);

  const goToDetail = (event) => navigate(`/eventos-adversos/${event.id}`);

  return (
    <PageLayout
      coachFeatureId="adverse-events"
      eyebrow="Cuidado clínico"
      title="Eventos adversos"
      description="Registro y seguimiento de eventos serios: caídas, errores de medicación, fugas, lesiones por presión y más."
      actions={canCreate ? (
        <Button onClick={() => navigate("/eventos-adversos/nuevo")} className="bg-teal-700 text-white hover:bg-teal-800 font-semibold">
          + Registrar evento
        </Button>
      ) : null}
    >
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 mb-5">
        <FilterBar
          search={filters.q ?? ""}
          onSearchChange={(v) => setFilter("q", v)}
          searchPlaceholder="Buscar por descripción, lugar, causas o conclusiones..."
          filters={[
            { type: "select", name: "categoria", label: "Categoría", options: CATEGORIA_OPTIONS, placeholder: "Todas las categorías" },
            { type: "select", name: "severidad", label: "Severidad", options: SEVERIDAD_OPTIONS, placeholder: "Cualquier severidad" },
            { type: "select", name: "estado", label: "Estado", options: ESTADO_OPTIONS, placeholder: "Todos los estados" },
            {
              type: "select",
              name: "residenteId",
              label: "Residente",
              options: residents.map((r) => [r.id, `${r.apellido}, ${r.nombre}`]),
              placeholder: "Todos los residentes",
            },
            { type: "dateRange", name: "fecha", nameDesde: "desde", nameHasta: "hasta", label: "Período", presets: DATE_PRESETS },
            { type: "toggle", name: "pendientes", label: "Solo pendientes de cierre" },
          ]}
          values={filters}
          onFilterChange={setFilter}
          onClearAll={clearFilters}
          resultCount={loading ? undefined : events.length}
          loading={loading}
        />
      </div>

      {loading ? (
        <LeadsSkeletonList count={4} />
      ) : events.length === 0 ? (
        <EmptyState
          hasFilters={Object.values(filters).some((v) => v && v !== false)}
          onClearAll={clearFilters}
          onCreate={canCreate ? () => navigate("/eventos-adversos/nuevo") : null}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid gap-3 lg:hidden">
            {events.map((event) => (
              <AdverseEventCard key={event.id} event={event} onOpen={goToDetail} />
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Severidad</th>
                  <th className="px-4 py-3">Residente</th>
                  <th className="px-4 py-3">Lugar</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => {
                  const tone = severityTone(event.severidad);
                  return (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 tabular-nums">
                        {formatEventDateTime(event.fecha_evento, event.hora_evento)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {CATEGORIA_LABEL[event.categoria] ?? event.categoria}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                          {SEVERIDAD_LABEL[event.severidad] ?? event.severidad}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {event.residente ? `${event.residente.apellido}, ${event.residente.nombre}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[10rem]">{event.lugar || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {ESTADO_LABEL[event.estado] ?? event.estado}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => goToDetail(event)}
                          className="text-xs font-semibold text-teal-700 hover:underline"
                        >
                          Ver detalle →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageLayout>
  );
}

function EmptyState({ hasFilters, onClearAll, onCreate }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50">
        <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      {hasFilters ? (
        <>
          <h2 className="text-sm font-semibold text-slate-900">Sin resultados</h2>
          <p className="mt-1 text-sm text-slate-500">No hay eventos adversos que coincidan con los filtros aplicados.</p>
          <button type="button" onClick={onClearAll} className="mt-4 text-sm font-semibold text-teal-700 hover:underline">
            Limpiar filtros
          </button>
        </>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-slate-900">Aún no hay eventos adversos registrados</h2>
          <p className="mt-1 max-w-md mx-auto text-sm text-slate-500">
            Registra caídas, errores de medicación, fugas y cualquier evento serio para mantener trazabilidad reglamentaria y aprender de cada caso.
          </p>
          {onCreate && (
            <Button onClick={onCreate} className="mt-4 bg-teal-700 text-white hover:bg-teal-800 font-semibold">
              Registrar primer evento
            </Button>
          )}
        </>
      )}
    </div>
  );
}
