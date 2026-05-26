import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import HelpTooltip from "../../../components/HelpTooltip";
import {
  TextField,
  TextareaField,
  SelectField,
  FormGrid,
  FormSection,
  SubmitBar,
  ErrorSummary,
  Notice,
} from "../../../components/forms/FormKit";
import { useToast } from "../../../components/Toast";
import {
  applyPostgresErrorToForm,
  scrollToFirstError,
} from "../../../utils/formValidation";
import {
  PROSPECT_ESTADOS,
  PROSPECT_FORM_EMPTY,
  validateProspectForm,
} from "../crmEmailFormSchema";
import { createProspect, updateProspect } from "../crmEmailService";

// Mapeo de constraints / columnas de crm_prospects a campos del formulario
// para mostrar errores específicos cuando la BD rechaza la inserción.
// Cuando agregues una constraint nueva al schema, mapéala aquí.
const PROSPECT_DB_FIELD_MAP = {
  // Columnas (NOT NULL / column-level checks auto-named):
  eleam_nombre: { field: "eleam_nombre", message: "El nombre del ELEAM no tiene el formato permitido (máximo 200 caracteres)." },
  comuna: { field: "comuna", message: "La comuna no tiene el formato permitido (máximo 100 caracteres)." },
  telefono: { field: "telefono", message: "El teléfono no tiene el formato permitido (máximo 40 caracteres)." },
  email: { field: "email", message: "El correo no tiene un formato válido (usa solo letras, números y los símbolos . _ + - %)." },
  facebook_url: { field: "facebook_url", message: "El enlace de Facebook no tiene el formato permitido (máximo 500 caracteres)." },
  instagram_url: { field: "instagram_url", message: "El enlace de Instagram no tiene el formato permitido (máximo 500 caracteres)." },
  tiktok_url: { field: "tiktok_url", message: "El enlace de TikTok no tiene el formato permitido (máximo 500 caracteres)." },
  origen: { field: "origen", message: "El origen no es uno de los valores permitidos." },
  canal_preferido: { field: "canal_preferido", message: "El canal preferido no es uno de los valores permitidos." },
  cargo_contacto: { field: "cargo_contacto", message: "El cargo de contacto no tiene el formato permitido." },
  decision_maker_nombre: { field: "decision_maker_nombre", message: "El nombre del decisor no tiene el formato permitido." },
  decision_maker_cargo: { field: "decision_maker_cargo", message: "El cargo del decisor no tiene el formato permitido." },
  num_residentes: { field: "num_residentes", message: "El número de residentes debe estar entre 1 y 10.000." },
  digitalizacion_estado: { field: "digitalizacion_estado", message: "El estado digital no es uno de los valores permitidos." },
  software_actual: { field: "software_actual", message: "El software actual no tiene el formato permitido." },
  dolor_principal: { field: "dolor_principal", message: "El dolor principal no tiene el formato permitido (máximo 500 caracteres)." },
  urgencia: { field: "urgencia", message: "La urgencia no es uno de los valores permitidos." },
  fit_score: { field: "fit_score", message: "El fit score debe estar entre 0 y 100." },
  valor_estimado_clp: { field: "valor_estimado_clp", message: "El valor estimado no puede ser negativo." },
  probabilidad_cierre: { field: "probabilidad_cierre", message: "La probabilidad de cierre debe estar entre 0 y 100." },
  motivo_perdida: { field: "motivo_perdida", message: "El motivo de pérdida no tiene el formato permitido (máximo 500 caracteres)." },
  competidor: { field: "competidor", message: "El competidor no tiene el formato permitido." },
  estado: { field: "estado", message: "La etapa no es uno de los valores permitidos." },
  notas: { field: "notas", message: "Las notas no tienen el formato permitido (máximo 3.000 caracteres)." },
  // Constraints custom (named):
  crm_prospects_lost_reason_required: {
    field: "motivo_perdida",
    message: "Cuando la etapa es \"perdido\" debes indicar un motivo de pérdida.",
  },
  crm_prospects_no_contactar_consistent: {
    field: "estado",
    message: "La etapa y la marca \"no contactar\" deben coincidir.",
  },
  // Unique indexes:
  crm_prospects_email_unique: {
    field: "email",
    message: "Ya existe un prospecto con ese correo en la base.",
  },
  crm_prospects_demo_lead_unique: {
    field: null,
    message: "Este prospecto ya está vinculado a un lead de demo.",
  },
};
import {
  CHANNEL_OPTIONS,
  DIGITALIZATION_OPTIONS,
  ORIGIN_OPTIONS,
  URGENCY_OPTIONS,
  OBJECTION_LIBRARY,
  digitalizationLabel,
  stageGuideText,
  stageLabel,
} from "./crmSalesPlaybook";

const ESTADO_OPTIONS = PROSPECT_ESTADOS.map((value) => [value, stageLabel(value)]);

function numberToInput(value) {
  return value == null ? "" : String(value);
}

function prospectToForm(p) {
  if (!p) return PROSPECT_FORM_EMPTY;
  return {
    list_id: p.list_id ?? "",
    eleam_nombre: p.eleam_nombre ?? "",
    comuna: p.comuna ?? "",
    telefono: p.telefono ?? "",
    email: p.email ?? "",
    facebook_url: p.facebook_url ?? "",
    instagram_url: p.instagram_url ?? "",
    tiktok_url: p.tiktok_url ?? "",
    origen: p.origen ?? "outbound",
    canal_preferido: p.canal_preferido ?? "desconocido",
    cargo_contacto: p.cargo_contacto ?? "",
    decision_maker_nombre: p.decision_maker_nombre ?? "",
    decision_maker_cargo: p.decision_maker_cargo ?? "",
    num_residentes: numberToInput(p.num_residentes),
    digitalizacion_estado: p.digitalizacion_estado ?? "desconocido",
    software_actual: p.software_actual ?? "",
    dolor_principal: p.dolor_principal ?? "",
    urgencia: p.urgencia ?? "desconocida",
    fit_score: p.fit_score ?? 50,
    valor_estimado_clp: numberToInput(p.valor_estimado_clp),
    probabilidad_cierre: p.probabilidad_cierre ?? 10,
    proxima_accion_fecha: p.proxima_accion_fecha ?? "",
    motivo_perdida: p.motivo_perdida ?? "",
    competidor: p.competidor ?? "",
    estado: p.estado ?? "nuevo",
    notas: p.notas ?? "",
  };
}

export default function ProspectFormModal({ isOpen, prospect, lists = [], defaultListId = null, onClose, onSaved }) {
  const isEditing = Boolean(prospect?.id);
  const toast = useToast();
  const [form, setForm] = useState(PROSPECT_FORM_EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm(prospect ? prospectToForm(prospect) : { ...PROSPECT_FORM_EMPTY, list_id: defaultListId ?? "" });
  }, [isOpen, prospect, defaultListId]);

  const stageTip = useMemo(() => stageGuideText(form.estado), [form.estado]);
  const digitalTip = useMemo(() => {
    if (form.digitalizacion_estado === "papel_excel_whatsapp") {
      return "Enfoque: orden clínico, continuidad de turno, carpeta SEREMI, menos doble registro y control familiar.";
    }
    if (form.digitalizacion_estado === "software_generico" || form.digitalizacion_estado === "software_eleam") {
      return "Enfoque: brechas del sistema actual, adopción, soporte local, módulos ELEAM-específicos y costo/valor.";
    }
    return "Primero descubre si usan papel, planillas, WhatsApp o software. La venta cambia según esa respuesta.";
  }, [form.digitalizacion_estado]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      // Limpia error del campo + el banner general al editar cualquier cosa,
      // así el usuario percibe progreso al corregir.
      if (!prev[name] && !prev._form) return prev;
      const next = { ...prev };
      delete next[name];
      delete next._form;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = validateProspectForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      scrollToFirstError(result.errors);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...result.data, list_id: result.data.list_id || null };
      const saved = isEditing
        ? await updateProspect(prospect.id, payload)
        : await createProspect(payload);
      toast(isEditing ? "Prospecto actualizado." : "Prospecto creado.", "success");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      // Parsea el error de Postgres → resalta el campo culpable cuando se
      // puede identificar, si no muestra un banner general dentro del form.
      const applied = applyPostgresErrorToForm(err, setErrors, {
        fieldMap: PROSPECT_DB_FIELD_MAP,
        fallback: "No se pudo guardar el prospecto.",
      });
      if (applied.field) {
        scrollToFirstError({ [applied.field]: applied.message });
      } else {
        toast(applied.message, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const listOptions = [["", "Sin lista"], ...lists.map((l) => [l.id, l.nombre])];

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={isEditing ? "Ficha comercial del prospecto" : "Nuevo prospecto"}
      panelClassName="max-w-5xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorSummary errors={errors} />

        <Notice tone="teal" title="Guía de etapa">
          <div className="whitespace-pre-line">{stageTip}</div>
        </Notice>

        <FormSection title="Datos del ELEAM" description="Identifica el establecimiento, canal de contacto y origen comercial.">
          <FormGrid columns={3}>
            <TextField id="eleam_nombre" name="eleam_nombre" label="Nombre del ELEAM" required value={form.eleam_nombre} onChange={handleChange} placeholder="ELEAM Vista Hermosa" error={errors.eleam_nombre} maxLength={200} />
            <TextField id="comuna" name="comuna" label="Comuna" value={form.comuna} onChange={handleChange} placeholder="Las Condes" error={errors.comuna} maxLength={100} />
            <SelectField id="list_id" name="list_id" label="Lista" value={form.list_id} onChange={handleChange} options={listOptions} placeholder={null} error={errors.list_id} />
            <TextField id="telefono" name="telefono" label="Teléfono" value={form.telefono} onChange={handleChange} placeholder="+56 9 1234 5678" error={errors.telefono} />
            <TextField id="email" name="email" type="email" label="Correo electrónico" value={form.email} onChange={handleChange} placeholder="contacto@ejemplo.cl" error={errors.email} hint="Sin correo, puede seguir por llamada, WhatsApp o RRSS." maxLength={254} />
            <SelectField id="origen" name="origen" label="Origen" value={form.origen} onChange={handleChange} options={ORIGIN_OPTIONS} placeholder={null} error={errors.origen} />
          </FormGrid>
        </FormSection>

        <FormSection
          title={
            <span className="inline-flex items-center gap-2">
              Funnel y próxima acción
              <HelpTooltip label="Guía de etapa">{stageTip}</HelpTooltip>
            </span>
          }
          description="Todo prospecto debe quedar con una etapa, prioridad comercial y próxima acción clara."
        >
          <FormGrid columns={3}>
            <SelectField id="estado" name="estado" label="Etapa" value={form.estado} onChange={handleChange} options={ESTADO_OPTIONS} placeholder={null} error={errors.estado} />
            <SelectField id="canal_preferido" name="canal_preferido" label="Canal preferido" value={form.canal_preferido} onChange={handleChange} options={CHANNEL_OPTIONS} placeholder={null} error={errors.canal_preferido} />
            <TextField id="proxima_accion_fecha" name="proxima_accion_fecha" type="date" label="Próxima acción" value={form.proxima_accion_fecha} onChange={handleChange} error={errors.proxima_accion_fecha} />
            <TextField id="fit_score" name="fit_score" type="number" label="Fit score" value={form.fit_score} onChange={handleChange} min={0} max={100} step={1} error={errors.fit_score} hint="0-100: tamaño, dolor, autoridad y urgencia." />
            <TextField id="probabilidad_cierre" name="probabilidad_cierre" type="number" label="Probabilidad cierre %" value={form.probabilidad_cierre} onChange={handleChange} min={0} max={100} step={1} error={errors.probabilidad_cierre} />
            <SelectField id="urgencia" name="urgencia" label="Urgencia" value={form.urgencia} onChange={handleChange} options={URGENCY_OPTIONS} placeholder={null} error={errors.urgencia} />
          </FormGrid>
        </FormSection>

        <FormSection
          title={
            <span className="inline-flex items-center gap-2">
              Calificación y dolor
              <HelpTooltip label="Guía de digitalización">{digitalTip}</HelpTooltip>
            </span>
          }
          description={`Estado digital actual: ${digitalizationLabel(form.digitalizacion_estado)}. Usa esto para orientar la conversación.`}
        >
          <FormGrid columns={3}>
            <SelectField id="digitalizacion_estado" name="digitalizacion_estado" label="Estado digital" value={form.digitalizacion_estado} onChange={handleChange} options={DIGITALIZATION_OPTIONS} placeholder={null} error={errors.digitalizacion_estado} />
            <TextField id="software_actual" name="software_actual" label="Software actual" value={form.software_actual} onChange={handleChange} placeholder="Planillas, sistema actual o competidor" error={errors.software_actual} maxLength={160} />
            <TextField id="num_residentes" name="num_residentes" type="number" label="N° residentes" value={form.num_residentes} onChange={handleChange} min={1} step={1} error={errors.num_residentes} />
          </FormGrid>
          <div className="mt-4">
            <TextareaField id="dolor_principal" name="dolor_principal" label="Dolor principal" value={form.dolor_principal} onChange={handleChange} placeholder="Ej: carpeta SEREMI desordenada, turnos sin continuidad, medicamentos en papel, familias preguntan por WhatsApp..." rows={3} maxLength={500} error={errors.dolor_principal} />
          </div>
        </FormSection>

        <FormSection title="Decisor y seguimiento" description="World-class selling requiere saber quién decide, quién influye y qué riesgo bloquea el cierre.">
          <FormGrid columns={3}>
            <TextField id="cargo_contacto" name="cargo_contacto" label="Cargo contacto" value={form.cargo_contacto} onChange={handleChange} placeholder="Administración, TENS, dirección..." error={errors.cargo_contacto} maxLength={120} />
            <TextField id="decision_maker_nombre" name="decision_maker_nombre" label="Nombre decisor" value={form.decision_maker_nombre} onChange={handleChange} placeholder="Nombre y apellido" error={errors.decision_maker_nombre} maxLength={160} />
            <TextField id="decision_maker_cargo" name="decision_maker_cargo" label="Cargo decisor" value={form.decision_maker_cargo} onChange={handleChange} placeholder="Dueño, directora técnica..." error={errors.decision_maker_cargo} maxLength={120} />
            <TextField id="valor_estimado_clp" name="valor_estimado_clp" type="number" label="Valor estimado CLP" value={form.valor_estimado_clp} onChange={handleChange} min={0} step={1000} error={errors.valor_estimado_clp} />
            <TextField id="competidor" name="competidor" label="Competidor" value={form.competidor} onChange={handleChange} placeholder="Si ya usan otro software" error={errors.competidor} maxLength={160} />
            <TextField id="motivo_perdida" name="motivo_perdida" label="Motivo pérdida" value={form.motivo_perdida} onChange={handleChange} placeholder="Obligatorio si etapa = perdido" error={errors.motivo_perdida} maxLength={500} />
          </FormGrid>
        </FormSection>

        <FormSection title="Redes sociales y notas" description="Usa redes para investigar antes de llamar. No guardes aquí copy de campaña.">
          <FormGrid columns={3}>
            <TextField id="facebook_url" name="facebook_url" label="Facebook" value={form.facebook_url} onChange={handleChange} placeholder="facebook.com/eleam" error={errors.facebook_url} maxLength={500} />
            <TextField id="instagram_url" name="instagram_url" label="Instagram" value={form.instagram_url} onChange={handleChange} placeholder="instagram.com/eleam" error={errors.instagram_url} maxLength={500} />
            <TextField id="tiktok_url" name="tiktok_url" label="TikTok" value={form.tiktok_url} onChange={handleChange} placeholder="tiktok.com/@eleam" error={errors.tiktok_url} maxLength={500} />
          </FormGrid>
          <div className="mt-4">
            <TextareaField id="notas" name="notas" label="Notas internas" value={form.notas} onChange={handleChange} placeholder="Contexto de investigación, objeciones, influenciadores, acuerdos de próxima llamada..." rows={4} maxLength={3000} error={errors.notas} />
          </div>
        </FormSection>

        <FormSection title="Objeciones frecuentes" description="Guía rápida para preparar llamada o seguimiento.">
          <div className="grid gap-2 md:grid-cols-2">
            {OBJECTION_LIBRARY.slice(0, 6).map((item) => (
              <div key={item.objection} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-800">{item.objection}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.response}</p>
              </div>
            ))}
          </div>
        </FormSection>

        <SubmitBar submitLabel={isEditing ? "Guardar cambios" : "Crear prospecto"} busy={saving} onCancel={onClose} />
      </form>
    </Modal>
  );
}
