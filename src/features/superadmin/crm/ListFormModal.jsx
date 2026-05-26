import { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import { TextField, TextareaField, SubmitBar, ErrorSummary } from "../../../components/forms/FormKit";
import { useToast } from "../../../components/Toast";
import { applyPostgresErrorToForm, scrollToFirstError } from "../../../utils/formValidation";
import {
  PROSPECT_LIST_EMPTY,
  validateProspectListForm,
} from "../crmEmailFormSchema";
import { createProspectList, updateProspectList } from "../crmEmailService";

const LIST_DB_FIELD_MAP = {
  nombre: { field: "nombre", message: "El nombre de la lista no tiene el formato permitido (máximo 120 caracteres)." },
  descripcion: { field: "descripcion", message: "La descripción no tiene el formato permitido (máximo 500 caracteres)." },
  origen: { field: null, message: "El origen no es uno de los valores permitidos." },
};

export default function ListFormModal({ isOpen, list, onClose, onSaved }) {
  const isEditing = Boolean(list?.id);
  const toast = useToast();
  const [form, setForm] = useState(PROSPECT_LIST_EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm(list ? { nombre: list.nombre ?? "", descripcion: list.descripcion ?? "" } : PROSPECT_LIST_EMPTY);
  }, [isOpen, list]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name] && !prev._form) return prev;
      const next = { ...prev };
      delete next[name];
      delete next._form;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = validateProspectListForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      scrollToFirstError(result.errors);
      return;
    }
    setSaving(true);
    try {
      const saved = isEditing
        ? await updateProspectList(list.id, result.data)
        : await createProspectList(result.data);
      toast(isEditing ? "Lista actualizada." : "Lista creada.", "success");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const applied = applyPostgresErrorToForm(err, setErrors, {
        fieldMap: LIST_DB_FIELD_MAP,
        fallback: "No se pudo guardar la lista.",
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

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title={isEditing ? "Editar lista" : "Nueva lista de prospectos"}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorSummary errors={errors} />
        <TextField
          id="list_nombre"
          name="nombre"
          label="Nombre de la lista"
          required
          value={form.nombre}
          onChange={handleChange}
          placeholder="Prospección abril 2026"
          error={errors.nombre}
          maxLength={120}
        />
        <TextareaField
          id="list_descripcion"
          name="descripcion"
          label="Descripción"
          value={form.descripcion}
          onChange={handleChange}
          placeholder="Cohorte, comuna, fuente de los datos..."
          rows={3}
          maxLength={500}
          error={errors.descripcion}
        />
        <SubmitBar
          submitLabel={isEditing ? "Guardar cambios" : "Crear lista"}
          busy={saving}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}
