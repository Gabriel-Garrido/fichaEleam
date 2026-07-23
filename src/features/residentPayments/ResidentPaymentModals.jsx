import { useEffect, useState } from "react";
import Button from "../../components/Button";
import { useConfirm } from "../../components/ConfirmDialog";
import HelpTooltip from "../../components/HelpTooltip";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import {
  createResidentCharge,
  deleteResidentBillingProfile,
  registerResidentPayment,
  savePaymentContact,
  updateResidentBillingProfile,
  voidResidentCharge,
  voidResidentPayment,
} from "./residentPaymentService";
import {
  DOCUMENT_TYPES,
  PAYMENT_METHODS,
  formatClp,
  residentName,
  validatePaymentFile,
} from "./residentPaymentUtils";

function chileToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function emptyCharge() {
  const today = chileToday();
  const period = today.slice(0, 7);
  const day = String(Math.min(28, Number(today.slice(8, 10)))).padStart(2, "0");
  return {
    residenteId: "",
    tipo: "mensualidad",
    concepto: "Mensualidad",
    periodo: period,
    fechaVencimiento: `${period}-${day}`,
    monto: "",
    observacion: "",
    repetirMensual: true,
  };
}

function emptyPayment() {
  return {
    amount: "",
    date: chileToday(),
    method: "transferencia",
    reference: "",
    observation: "",
    documentType: "boleta",
    file: null,
  };
}

const EMPTY_CONTACT = { nombre: "", relacion: "", email: "", telefono: "" };

function alignDueDate(period, currentDate) {
  if (!period) return currentDate;
  const currentDay = Number(currentDate?.slice(8, 10));
  const day = String(Math.min(28, Math.max(1, currentDay || 1))).padStart(2, "0");
  return `${period}-${day}`;
}

export function BillingProfilesModal({ isOpen, profiles, residentsById, onClose, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(30);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setDraft(null);
      setSearch("");
      setVisibleLimit(30);
    }
  }, [isOpen]);

  const toggle = async (profile) => {
    setSavingId(profile.residente_id);
    try {
      await updateResidentBillingProfile(profile, {
        activo: !profile.activo,
        ...(!profile.activo ? { mes_inicio: `${chileToday().slice(0, 7)}-01` } : {}),
      });
      toast(profile.activo ? "Mensualidad automática pausada." : "Mensualidad automática reactivada.", "success");
      await onSaved();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSavingId(null);
    }
  };

  const startEditing = (profile) => {
    setEditingId(profile.residente_id);
    setDraft({
      monto_mensual: String(profile.monto_mensual),
      dia_vencimiento: String(profile.dia_vencimiento),
      concepto: profile.concepto,
    });
  };

  const saveEdit = async (profile) => {
    const amount = Number(draft?.monto_mensual);
    const dueDay = Number(draft?.dia_vencimiento);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000000) {
      toast("Ingresa un monto válido en pesos.", "error");
      return;
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
      toast("El día de vencimiento debe estar entre 1 y 28.", "error");
      return;
    }
    if ((draft?.concepto ?? "").trim().length < 2) {
      toast("Escribe un concepto para la mensualidad.", "error");
      return;
    }
    setSavingId(profile.residente_id);
    try {
      await updateResidentBillingProfile(profile, {
        monto_mensual: amount,
        dia_vencimiento: dueDay,
        concepto: draft.concepto.trim(),
      });
      toast("Mensualidad actualizada. Los cobros ya creados no cambiaron.", "success");
      setEditingId(null);
      setDraft(null);
      await onSaved();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (profile) => {
    const name = residentName(residentsById[profile.residente_id]);
    const accepted = await confirm({
      title: "Eliminar mensualidad",
      message: `Se quitará la mensualidad de ${name} y no se crearán nuevos cobros automáticos.\n\nLos cobros y pagos que ya existen se conservarán en el historial.`,
      confirmText: "Eliminar mensualidad",
      cancelText: "Volver",
      danger: true,
    });
    if (!accepted) return;
    setSavingId(profile.residente_id);
    try {
      await deleteResidentBillingProfile(profile.residente_id);
      toast("Mensualidad eliminada del listado.", "success");
      await onSaved();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSavingId(null);
    }
  };

  const busy = savingId !== null;
  const query = search.trim().toLocaleLowerCase("es-CL");
  const filteredProfiles = profiles.filter((profile) =>
    `${residentName(residentsById[profile.residente_id])} ${profile.concepto}`
      .toLocaleLowerCase("es-CL")
      .includes(query)
  );
  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title="Mensualidades automáticas" panelClassName="max-w-3xl p-4 sm:p-6">
      <p className="text-sm leading-6 text-slate-600">
        Cambia los próximos cobros, pausa temporalmente una mensualidad o elimínala cuando ya no corresponda. Los cobros y pagos anteriores siempre se conservan.
      </p>
      {profiles.length > 8 && (
        <label className="mt-4 block">
          <span className="sr-only">Buscar mensualidad por residente</span>
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setVisibleLimit(30); }}
            placeholder="Buscar residente o concepto"
            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      )}
      {profiles.length === 0 ? (
        <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Aún no hay mensualidades automáticas. Créala desde “Crear cobro”.</div>
      ) : filteredProfiles.length > 0 ? (
        <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {filteredProfiles.slice(0, visibleLimit).map((profile) => {
            const editing = editingId === profile.residente_id;
            const saving = savingId === profile.residente_id;
            return (
              <li key={profile.residente_id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-semibold text-slate-900">{residentName(residentsById[profile.residente_id])}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${profile.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{profile.activo ? "Activa" : "Pausada"}</span>
                    </div>
                    {!editing && (
                      <>
                        <p className="mt-1 text-sm text-slate-600">{formatClp(profile.monto_mensual)} · vence el día {profile.dia_vencimiento}</p>
                        <p className="mt-0.5 break-words text-xs text-slate-500">{profile.concepto}</p>
                      </>
                    )}
                  </div>
                  {!editing && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" disabled={busy} onClick={() => startEditing(profile)} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Editar</Button>
                      <Button type="button" disabled={busy} onClick={() => toggle(profile)} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">{saving ? "Guardando..." : profile.activo ? "Pausar" : "Reactivar"}</Button>
                      <Button type="button" disabled={busy} onClick={() => remove(profile)} className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50">Eliminar</Button>
                    </div>
                  )}
                </div>
                {editing && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Monto mensual" type="number" min="1" max="100000000" step="1" value={draft.monto_mensual} onChange={(value) => setDraft((current) => ({ ...current, monto_mensual: value }))} />
                      <Field label="Día de vencimiento" type="number" min="1" max="28" step="1" value={draft.dia_vencimiento} onChange={(value) => setDraft((current) => ({ ...current, dia_vencimiento: value }))} />
                      <div className="sm:col-span-2"><Field label="Concepto" maxLength="160" value={draft.concepto} onChange={(value) => setDraft((current) => ({ ...current, concepto: value }))} /></div>
                    </div>
                    <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button type="button" disabled={saving} onClick={() => { setEditingId(null); setDraft(null); }} className="border border-slate-200 bg-white text-slate-700">Cancelar</Button>
                      <Button type="button" disabled={saving} onClick={() => saveEdit(profile)} className="bg-teal-700 text-white hover:bg-teal-800">{saving ? "Guardando..." : "Guardar cambios"}</Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No encontramos mensualidades con esa búsqueda.</p>
      )}
      {visibleLimit < filteredProfiles.length && (
        <div className="mt-4 text-center">
          <Button type="button" disabled={busy} onClick={() => setVisibleLimit((current) => current + 30)} className="border border-slate-200 bg-white text-slate-700">
            Mostrar 30 más
          </Button>
        </div>
      )}
      <div className="mt-5 flex justify-end"><Button type="button" disabled={busy} onClick={onClose} className="bg-teal-700 text-white">Listo</Button></div>
    </Modal>
  );
}

export function ChargeModal({ isOpen, residents, contacts = [], onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyCharge);
  const [receiver, setReceiver] = useState(EMPTY_CONTACT);
  const [residentSearch, setResidentSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(emptyCharge());
      setReceiver(EMPTY_CONTACT);
      setResidentSearch("");
    }
  }, [isOpen]);

  const selectResident = (residentId) => {
    setForm((current) => ({ ...current, residenteId: residentId }));
    const contact = contacts.find((item) => item.residente_id === residentId);
    setReceiver(contact ? {
      nombre: contact.nombre ?? "",
      relacion: contact.relacion ?? "",
      email: contact.email ?? "",
      telefono: contact.telefono ?? "",
    } : EMPTY_CONTACT);
  };

  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.monto);
    if (!form.residenteId || !form.concepto.trim() || !form.fechaVencimiento) {
      toast("Completa los datos obligatorios.", "error");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000000) {
      toast("Ingresa un monto válido en pesos.", "error");
      return;
    }
    if (form.tipo === "mensualidad" && (!form.periodo || !form.fechaVencimiento.startsWith(form.periodo))) {
      toast("El vencimiento debe estar dentro del período de la mensualidad.", "error");
      return;
    }
    if (receiver.nombre.trim().length < 2 || receiver.relacion.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(receiver.email)) {
      toast("Completa correctamente el contacto que recibirá los correos de pago.", "error");
      return;
    }
    setSaving(true);
    try {
      await savePaymentContact(form.residenteId, receiver);
      await createResidentCharge({ ...form, monto: amount });
      toast("Cobro creado.", "success");
      await onSaved();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const residentQuery = residentSearch.trim().toLocaleLowerCase("es-CL");
  const eligibleResidents = residents
    .filter((resident) => ["activo", "hospitalizado"].includes(resident.estado))
    .filter((resident) => !residentQuery || residentName(resident).toLocaleLowerCase("es-CL").includes(residentQuery));
  const selectedResident = residents.find((resident) => resident.id === form.residenteId);
  const visibleResidents = selectedResident && !eligibleResidents.some((resident) => resident.id === selectedResident.id)
    ? [selectedResident, ...eligibleResidents.slice(0, 99)]
    : eligibleResidents.slice(0, 100);

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title="Crear cobro" panelClassName="max-w-2xl p-4 sm:p-6">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">Registra una mensualidad o cualquier otro concepto que deba pagarse.</p>
        {residents.length > 20 && (
          <Field
            label="Buscar residente"
            type="search"
            value={residentSearch}
            onChange={setResidentSearch}
            placeholder="Escribe el nombre o apellido"
          />
        )}
        <Select label="Residente" value={form.residenteId} onChange={selectResident} required>
          <option value="">Selecciona un residente</option>
          {visibleResidents.map((resident) => <option key={resident.id} value={resident.id}>{residentName(resident)}</option>)}
        </Select>
        {eligibleResidents.length > 100 && <p className="-mt-2 text-xs text-slate-500">Se muestran los primeros 100 resultados. Escribe más letras para acotar la búsqueda.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo" value={form.tipo} onChange={(value) => setForm((current) => ({ ...current, tipo: value, concepto: value === "mensualidad" ? "Mensualidad" : "", repetirMensual: value === "mensualidad" }))}>
            <option value="mensualidad">Mensualidad</option>
            <option value="otro">Otro cobro</option>
          </Select>
          <Field label="Monto total" type="number" min="1" max="100000000" step="1" value={form.monto} onChange={(value) => setForm((current) => ({ ...current, monto: value }))} required />
        </div>
        <Field label="Concepto" value={form.concepto} maxLength="160" onChange={(value) => setForm((current) => ({ ...current, concepto: value }))} required />
        {form.tipo === "mensualidad" && (
          <>
            <Field label="Período" type="month" value={form.periodo} onChange={(value) => setForm((current) => ({ ...current, periodo: value, fechaVencimiento: alignDueDate(value, current.fechaVencimiento) }))} required />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
              <input type="checkbox" checked={form.repetirMensual} onChange={(event) => setForm((current) => ({ ...current, repetirMensual: event.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-teal-700" />
              <span><strong className="block text-sm text-teal-950">Crear esta mensualidad cada mes</strong><span className="mt-0.5 block text-xs leading-5 text-teal-800">Se generará mientras el residente esté activo. Desmárcalo si este cobro corresponde solo a este período.</span></span>
            </label>
          </>
        )}
        <Field label="Fecha de vencimiento" type="date" value={form.fechaVencimiento} onChange={(value) => setForm((current) => ({ ...current, fechaVencimiento: value }))} required />
        <Textarea label="Observación (opcional)" value={form.observacion} onChange={(value) => setForm((current) => ({ ...current, observacion: value }))} placeholder="Detalle del servicio, gasto u otra información útil" />
        <section className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
          <h3 className="text-sm font-semibold text-teal-950">Contacto de pagos</h3>
          <p className="mt-1 text-xs leading-5 text-teal-800">Esta persona recibirá las confirmaciones y los recordatorios de este residente. Podrás actualizarla al crear otro cobro.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" value={receiver.nombre} maxLength="120" onChange={(value) => setReceiver((current) => ({ ...current, nombre: value }))} required />
            <Field label="Relación con el residente" value={receiver.relacion} maxLength="80" onChange={(value) => setReceiver((current) => ({ ...current, relacion: value }))} placeholder="Ej: hija, representante legal" required />
            <Field label="Correo" type="email" value={receiver.email} maxLength="254" onChange={(value) => setReceiver((current) => ({ ...current, email: value }))} required />
            <Field label="Teléfono (opcional)" value={receiver.telefono} maxLength="40" onChange={(value) => setReceiver((current) => ({ ...current, telefono: value }))} />
          </div>
        </section>
        <ModalActions onCancel={onClose} saving={saving} label="Crear cobro" />
      </form>
    </Modal>
  );
}

export function PaymentModal({ charge, resident, contact, paid, eleamId, canSend, onClose, onSaved }) {
  const toast = useToast();
  const [payment, setPayment] = useState(emptyPayment);
  const [receiver, setReceiver] = useState(EMPTY_CONTACT);
  const [saving, setSaving] = useState(false);
  const balance = charge ? Math.max(0, Number(charge.monto) - paid) : 0;

  useEffect(() => {
    if (!charge) return;
    setPayment({ ...emptyPayment(), amount: String(balance) });
    setReceiver(contact ? {
      nombre: contact.nombre ?? "",
      relacion: contact.relacion ?? "",
      email: contact.email ?? "",
      telefono: contact.telefono ?? "",
    } : EMPTY_CONTACT);
  }, [balance, charge, contact]);

  if (!charge) return null;

  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(payment.amount);
    const fileError = validatePaymentFile(payment.file);
    if (receiver.nombre.trim().length < 2 || receiver.relacion.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(receiver.email)) {
      toast("Completa correctamente el contacto que recibirá el comprobante.", "error");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0 || amount > balance) {
      toast("El monto debe ser un número entero mayor a cero y no superar el saldo.", "error");
      return;
    }
    if (fileError) {
      toast(fileError, "error");
      return;
    }
    setSaving(true);
    try {
      await savePaymentContact(resident.id, receiver);
      const result = await registerResidentPayment({ eleamId, chargeId: charge.id, ...payment, amount });
      await onSaved(result);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()} title="Registrar pago" panelClassName="max-w-2xl p-4 sm:p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="break-words font-semibold text-slate-900">{residentName(resident)}</p>
          <p className="mt-1 break-words text-sm text-slate-600">{charge.concepto}</p>
          <div className="mt-3 grid gap-1 text-sm sm:grid-cols-3"><span>Total: <strong>{formatClp(charge.monto)}</strong></span><span>Pagado: <strong>{formatClp(paid)}</strong></span><span>Saldo: <strong>{formatClp(balance)}</strong></span></div>
        </div>
        <section>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">Datos del pago <HelpTooltip label="Importante">FichaEleam no procesa el pago. Registra aquí una operación realizada por un medio externo.</HelpTooltip></h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Monto recibido" type="number" min="1" max={balance} step="1" value={payment.amount} onChange={(value) => setPayment((current) => ({ ...current, amount: value }))} required />
            <Field label="Fecha del pago" type="date" max={chileToday()} value={payment.date} onChange={(value) => setPayment((current) => ({ ...current, date: value }))} required />
            <Select label="Medio de pago" value={payment.method} onChange={(value) => setPayment((current) => ({ ...current, method: value }))}>{Object.entries(PAYMENT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            <Field label="Referencia (opcional)" value={payment.reference} maxLength="120" onChange={(value) => setPayment((current) => ({ ...current, reference: value }))} placeholder="N° de transferencia u operación" />
          </div>
          <div className="mt-4"><Textarea label="Observación (opcional)" value={payment.observation} onChange={(value) => setPayment((current) => ({ ...current, observation: value }))} placeholder="Puedes indicar aquí qué conceptos cubre este pago" /></div>
        </section>
        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Documento externo</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Adjunta la boleta, factura u otro respaldo tributario. (Máximo 5 MB.)</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Select label="Tipo de documento" value={payment.documentType} onChange={(value) => setPayment((current) => ({ ...current, documentType: value }))}>{Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            <label className="min-w-0"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Archivo</span><input type="file" accept="application/pdf,image/jpeg,image/png" required onChange={(event) => setPayment((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} className="block min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-700" /></label>
          </div>
        </section>
        <section className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
          <h3 className="text-sm font-semibold text-teal-950">Contacto de pagos</h3>
          <p className="mt-1 text-xs leading-5 text-teal-800">Estos datos vienen del cobro. Revísalos antes de continuar; si los cambias, quedarán guardados para los próximos pagos y reenvíos.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" value={receiver.nombre} maxLength="120" onChange={(value) => setReceiver((current) => ({ ...current, nombre: value }))} required />
            <Field label="Relación con el residente" value={receiver.relacion} maxLength="80" onChange={(value) => setReceiver((current) => ({ ...current, relacion: value }))} placeholder="Ej: hija, representante legal" required />
            <Field label="Correo" type="email" value={receiver.email} maxLength="254" onChange={(value) => setReceiver((current) => ({ ...current, email: value }))} required />
            <Field label="Teléfono (opcional)" value={receiver.telefono} maxLength="40" onChange={(value) => setReceiver((current) => ({ ...current, telefono: value }))} />
          </div>
        </section>
        {!canSend && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Puedes registrar el pago, pero no enviar correos. Una persona con permiso de envío podrá hacerlo desde el historial.</p>}
        <ModalActions onCancel={onClose} saving={saving} label={canSend ? "Registrar y enviar" : "Registrar pago"} />
      </form>
    </Modal>
  );
}

export function VoidModal({ target, onClose, onSaved }) {
  const toast = useToast();
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setCategory("");
      setReason("");
    }
  }, [target]);

  if (!target) return null;
  const submit = async (event) => {
    event.preventDefault();
    if (!category || reason.trim().length < 5) {
      toast("Selecciona una causa y explica brevemente qué ocurrió.", "error");
      return;
    }
    const categoryLabel = {
      ingreso_incorrecto: "datos ingresados incorrectamente",
      duplicado: "registro duplicado",
      pago_revertido: "pago revertido o no concretado",
      error_sistema: "error del sistema",
      otro: "otra causa",
    }[category];
    const clearReason = `Anulación manual por ${categoryLabel}: ${reason.trim()}`;
    setSaving(true);
    try {
      if (target.type === "payment") await voidResidentPayment(target.item.id, clearReason);
      else await voidResidentCharge(target.item.id, clearReason);
      toast(target.type === "payment" ? "Pago anulado." : "Cobro anulado.", "success");
      await onSaved();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen onClose={() => !saving && onClose()} title={target.type === "payment" ? "Anular pago" : "Anular cobro"} panelClassName="max-w-md p-4 sm:p-6">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">El registro permanecerá en el historial. El motivo será visible, por lo que debe explicar claramente qué ocurrió.</p>
        <Select label="Causa" value={category} onChange={setCategory} required>
          <option value="">Selecciona una causa</option>
          <option value="ingreso_incorrecto">Datos ingresados incorrectamente</option>
          <option value="duplicado">Registro duplicado</option>
          <option value="pago_revertido">Pago revertido o no concretado</option>
          <option value="error_sistema">Error del sistema</option>
          <option value="otro">Otra causa</option>
        </Select>
        <Textarea label="¿Qué ocurrió?" value={reason} onChange={setReason} maxLength={400} placeholder="Describe brevemente el error y, si corresponde, cómo se corrigió" required />
        <ModalActions onCancel={onClose} saving={saving} label="Confirmar anulación" danger />
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange, type = "text", ...props }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" {...props} /></label>;
}

function Select({ label, value, onChange, children, ...props }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" {...props}>{children}</select></label>;
}

function Textarea({ label, value, onChange, ...props }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} maxLength={1000} className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" {...props} /></label>;
}

function ModalActions({ onCancel, saving, label, danger = false }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
      <Button type="button" onClick={onCancel} disabled={saving} className="w-full border border-slate-200 bg-white text-slate-700 sm:w-auto">Cancelar</Button>
      <Button type="submit" disabled={saving} className={`w-full text-white sm:w-auto ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-teal-700 hover:bg-teal-800"}`}>{saving ? "Guardando..." : label}</Button>
    </div>
  );
}
