import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getObservations, deleteObservation } from "./observationsService";
import { getResidents } from "../residents/residentService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import EmptyState from "../../components/EmptyState";
import FilterBar from "../../components/FilterBar";
import PageLayout from "../../layout/PageLayout";
import { useFilterParams } from "../../hooks/useFilterParams";
import { TIPO_LABEL } from "../residents/residentUtils";

const TIPO_TONE = {
  caida: "rose",
  incidente: "rose",
  curacion: "sky",
  visita_medica: "sky",
  administracion_medicamento: "primary",
  cambio_posicion: "amber",
  higiene: "amber",
  alimentacion: "emerald",
  eliminacion: "amber",
  actividad: "emerald",
  observacion_general: "slate",
  otro: "slate",
};

const TIPO_OPTIONS = Object.entries(TIPO_LABEL);

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

const DATE_PRESETS = [
  { label: "Hoy", desde: today(), hasta: today() },
  { label: "Últ. 7 días", desde: daysAgoIso(6), hasta: today() },
  { label: "Este mes", desde: firstOfMonth(), hasta: today() },
];

function formatFollowUpLabel(record) {
  const parts = [];

  if (record.seguimiento_fecha) {
    parts.push(
      new Date(`${record.seguimiento_fecha}T12:00:00`).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
      })
    );
  }

  if (record.seguimiento_turno) parts.push(record.seguimiento_turno);

  return parts.length ? `Seguimiento · ${parts.join(" · ")}` : "Seguimiento pendiente";
}

function ObservationList() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canDelete = can("eliminar_observaciones");
  const canCreate = can("crear_observaciones");

  const [filters, setFilter, clearFilters] = useFilterParams({
    schema: {
      q: "string",
      residenteId: "string",
      tipo: "string",
      desde: "date",
      hasta: "date",
      seguimiento: "boolean",
    },
    defaults: {
      q: "",
      residenteId: "",
      tipo: "",
      desde: firstOfMonth(),
      hasta: today(),
      seguimiento: false,
    },
  });
  const busqueda = filters.q ?? "";
  const filtroResidente = filters.residenteId ?? "";
  const filtroTipo = filters.tipo ?? "";
  const filtroDesde = filters.desde ?? "";
  const filtroHasta = filters.hasta ?? "";
  const soloSeguimiento = filters.seguimiento === true;
  const preselectedId = filtroResidente;

  const [records, setRecords]                 = useState([]);
  const [residents, setResidents]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);

  useEffect(() => {
    getResidents()
      .then(setResidents)
      .catch(() => toast("No se pudo cargar la lista de residentes.", "warning"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getObservations(filtroResidente || null, {
        desde:            filtroDesde || null,
        hasta:            filtroHasta || null,
        tipo:             filtroTipo  || null,
        soloSeguimiento,
        search:           busqueda || null,
      });
      setRecords(data);
    } catch (err) {
      const isNetwork = /network|fetch|offline/i.test(String(err?.message || ""));
      setError(isNetwork
        ? "No pudimos conectar. Revisa tu conexión e intenta nuevamente."
        : "No se pudieron cargar las observaciones.");
    } finally {
      setLoading(false);
    }
  }, [filtroResidente, filtroDesde, filtroHasta, filtroTipo, soloSeguimiento, busqueda]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: "Eliminar observación",
      message: "¿Eliminar esta observación? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteObservation(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast("Observación eliminada.", "success");
    } catch {
      toast("No se pudo eliminar la observación.", "error");
    }
  };

  const hasActiveFilters = !!(filtroResidente || filtroTipo || soloSeguimiento || busqueda);

  if (loading) return (
    <PageLayout title="Observaciones" eyebrow="Cuidado diario">
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </PageLayout>
  );

  return (
    <PageLayout
      coachFeatureId="observations"
      title="Observaciones"
      eyebrow="Cuidado diario"
      description={`${records.length} registro${records.length === 1 ? "" : "s"} en el período seleccionado${soloSeguimiento ? " · solo seguimientos" : ""}. Usa seguimiento para dejar pendientes claros al próximo turno.`}
      actions={
        canCreate ? (
          <Button
            onClick={() =>
              navigate(
                preselectedId
                  ? `/observations/new?residenteId=${preselectedId}`
                  : "/observations/new"
              )
            }
            className="w-full sm:w-auto bg-teal-700 text-white px-6 py-2 rounded-xl hover:bg-teal-800"
          >
            + Nueva Observación
          </Button>
        ) : null
      }
    >

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={fetchRecords} className="underline text-sm ml-2">Reintentar</button>
        </div>
      )}

      <div className="mb-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        <FilterBar
          search={busqueda}
          onSearchChange={(v) => setFilter("q", v)}
          searchPlaceholder="Buscar por descripción o acciones..."
          filters={[
            {
              type: "select",
              name: "residenteId",
              label: "Residente",
              options: residents.map((r) => [r.id, `${r.apellido}, ${r.nombre}`]),
              placeholder: "Todos los residentes",
            },
            {
              type: "select",
              name: "tipo",
              label: "Tipo",
              options: TIPO_OPTIONS,
              placeholder: "Todos los tipos",
            },
            {
              type: "dateRange",
              name: "fecha",
              nameDesde: "desde",
              nameHasta: "hasta",
              label: "Período",
              presets: DATE_PRESETS,
            },
            {
              type: "toggle",
              name: "seguimiento",
              label: "Solo seguimientos",
            },
          ]}
          values={filters}
          onFilterChange={setFilter}
          onClearAll={clearFilters}
          resultCount={records.length}
          loading={loading}
        />
      </div>

      {records.length === 0 ? (
        <EmptyState
          tone="slate"
          title="Sin observaciones para los filtros seleccionados"
          description={hasActiveFilters
            ? "Quita algunos filtros o cambia el rango de fechas para ver más resultados."
            : "Aún no hay observaciones registradas en este período. Crea una nueva para dejar trazabilidad clínica."}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
          }
          action={hasActiveFilters ? { label: "Limpiar filtros", onClick: clearFilters } : null}
        />
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {records.map((r) => (
            <article key={r.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {r.residentes
                        ? `${r.residentes.apellido}, ${r.residentes.nombre}`
                        : "—"}
                    </span>
                    <Badge tone={TIPO_TONE[r.tipo] ?? "slate"} size="sm">
                      {TIPO_LABEL[r.tipo] ?? r.tipo}
                    </Badge>
                    {r.requiere_seguimiento && (
                      <Badge tone="amber" size="sm">{formatFollowUpLabel(r)}</Badge>
                    )}
                    <span className="text-xs font-medium capitalize text-slate-400">{r.turno}</span>
                  </div>
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">{r.descripcion}</p>
                  {r.acciones_tomadas && (
                    <p className="mt-1 line-clamp-2 text-sm italic text-slate-500">
                      Acciones: {r.acciones_tomadas}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-xs tabular-nums text-slate-400">
                    {new Date(r.fecha_hora).toLocaleString("es-CL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="text-xs font-medium text-rose-500 transition-colors hover:text-rose-700"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageLayout>
  );
}

export default ObservationList;
