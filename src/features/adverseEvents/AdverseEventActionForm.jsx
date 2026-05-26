import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import {
  ErrorSummary,
  SelectField,
  TextareaField,
} from "../../components/forms/FormKit";
import { useToast } from "../../components/Toast";
import { userFacingFormError } from "../../utils/formValidation";
import {
  ACCION_TIPO_LABEL,
  ACCION_TIPOS,
} from "./eventosAdversosUtils";
import {
  ADVERSE_EVENT_ACTION_EMPTY,
  validateAdverseEventActionForm,
} from "./eventosAdversosFormSchema";
import { addEventAction } from "./eventosAdversosService";

const TIPO_OPTIONS = ACCION_TIPOS.filter((t) => t !== "cierre" && t !== "reabertura")
  .map((t) => [t, ACCION_TIPO_LABEL[t]]);

export default function AdverseEventActionForm({ isOpen, eventId, eleamId, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(ADVERSE_EVENT_ACTION_EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(ADVERSE_EVENT_ACTION_EMPTY);
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev }; delete next[name]; return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = validateAdverseEventActionForm(form);
    if (!result.ok) { setErrors(result.errors); return; }
    setSaving(true);
    try {
      const action = await addEventAction(eventId, result.data, { eleamId });
      toast("Acción registrada.", "success");
      onCreated?.(action);
      onClose?.();
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo guardar la acción."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title="Agregar acción al evento">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <ErrorSummary errors={errors} />
        <SelectField
          id="tipo" name="tipo" label="Tipo de acción" required
          value={form.tipo} onChange={handleChange}
          options={TIPO_OPTIONS}
          placeholder={null}
          error={errors.tipo}
        />
        <TextareaField
          id="descripcion" name="descripcion" label="Descripción" required
          value={form.descripcion} onChange={handleChange}
          error={errors.descripcion}
          rows={4} maxLength={2000}
          placeholder="Qué se hizo, qué resultados se observaron, próximos pasos..."
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose} disabled={saving} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Agregar acción"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
