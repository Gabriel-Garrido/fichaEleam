import { useCallback, useEffect, useState } from "react";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
import { formatDateOnly } from "../../utils/dateUtils";
import ConsentModal from "./ConsentModal";
import UploadConsentModal from "./UploadConsentModal";
import {
  ACTIVIDAD_FRECUENCIAS,
  ACTIVIDAD_FRECUENCIA_LABEL,
  ACTIVIDAD_PREFERENCIAS,
  ACTIVIDAD_PREFERENCIA_LABEL,
  ACTIVIDAD_TIPOS,
  ACTIVIDAD_TIPO_LABEL,
  getResidentDs20Bundle,
  listActiveHealthCenters,
  getSignedDs20Url,
  upsertHealthCenter,
  upsertResidentHealthNetwork,
  getPersonaSignificativa,
  upsertPersonaSignificativa,
  getActividadesSociales,
  saveActividadSocial,
  deleteActividadSocial,
} from "./ds20Service";

const CENTER_TYPES = [
  ["aps", "APS / CESFAM"],
  ["privado", "Centro privado"],
  ["hospital", "Hospital"],
  ["urgencia", "Urgencia"],
  ["otro", "Otro"],
];

const BOOL_OPTIONS = [
  ["", "Sin dato"],
  ["true", "Sí"],
  ["false", "No"],
];

function Field({ label, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export default function ResidentDs20Tab({ resident, onResidentChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { eleam, can } = useAuth();
  const canEdit = can("editar_residentes");
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNetworkForm, setShowNetworkForm] = useState(false);
  const [healthCenters, setHealthCenters] = useState([]);
  const [healthCentersLoading, setHealthCentersLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showConsentUpload, setShowConsentUpload] = useState(false);
  const [personaSig, setPersonaSig] = useState(null);
  const [personaSigForm, setPersonaSigForm] = useState({ nombre: "", parentesco: "", telefono: "", email: "", vive_con_residente: false, descripcion_relacion: "", preferencias_visita: "" });
  const [showPersonaSigForm, setShowPersonaSigForm] = useState(false);
  const [actividadesSociales, setActividadesSociales] = useState([]);
  const [showActividadForm, setShowActividadForm] = useState(false);
  const [actividadForm, setActividadForm] = useState({ nombre: "", tipo: "recreativa", descripcion: "", frecuencia: "", preferencia: "" });
  const [networkForm, setNetworkForm] = useState({
    health_center_id: "",
    center_nombre: "",
    center_tipo: "aps",
    sistema_salud: resident?.prevision || "",
    inscrito_aps: "",
    numero_ficha: "",
    medico_referencia: "",
    telefono_referencia: "",
    observaciones: "",
  });

  const load = useCallback(async () => {
    if (!resident?.id) return;
    setLoading(true);
    try {
      const [data, ps, acts] = await Promise.all([
        getResidentDs20Bundle(resident.id),
        getPersonaSignificativa(resident.id),
        getActividadesSociales(resident.id),
      ]);
      setBundle(data);
      setPersonaSig(ps);
      setActividadesSociales(acts);
      if (ps) {
        setPersonaSigForm({
          nombre: ps.nombre ?? "",
          parentesco: ps.parentesco ?? "",
          telefono: ps.telefono ?? "",
          email: ps.email ?? "",
          vive_con_residente: ps.vive_con_residente ?? false,
          descripcion_relacion: ps.descripcion_relacion ?? "",
          preferencias_visita: ps.preferencias_visita ?? "",
        });
      }
      const network = data.network;
      setNetworkForm({
        health_center_id: network?.health_center_id ?? "",
        center_nombre: "",
        center_tipo: network?.centro?.tipo ?? "aps",
        sistema_salud: network?.sistema_salud ?? resident?.prevision ?? "",
        inscrito_aps: network?.inscrito_aps == null ? "" : String(network.inscrito_aps),
        numero_ficha: network?.numero_ficha ?? "",
        medico_referencia: network?.medico_referencia ?? "",
        telefono_referencia: network?.telefono_referencia ?? "",
        observaciones: network?.observaciones ?? "",
      });
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudieron cargar los antecedentes de ingreso.", "error");
    } finally {
      setLoading(false);
    }
  }, [resident?.id, resident?.prevision, toast]);

  useEffect(() => { load(); }, [load]);

  const latestConsent = bundle?.consents?.[0] ?? null;

  const toggleNetworkForm = async () => {
    if (showNetworkForm) {
      setShowNetworkForm(false);
      return;
    }
    setShowNetworkForm(true);
    if (healthCenters.length > 0) return;
    setHealthCentersLoading(true);
    try {
      setHealthCenters(await listActiveHealthCenters());
    } catch (error) {
      console.error(error);
      toast("No se pudo cargar la lista de centros de salud.", "error");
    } finally {
      setHealthCentersLoading(false);
    }
  };

  const saveNetwork = async () => {
    setSaving(true);
    try {
      let centerId = networkForm.health_center_id || null;
      const centerName = networkForm.center_nombre.trim();
      const healthSystem = networkForm.sistema_salud.trim();
      if (!centerId && !centerName && !healthSystem) {
        toast("Indica un centro de salud o un sistema de salud para guardar la red.", "warning");
        return;
      }
      if (!centerId && networkForm.center_nombre.trim()) {
        const center = await upsertHealthCenter({
          nombre: centerName,
          tipo: networkForm.center_tipo,
        });
        centerId = center.id;
      }
      await upsertResidentHealthNetwork(resident.id, {
        ...networkForm,
        health_center_id: centerId,
        inscrito_aps: networkForm.inscrito_aps === "" ? "" : networkForm.inscrito_aps === "true",
      });
      toast("Red de salud actualizada.", "success");
      await load();
      setShowNetworkForm(false);
      void onResidentChanged?.();
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudo guardar red de salud.", "error");
    } finally {
      setSaving(false);
    }
  };

  const savePersonaSig = async () => {
    if (!personaSigForm.nombre.trim()) {
      toast("El nombre de la persona significativa es obligatorio.", "warning");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertPersonaSignificativa(resident.id, personaSigForm);
      setPersonaSig(saved);
      setShowPersonaSigForm(false);
      toast("Persona significativa guardada.", "success");
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudo guardar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveActividad = async () => {
    if (!actividadForm.nombre.trim() || !actividadForm.tipo) {
      toast("Nombre y tipo son obligatorios.", "warning");
      return;
    }
    setSaving(true);
    try {
      await saveActividadSocial(resident.id, actividadForm);
      setActividadForm({ nombre: "", tipo: "recreativa", descripcion: "", frecuencia: "", preferencia: "" });
      setShowActividadForm(false);
      await load();
      toast("Actividad registrada.", "success");
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudo guardar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeActividad = async (act) => {
    const ok = await confirm({
      title: "Eliminar actividad",
      message: `Se eliminará "${act.nombre}" del registro de actividades del residente.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteActividadSocial(act.id);
      setActividadesSociales((prev) => prev.filter((a) => a.id !== act.id));
      toast("Actividad eliminada.", "success");
    } catch (error) {
      toast(error.message || "No se pudo eliminar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openPdf = async (path) => {
    try {
      const url = await getSignedDs20Url(path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast("No se pudo abrir el documento.", "error");
    }
  };

  if (loading) return <Loading message="Cargando antecedentes de ingreso..." />;

  const hasNetwork = Boolean(bundle?.network?.health_center_id || bundle?.network?.centro?.nombre || bundle?.network?.sistema_salud || bundle?.network?.numero_ficha);

  return (
    <div id="resident-admission" className="scroll-mt-4 space-y-5">
      <section className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${latestConsent ? "border-slate-200" : "border-amber-300 ring-1 ring-amber-100"}`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Antecedentes de ingreso</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">Reúne aquí el consentimiento y los antecedentes que acompañan la estadía. El seguimiento normativo general se mantiene en Cumplimiento.</p>
          </div>
          <span className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${latestConsent ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-900"}`}>
            {latestConsent ? "Consentimiento registrado" : "Pendiente DS20"}
          </span>
        </div>
        <div className={`rounded-xl border p-3 sm:p-4 ${latestConsent ? "border-slate-100 bg-slate-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-sm font-semibold text-slate-900">Consentimiento informado</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {latestConsent ? `Registrado el ${formatDateOnly(latestConsent.fecha_consentimiento)} por ${latestConsent.firmante_nombre}.` : "Requerido para el ingreso: registra un nuevo consentimiento o sube el documento que ya fue firmado."}
          </p>
          {(canEdit || latestConsent?.pdf_storage_path) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canEdit && (
                <>
                  <Button type="button" onClick={() => setShowConsent(true)} className="bg-teal-700 text-white hover:bg-teal-800">
                    {latestConsent ? "Registrar uno nuevo" : "Registrar consentimiento"}
                  </Button>
                  <Button type="button" onClick={() => setShowConsentUpload(true)} className="border border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">
                    Subir documento firmado
                  </Button>
                </>
              )}
              {latestConsent?.pdf_storage_path && (
                <button type="button" onClick={() => openPdf(latestConsent.pdf_storage_path)} className="min-h-10 px-2 text-sm font-semibold text-teal-700 hover:underline">
                  Ver documento
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${hasNetwork ? "border-slate-200" : "border-amber-300 ring-1 ring-amber-100"}`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">Red de salud</h2>
              {!hasNetwork && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Pendiente DS20</span>}
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-500">Centro de atención y contacto profesional del residente.</p>
          </div>
          {canEdit && (
            <button type="button" onClick={toggleNetworkForm} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">
              {showNetworkForm ? "Cerrar" : hasNetwork ? "Editar" : "Registrar"}
            </button>
          )}
        </div>
        {!showNetworkForm && (hasNetwork ? (
          <dl className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
            <div><dt className="text-xs font-semibold text-slate-500">Centro</dt><dd className="mt-1 text-sm font-medium text-slate-900">{bundle.network?.centro?.nombre || "Sin centro asociado"}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Sistema de salud</dt><dd className="mt-1 text-sm font-medium text-slate-900">{bundle.network?.sistema_salud || "Sin registrar"}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Inscripción APS</dt><dd className="mt-1 text-sm font-medium text-slate-900">{bundle.network?.inscrito_aps == null ? "Sin registrar" : bundle.network.inscrito_aps ? "Sí" : "No"}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Profesional de referencia</dt><dd className="mt-1 text-sm font-medium text-slate-900">{bundle.network?.medico_referencia || "Sin registrar"}</dd></div>
          </dl>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">Registra el centro o sistema de salud para respaldar la continuidad de atención exigida en la ficha del residente.</p>
        ))}
        {showNetworkForm && <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3 md:grid-cols-2 sm:p-4">
          <Field label="Centro existente">
            <select className={inputClass} value={networkForm.health_center_id} disabled={saving || healthCentersLoading || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, health_center_id: e.target.value }))}>
              <option value="">{healthCentersLoading ? "Cargando centros…" : "Seleccionar o crear nuevo"}</option>
              {healthCenters.map((center) => (
                <option key={center.id} value={center.id}>{center.nombre} · {center.tipo}</option>
              ))}
            </select>
          </Field>
          {!networkForm.health_center_id && (
            <>
              <Field label="Nuevo centro">
                <input className={inputClass} value={networkForm.center_nombre} disabled={saving || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, center_nombre: e.target.value }))} placeholder="CESFAM, clínica o centro de salud" />
              </Field>
              <Field label="Tipo de centro">
                <select className={inputClass} value={networkForm.center_tipo} disabled={saving || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, center_tipo: e.target.value }))}>
                  {CENTER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Sistema de salud">
            <input className={inputClass} value={networkForm.sistema_salud} disabled={saving || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, sistema_salud: e.target.value }))} placeholder="FONASA, ISAPRE, particular" />
          </Field>
          <Field label="Inscrito en APS">
            <select className={inputClass} value={networkForm.inscrito_aps} disabled={saving || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, inscrito_aps: e.target.value }))}>
              {BOOL_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="N° ficha o identificador">
            <input className={inputClass} value={networkForm.numero_ficha} disabled={saving || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, numero_ficha: e.target.value }))} />
          </Field>
          <Field label="Médico/profesional referencia">
            <input className={inputClass} value={networkForm.medico_referencia} disabled={saving || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, medico_referencia: e.target.value }))} />
          </Field>
          <Field label="Teléfono referencia">
            <input className={inputClass} value={networkForm.telefono_referencia} disabled={saving || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, telefono_referencia: e.target.value }))} />
          </Field>
          <Field label="Observaciones">
            <textarea className={`${inputClass} resize-y`} rows={3} value={networkForm.observaciones} disabled={saving || !canEdit} onChange={(e) => setNetworkForm((p) => ({ ...p, observaciones: e.target.value }))} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
            <Button type="button" disabled={saving} onClick={() => setShowNetworkForm(false)} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-100">
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={saveNetwork} className="bg-teal-700 text-white hover:bg-teal-800">
              Guardar red de salud
            </Button>
          </div>
        </div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Persona significativa</h2>
            <p className="mt-1 text-sm text-slate-500">Referente afectivo o persona de apoyo que el residente reconoce como importante.</p>
          </div>
          {canEdit && (
            <button type="button" onClick={() => setShowPersonaSigForm(!showPersonaSigForm)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {personaSig ? "Editar" : "Registrar"}
            </button>
          )}
        </div>

        {showPersonaSigForm ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre *">
                <input className={inputClass} value={personaSigForm.nombre} onChange={(e) => setPersonaSigForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo" />
              </Field>
              <Field label="Parentesco / relación">
                <input className={inputClass} value={personaSigForm.parentesco} onChange={(e) => setPersonaSigForm((p) => ({ ...p, parentesco: e.target.value }))} placeholder="Ej: hija, amigo cercano…" />
              </Field>
              <Field label="Teléfono">
                <input className={inputClass} value={personaSigForm.telefono} onChange={(e) => setPersonaSigForm((p) => ({ ...p, telefono: e.target.value }))} placeholder="+56 9…" />
              </Field>
              <Field label="Correo electrónico">
                <input className={inputClass} type="email" value={personaSigForm.email} onChange={(e) => setPersonaSigForm((p) => ({ ...p, email: e.target.value }))} placeholder="ejemplo@correo.cl" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={personaSigForm.vive_con_residente} onChange={(e) => setPersonaSigForm((p) => ({ ...p, vive_con_residente: e.target.checked }))} className="h-4 w-4 rounded accent-teal-600" />
              Vive o vivía con el residente
            </label>
            <Field label="Descripción de la relación">
              <textarea rows={2} className={`${inputClass} resize-y`} value={personaSigForm.descripcion_relacion} onChange={(e) => setPersonaSigForm((p) => ({ ...p, descripcion_relacion: e.target.value }))} placeholder="Cómo se relacionan, historia compartida…" />
            </Field>
            <Field label="Preferencias de visita">
              <textarea rows={2} className={`${inputClass} resize-y`} value={personaSigForm.preferencias_visita} onChange={(e) => setPersonaSigForm((p) => ({ ...p, preferencias_visita: e.target.value }))} placeholder="Horarios preferidos, frecuencia, consideraciones…" />
            </Field>
            <div className="flex gap-2">
              <button type="button" onClick={savePersonaSig} disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                {saving ? "Guardando…" : "Guardar"}
              </button>
              <button type="button" onClick={() => setShowPersonaSigForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        ) : personaSig ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</p>
              <p className="text-sm text-slate-900">{personaSig.nombre}</p>
            </div>
            {personaSig.parentesco && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parentesco</p>
                <p className="text-sm text-slate-900">{personaSig.parentesco}</p>
              </div>
            )}
            {personaSig.telefono && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teléfono</p>
                <p className="text-sm text-slate-900">{personaSig.telefono}</p>
              </div>
            )}
            {personaSig.email && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correo</p>
                <p className="text-sm text-slate-900">{personaSig.email}</p>
              </div>
            )}
            {personaSig.descripcion_relacion && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Relación</p>
                <p className="text-sm leading-5 text-slate-700">{personaSig.descripcion_relacion}</p>
              </div>
            )}
            {personaSig.preferencias_visita && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preferencias de visita</p>
                <p className="text-sm leading-5 text-slate-700">{personaSig.preferencias_visita}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Sin persona significativa registrada.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Intereses y actividades</h2>
            <p className="mt-1 text-sm text-slate-500">Preferencias que ayudan a planificar actividades significativas para el residente.</p>
          </div>
          {canEdit && (
            <button type="button" onClick={() => setShowActividadForm(!showActividadForm)}
              className="rounded-xl bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800">
              + Agregar
            </button>
          )}
        </div>

        {showActividadForm && (
          <div className="mb-4 space-y-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre de la actividad *">
                <input className={inputClass} value={actividadForm.nombre} onChange={(e) => setActividadForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Tejido, Caminata, Misa…" />
              </Field>
              <Field label="Tipo *">
                <select className={inputClass} value={actividadForm.tipo} onChange={(e) => setActividadForm((p) => ({ ...p, tipo: e.target.value }))}>
                  {ACTIVIDAD_TIPOS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Frecuencia">
                <select className={inputClass} value={actividadForm.frecuencia} onChange={(e) => setActividadForm((p) => ({ ...p, frecuencia: e.target.value }))}>
                  <option value="">Sin especificar</option>
                  {ACTIVIDAD_FRECUENCIAS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Preferencia del residente">
                <select className={inputClass} value={actividadForm.preferencia} onChange={(e) => setActividadForm((p) => ({ ...p, preferencia: e.target.value }))}>
                  <option value="">Sin especificar</option>
                  {ACTIVIDAD_PREFERENCIAS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descripción">
              <textarea rows={2} className={`${inputClass} resize-y`} value={actividadForm.descripcion} onChange={(e) => setActividadForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Detalles adicionales…" />
            </Field>
            <div className="flex gap-2">
              <button type="button" onClick={saveActividad} disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                {saving ? "Guardando…" : "Guardar actividad"}
              </button>
              <button type="button" onClick={() => setShowActividadForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {actividadesSociales.length === 0 ? (
          <p className="text-sm text-slate-500">Sin actividades registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {actividadesSociales.map((act) => (
              <li key={act.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{act.nombre}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {ACTIVIDAD_TIPO_LABEL[act.tipo] ?? act.tipo}
                    {act.frecuencia ? ` · ${ACTIVIDAD_FRECUENCIA_LABEL[act.frecuencia] ?? act.frecuencia}` : ""}
                    {act.preferencia ? ` · ${ACTIVIDAD_PREFERENCIA_LABEL[act.preferencia] ?? act.preferencia}` : ""}
                  </p>
                  {act.descripcion && <p className="mt-1 text-xs leading-5 text-slate-600">{act.descripcion}</p>}
                </div>
                {canEdit && (
                  <button type="button" onClick={() => removeActividad(act)} disabled={saving}
                    className="shrink-0 rounded-xl border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                    Eliminar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConsentModal
        isOpen={showConsent}
        onClose={() => setShowConsent(false)}
        resident={resident}
        eleam={eleam}
        onSaved={load}
      />
      <UploadConsentModal
        isOpen={showConsentUpload}
        onClose={() => setShowConsentUpload(false)}
        resident={resident}
        eleam={eleam}
        onSaved={load}
      />
    </div>
  );
}
