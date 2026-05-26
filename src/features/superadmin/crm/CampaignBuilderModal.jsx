import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import Button from "../../../components/Button";
import {
  TextField,
  TextareaField,
  SelectField,
  FormGrid,
  FormSection,
  ErrorSummary,
  Notice,
} from "../../../components/forms/FormKit";
import { useToast } from "../../../components/Toast";
import { useConfirm } from "../../../components/ConfirmDialog";
import {
  applyPostgresErrorToForm,
  scrollToFirstError,
  userFacingFormError,
} from "../../../utils/formValidation";
import { validateEmail } from "../../../utils/validators";

const CAMPAIGN_DB_FIELD_MAP = {
  nombre: { field: "nombre", message: "El nombre de la campaña no tiene el formato permitido (máximo 160 caracteres)." },
  asunto_default: { field: "asunto_default", message: "El asunto no tiene el formato permitido (máximo 200 caracteres)." },
  cuerpo_default: { field: "cuerpo_default", message: "El cuerpo del correo excede el largo permitido (máximo 8.000 caracteres)." },
  mensaje_rrss_template: { field: "mensaje_rrss_template", message: "El mensaje de RRSS excede el largo permitido (máximo 4.000 caracteres)." },
  script_llamada_template: { field: "script_llamada_template", message: "El script de llamada excede el largo permitido (máximo 8.000 caracteres)." },
  objetivo: { field: "objetivo", message: "El objetivo excede el largo permitido (máximo 1.000 caracteres)." },
  audiencia_notas: { field: "audiencia_notas", message: "Las notas de audiencia exceden el largo permitido (máximo 1.000 caracteres)." },
  from_email: { field: "from_email", message: "El email \"From\" no tiene un formato válido." },
  from_name: { field: "from_name", message: "El nombre del remitente excede el largo permitido (máximo 120 caracteres)." },
  reply_to_email: { field: "reply_to_email", message: "El email de \"Reply-To\" no tiene un formato válido." },
};
import {
  CAMPAIGN_FORM_EMPTY,
  validateCampaignForm,
} from "../crmEmailFormSchema";
import {
  createCampaignMembers,
  createEmailCampaign,
  getProspectLists,
  getProspects,
} from "../crmEmailService";
import {
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_CALL_SCRIPT,
  DEFAULT_RRSS_TEMPLATE,
  renderTemplate,
  templateVariableHelp,
} from "./crmSalesPlaybook";
import CampaignSendProgress from "./CampaignSendProgress";

const STEPS = [
  { key: "definition", label: "Campaña" },
  { key: "audience",   label: "Audiencia" },
  { key: "preview",    label: "Vista previa" },
  { key: "send",       label: "Envío" },
];

function StepIndicator({ current }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((step, idx) => {
        const state = idx < current ? "done" : idx === current ? "active" : "pending";
        return (
          <li
            key={step.key}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
              state === "active" ? "bg-teal-700 text-white"
              : state === "done" ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
              state === "active" ? "bg-white/20 text-white"
              : state === "done" ? "bg-emerald-500 text-white"
              : "bg-white text-slate-500"
            }`}>
              {state === "done" ? "✓" : idx + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function previewSubject(prospect, campaignForm) {
  return renderTemplate(campaignForm.asunto_default, prospect, "FichaEleam para {{eleam_nombre}}").trim()
    || "FichaEleam para tu ELEAM";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function previewBodyText(prospect, campaignForm) {
  return renderTemplate(campaignForm.cuerpo_default, prospect, DEFAULT_EMAIL_TEMPLATE).trim();
}

function previewBodyHtml(text) {
  return escapeHtml(text).replace(/\r?\n/g, "<br/>");
}

export default function CampaignBuilderModal({
  isOpen,
  initialProspectIds = [],
  onClose,
  onSent,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [step, setStep] = useState(0);
  const [campaignForm, setCampaignForm] = useState(CAMPAIGN_FORM_EMPTY);
  const [errors, setErrors] = useState({});
  const [lists, setLists] = useState([]);
  const [allProspects, setAllProspects] = useState([]);
  const [filterListId, setFilterListId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  // Reset cuando se abre/cierra.
  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setCampaignForm(CAMPAIGN_FORM_EMPTY);
    setErrors({});
    setSelectedIds(new Set(initialProspectIds ?? []));
    setSearch("");
    setFilterListId("");
    setCreatedCampaignId(null);
    setSendResult(null);
  }, [isOpen, initialProspectIds]);

  // Carga inicial de listas y prospectos cuando se abre.
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const data = await getProspectLists();
        setLists(data);
      } catch (err) {
        toast(userFacingFormError(err, "No se pudieron cargar las listas."), "error");
      }
    })();
  }, [isOpen, toast]);

  // Cuando entra al paso "audience" carga prospectos del filtro.
  useEffect(() => {
    if (!isOpen) return;
    if (step !== 1) return;
    let cancelled = false;
    setLoadingProspects(true);
    (async () => {
      try {
        const data = await getProspects({
          listId: filterListId || null,
          includeNoContactar: true,
          limit: 500,
        });
        if (!cancelled) setAllProspects(data);
      } catch (err) {
        if (!cancelled) toast(userFacingFormError(err, "No se pudieron cargar los prospectos."), "error");
      } finally {
        if (!cancelled) setLoadingProspects(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, step, filterListId, toast]);

  const handleField = (e) => {
    const { name, value } = e.target;
    setCampaignForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name] && !prev._form) return prev;
      const next = { ...prev };
      delete next[name];
      delete next._form;
      return next;
    });
  };

  const visibleProspects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allProspects;
    return allProspects.filter((p) =>
      [p.eleam_nombre, p.email, p.comuna].some((v) => v && v.toLowerCase().includes(term)),
    );
  }, [allProspects, search]);

  const selectedProspects = useMemo(
    () => allProspects.filter((p) => selectedIds.has(p.id)),
    [allProspects, selectedIds],
  );

  const sendable = useMemo(() => {
    return selectedProspects.filter((p) => !p.no_contactar && p.email && validateEmail(p.email));
  }, [selectedProspects]);

  const skippable = useMemo(() => {
    return selectedProspects.filter((p) => p.no_contactar || !p.email || !validateEmail(p.email));
  }, [selectedProspects]);

  const allVisibleSelected = visibleProspects.length > 0 && visibleProspects.every((p) => selectedIds.has(p.id));
  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleProspects.forEach((p) => next.delete(p.id));
      } else {
        visibleProspects.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Sample para preview: hasta 3 prospectos enviables.
  const previewSamples = useMemo(() => sendable.slice(0, 3), [sendable]);
  const [previewIndex, setPreviewIndex] = useState(0);
  useEffect(() => { setPreviewIndex(0); }, [previewSamples.length]);

  const goNext = async () => {
    if (step === 0) {
      const result = validateCampaignForm(campaignForm);
      if (!result.ok) {
        setErrors(result.errors);
        scrollToFirstError(result.errors);
        return;
      }
      setCampaignForm({
        ...campaignForm,
        ...result.data,
        from_email: result.data.from_email ?? "",
        from_name: result.data.from_name ?? "",
        reply_to_email: result.data.reply_to_email ?? "",
        cuerpo_default: result.data.cuerpo_default ?? "",
      });
      setStep(1);
      return;
    }
    if (step === 1) {
      if (selectedIds.size === 0) {
        toast("Selecciona al menos un destinatario.", "warning");
        return;
      }
      if (sendable.length === 0) {
        toast("Ninguno de los seleccionados tiene email válido.", "warning");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const confirmed = await confirm({
        title: `¿Enviar a ${sendable.length} destinatario${sendable.length === 1 ? "" : "s"}?`,
        message: skippable.length > 0
          ? `Se omitirán ${skippable.length} (sin email válido o marcados "no contactar"). El envío inicia inmediatamente y no se puede cancelar.`
          : "El envío inicia inmediatamente y no se puede cancelar una vez confirmado.",
        confirmText: "Enviar ahora",
        danger: false,
      });
      if (!confirmed) return;

      // Crea la campaña en BD y luego pasa al paso de envío.
      setCreating(true);
      try {
        const payload = validateCampaignForm(campaignForm);
        if (!payload.ok) {
          setErrors(payload.errors);
          setStep(0);
          return;
        }
        const insertable = {
          ...payload.data,
          total_destinatarios: sendable.length + skippable.length,
        };
        const created = await createEmailCampaign(insertable);
        await createCampaignMembers(created.id, selectedProspects.map((p) => p.id));
        setCreatedCampaignId(created.id);
        setStep(3);
      } catch (err) {
        // Si la BD rechazó la campaña, volvemos al paso 0 con el campo
        // resaltado para que el usuario corrija (no perder el progreso de
        // audiencia/preview ya selecciona).
        const applied = applyPostgresErrorToForm(err, setErrors, {
          fieldMap: CAMPAIGN_DB_FIELD_MAP,
          fallback: "No se pudo crear la campaña.",
        });
        setStep(0);
        if (applied.field) {
          scrollToFirstError({ [applied.field]: applied.message });
        } else {
          toast(applied.message, "error");
        }
      } finally {
        setCreating(false);
      }
      return;
    }
  };

  const goBack = () => {
    if (step === 0) { onClose(); return; }
    if (step === 3) return; // no retroceder durante envío
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSendDone = (summary) => {
    setSendResult(summary);
  };

  const handleFinalClose = () => {
    onSent?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 3 && !sendResult ? () => {} : onClose}
      title={step === 3 ? "Enviando campaña…" : "Nueva campaña"}
      panelClassName="max-w-5xl p-0"
    >
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <StepIndicator current={step} />
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-5">
        {step === 0 && (
          <div className="space-y-4">
            <ErrorSummary errors={errors} />
            <FormSection title="Datos de la campaña" description="El nombre es interno. El objetivo debe decir qué avance comercial se espera de esta audiencia.">
              <div className="space-y-4">
                <TextField
                  id="nombre" name="nombre" label="Nombre de la campaña" required
                  value={campaignForm.nombre} onChange={handleField}
                  placeholder="Prospección ELEAM no digitalizados junio 2026" error={errors.nombre} maxLength={160}
                />
                <TextareaField
                  id="objetivo" name="objetivo" label="Objetivo comercial"
                  value={campaignForm.objetivo} onChange={handleField}
                  placeholder="Agendar demos con ELEAM que operan con papel, Excel o WhatsApp y tienen dolor de fiscalización/turnos."
                  rows={2} maxLength={1000} error={errors.objetivo}
                />
                <TextareaField
                  id="audiencia_notas" name="audiencia_notas" label="Notas de audiencia"
                  value={campaignForm.audiencia_notas} onChange={handleField}
                  placeholder="Segmento, hipótesis de dolor, criterios de exclusión y ángulo de venta."
                  rows={2} maxLength={1000} error={errors.audiencia_notas}
                />
                <TextField
                  id="asunto_default" name="asunto_default" label="Asunto maestro" required
                  value={campaignForm.asunto_default} onChange={handleField}
                  placeholder="Ordenar {{eleam_nombre}} sin más planillas ni papeles"
                  error={errors.asunto_default} maxLength={200}
                  hint={`Variables: ${templateVariableHelp()}`}
                />
                <TextareaField
                  id="cuerpo_default" name="cuerpo_default" label="Plantilla maestra de correo"
                  value={campaignForm.cuerpo_default} onChange={handleField}
                  placeholder={DEFAULT_EMAIL_TEMPLATE}
                  rows={6} maxLength={8000} error={errors.cuerpo_default}
                  hint="Se renderiza para cada prospecto. No hay copy por prospecto."
                />
                <TextareaField
                  id="mensaje_rrss_template" name="mensaje_rrss_template" label="Plantilla maestra RRSS"
                  value={campaignForm.mensaje_rrss_template} onChange={handleField}
                  placeholder={DEFAULT_RRSS_TEMPLATE}
                  rows={3} maxLength={4000} error={errors.mensaje_rrss_template}
                />
                <TextareaField
                  id="script_llamada_template" name="script_llamada_template" label="Script maestro de llamada"
                  value={campaignForm.script_llamada_template} onChange={handleField}
                  placeholder={DEFAULT_CALL_SCRIPT}
                  rows={6} maxLength={8000} error={errors.script_llamada_template}
                />
              </div>
            </FormSection>

            <FormSection title="Remitente (opcional)" description="Si dejas vacío, se usan los valores por defecto del sistema (RESEND_CRM_FROM_EMAIL / RESEND_CRM_REPLY_TO).">
              <FormGrid columns={2}>
                <TextField id="from_name" name="from_name" label="Nombre remitente"
                  value={campaignForm.from_name} onChange={handleField}
                  placeholder="Gabriel Garrido" error={errors.from_name} maxLength={120} />
                <TextField id="from_email" name="from_email" type="email" label="From"
                  value={campaignForm.from_email} onChange={handleField}
                  placeholder="gabriel@fichaeleam.cl" error={errors.from_email} maxLength={254} />
                <TextField id="reply_to_email" name="reply_to_email" type="email" label="Reply-To"
                  className="sm:col-span-2"
                  value={campaignForm.reply_to_email} onChange={handleField}
                  placeholder="contacto@fichaeleam.cl" error={errors.reply_to_email} maxLength={254} />
              </FormGrid>
            </FormSection>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <SelectField
                  id="filter_list" name="filter_list" label=""
                  value={filterListId} onChange={(e) => setFilterListId(e.target.value)}
                  options={[["", "Todas las listas"], ...lists.map((l) => [l.id, l.nombre])]}
                  placeholder={null} className="w-64"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="min-h-11 sm:min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div className="text-sm font-semibold text-slate-700">
                <span className="text-teal-700">{selectedIds.size}</span> seleccionados / <span className="text-slate-500">{visibleProspects.length}</span> visibles
              </div>
            </div>

            {loadingProspects ? (
              <p className="py-8 text-center text-sm text-slate-500">Cargando prospectos…</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-10 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleAllVisible}
                            aria-label="Seleccionar todos los visibles"
                            className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                          />
                        </th>
                        <th className="px-3 py-2">ELEAM</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Comuna</th>
                        <th className="px-3 py-2 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleProspects.map((p) => {
                        const checked = selectedIds.has(p.id);
                        const omitted = p.no_contactar || !p.email || !validateEmail(p.email);
                        return (
                          <tr key={p.id} className={omitted ? "bg-slate-50/60" : "hover:bg-slate-50"}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOne(p.id)}
                                aria-label={`Seleccionar ${p.eleam_nombre}`}
                                className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                              />
                            </td>
                            <td className="max-w-xs truncate px-3 py-2 font-medium text-slate-800" title={p.eleam_nombre}>{p.eleam_nombre}</td>
                            <td className="max-w-xs truncate px-3 py-2 text-slate-700">
                              {p.email || <span className="text-rose-500">Sin email</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-500">{p.comuna || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              {p.no_contactar ? (
                                <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">No contactar</span>
                              ) : !p.email || !validateEmail(p.email) ? (
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Sin email</span>
                              ) : (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedIds.size > 0 && (
              <Notice tone="teal" title={`${sendable.length} se enviarán · ${skippable.length} se omitirán`}>
                <p>Los omitidos quedan registrados con el motivo (no contactar o email inválido). La campaña no falla por ellos.</p>
              </Notice>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {previewSamples.length === 0 ? (
              <Notice tone="rose" title="No hay destinatarios para previsualizar">
                <p>Vuelve al paso anterior y selecciona prospectos con email válido.</p>
              </Notice>
            ) : (
              <>
                <Notice tone="slate" title={`Vista previa con ${previewSamples.length} destinatario${previewSamples.length === 1 ? "" : "s"}`}>
                  <p>Cambia entre prospectos para ver cómo se renderiza la plantilla maestra con datos reales. No se usa copy personalizado por prospecto.</p>
                </Notice>
                <div className="flex flex-wrap gap-2">
                  {previewSamples.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreviewIndex(idx)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                        idx === previewIndex
                          ? "bg-teal-700 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {p.eleam_nombre}
                    </button>
                  ))}
                </div>
                <PreviewCard prospect={previewSamples[previewIndex]} campaignForm={campaignForm} />
                <Notice tone="amber" title="Resumen final">
                  <ul className="list-disc space-y-0.5 pl-4">
                    <li><strong>{sendable.length}</strong> correo{sendable.length === 1 ? "" : "s"} {sendable.length === 1 ? "será enviado" : "serán enviados"}.</li>
                    <li><strong>{skippable.length}</strong> {skippable.length === 1 ? "destinatario se omitirá" : "destinatarios se omitirán"} (sin email o marcados \"no contactar\").</li>
                    <li>Remitente: <strong>{campaignForm.from_name || "Gabriel Garrido"} &lt;{campaignForm.from_email || "gabriel@fichaeleam.cl (default)"}&gt;</strong></li>
                    <li>Reply-To: <strong>{campaignForm.reply_to_email || "contacto@fichaeleam.cl (default)"}</strong></li>
                  </ul>
                </Notice>
              </>
            )}
          </div>
        )}

        {step === 3 && createdCampaignId && (
          <CampaignSendProgress
            campaignId={createdCampaignId}
            prospectIds={sendable.map((p) => p.id)}
            onDone={handleSendDone}
          />
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:justify-between">
        {step < 3 ? (
          <>
            <Button
              type="button"
              onClick={goBack}
              disabled={creating}
              className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              {step === 0 ? "Cancelar" : "← Atrás"}
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={creating || (step === 2 && sendable.length === 0)}
              className="bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {creating ? "Creando campaña…"
                : step === 2 ? `Enviar a ${sendable.length}`
                : "Continuar →"}
            </Button>
          </>
        ) : (
          <>
            <span className="text-xs text-slate-500">
              {sendResult ? "Campaña finalizada — puedes cerrar este modal." : "No cierres mientras el envío esté en curso."}
            </span>
            <Button
              type="button"
              onClick={handleFinalClose}
              disabled={!sendResult}
              className="bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
            >
              Cerrar
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

function PreviewCard({ prospect, campaignForm }) {
  const subject = previewSubject(prospect, campaignForm);
  const body = previewBodyText(prospect, campaignForm);
  const rrss = renderTemplate(campaignForm.mensaje_rrss_template, prospect, DEFAULT_RRSS_TEMPLATE);
  const callScript = renderTemplate(campaignForm.script_llamada_template, prospect, DEFAULT_CALL_SCRIPT);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div><span className="font-semibold text-slate-600">Para:</span> <span className="text-slate-800">{prospect.email}</span></div>
          <div><span className="font-semibold text-slate-600">Asunto:</span> <span className="text-slate-800">{subject}</span></div>
        </div>
      </div>
      <div className="p-5">
        <p className="mb-3 text-sm text-slate-700">Estimado equipo de <strong>{prospect.eleam_nombre}</strong>,</p>
        <div
          className="text-sm text-slate-700 leading-relaxed"
          // El preview viene del prospecto/campaña — todo escapado en previewBodyHtml.
          dangerouslySetInnerHTML={{ __html: previewBodyHtml(body) }}
        />
        <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-800">
          <strong>Qué incluye FichaEleam</strong>
          <ul className="mt-1 list-disc pl-4">
            <li>Ordena en un solo lugar lo que hoy puede estar repartido entre carpetas, planillas y WhatsApp.</li>
            <li>Reduce el riesgo de enfrentar una revisión buscando papeles a última hora: registros y reportes claros cuando los necesiten.</li>
            <li>Facilita el trabajo diario del equipo con cuidados, medicamentos y signos vitales simples de registrar.</li>
            <li>Si ya usan otro sistema, les mostramos una alternativa pensada para ELEAM, fácil de adoptar y con soporte cercano en Chile.</li>
            <li>Planes con precios justos para residencias pequeñas y grandes, para que modernizarse tenga sentido desde el primer mes.</li>
          </ul>
        </div>
        <div className="mt-4 text-center">
          <a href="https://fichaeleam.cl/#demo" className="inline-block rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white">
            Conoce FichaEleam — solicita una demo gratis
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">RRSS / WhatsApp</p>
            <p className="whitespace-pre-line text-xs leading-5 text-slate-700">{rrss}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Llamada</p>
            <p className="max-h-44 overflow-auto whitespace-pre-line text-xs leading-5 text-slate-700">{callScript}</p>
          </div>
        </div>
        <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          Respondemos en menos de 24 horas hábiles. También puedes escribirnos respondiendo directamente este correo.
          <br />
          FichaEleam · Santiago, Chile · fichaeleam.cl
        </p>
      </div>
    </div>
  );
}
