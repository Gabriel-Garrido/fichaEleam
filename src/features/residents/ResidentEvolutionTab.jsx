import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import FilterBar from "../../components/FilterBar";
import Modal from "../../components/Modal";
import {
  CheckboxField,
  ErrorSummary,
  FieldGroup,
  FormGrid,
  Notice,
  SelectField,
  SubmitBar,
  TextareaField,
  TextField,
} from "../../components/forms/FormKit";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import {
  scrollToFirstError,
  setFieldErrorCleared,
  userFacingFormError,
} from "../../utils/formValidation";
import { currentTurno } from "../carePlans/carePlansService";
import {
  OBSERVATION_TURNS,
  OBSERVATION_TYPES,
  OBSERVATION_CATEGORY_GUIDANCE,
  validateObservationForm,
} from "../observations/observationFormSchema";
import {
  createObservation,
  getObservations,
} from "../observations/observationsService";
import { TIPO_LABEL } from "./residentUtils";

const PAGE_SIZE = 25;

const TIPO_TONE = {
  cambio_clinico: "sky",
  dolor: "rose",
  piel_heridas: "amber",
  conducta_animo: "emerald",
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

const EMPTY_FILTERS = {
  q: "",
  tipo: "",
  desde: "",
  hasta: "",
  seguimiento: false,
};

function localDateTimeValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dateOnly(value) {
  return String(value || localDateTimeValue()).slice(0, 10);
}

function defaultFollowUp(fechaHora, turno) {
  const baseDate = dateOnly(fechaHora);
  const base = new Date(`${baseDate}T12:00:00`);
  if (turno === "mañana") return { fecha: baseDate, turno: "tarde" };
  if (turno === "tarde") return { fecha: baseDate, turno: "noche" };
  base.setDate(base.getDate() + 1);
  return { fecha: base.toISOString().slice(0, 10), turno: "mañana" };
}

function initialObservation(residentId) {
  return {
    residente_id: residentId,
    fecha_hora: localDateTimeValue(),
    turno: currentTurno(),
    tipo: "observacion_general",
    descripcion: "",
    acciones_tomadas: "",
    requiere_seguimiento: false,
    seguimiento_fecha: "",
    seguimiento_turno: "",
  };
}

function daysAgoIso(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

function todayIso() {
  return localDateKey(new Date());
}

const DATE_PRESETS = [
  { label: "Hoy", desde: todayIso(), hasta: todayIso() },
  { label: "7 días", desde: daysAgoIso(6), hasta: todayIso() },
  { label: "30 días", desde: daysAgoIso(29), hasta: todayIso() },
  { label: "Todo", desde: "", hasta: "" },
];

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? "sin-fecha" : localDateKey(date);
}

function dayHeading(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Fecha no disponible";
  const key = dayKey(value);
  const today = dayKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === today) return "Hoy";
  if (key === dayKey(yesterday)) return "Ayer";
  return date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function followUpLabel(record) {
  if (!record.requiere_seguimiento) return null;
  if (record.seguimiento_estado === "resuelto") return "Seguimiento resuelto";
  if (record.seguimiento_estado === "cancelado") return "Seguimiento cancelado";
  const date = record.seguimiento_fecha
    ? new Date(`${record.seguimiento_fecha}T12:00:00`).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })
    : null;
  return `Pendiente${date ? ` · ${date}` : ""}${record.seguimiento_turno ? ` · ${record.seguimiento_turno}` : ""}`;
}

export default function ResidentEvolutionTab({ resident }) {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const closed = ["egresado", "fallecido"].includes(resident.estado);
  const canCreate = can("crear_observaciones") && !closed;
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const loadRecords = useCallback(async ({ append = false, offset = 0 } = {}) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const data = await getObservations(resident.id, {
        limit: PAGE_SIZE + 1,
        offset,
        desde: filters.desde || null,
        hasta: filters.hasta || null,
        tipo: filters.tipo || null,
        soloSeguimiento: filters.seguimiento,
        search: filters.q || null,
      });
      const page = data.slice(0, PAGE_SIZE);
      setHasMore(data.length > PAGE_SIZE);
      setRecords((current) => append ? [...current, ...page] : page);
    } catch (loadError) {
      setError(/network|fetch|offline/i.test(String(loadError?.message || ""))
        ? "No pudimos conectar. Revisa tu conexión e intenta nuevamente."
        : "No se pudo cargar el registro de evolución.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, resident.id]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useEffect(() => {
    if (searchParams.get("nuevaEvolucion") !== "1") return;
    if (canCreate) setComposerOpen(true);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("nuevaEvolucion");
      return next;
    }, { replace: true });
  }, [canCreate, searchParams, setSearchParams]);

  const groupedRecords = useMemo(() => {
    const groups = [];
    for (const record of records) {
      const key = dayKey(record.fecha_hora);
      const last = groups.at(-1);
      if (last?.key === key) last.items.push(record);
      else groups.push({ key, heading: dayHeading(record.fecha_hora), items: [record] });
    }
    return groups;
  }, [records]);

  const pendingCount = useMemo(
    () => records.filter((record) => record.requiere_seguimiento && record.seguimiento_estado === "pendiente").length,
    [records],
  );

  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Registro de evolución</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Observaciones clínicas y de cuidado ordenadas por fecha. Registra sólo lo relevante, las acciones realizadas y el seguimiento que deba continuar otro turno.</p>
          </div>
          {canCreate && <Button type="button" onClick={() => setComposerOpen(true)} className="w-full bg-teal-700 text-white hover:bg-teal-800 sm:w-auto">Registrar observación</Button>}
        </div>
        {pendingCount > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><strong>{pendingCount} seguimiento{pendingCount === 1 ? " pendiente" : "s pendientes"}</strong> visible{pendingCount === 1 ? "" : "s"} en los registros cargados.</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <FilterBar
          search={filters.q}
          onSearchChange={(value) => updateFilter("q", value)}
          searchPlaceholder="Buscar en descripción o acciones..."
          filters={[
            { type: "select", name: "tipo", label: "Categoría", options: OBSERVATION_TYPES, placeholder: "Todas las categorías" },
            { type: "dateRange", name: "fecha", nameDesde: "desde", nameHasta: "hasta", label: "Período", presets: DATE_PRESETS },
            { type: "toggle", name: "seguimiento", label: "Sólo seguimientos" },
          ]}
          values={filters}
          onFilterChange={updateFilter}
          onClearAll={clearFilters}
          resultCount={records.length}
          loading={loading}
        />
      </section>

      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => loadRecords()} className="font-semibold underline">Reintentar</button></div>}

      {loading ? <EvolutionSkeleton /> : records.length === 0 ? (
        <EmptyState
          tone="slate"
          title="No hay registros para mostrar"
          description={Object.values(filters).some(Boolean) ? "Prueba otro período, categoría o término de búsqueda." : "Cuando el equipo registre una observación, aparecerá aquí en orden cronológico."}
          action={canCreate && !Object.values(filters).some(Boolean) ? { label: "Registrar primera observación", onClick: () => setComposerOpen(true) } : null}
        />
      ) : (
        <div className="space-y-5">
          {groupedRecords.map((group) => (
            <section key={group.key} aria-labelledby={`evolution-${group.key}`}>
              <h3 id={`evolution-${group.key}`} className="mb-2 text-sm font-bold capitalize text-slate-600">{group.heading}</h3>
              <div className="space-y-3 border-l-2 border-slate-200 pl-3 sm:pl-5">
                {group.items.map((record) => <EvolutionRecord key={record.id} record={record} />)}
              </div>
            </section>
          ))}
          {hasMore && <div className="flex justify-center"><Button type="button" disabled={loadingMore} onClick={() => loadRecords({ append: true, offset: records.length })} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">{loadingMore ? "Cargando..." : "Cargar registros anteriores"}</Button></div>}
        </div>
      )}

      <ResidentObservationModal
        resident={resident}
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSaved={async () => {
          setComposerOpen(false);
          await loadRecords();
        }}
      />
    </div>
  );
}

function EvolutionRecord({ record }) {
  const followUp = followUpLabel(record);
  const pending = record.requiere_seguimiento && record.seguimiento_estado === "pendiente";
  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="absolute -left-[1.35rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-teal-600 shadow sm:-left-[1.85rem]" aria-hidden="true" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TIPO_TONE[record.tipo] ?? "slate"} size="sm">{TIPO_LABEL[record.tipo] ?? record.tipo}</Badge>
            <span className="text-xs font-semibold capitalize text-slate-500">Turno {record.turno || "sin indicar"}</span>
            {followUp && <Badge tone={pending ? "amber" : "emerald"} size="sm">{followUp}</Badge>}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{record.descripcion}</p>
          {record.acciones_tomadas && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-700">Acciones realizadas:</span> {record.acciones_tomadas}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          <time dateTime={record.fecha_hora} className="text-xs tabular-nums text-slate-500">{new Date(record.fecha_hora).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</time>
        </div>
      </div>
      <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-400">Registrado por {record.registrado_por_nombre || "usuario no disponible"}</p>
    </article>
  );
}

function EvolutionSkeleton() {
  return <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
}

export function ResidentObservationModal({ resident, open, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => initialObservation(resident.id));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const categoryGuidance = OBSERVATION_CATEGORY_GUIDANCE[form.tipo] ?? OBSERVATION_CATEGORY_GUIDANCE.observacion_general;

  useEffect(() => {
    if (!open) return;
    setForm(initialObservation(resident.id));
    setFieldErrors({});
    setError("");
  }, [open, resident.id]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFieldErrorCleared(setFieldErrors, name);
    setForm((current) => {
      if (name === "requiere_seguimiento") {
        if (!checked) return { ...current, requiere_seguimiento: false, seguimiento_fecha: "", seguimiento_turno: "" };
        const next = defaultFollowUp(current.fecha_hora, current.turno);
        return { ...current, requiere_seguimiento: true, seguimiento_fecha: next.fecha, seguimiento_turno: next.turno };
      }
      const nextForm = { ...current, [name]: type === "checkbox" ? checked : value };
      if ((name === "fecha_hora" || name === "turno") && current.requiere_seguimiento) {
        const next = defaultFollowUp(name === "fecha_hora" ? value : current.fecha_hora, name === "turno" ? value : current.turno);
        nextForm.seguimiento_fecha = next.fecha;
        nextForm.seguimiento_turno = next.turno;
      }
      return nextForm;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const result = validateObservationForm(form);
    setFieldErrors(result.errors);
    if (!result.ok) {
      scrollToFirstError(result.errors);
      return;
    }
    setSaving(true);
    try {
      await createObservation(result.data);
      toast("Evolución guardada en el historial del residente.", "success");
      await onSaved();
    } catch (saveError) {
      const message = userFacingFormError(saveError, "No se pudo guardar la observación. Revisa los datos e intenta nuevamente.");
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={saving ? undefined : onClose} title="Registrar evolución" panelClassName="max-w-2xl p-4 sm:p-6" closeOnBackdrop={!saving}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-950"><span className="font-semibold">Residente:</span> {resident.nombre} {resident.apellido}</div>
        {error && <Notice tone="rose">{error}</Notice>}
        <ErrorSummary errors={fieldErrors} />

        <FormGrid>
          <SelectField id="tipo" name="tipo" label="Categoría" required value={form.tipo} onChange={handleChange} options={OBSERVATION_TYPES} error={fieldErrors.tipo} placeholder={null} />
          <SelectField id="turno" name="turno" label="Turno" required value={form.turno} onChange={handleChange} options={OBSERVATION_TURNS} error={fieldErrors.turno} placeholder={null} />
          <TextField id="fecha_hora" name="fecha_hora" type="datetime-local" label="Fecha y hora" required value={form.fecha_hora} onChange={handleChange} error={fieldErrors.fecha_hora} className="sm:col-span-2" />
        </FormGrid>

        <Notice tone="teal" title="Qué conviene registrar">{categoryGuidance.help}</Notice>

        <TextareaField id="descripcion" name="descripcion" label={categoryGuidance.descriptionLabel} required value={form.descripcion} onChange={handleChange} error={fieldErrors.descripcion} maxLength={2000} rows={4} placeholder={categoryGuidance.descriptionPlaceholder} hint="Registra información objetiva, relevante y respetuosa." />
        <TextareaField id="acciones_tomadas" name="acciones_tomadas" label={categoryGuidance.actionsLabel} required={categoryGuidance.actionsRequired} value={form.acciones_tomadas} onChange={handleChange} error={fieldErrors.acciones_tomadas} maxLength={1000} rows={3} placeholder={categoryGuidance.actionsPlaceholder} hint={categoryGuidance.actionsHint} />

        <FieldGroup tone="amber">
          <CheckboxField id="requiere_seguimiento" name="requiere_seguimiento" label="Dejar seguimiento al próximo turno" description="Actívalo si el equipo debe volver a evaluar la evolución o completar una gestión." checked={form.requiere_seguimiento} onChange={handleChange} />
          {form.requiere_seguimiento && <FormGrid className="mt-4"><TextField id="seguimiento_fecha" name="seguimiento_fecha" type="date" label="Fecha" required value={form.seguimiento_fecha} onChange={handleChange} error={fieldErrors.seguimiento_fecha} /><SelectField id="seguimiento_turno" name="seguimiento_turno" label="Turno" required value={form.seguimiento_turno} onChange={handleChange} options={OBSERVATION_TURNS} error={fieldErrors.seguimiento_turno} /></FormGrid>}
        </FieldGroup>

        <SubmitBar onCancel={onClose} submitLabel="Guardar evolución" busy={saving} helperText="Quedará ordenada por fecha en el Historial de esta ficha." />
      </form>
    </Modal>
  );
}
