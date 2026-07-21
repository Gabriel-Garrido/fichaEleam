import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createObservation } from "./observationsService";
import { getResidents } from "../residents/residentService";
import { isValidUUID } from "../../utils/validators";
import {
  scrollToFirstError,
  setFieldErrorCleared,
  userFacingFormError,
} from "../../utils/formValidation";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import { shouldSuggestAdverseEventForObservation } from "../adverseEvents/eventosAdversosUtils";
import {
  CheckboxField,
  ErrorSummary,
  FieldGroup,
  FormGrid,
  FormHeader,
  FormPage,
  FormSection,
  Notice,
  SelectField,
  SubmitBar,
  TextareaField,
  TextField,
} from "../../components/forms/FormKit";
import { currentTurno } from "../carePlans/carePlansService";
import {
  OBSERVATION_TURNS,
  validateObservationForm,
} from "./observationFormSchema";
import ObservationTypePicker from "./ObservationTypePicker";

function dateFromDateTime(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

function defaultFollowUp(fechaHora, turno) {
  const baseDate = dateFromDateTime(fechaHora);
  const base = new Date(`${baseDate}T12:00:00`);
  if (turno === "mañana") return { fecha: baseDate, turno: "tarde" };
  if (turno === "tarde") return { fecha: baseDate, turno: "noche" };
  base.setDate(base.getDate() + 1);
  return { fecha: base.toISOString().slice(0, 10), turno: "mañana" };
}

function ObservationForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can, isAdminEleam } = useAuth();
  const canCreateAdverseEvent = isAdminEleam || can("crear_eventos_adversos");
  const [searchParams] = useSearchParams();
  const rawId = searchParams.get("residenteId");
  const preselectedId = rawId && isValidUUID(rawId) ? rawId : null;

  const [form, setForm] = useState({
    residente_id: preselectedId ?? "",
    fecha_hora: new Date().toISOString().slice(0, 16),
    turno: currentTurno(),
    tipo: "observacion_general",
    descripcion: "",
    acciones_tomadas: "",
    requiere_seguimiento: false,
    seguimiento_fecha: "",
    seguimiento_turno: "",
  });
  const [residents, setResidents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingRes, setLoadingRes] = useState(true);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    getResidents("activo")
      .then(setResidents)
      .catch(() => setResidents([]))
      .finally(() => setLoadingRes(false));
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFieldErrorCleared(setFieldErrors, name);

    setForm((prev) => {
      if (name === "requiere_seguimiento") {
        if (!checked) {
          return { ...prev, requiere_seguimiento: false, seguimiento_fecha: "", seguimiento_turno: "" };
        }
        const next = defaultFollowUp(prev.fecha_hora, prev.turno);
        return {
          ...prev,
          requiere_seguimiento: true,
          seguimiento_fecha: prev.seguimiento_fecha || next.fecha,
          seguimiento_turno: prev.seguimiento_turno || next.turno,
        };
      }

      const nextForm = { ...prev, [name]: type === "checkbox" ? checked : value };
      if ((name === "fecha_hora" || name === "turno") && prev.requiere_seguimiento) {
        const next = defaultFollowUp(
          name === "fecha_hora" ? value : prev.fecha_hora,
          name === "turno" ? value : prev.turno
        );
        nextForm.seguimiento_fecha = next.fecha;
        nextForm.seguimiento_turno = next.turno;
      }
      return nextForm;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const result = validateObservationForm(form);
    setFieldErrors(result.errors);
    if (!result.ok) {
      scrollToFirstError(result.errors);
      return;
    }

    setSaving(true);
    try {
      await createObservation(result.data);
      toast("Observación guardada correctamente.", "success");
      navigate(preselectedId ? `/residents/${preselectedId}` : "/observations");
    } catch (err) {
      const message = userFacingFormError(err, "No se pudo guardar la observación. Revisa los datos e intenta nuevamente.");
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingRes) {
    return (
      <FormPage size="md" className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </FormPage>
    );
  }

  const noActiveResidents = residents.length === 0;
  const residentOptions = residents.map((resident) => [resident.id, `${resident.apellido}, ${resident.nombre}`]);

  return (
    <FormPage size="md" coachFeatureId="observations-new">
      <FormHeader
        eyebrow="Observaciones"
        title="Nueva observación"
        description="Registra el hecho clínico u operativo y deja claro si el equipo debe realizar un seguimiento."
        onBack={() => navigate(-1)}
      />

      <div className="space-y-4">
        {error && <Notice tone="rose">{error}</Notice>}

        {noActiveResidents && (
          <Notice
            tone="amber"
            title="No hay residentes activos para registrar observaciones"
            action={(
              <Button
                type="button"
                onClick={() => navigate("/residents/new")}
                className="border border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
              >
                Agregar residente
              </Button>
            )}
          >
            Primero agrega un residente activo para asociar el registro de turno.
          </Notice>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <ErrorSummary errors={fieldErrors} />

          <FormSection
            title="Contexto del registro"
            description="Estos datos ubican la observación en la ficha, turno y trazabilidad clínica."
          >
            <FormGrid>
              <SelectField
                id="residente_id"
                name="residente_id"
                label="Residente"
                required
                value={form.residente_id}
                onChange={handleChange}
                options={residentOptions}
                error={fieldErrors.residente_id}
                disabled={noActiveResidents}
                className="sm:col-span-2"
              />
              <TextField
                id="fecha_hora"
                name="fecha_hora"
                type="datetime-local"
                label="Fecha y hora"
                required
                value={form.fecha_hora}
                onChange={handleChange}
                error={fieldErrors.fecha_hora}
              />
              <SelectField
                id="turno"
                name="turno"
                label="Turno"
                required
                value={form.turno}
                onChange={handleChange}
                options={OBSERVATION_TURNS}
                error={fieldErrors.turno}
                placeholder={null}
              />
            </FormGrid>
            <div className="mt-4">
              <ObservationTypePicker
                value={form.tipo}
                onChange={handleChange}
                error={fieldErrors.tipo}
              />
            </div>
            {shouldSuggestAdverseEventForObservation(form.tipo) && canCreateAdverseEvent && (
              <Notice
                tone="teal"
                title="¿Es un evento adverso reglamentario?"
                action={
                  <Button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (form.residente_id) params.set("residenteId", form.residente_id);
                      const cat = form.tipo === "caida" ? "caida_sin_lesion" : "otro";
                      params.set("categoria", cat);
                      navigate(`/eventos-adversos/nuevo?${params.toString()}`);
                    }}
                    className="border border-teal-300 bg-white text-teal-700 hover:bg-teal-100 text-sm"
                  >
                    Registrar evento adverso →
                  </Button>
                }
              >
                Caídas e incidentes serios suelen requerir un registro reglamentario con severidad, acciones inmediatas y trazabilidad de comunicación con la familia. Puedes crear el evento adverso y vincularlo a esta observación.
              </Notice>
            )}
          </FormSection>

          <FormSection
            title="Detalle del registro"
            description="Escribe solo la información necesaria para que el siguiente turno comprenda lo ocurrido y pueda actuar."
          >
            <div className="space-y-4">
              <TextareaField
                id="descripcion"
                name="descripcion"
                label="Descripción"
                required
                value={form.descripcion}
                onChange={handleChange}
                error={fieldErrors.descripcion}
                maxLength={2000}
                rows={4}
                placeholder="Describe lo observado, hora aproximada, contexto y condición del residente."
              />
              <TextareaField
                id="acciones_tomadas"
                name="acciones_tomadas"
                label="Acciones tomadas"
                value={form.acciones_tomadas}
                onChange={handleChange}
                error={fieldErrors.acciones_tomadas}
                maxLength={1000}
                rows={3}
                placeholder="Indica intervenciones realizadas, avisos, derivaciones o controles posteriores."
              />
            </div>
          </FormSection>

          <FieldGroup tone="amber">
            <CheckboxField
              id="requiere_seguimiento"
              name="requiere_seguimiento"
              label="Crear seguimiento pendiente"
              description="Úsalo cuando el equipo deba revisar evolución, respuesta a una intervención o un pendiente en otro turno."
              checked={form.requiere_seguimiento}
              onChange={handleChange}
            />
            {form.requiere_seguimiento && (
              <FormGrid className="mt-4">
                <TextField
                  id="seguimiento_fecha"
                  name="seguimiento_fecha"
                  type="date"
                  label="Fecha del seguimiento"
                  required
                  value={form.seguimiento_fecha}
                  onChange={handleChange}
                  error={fieldErrors.seguimiento_fecha}
                />
                <SelectField
                  id="seguimiento_turno"
                  name="seguimiento_turno"
                  label="Turno del seguimiento"
                  required
                  value={form.seguimiento_turno}
                  onChange={handleChange}
                  options={OBSERVATION_TURNS}
                  error={fieldErrors.seguimiento_turno}
                />
                <p className="text-xs leading-5 text-amber-800 sm:col-span-2">
                  La observación quedará pendiente hasta que el equipo resuelva, continúe o cancele el seguimiento.
                </p>
              </FormGrid>
            )}
          </FieldGroup>

          <SubmitBar
            onCancel={() => navigate(-1)}
            submitLabel="Guardar observación"
            busy={saving}
            disabled={noActiveResidents}
            helperText="Los campos con * son obligatorios."
          />
        </form>
      </div>
    </FormPage>
  );
}

export default ObservationForm;
