import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { CheckboxField, ErrorSummary, FormGrid, Notice, SelectField, SubmitBar, TextareaField, TextField } from "../../components/forms/FormKit";
import { useToast } from "../../components/Toast";
import { setFieldErrorCleared } from "../../utils/formValidation";
import { getResidentHealthNetwork, saveHealthControl } from "./ds20Service";
import {
  HEALTH_CONTROL_STATES,
  HEALTH_CONTROL_TYPES,
  HEALTH_CONTROL_TYPE_HELP,
  healthControlCopy,
  initialHealthControlForm,
  validateHealthControlForm,
} from "./healthControlForm";

export default function ResidentHealthControlModal({ resident, open, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initialHealthControlForm);
  const [network, setNetwork] = useState(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open || !resident?.id) return;
    let active = true;
    setForm(initialHealthControlForm());
    setFieldErrors({});
    setNetworkError(false);
    setNetworkLoading(true);
    getResidentHealthNetwork(resident.id)
      .then((data) => {
        if (!active) return;
        setNetwork(data);
        const linkedCenter = data?.centro?.nombre || "";
        if (linkedCenter) setForm((current) => ({ ...current, centro_atencion: current.centro_atencion || linkedCenter }));
      })
      .catch(() => {
        if (!active) return;
        setNetwork(null);
        setNetworkError(true);
      })
      .finally(() => { if (active) setNetworkLoading(false); });
    return () => { active = false; };
  }, [open, resident?.id]);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setFieldErrorCleared(setFieldErrors, name);
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "familia_informada" && !checked ? { coordinacion_familia: "" } : {}),
      ...(name === "tipo" && value !== "derivacion" && value !== "urgencia" ? { familia_informada: false, coordinacion_familia: "" } : {}),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateHealthControlForm(form);
    setFieldErrors(validation.errors);
    if (!validation.ok) return;
    setSaving(true);
    try {
      await saveHealthControl(resident.id, {
        ...validation.data,
        health_center_id: network?.health_center_id || null,
        fecha_realizada: validation.data.estado === "realizado" ? validation.data.fecha_programada : null,
      });
      toast("Atención guardada en el historial.", "success");
      await onSaved?.();
    } catch (error) {
      console.error(error);
      toast(error.message || "No se pudo guardar el control.", "error");
    } finally {
      setSaving(false);
    }
  };

  const centerName = network?.centro?.nombre || network?.sistema_salud;
  const copy = healthControlCopy(form);
  const completed = form.estado === "realizado";
  const showFamilyCoordination = form.tipo === "derivacion" || form.tipo === "urgencia";

  return (
    <Modal isOpen={open} onClose={saving ? undefined : onClose} title="Registrar control o derivación" panelClassName="max-w-2xl p-4 sm:p-6" closeOnBackdrop={!saving}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Notice tone={networkError ? "amber" : "teal"} title={`${resident?.nombre ?? ""} ${resident?.apellido ?? ""}`.trim()}>
          {networkLoading ? "Consultando red de salud…" : networkError ? "No pudimos consultar la red asociada. Puedes completar el registro indicando el centro de atención." : centerName ? `Red asociada: ${centerName}. Confirma abajo el lugar donde ocurrió esta atención.` : "Sin centro asociado. Indica dónde se realizó o realizará la atención; después podrás completar la red en Información general."}
        </Notice>
        <ErrorSummary errors={fieldErrors} />

        <FormGrid>
          <SelectField id="control_tipo" name="tipo" label="Qué necesitas registrar" required value={form.tipo} onChange={change} options={HEALTH_CONTROL_TYPES} placeholder={null} hint={HEALTH_CONTROL_TYPE_HELP[form.tipo]} />
          <SelectField id="control_estado" name="estado" label="Situación" required value={form.estado} onChange={change} options={HEALTH_CONTROL_STATES} placeholder={null} />
          <TextField id="control_fecha" name="fecha_programada" type="date" label={copy.dateLabel} required value={form.fecha_programada} onChange={change} error={fieldErrors.fecha_programada} />
          <TextField id="control_centro" name="centro_atencion" label="Centro o lugar de atención" required value={form.centro_atencion} onChange={change} error={fieldErrors.centro_atencion} placeholder="Ej.: CESFAM Los Aromos" />
          <TextField id="control_especialidad" name="especialidad" label="Atención o especialidad" value={form.especialidad} onChange={change} placeholder="Ej.: medicina general" />
        </FormGrid>

        <TextareaField id="control_motivo" name="motivo" label={copy.reasonLabel} required value={form.motivo} onChange={change} error={fieldErrors.motivo} rows={2} maxLength={1000} placeholder={copy.reasonPlaceholder} />

        {completed && (
          <>
            <FormGrid>
              <TextField id="control_profesional" name="profesional" label="Profesional que atendió" value={form.profesional} onChange={change} placeholder="Nombre, si se conoce" />
              <TextField id="control_acompanante" name="acompanante" label="Quién acompañó" value={form.acompanante} onChange={change} placeholder="Funcionario o familiar, si corresponde" />
            </FormGrid>
            <TextareaField id="control_resultado" name="resultado" label="Observaciones e indicaciones recibidas" required value={form.resultado} onChange={change} error={fieldErrors.resultado} rows={3} maxLength={2000} placeholder="Registra lo observado por el profesional, indicaciones, cambios de tratamiento y acciones que deben continuar." hint="Si no hubo indicaciones nuevas, déjalo expresamente registrado." />
            <TextField id="control_proximo" name="proximo_control" type="date" label="Próximo control" value={form.proximo_control} onChange={change} error={fieldErrors.proximo_control} hint="Opcional. Úsalo sólo si quedó indicada una nueva fecha." />
          </>
        )}

        {showFamilyCoordination && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <CheckboxField id="control_familia" name="familia_informada" label="Se coordinó con familia o persona significativa" description="Actívalo cuando la situación de salud requirió informar, solicitar acompañamiento o acordar acciones." checked={form.familia_informada} onChange={change} />
            {form.familia_informada && <TextareaField id="control_coordinacion" name="coordinacion_familia" label="Coordinación realizada" required value={form.coordinacion_familia} onChange={change} error={fieldErrors.coordinacion_familia} rows={2} maxLength={1000} placeholder="Indica con quién se habló, qué se informó y los acuerdos adoptados." className="mt-3" />}
          </div>
        )}

        {completed && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">Si recibiste una receta o cambió un medicamento, registra ese respaldo en <strong>Medicamentos</strong> para mantener la indicación y el stock actualizados.</p>}

        <SubmitBar onCancel={onClose} submitLabel="Guardar en historial" busy={saving} disabled={networkLoading} helperText="Guardará fecha, responsable, atención e indicaciones en el Historial del residente." />
      </form>
    </Modal>
  );
}
