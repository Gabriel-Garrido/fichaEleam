import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import PageLayout from "../../layout/PageLayout";
import { friendlyError } from "../../utils/errorMessages";
import {
  PROTOCOLO_ESTADO_LABEL,
  PROTOCOLO_ESTADO_TONE,
  PROTOCOLO_TIPO_DESC,
  PROTOCOLO_TIPO_LABEL,
  PROTOCOLOS_REQUERIDOS,
  getProtocolos,
  protocolosFaltantes,
  saveProtocolo,
  validateProtocolPayload,
} from "./cumplimientoService";

const EMPTY_FORM = {
  contenido: "",
  estado: "borrador",
  fecha_aprobacion: "",
  fecha_revision: "",
};

export default function CumplimientoPage() {
  const toast = useToast();
  const [protocolos, setProtocolos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setProtocolos(await getProtocolos());
    } catch (error) {
      const message = friendlyError(error, "No se pudieron cargar los protocolos.");
      setLoadError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const byType = useMemo(() => Object.fromEntries(
    protocolos.map((item) => [item.tipo, item]),
  ), [protocolos]);
  const faltantes = protocolosFaltantes(protocolos);

  const openEditor = (tipo) => {
    const current = byType[tipo];
    setEditing({ tipo, id: current?.id ?? null });
    setForm({
      contenido: current?.contenido ?? "",
      estado: current?.estado ?? "borrador",
      fecha_aprobacion: current?.fecha_aprobacion ?? "",
      fecha_revision: current?.fecha_revision ?? "",
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.contenido.trim()) {
      toast("Describe los pasos y responsables del protocolo.", "error");
      return;
    }
    try {
      validateProtocolPayload({ ...form, tipo: editing.tipo });
    } catch (validationError) {
      toast(validationError.message, "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveProtocolo({ ...form, tipo: editing.tipo }, editing.id);
      setProtocolos((current) => [
        ...current.filter((item) => item.tipo !== saved.tipo),
        saved,
      ]);
      setEditing(null);
      toast("Protocolo guardado.", "success");
    } catch (error) {
      toast(friendlyError(error, "No se pudo guardar el protocolo."), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando protocolos..." />;

  return (
    <PageLayout
      eyebrow="Cumplimiento"
      title="Protocolos esenciales"
      description="Mantén instrucciones claras, responsables y fechas de revisión para los tres protocolos del ELEAM."
      actions={<Link to="/cumplimiento" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto">Volver a cumplimiento</Link>}
      className="space-y-6"
    >
      {loadError && (
        <section className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-rose-900">No pudimos cargar los protocolos</h2><p className="mt-1 text-sm text-rose-800">No se muestra información incompleta. Vuelve a intentarlo.</p></div>
          <Button type="button" onClick={load} className="shrink-0 border border-rose-200 bg-white text-rose-800 hover:bg-rose-100">Reintentar</Button>
        </section>
      )}

      {!loadError && <>
      <section className={`rounded-2xl border p-4 sm:p-5 ${faltantes.length === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado general</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">
          {faltantes.length === 0 ? "Los protocolos están vigentes" : `${faltantes.length} protocolo${faltantes.length === 1 ? " necesita" : "s necesitan"} atención`}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Para cada protocolo basta con mantener instrucciones claras, responsables y fechas de revisión.
        </p>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-950">Protocolos esenciales</h2>
          <p className="mt-1 text-sm text-slate-500">Solo se incluyen los protocolos documentales que corresponde mantener aquí.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {PROTOCOLOS_REQUERIDOS.map((tipo) => {
            const item = byType[tipo];
            const estado = item?.estado ?? "borrador";
            return (
              <article key={tipo} className="flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-950">{PROTOCOLO_TIPO_LABEL[tipo]}</h3>
                  <Badge tone={PROTOCOLO_ESTADO_TONE[estado]}>{PROTOCOLO_ESTADO_LABEL[estado]}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{PROTOCOLO_TIPO_DESC[tipo]}</p>
                {item?.fecha_revision && <p className="mt-3 text-xs font-medium text-slate-500">Próxima revisión: {item.fecha_revision}</p>}
                <div className="mt-auto pt-5">
                  <Button type="button" onClick={() => openEditor(tipo)} className="w-full border border-teal-200 bg-white text-teal-800 hover:bg-teal-50">
                    {item ? "Revisar protocolo" : "Completar protocolo"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      </>}

      <ProtocolModal editing={editing} form={form} setForm={setForm} saving={saving} onClose={() => setEditing(null)} onSubmit={submit} />
    </PageLayout>
  );
}

function ProtocolModal({ editing, form, setForm, saving, onClose, onSubmit }) {
  if (!editing) return null;
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return (
    <Modal isOpen onClose={onClose} title={PROTOCOLO_TIPO_LABEL[editing.tipo]} panelClassName="max-w-2xl p-4 sm:p-6">
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-semibold text-slate-700">
          Pasos y responsables
          <textarea value={form.contenido} onChange={set("contenido")} rows={8} required maxLength={20000} placeholder="Describe qué hacer, quién es responsable y a quién se debe avisar." className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">Estado<select value={form.estado} onChange={set("estado")} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="borrador">Por completar</option><option value="vigente">Vigente</option><option value="revision">Revisar</option></select></label>
          <label className="text-sm font-semibold text-slate-700">Aprobado el<input type="date" value={form.fecha_aprobacion} onChange={set("fecha_aprobacion")} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" /></label>
          <label className="text-sm font-semibold text-slate-700">Revisar el<input type="date" value={form.fecha_revision} onChange={set("fecha_revision")} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" /></label>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={onClose} disabled={saving} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Cancelar</Button><Button type="submit" disabled={saving} className="bg-teal-700 text-white hover:bg-teal-800">{saving ? "Guardando..." : "Guardar protocolo"}</Button></div>
      </form>
    </Modal>
  );
}
