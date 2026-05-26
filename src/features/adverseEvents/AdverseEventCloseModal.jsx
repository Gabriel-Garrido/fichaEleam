import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import {
  ErrorSummary,
  Notice,
  TextareaField,
} from "../../components/forms/FormKit";
import { useToast } from "../../components/Toast";
import { userFacingFormError } from "../../utils/formValidation";
import {
  ADVERSE_EVENT_CLOSE_EMPTY,
  validateAdverseEventCloseForm,
} from "./eventosAdversosFormSchema";
import { closeAdverseEvent } from "./eventosAdversosService";

export default function AdverseEventCloseModal({ isOpen, eventId, eleamId, onClose, onClosed }) {
  const toast = useToast();
  const [form, setForm] = useState(ADVERSE_EVENT_CLOSE_EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(ADVERSE_EVENT_CLOSE_EMPTY);
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = validateAdverseEventCloseForm(form);
    if (!result.ok) { setErrors(result.errors); return; }
    setSaving(true);
    try {
      const closed = await closeAdverseEvent(eventId, result.data.conclusiones, { eleamId });
      toast("Evento cerrado correctamente.", "success");
      onClosed?.(closed);
      onClose?.();
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo cerrar el evento."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title="Cerrar evento adverso">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <ErrorSummary errors={errors} />
        <Notice tone="amber" title="¿Listo para cerrar?">
          Al cerrar, el evento queda como referencia histórica. Si necesitas reabrirlo después, podrás hacerlo desde el detalle.
        </Notice>
        <TextareaField
          id="conclusiones" name="conclusiones" label="Conclusiones y aprendizajes" required
          value={form.conclusiones} onChange={(e) => setForm({ conclusiones: e.target.value })}
          error={errors.conclusiones}
          rows={5} maxLength={2000}
          placeholder="Resumen del proceso, medidas correctivas tomadas, aprendizajes para evitar que se repita..."
          hint="Mínimo 10 caracteres. Esto se guarda en el registro y en la timeline."
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose} disabled={saving} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60">
            {saving ? "Cerrando..." : "Cerrar evento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
