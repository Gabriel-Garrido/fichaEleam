import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import HelpTooltip from "../../components/HelpTooltip";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import PageLayout from "../../layout/PageLayout";
import { useAuth } from "../../context/AuthContext";
import { friendlyError } from "../../utils/errorMessages";
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
} from "./bedsUtils";

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
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span>{label}</span>
        {help && <HelpTooltip label={`Ayuda: ${label}`}>{help}</HelpTooltip>}
      </div>
      <div className={`mt-2 inline-flex min-w-14 justify-center rounded-xl border px-3 py-1 text-2xl font-bold tabular-nums ${tones[tone]}`}>
        {value}
      </div>
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
    </article>
  );
}

function StatusBadge({ status, type = "bed" }) {
  const label = type === "assignment"
    ? ASSIGNMENT_STATUS_LABELS[status] ?? status
    : BED_STATUS_LABELS[status] ?? status;
  const cls = {
    operativa: "bg-emerald-50 text-emerald-700 border-emerald-100",
    mantenimiento: "bg-amber-50 text-amber-800 border-amber-100",
    inactiva: "bg-slate-100 text-slate-600 border-slate-200",
    ocupada: "bg-teal-50 text-teal-700 border-teal-100",
    reservada_hospitalizacion: "bg-indigo-50 text-indigo-700 border-indigo-100",
  }[status] ?? "bg-slate-50 text-slate-600 border-slate-100";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
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

function RoomModal({ initial, onClose, onSubmit, saving }) {
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
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <Modal isOpen onClose={onClose} title={form.id ? "Editar habitación" : "Nueva habitación"}>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Código">
            <input className={inputClass()} value={form.codigo} onChange={(e) => set("codigo", e.target.value)} required />
          </Field>
          <Field label="Orden">
            <input className={inputClass()} type="number" value={form.orden} onChange={(e) => set("orden", e.target.value)} />
          </Field>
          <Field label="Nombre">
            <input className={inputClass()} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </Field>
          <Field label="Estado">
            <select className={inputClass()} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
              {BED_STATUS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Piso">
            <input className={inputClass()} value={form.piso} onChange={(e) => set("piso", e.target.value)} />
          </Field>
          <Field label="Sector">
            <input className={inputClass()} value={form.sector} onChange={(e) => set("sector", e.target.value)} />
          </Field>
        </div>
        <Field label="Notas">
          <textarea className={inputClass()} rows={3} value={form.notas} onChange={(e) => set("notas", e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="bg-teal-600 text-white hover:bg-teal-700">
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BedModal({ habitaciones, initial, onClose, onSubmit, saving }) {
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
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <Modal isOpen onClose={onClose} title={form.id ? "Editar cama" : "Nueva cama"}>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <Field label="Habitación">
          <select className={inputClass()} value={form.habitacion_id} onChange={(e) => set("habitacion_id", e.target.value)} required>
            {habitaciones.map((room) => (
              <option key={room.id} value={room.id}>
                {room.codigo}{room.nombre ? ` · ${room.nombre}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Código">
            <input className={inputClass()} value={form.codigo} onChange={(e) => set("codigo", e.target.value)} required />
          </Field>
          <Field label="Orden">
            <input className={inputClass()} type="number" value={form.orden} onChange={(e) => set("orden", e.target.value)} />
          </Field>
          <Field label="Tipo">
            <select className={inputClass()} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
              {BED_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputClass()} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
              {BED_STATUS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Nombre">
          <input className={inputClass()} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
        </Field>
        <Field label="Notas">
          <textarea className={inputClass()} rows={3} value={form.notas} onChange={(e) => set("notas", e.target.value)} />
        </Field>
        {initial?.assignment && form.estado !== "operativa" && (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Libera o transfiere al residente antes de dejar esta cama fuera de servicio.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="bg-teal-600 text-white hover:bg-teal-700">
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignModal({ bed, residentes, onClose, onSubmit, saving }) {
  const [residentId, setResidentId] = useState("");
  const [query, setQuery] = useState("");
  const [notas, setNotas] = useState("");
  const filtered = residentes.filter((resident) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${resident.nombre} ${resident.apellido} ${resident.rut ?? ""}`.toLowerCase().includes(q);
  });
  const selected = residentes.find((resident) => resident.id === residentId);
  return (
    <Modal isOpen onClose={onClose} title={`Asignar ${formatBedLocation(bed)}`} panelClassName="max-w-2xl p-4 sm:p-6">
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (residentId) onSubmit({ residentId, notas });
      }}>
        <Field label="Buscar residente activo">
          <input className={inputClass()} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, apellido o RUT" />
        </Field>
        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No hay residentes activos disponibles.</div>
          ) : filtered.map((resident) => (
            <button
              key={resident.id}
              type="button"
              onClick={() => setResidentId(resident.id)}
              className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 ${
                residentId === resident.id ? "bg-teal-50" : "bg-white hover:bg-slate-50"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">{occupantName(resident)}</span>
                <span className="block truncate text-xs text-slate-500">
                  {resident.cama_actual_id ? resident.ubicacion_label : "Sin cama asignada"}
                </span>
              </span>
              {residentId === resident.id && <span className="text-sm font-semibold text-teal-700">Seleccionado</span>}
            </button>
          ))}
        </div>
        {selected?.cama_actual_id && (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {occupantName(selected)} será transferido desde {selected.ubicacion_label}.
          </p>
        )}
        <Field label="Notas">
          <textarea className={inputClass()} rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving || !residentId} className="bg-teal-600 text-white hover:bg-teal-700">
            Asignar
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
        <Field label="Cama destino">
          <select className={inputClass()} value={targetBedId} onChange={(e) => setTargetBedId(e.target.value)} required>
            <option value="">Selecciona una cama disponible</option>
            {availableBeds.map((item) => (
              <option key={item.id} value={item.id}>{formatBedLocation(item)}</option>
            ))}
          </select>
        </Field>
        <Field label="Notas">
          <textarea className={inputClass()} rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving || !targetBedId} className="bg-teal-600 text-white hover:bg-teal-700">
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
        <div className="flex justify-end gap-2">
          <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="bg-rose-600 text-white hover:bg-rose-700">
            Liberar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BedCard({ bed, canAdmin, canAssign, onAssign, onEdit, onDelete, onTransfer, onRelease }) {
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
          <div className="text-sm font-semibold text-slate-900">{occupantName(resident)}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            {resident?.estado && <span>{resident.estado}</span>}
            {resident?.nivel_dependencia && <span>Dependencia {resident.nivel_dependencia}</span>}
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
        {assignment && (
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
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [roomModal, setRoomModal] = useState(null);
  const [bedModal, setBedModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [releaseModal, setReleaseModal] = useState(null);

  const canAdminBeds = auth.isAdminEleam || (auth.isSuperadmin && !!auth.profile?.eleam_id);
  const canAssignBeds = auth.can("asignar_camas");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getBedsOverview());
    } catch (error) {
      toast(bedError(error, "No se pudo cargar la ocupación de camas."), "error");
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

  async function runAction(action, success, fallback) {
    setSaving(true);
    try {
      await action();
      toast(success, "success");
      await load();
      setRoomModal(null);
      setBedModal(null);
      setAssignModal(null);
      setTransferModal(null);
      setReleaseModal(null);
    } catch (error) {
      toast(bedError(error, fallback), "error");
    } finally {
      setSaving(false);
    }
  }

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
      title="Camas"
      eyebrow="Operación"
      description="Inventario, disponibilidad y ocupación en tiempo real."
      actions={
        <div className="flex flex-wrap gap-2">
          {canAdminBeds && (
            <>
              <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setRoomModal({})}>
                Nueva habitación
              </Button>
              <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => setBedModal({})} disabled={(overview?.habitaciones ?? []).length === 0}>
                Nueva cama
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-7">
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    filter === value
                      ? "border-teal-200 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 lg:max-w-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cama, habitación o residente"
            />
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Cargando camas...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Sin camas para mostrar</h2>
            <p className="mt-1 text-sm text-slate-500">
              {overview?.camas?.length ? "Ajusta los filtros para ver otros resultados." : "Crea habitaciones y camas para comenzar a medir ocupación."}
            </p>
          </div>
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
                      <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setRoomModal(room)}>
                        Editar habitación
                      </Button>
                      <Button className="border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" onClick={() => runAction(
                        () => deleteHabitacion(room.id),
                        "Habitación eliminada.",
                        "No se pudo eliminar la habitación."
                      )}>
                        Eliminar
                      </Button>
                    </div>
                  )}
                </header>
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {room.camas.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Esta habitación aún no tiene camas registradas.
                    </div>
                  )}
                  {room.camas.map((bed) => (
                    <BedCard
                      key={bed.id}
                      bed={bed}
                      canAdmin={canAdminBeds}
                      canAssign={canAssignBeds}
                      onAssign={setAssignModal}
                      onEdit={setBedModal}
                      onDelete={(target) => runAction(
                        () => deleteCama(target.id),
                        "Cama eliminada.",
                        "No se pudo eliminar la cama."
                      )}
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

      {roomModal && (
        <RoomModal
          initial={roomModal}
          onClose={() => setRoomModal(null)}
          saving={saving}
          onSubmit={(form) => runAction(
            () => saveHabitacion(form),
            "Habitación guardada.",
            "No se pudo guardar la habitación."
          )}
        />
      )}
      {bedModal && (
        <BedModal
          initial={bedModal}
          habitaciones={overview?.habitaciones ?? []}
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
