import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import ChipGroup from "../../components/ChipGroup";
import EmptyState from "../../components/EmptyState";
import FilterBar from "../../components/FilterBar";
import HelpTooltip from "../../components/HelpTooltip";
import Modal from "../../components/Modal";
import { useConfirm } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import {
  ErrorSummary,
  FormGrid,
  Notice,
  SelectField,
  SubmitBar,
  TextareaField,
  TextField,
} from "../../components/forms/FormKit";
import PageLayout from "../../layout/PageLayout";
import { useAuth } from "../../context/AuthContext";
import { useFilterParams } from "../../hooks/useFilterParams";
import { friendlyError } from "../../utils/errorMessages";
import { scrollToFirstError, setFieldErrorCleared } from "../../utils/formValidation";
import {
  assignResidentToBed,
  deleteCama,
  deleteHabitacion,
  getBedsOverview,
  releaseResidentBed,
  saveCama,
  saveHabitacion,
} from "./bedsService";
import {
  ASSIGNMENT_STATUS_LABELS,
  BED_STATUS_LABELS,
  formatBedLocation,
  groupBedsByRoom,
  hasDuplicateBedCode,
  hasDuplicateRoomCode,
  suggestNextBedCode,
} from "./bedsUtils";
import { validateBedForm, validateRoomForm } from "./bedsFormSchema";

const BED_TYPES = [
  ["estandar", "Estándar"],
  ["clinica", "Clínica"],
  ["bariatrica", "Bariátrica"],
  ["otra", "Otra"],
];

const BED_STATUS = [
  ["operativa", "Operativa"],
  ["mantenimiento", "Mantenimiento"],
  ["inactiva", "Inactiva"],
];

const FILTERS = [
  ["todos", "Todas"],
  ["disponibles", "Disponibles"],
  ["ocupadas", "Ocupadas"],
  ["reservadas", "Reservadas"],
  ["fuera_servicio", "Fuera de servicio"],
];

function bedError(error, fallback) {
  const message = error?.message || "";
  if (error?.code === "23505" && /habitaciones/i.test(message)) {
    return "Ya existe una habitación con ese código en este ELEAM.";
  }
  if (error?.code === "23505" && /camas/i.test(message)) {
    return "Ya existe una cama con ese código en la habitación seleccionada.";
  }
  if (error?.code === "23503") {
    return "No se puede completar la acción porque existen registros vinculados.";
  }
  if (/cama|habitacion|residente|hospitalizacion|ocupada|reservada|operativa|autorizado/i.test(message)) {
    return message;
  }
  return friendlyError(error, fallback);
}

function occupantName(resident) {
  if (!resident) return "Sin residente";
  return `${resident.nombre ?? ""} ${resident.apellido ?? ""}`.trim();
}

function Kpi({ label, value, sub, tone = "teal", help }) {
  const tones = {
    teal: "border-teal-100 bg-teal-50 text-teal-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
  };
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
        <span className="truncate">{label}</span>
        {help && <HelpTooltip label={`Ayuda: ${label}`}>{help}</HelpTooltip>}
      </div>
      <div className={`mt-2 inline-flex min-w-12 justify-center rounded-xl border px-2.5 py-0.5 text-lg font-bold tabular-nums sm:px-3 sm:py-1 sm:text-2xl ${tones[tone]}`}>
        {value}
      </div>
      {sub && <p className="mt-1 text-[11px] text-slate-500 sm:mt-2 sm:text-xs">{sub}</p>}
    </article>
  );
}

const STATUS_BADGE_TONE = {
  operativa: "emerald",
  mantenimiento: "amber",
  inactiva: "slate",
  ocupada: "primary",
  reservada_hospitalizacion: "sky",
};

function StatusBadge({ status, type = "bed" }) {
  const label = type === "assignment"
    ? ASSIGNMENT_STATUS_LABELS[status] ?? status
    : BED_STATUS_LABELS[status] ?? status;
  return <Badge tone={STATUS_BADGE_TONE[status] ?? "slate"} size="sm">{label}</Badge>;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
}

function RoomModal({ initial, rooms = [], onClose, onSubmit, saving }) {
  const [form, setForm] = useState(() => ({
    id: initial?.id ?? null,
    codigo: initial?.codigo ?? "",
    nombre: initial?.nombre ?? "",
    piso: initial?.piso ?? "",
    sector: initial?.sector ?? "",
    estado: initial?.estado ?? "operativa",
    orden: initial?.orden ?? 0,
    notas: initial?.notas ?? "",
  }));
  const [errors, setErrors] = useState({});
  const set = (key, value) => {
    setFieldErrorCleared(setErrors, key);
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const submit = (event) => {
    event.preventDefault();
    const result = validateRoomForm(form);
    setErrors(result.errors);
    if (!result.ok) {
      scrollToFirstError(result.errors);
      return;
    }
    if (hasDuplicateRoomCode({ rooms, code: result.data.codigo, currentId: result.data.id })) {
      const nextErrors = { codigo: "Ya existe una habitación con ese código." };
      setErrors(nextErrors);
      scrollToFirstError(nextErrors);
      return;
    }
    onSubmit(result.data);
  };
  return (
    <Modal isOpen onClose={onClose} title={form.id ? "Editar habitación" : "Nueva habitación"}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <ErrorSummary errors={errors} />
        <FormGrid>
          <TextField id="codigo" name="codigo" label="Código" required value={form.codigo} onChange={(e) => set("codigo", e.target.value)} error={errors.codigo} maxLength={40} placeholder="101" />
          <TextField id="orden" name="orden" type="number" label="Orden" value={form.orden} onChange={(e) => set("orden", e.target.value)} error={errors.orden} min={0} max={9999} />
          <TextField id="nombre" name="nombre" label="Nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} error={errors.nombre} maxLength={120} placeholder="Habitación norte" />
          <SelectField id="estado" name="estado" label="Estado" required value={form.estado} onChange={(e) => set("estado", e.target.value)} options={BED_STATUS} error={errors.estado} placeholder={null} />
          <TextField id="piso" name="piso" label="Piso" value={form.piso} onChange={(e) => set("piso", e.target.value)} error={errors.piso} maxLength={80} />
          <TextField id="sector" name="sector" label="Sector" value={form.sector} onChange={(e) => set("sector", e.target.value)} error={errors.sector} maxLength={120} />
        </FormGrid>
        <TextareaField id="notas" name="notas" label="Notas" value={form.notas} onChange={(e) => set("notas", e.target.value)} error={errors.notas} maxLength={500} rows={3} />
        <SubmitBar onCancel={onClose} submitLabel="Guardar habitación" busy={saving} helperText="El código debe ser único dentro del ELEAM." />
      </form>
    </Modal>
  );
}

function BedModal({ habitaciones, camas = [], initial, onClose, onSubmit, saving }) {
  const [form, setForm] = useState(() => ({
    id: initial?.id ?? null,
    habitacion_id: initial?.habitacion_id ?? initial?.habitacion?.id ?? habitaciones[0]?.id ?? "",
    codigo: initial?.codigo ?? "",
    nombre: initial?.nombre ?? "",
    tipo: initial?.tipo ?? "estandar",
    estado: initial?.estado ?? "operativa",
    orden: initial?.orden ?? 0,
    notas: initial?.notas ?? "",
  }));
  const [errors, setErrors] = useState({});
  const selectedRoom = habitaciones.find((room) => room.id === form.habitacion_id);
  const set = (key, value) => {
    setFieldErrorCleared(setErrors, key);
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const submit = (event) => {
    event.preventDefault();
    const result = validateBedForm(form);
    setErrors(result.errors);
    if (!result.ok) {
      scrollToFirstError(result.errors);
      return;
    }
    if (hasDuplicateBedCode({ beds: camas, roomId: result.data.habitacion_id, code: result.data.codigo, currentId: result.data.id })) {
      const nextErrors = { codigo: "Ya existe una cama con ese código en esta habitación." };
      setErrors(nextErrors);
      scrollToFirstError(nextErrors);
      return;
    }
    if (initial?.assignment && result.data.estado !== "operativa") {
      const nextErrors = { estado: "Libera o transfiere al residente antes de dejar esta cama fuera de servicio." };
      setErrors(nextErrors);
      scrollToFirstError(nextErrors);
      return;
    }
    onSubmit(result.data);
  };
  return (
    <Modal isOpen onClose={onClose} title={form.id ? "Editar cama" : "Nueva cama"}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <ErrorSummary errors={errors} />
        <SelectField
          id="habitacion_id"
          name="habitacion_id"
          label="Habitación"
          required
          value={form.habitacion_id}
          onChange={(e) => set("habitacion_id", e.target.value)}
          options={habitaciones.map((room) => [room.id, `${room.codigo}${room.nombre ? ` · ${room.nombre}` : ""}`])}
          error={errors.habitacion_id}
        />
        {selectedRoom?.estado && selectedRoom.estado !== "operativa" && (
          <Notice tone="amber">
            Esta habitación no está operativa. Puedes guardar la cama, pero no podrá asignarse hasta reactivar la habitación.
          </Notice>
        )}
        <FormGrid>
          <TextField id="codigo" name="codigo" label="Código" required value={form.codigo} onChange={(e) => set("codigo", e.target.value)} error={errors.codigo} maxLength={40} placeholder="A" />
          <TextField id="orden" name="orden" type="number" label="Orden" value={form.orden} onChange={(e) => set("orden", e.target.value)} error={errors.orden} min={0} max={9999} />
          <SelectField id="tipo" name="tipo" label="Tipo" required value={form.tipo} onChange={(e) => set("tipo", e.target.value)} options={BED_TYPES} error={errors.tipo} placeholder={null} />
          <SelectField id="estado" name="estado" label="Estado" required value={form.estado} onChange={(e) => set("estado", e.target.value)} options={BED_STATUS} error={errors.estado} placeholder={null} />
        </FormGrid>
        <TextField id="nombre" name="nombre" label="Nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} error={errors.nombre} maxLength={120} />
        <TextareaField id="notas" name="notas" label="Notas" value={form.notas} onChange={(e) => set("notas", e.target.value)} error={errors.notas} maxLength={500} rows={3} />
        {initial?.assignment && form.estado !== "operativa" && (
          <Notice tone="amber">
            Libera o transfiere al residente antes de dejar esta cama fuera de servicio.
          </Notice>
        )}
        <SubmitBar onCancel={onClose} submitLabel="Guardar cama" busy={saving} helperText="La cama debe pertenecer a una habitación operativa para poder asignarla." />
      </form>
    </Modal>
  );
}

function AssignModal({ bed, residentes, onClose, onSubmit, saving }) {
  const [residentId, setResidentId] = useState("");
  const [query, setQuery] = useState("");
  const [notas, setNotas] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return residentes;
    return residentes.filter((resident) =>
      `${resident.nombre} ${resident.apellido} ${resident.rut ?? ""}`.toLowerCase().includes(q),
    );
  }, [residentes, query]);
  const selected = residentes.find((resident) => resident.id === residentId);
  return (
    <Modal isOpen onClose={onClose} title={`Asignar ${formatBedLocation(bed)}`} panelClassName="max-w-lg p-4 sm:max-w-2xl sm:p-6">
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (residentId) onSubmit({ residentId, notas });
      }}>
        <Field label="Buscar residente activo">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              className={`${inputClass()} pl-9`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, apellido o RUT"
              autoFocus
            />
          </div>
          {residentes.length > 12 && (
            <p className="mt-1 text-[11px] text-slate-400">{filtered.length} de {residentes.length} residentes</p>
          )}
        </Field>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 sm:max-h-80">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">
              {residentes.length === 0
                ? "No hay residentes activos disponibles."
                : "Sin coincidencias. Prueba otro nombre o limpia la búsqueda."}
            </div>
          ) : filtered.map((resident) => {
            const isSelected = residentId === resident.id;
            return (
              <button
                key={resident.id}
                type="button"
                onClick={() => setResidentId(resident.id)}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                  isSelected ? "bg-teal-50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">{occupantName(resident)}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {resident.cama_actual_id ? resident.ubicacion_label : "Sin cama asignada"}
                  </span>
                </span>
                {isSelected && (
                  <span className="shrink-0 text-xs font-semibold text-teal-700">✓ Seleccionado</span>
                )}
              </button>
            );
          })}
        </div>
        {selected?.cama_actual_id && (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {occupantName(selected)} será transferido desde {selected.ubicacion_label}.
          </p>
        )}
        <Field label="Notas (opcional)">
          <textarea className={inputClass()} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Motivo o detalles del cambio…" />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving || !residentId} className="w-full bg-teal-700 text-white hover:bg-teal-800 sm:w-auto">
            {saving ? "Asignando…" : "Asignar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TransferModal({ bed, availableBeds, onClose, onSubmit, saving }) {
  const resident = bed?.assignment?.residente;
  const [targetBedId, setTargetBedId] = useState("");
  const [notas, setNotas] = useState("");
  return (
    <Modal isOpen onClose={onClose} title="Transferir residente">
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (resident?.id && targetBedId) onSubmit({ residentId: resident.id, targetBedId, notas });
      }}>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold">{occupantName(resident)}</span> desde {formatBedLocation(bed)}
        </div>
        {availableBeds.length === 0 && (
          <Notice tone="amber">
            No hay camas operativas disponibles para transferir. Crea una cama o libera una existente antes de continuar.
          </Notice>
        )}
        <Field label="Cama destino">
          <select className={inputClass()} value={targetBedId} onChange={(e) => setTargetBedId(e.target.value)} required disabled={availableBeds.length === 0}>
            <option value="">Selecciona una cama disponible</option>
            {availableBeds.map((item) => (
              <option key={item.id} value={item.id}>{formatBedLocation(item)}</option>
            ))}
          </select>
        </Field>
        <Field label="Notas">
          <textarea className={inputClass()} rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving || !targetBedId} className="w-full bg-teal-600 text-white hover:bg-teal-700 sm:w-auto">
            Transferir
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReleaseModal({ bed, onClose, onSubmit, saving }) {
  const [motivo, setMotivo] = useState("liberacion");
  const [notas, setNotas] = useState("");
  const resident = bed?.assignment?.residente;
  return (
    <Modal isOpen onClose={onClose} title="Liberar cama">
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (resident?.id) onSubmit({ residentId: resident.id, motivo, notas });
      }}>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold">{formatBedLocation(bed)}</span> · {occupantName(resident)}
        </div>
        <Field label="Motivo">
          <select className={inputClass()} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="liberacion">Liberación operativa</option>
            <option value="traslado_externo">Traslado externo</option>
            <option value="egreso">Egreso</option>
            <option value="hospitalizacion_liberada">Hospitalización con cama liberada</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
        <Field label="Notas">
          <textarea className={inputClass()} rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="w-full bg-rose-600 text-white hover:bg-rose-700 sm:w-auto">
            Liberar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BedCard({ bed, canAdmin, canAssign, canViewResident, onAssign, onEdit, onDelete, onTransfer, onRelease }) {
  const assignment = bed.assignment;
  const resident = assignment?.residente;
  const unavailable = bed.estado !== "operativa" || (bed.habitacion?.estado ?? "operativa") !== "operativa";
  const reserved = assignment?.estado === "reservada_hospitalizacion";
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${unavailable ? "border-slate-200 opacity-80" : reserved ? "border-indigo-100" : assignment ? "border-teal-100" : "border-slate-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            Cama {bed.codigo}{bed.nombre ? ` · ${bed.nombre}` : ""}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{BED_TYPES.find(([value]) => value === bed.tipo)?.[1] ?? bed.tipo}</p>
        </div>
        <StatusBadge status={assignment?.estado ?? bed.estado} type={assignment ? "assignment" : "bed"} />
      </div>

      {assignment ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">
            {canViewResident ? occupantName(resident) : "Residente asignado"}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            {canViewResident && resident?.estado && <span>{resident.estado}</span>}
            {canViewResident && resident?.nivel_dependencia && <span>Dependencia {resident.nivel_dependencia}</span>}
            {assignment.fecha_inicio && <span>Desde {new Date(assignment.fecha_inicio).toLocaleDateString("es-CL")}</span>}
          </div>
          {reserved && (
            <p className="mt-2 text-xs text-indigo-700">
              Esta cama queda bloqueada mientras el residente está hospitalizado.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          {unavailable ? "No disponible para asignación." : "Disponible"}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!assignment && !unavailable && canAssign && (
          <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => onAssign(bed)}>Asignar</Button>
        )}
        {assignment && canViewResident && (
          <Link
            to={`/residents/${assignment.residente_id}`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver ficha
          </Link>
        )}
        {assignment && canAssign && !reserved && (
          <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => onTransfer(bed)}>
            Transferir
          </Button>
        )}
        {assignment && canAssign && (
          <Button className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={() => onRelease(bed)}>
            Liberar
          </Button>
        )}
        {canAdmin && (
          <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => onEdit(bed)}>
            Editar
          </Button>
        )}
        {canAdmin && !assignment && (
          <Button className="border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" onClick={() => onDelete(bed)}>
            Eliminar
          </Button>
        )}
      </div>
    </article>
  );
}

export default function BedsPage() {
  const auth = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilterParam, clearFilters] = useFilterParams({
    schema: { estado: "string", q: "string" },
    defaults: { estado: "todos", q: "" },
  });
  const filter = filters.estado || "todos";
  const query = filters.q ?? "";
  const [roomModal, setRoomModal] = useState(null);
  const [bedModal, setBedModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [releaseModal, setReleaseModal] = useState(null);

  const canAdminBeds = auth.isAdminEleam || (auth.isSuperadmin && !!auth.profile?.eleam_id);
  const canAssignBeds = auth.can("asignar_camas");
  const canViewResidents = auth.canFeature("residents");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getBedsOverview();
      setOverview(data);
      return data;
    } catch (error) {
      const message = bedError(error, "No se pudo cargar la ocupación de camas.");
      setLoadError(message);
      toast(message, "error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filteredRooms = useMemo(() => {
    if (!overview) return [];
    const q = query.trim().toLowerCase();
    const matchesFilter = (bed) => {
    const isOperative = bed.estado === "operativa" && (bed.habitacion?.estado ?? "operativa") === "operativa";
      if (filter === "disponibles") return isOperative && !bed.assignment;
      if (filter === "ocupadas") return bed.assignment?.estado === "ocupada";
      if (filter === "reservadas") return bed.assignment?.estado === "reservada_hospitalizacion";
      if (filter === "fuera_servicio") return !isOperative;
      return true;
    };
    const matchesSearch = (bed) => {
      if (!q) return true;
      const resident = bed.assignment?.residente;
      return [
        bed.codigo,
        bed.nombre,
        bed.habitacion?.codigo,
        bed.habitacion?.nombre,
        resident?.nombre,
        resident?.apellido,
        resident?.rut,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
    };
    const camas = overview.camas.filter((bed) => matchesFilter(bed) && matchesSearch(bed));
    const grouped = groupBedsByRoom(overview.habitaciones, camas);
    return filter === "todos" && !q ? grouped : grouped.filter((room) => room.camas.length > 0);
  }, [filter, overview, query]);

  const availableBeds = useMemo(() =>
    (overview?.camas ?? []).filter((bed) => bed.estado === "operativa" && (bed.habitacion?.estado ?? "operativa") === "operativa" && !bed.assignment),
  [overview]);

  const roomBedCount = useMemo(() => {
    const counts = new Map();
    for (const bed of overview?.camas ?? []) {
      const roomId = bed.habitacion_id ?? bed.habitacion?.id ?? bed.habitaciones?.id;
      counts.set(roomId, (counts.get(roomId) ?? 0) + 1);
    }
    return counts;
  }, [overview]);

  const openBedModal = useCallback((roomId = null) => {
    const habitaciones = overview?.habitaciones ?? [];
    const selectedRoomId = roomId ?? habitaciones[0]?.id ?? "";
    setBedModal({
      habitacion_id: selectedRoomId,
      codigo: suggestNextBedCode(overview?.camas ?? [], selectedRoomId),
    });
  }, [overview]);

  async function runAction(action, success, fallback) {
    setSaving(true);
    try {
      const result = await action();
      toast(success, "success");
      await load();
      setRoomModal(null);
      setBedModal(null);
      setAssignModal(null);
      setTransferModal(null);
      setReleaseModal(null);
      return result;
    } catch (error) {
      toast(bedError(error, fallback), "error");
      return null;
    } finally {
      setSaving(false);
    }
  }

  const handleRoomSubmit = async (form) => {
    const isNew = !form.id;
    const hadNoBeds = (overview?.camas ?? []).length === 0;
    setSaving(true);
    try {
      const room = await saveHabitacion(form);
      toast("Habitación guardada.", "success");
      setRoomModal(null);
      const nextOverview = await load();
      if (isNew && hadNoBeds) {
        setBedModal({
          habitacion_id: room.id,
          codigo: suggestNextBedCode(nextOverview?.camas ?? [], room.id),
        });
      }
    } catch (error) {
      toast(bedError(error, "No se pudo guardar la habitación."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async (room) => {
    const totalBeds = roomBedCount.get(room.id) ?? 0;
    if (totalBeds > 0) {
      toast("No se puede eliminar una habitación con camas. Elimina o mueve las camas primero.", "warning");
      return;
    }
    const ok = await confirm({
      title: "Eliminar habitación",
      message: `¿Eliminar la habitación ${room.codigo}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await runAction(
      () => deleteHabitacion(room.id),
      "Habitación eliminada.",
      "No se pudo eliminar la habitación.",
    );
  };

  const handleDeleteBed = async (bed) => {
    if (bed.assignment) {
      toast("Libera o transfiere al residente antes de eliminar la cama.", "warning");
      return;
    }
    const ok = await confirm({
      title: "Eliminar cama",
      message: `¿Eliminar ${formatBedLocation(bed)}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await runAction(
      () => deleteCama(bed.id),
      "Cama eliminada.",
      "No se pudo eliminar la cama.",
    );
  };

  const metrics = overview?.metrics ?? {
    operativas: 0,
    ocupadas: 0,
    reservadasHospitalizacion: 0,
    disponibles: 0,
    fueraServicio: 0,
    residentesSinCama: 0,
    porcentajeOcupacion: 0,
  };

  return (
    <PageLayout
      coachFeatureId="beds"
      title="Camas"
      eyebrow="Operación"
      description="Inventario, disponibilidad y ocupación en tiempo real."
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {canAdminBeds && (
            <>
              <Button disabled={loading || Boolean(loadError)} className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto" onClick={() => setRoomModal({})}>
                Nueva habitación
              </Button>
              <Button
                className="w-full bg-teal-600 text-white hover:bg-teal-700 sm:w-auto"
                onClick={() => openBedModal()}
                disabled={loading || Boolean(loadError) || (overview?.habitaciones ?? []).length === 0}
                title={(overview?.habitaciones ?? []).length === 0 ? "Primero crea una habitación." : undefined}
              >
                Nueva cama
              </Button>
            </>
          )}
        </div>
      }
    >
      {loadError ? (
        <EmptyState
          tone="rose"
          title="No se pudo cargar camas"
          description={loadError}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          }
          action={
            <Button type="button" onClick={load} className="bg-teal-700 text-white hover:bg-teal-800">
              Reintentar
            </Button>
          }
        />
      ) : (
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-7">
          <Kpi label="Operativas" value={metrics.operativas} sub="Aptas para uso" />
          <Kpi label="Ocupadas" value={metrics.ocupadas} tone="teal" sub="Con residente" />
          <Kpi label="Reservadas" value={metrics.reservadasHospitalizacion} tone="amber" sub="Hospitalización" />
          <Kpi label="Disponibles" value={metrics.disponibles} tone="emerald" sub="Asignables ahora" />
          <Kpi label="Fuera servicio" value={metrics.fueraServicio} tone="slate" sub="Mantención/inactivas" />
          <Kpi label="Sin cama" value={metrics.residentesSinCama} tone="rose" sub="Residentes activos" />
          <Kpi label="Ocupación" value={`${metrics.porcentajeOcupacion}%`} help="Calculado sobre camas operativas; incluye ocupadas y reservadas por hospitalización." />
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Ocupación operativa</h2>
              <p className="text-xs text-slate-500">Ocupadas y reservadas bloquean disponibilidad.</p>
            </div>
            <span className="text-sm font-bold tabular-nums text-teal-700">{metrics.porcentajeOcupacion}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(metrics.porcentajeOcupacion, 100)}%` }} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <FilterBar
            search={query}
            onSearchChange={(v) => setFilterParam("q", v)}
            searchPlaceholder="Buscar cama, habitación o residente..."
            filters={[]}
            values={filters}
            onFilterChange={setFilterParam}
            onClearAll={clearFilters}
            resultCount={loading ? undefined : filteredRooms.reduce((acc, r) => acc + r.camas.length, 0)}
            totalCount={loading ? undefined : (overview?.camas?.length ?? 0)}
            loading={loading}
          >
            <ChipGroup
              ariaLabel="Filtrar camas por estado"
              value={filter}
              onChange={(value) => setFilterParam("estado", value)}
              options={FILTERS.map(([value, label]) => ({ value, label, tone: "primary" }))}
              size="md"
            />

          </FilterBar>
        </section>

        {loading ? (
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" role="status" aria-live="polite">
            <p className="text-xs font-medium text-slate-500">Cargando ocupación de camas…</p>
            {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : filteredRooms.length === 0 ? (
          <EmptyState
            tone="teal"
            title={overview?.camas?.length ? "Sin camas para los filtros seleccionados" : "Crea tu primera habitación"}
            description={
              overview?.camas?.length
                ? "Ajusta los filtros o limpia la búsqueda para ver otros resultados."
                : "Crea habitaciones y camas para comenzar a medir ocupación y asignar residentes."
            }
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V8m0 0V5a2 2 0 012-2h14a2 2 0 012 2v3m-18 0h18m-18 0v13m18-13v13M3 21h18M7 14h.01M7 11h.01" />
              </svg>
            }
            action={
              !overview?.camas?.length && canAdminBeds
                ? { label: "Nueva habitación", onClick: () => setRoomModal({}) }
                : overview?.camas?.length
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : null
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredRooms.map((room) => (
              <section key={room.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <header className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">
                        Hab. {room.codigo}{room.nombre ? ` · ${room.nombre}` : ""}
                      </h2>
                      <StatusBadge status={room.estado} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {[room.piso && `Piso ${room.piso}`, room.sector].filter(Boolean).join(" · ") || "Sin sector definido"}
                    </p>
                  </div>
                  {canAdminBeds && (
                    <div className="flex flex-wrap gap-2">
                      <Button className="border border-teal-200 bg-white text-teal-700 hover:bg-teal-50" onClick={() => openBedModal(room.id)}>
                        Agregar cama
                      </Button>
                      <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setRoomModal(room)}>
                        Editar habitación
                      </Button>
                      <Button
                        disabled={(roomBedCount.get(room.id) ?? 0) > 0}
                        title={(roomBedCount.get(room.id) ?? 0) > 0 ? "Elimina o mueve las camas antes de borrar la habitación." : undefined}
                        className="border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        onClick={() => handleDeleteRoom(room)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  )}
                </header>
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {room.camas.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      <p>Esta habitación aún no tiene camas registradas.</p>
                      {canAdminBeds && (
                        <Button className="mt-3 bg-teal-700 text-white hover:bg-teal-800" onClick={() => openBedModal(room.id)}>
                          Agregar cama
                        </Button>
                      )}
                    </div>
                  )}
                  {room.camas.map((bed) => (
                    <BedCard
                      key={bed.id}
                      bed={bed}
                      canAdmin={canAdminBeds}
                      canAssign={canAssignBeds}
                      canViewResident={canViewResidents}
                      onAssign={setAssignModal}
                      onEdit={setBedModal}
                      onDelete={handleDeleteBed}
                      onTransfer={setTransferModal}
                      onRelease={setReleaseModal}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      )}

      {roomModal && (
        <RoomModal
          initial={roomModal}
          rooms={overview?.habitaciones ?? []}
          onClose={() => setRoomModal(null)}
          saving={saving}
          onSubmit={handleRoomSubmit}
        />
      )}
      {bedModal && (
        <BedModal
          initial={bedModal}
          habitaciones={overview?.habitaciones ?? []}
          camas={overview?.camas ?? []}
          onClose={() => setBedModal(null)}
          saving={saving}
          onSubmit={(form) => runAction(
            () => saveCama(form),
            "Cama guardada.",
            "No se pudo guardar la cama."
          )}
        />
      )}
      {assignModal && (
        <AssignModal
          bed={assignModal}
          residentes={(overview?.residentes ?? []).filter((resident) => resident.estado === "activo")}
          onClose={() => setAssignModal(null)}
          saving={saving}
          onSubmit={({ residentId, notas }) => runAction(
            () => assignResidentToBed(residentId, assignModal.id, notas),
            "Cama asignada.",
            "No se pudo asignar la cama."
          )}
        />
      )}
      {transferModal && (
        <TransferModal
          bed={transferModal}
          availableBeds={availableBeds}
          onClose={() => setTransferModal(null)}
          saving={saving}
          onSubmit={({ residentId, targetBedId, notas }) => runAction(
            () => assignResidentToBed(residentId, targetBedId, notas),
            "Residente transferido.",
            "No se pudo transferir al residente."
          )}
        />
      )}
      {releaseModal && (
        <ReleaseModal
          bed={releaseModal}
          onClose={() => setReleaseModal(null)}
          saving={saving}
          onSubmit={({ residentId, motivo, notas }) => runAction(
            () => releaseResidentBed(residentId, motivo, notas),
            "Cama liberada.",
            "No se pudo liberar la cama."
          )}
        />
      )}
    </PageLayout>
  );
}
