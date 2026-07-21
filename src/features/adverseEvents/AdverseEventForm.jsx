import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageLayout from "../../layout/PageLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import {
  CheckboxField,
  ErrorSummary,
  FormGrid,
  FormSection,
  Notice,
  SelectField,
  TextField,
  TextareaField,
} from "../../components/forms/FormKit";
import { scrollToFirstError, userFacingFormError } from "../../utils/formValidation";
import { isValidUUID } from "../../utils/validators";
import { getResidents } from "../residents/residentService";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  ESTADOS,
  MEDIO_NOTIFICACION_LABEL,
  MEDIOS_NOTIFICACION_FAMILIA,
  SEVERIDADES,
  SEVERIDAD_LABEL,
  TURNOS,
  suggestSeverityFromCategory,
} from "./eventosAdversosUtils";
import {
  ADVERSE_EVENT_EMPTY,
  validateAdverseEventForm,
} from "./eventosAdversosFormSchema";
import {
  createAdverseEvent,
  getAdverseEvent,
  updateAdverseEvent,
} from "./eventosAdversosService";

const CATEGORIA_OPTIONS = CATEGORIAS.map((c) => [c, CATEGORIA_LABEL[c]]);
const SEVERIDAD_OPTIONS = SEVERIDADES.map((s) => [s, SEVERIDAD_LABEL[s]]);
const ESTADO_OPTIONS = ESTADOS.map((e) => [e, ESTADO_LABEL[e]]);
const TURNO_OPTIONS = TURNOS.map((t) => [t, t[0].toUpperCase() + t.slice(1)]);
const MEDIO_OPTIONS = MEDIOS_NOTIFICACION_FAMILIA.map((m) => [m, MEDIO_NOTIFICACION_LABEL[m]]);

function eventToForm(event) {
  if (!event) return ADVERSE_EVENT_EMPTY;
  return {
    residente_id: event.residente_id ?? "",
    observacion_id: event.observacion_id ?? "",
    fecha_evento: event.fecha_evento ?? new Date().toISOString().slice(0, 10),
    hora_evento: event.hora_evento ? String(event.hora_evento).slice(0, 5) : "",
    turno: event.turno ?? "",
    lugar: event.lugar ?? "",
    categoria: event.categoria ?? "",
    severidad: event.severidad ?? "leve",
    descripcion: event.descripcion ?? "",
    causas_probables: event.causas_probables ?? "",
    acciones_inmediatas: event.acciones_inmediatas ?? "",
    testigos: event.testigos ?? "",
    estado: event.estado ?? "registrado",
    requiere_seguimiento: event.requiere_seguimiento ?? true,
    fecha_compromiso_cierre: event.fecha_compromiso_cierre ?? "",
    notificado_familia: event.notificado_familia ?? false,
    fecha_notificacion_familia: event.fecha_notificacion_familia
      ? String(event.fecha_notificacion_familia).slice(0, 16).replace("T", "T")
      : "",
    medio_notificacion_familia: event.medio_notificacion_familia ?? "",
  };
}

export default function AdverseEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { eleam, can, isAdminEleam } = useAuth();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(ADVERSE_EVENT_EMPTY);
  const [errors, setErrors] = useState({});
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const canCreate = isAdminEleam || can("crear_eventos_adversos");
  const canEdit = isAdminEleam || can("editar_eventos_adversos");

  useEffect(() => {
    getResidents()
      .then(setResidents)
      .catch(() => setResidents([]));
  }, []);

  // Carga inicial: edición o precargado desde observación.
  useEffect(() => {
    let cancelled = false;
    if (isEditing) {
      if (!isValidUUID(id)) {
        toast("ID de evento inválido.", "error");
        navigate("/eventos-adversos");
        return;
      }
      setLoading(true);
      getAdverseEvent(id)
        .then((event) => { if (!cancelled) setForm(eventToForm(event)); })
        .catch((e) => toast(userFacingFormError(e, "No se pudo cargar el evento."), "error"))
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      // Modo creación: lee residenteId / observacionId del URL para precarga.
      const preRes = searchParams.get("residenteId");
      const preObs = searchParams.get("observacionId");
      const preCat = searchParams.get("categoria");
      setForm((prev) => ({
        ...prev,
        residente_id: preRes && isValidUUID(preRes) ? preRes : "",
        observacion_id: preObs && isValidUUID(preObs) ? preObs : "",
        categoria: preCat && CATEGORIAS.includes(preCat) ? preCat : "",
      }));
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };
      // Si cambia la categoría y no se ha tocado severidad, sugerir.
      if (name === "categoria" && value && !prev.severidad) {
        next.severidad = suggestSeverityFromCategory(value);
      }
      // Si desactiva notificado_familia, limpiar medio/fecha.
      if (name === "notificado_familia" && !checked) {
        next.medio_notificacion_familia = "";
        next.fecha_notificacion_familia = "";
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eleam?.id) { toast("No se pudo obtener el ELEAM.", "error"); return; }
    const allowed = isEditing ? canEdit : canCreate;
    if (!allowed) { toast("No tienes permiso para esta acción.", "error"); return; }

    const result = validateAdverseEventForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      scrollToFirstError(result.errors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...result.data,
        // Mapear vacíos a null para que la DB no rompa con check constraints.
        fecha_compromiso_cierre: result.data.fecha_compromiso_cierre || null,
        fecha_notificacion_familia: result.data.fecha_notificacion_familia
          ? new Date(result.data.fecha_notificacion_familia).toISOString()
          : null,
        hora_evento: result.data.hora_evento || null,
      };
      const saved = isEditing
        ? await updateAdverseEvent(id, payload, { eleamId: eleam.id })
        : await createAdverseEvent(payload, { eleamId: eleam.id });
      toast(isEditing ? "Evento actualizado." : "Evento adverso registrado.", "success");
      navigate(`/eventos-adversos/${saved.id}`);
    } catch (err) {
      toast(userFacingFormError(err, "No se pudo guardar el evento."), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando evento adverso..." />;

  return (
    <PageLayout
      coachFeatureId={isEditing ? "adverse-events-edit" : "adverse-events-new"}
      eyebrow="Eventos adversos"
      title={isEditing ? "Editar evento adverso" : "Registrar evento adverso"}
      onBack={() => navigate(isEditing ? `/eventos-adversos/${id}` : "/eventos-adversos")}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorSummary errors={errors} />

        <FormSection title="¿Qué pasó?" description="Describe el evento con suficiente detalle para que el equipo pueda reaccionar y dejar trazabilidad reglamentaria.">
          <FormGrid columns={2}>
            <SelectField
              id="categoria" name="categoria" label="Categoría" required
              value={form.categoria} onChange={handleChange}
              options={CATEGORIA_OPTIONS} error={errors.categoria}
              placeholder="Selecciona categoría"
            />
            <SelectField
              id="severidad" name="severidad" label="Severidad" required
              value={form.severidad} onChange={handleChange}
              options={SEVERIDAD_OPTIONS} error={errors.severidad}
              placeholder={null}
            />
            <TextField
              id="fecha_evento" name="fecha_evento" type="date" label="Fecha del evento" required
              value={form.fecha_evento} onChange={handleChange} error={errors.fecha_evento}
            />
            <TextField
              id="hora_evento" name="hora_evento" type="time" label="Hora aproximada"
              value={form.hora_evento} onChange={handleChange} error={errors.hora_evento}
              hint="Opcional. Si no la sabes con certeza, déjala vacía."
            />
            <SelectField
              id="turno" name="turno" label="Turno"
              value={form.turno} onChange={handleChange}
              options={TURNO_OPTIONS} error={errors.turno}
              placeholder="Sin definir"
            />
            <TextField
              id="lugar" name="lugar" label="Lugar"
              value={form.lugar} onChange={handleChange} error={errors.lugar}
              placeholder="Habitación 3, baño común, comedor..."
              maxLength={200}
            />
            <SelectField
              id="residente_id" name="residente_id" label="Residente involucrado"
              value={form.residente_id} onChange={handleChange}
              options={residents.map((r) => [r.id, `${r.apellido}, ${r.nombre}`])}
              error={errors.residente_id}
              placeholder="Sin residente (evento institucional)"
              hint="Si afecta a varios o es institucional (ej: simulacro), déjalo vacío."
            />
            <SelectField
              id="estado" name="estado" label="Estado" required
              value={form.estado} onChange={handleChange}
              options={ESTADO_OPTIONS} error={errors.estado}
              placeholder={null}
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Hecho clínico" description="Mínimo 10 caracteres en la descripción. Incluye lo que viste, oíste y cómo encontraste al residente.">
          <div className="space-y-4">
            <TextareaField
              id="descripcion" name="descripcion" label="Descripción del evento" required
              value={form.descripcion} onChange={handleChange} error={errors.descripcion}
              maxLength={4000} rows={4}
              placeholder="Cómo, cuándo y dónde ocurrió, con qué condiciones..."
            />
            <TextareaField
              id="causas_probables" name="causas_probables" label="Causas probables"
              value={form.causas_probables} onChange={handleChange} error={errors.causas_probables}
              maxLength={2000} rows={3}
              placeholder="Factores que pudieron haber contribuido (piso mojado, mareo, error de etiquetado...)."
            />
            <TextareaField
              id="acciones_inmediatas" name="acciones_inmediatas" label="Acciones inmediatas"
              value={form.acciones_inmediatas} onChange={handleChange} error={errors.acciones_inmediatas}
              maxLength={2000} rows={3}
              placeholder="Qué se hizo en el momento (asistencia, evaluación, derivación...)."
            />
            <TextField
              id="testigos" name="testigos" label="Testigos"
              value={form.testigos} onChange={handleChange} error={errors.testigos}
              maxLength={500}
              placeholder="Nombres del personal o residentes que presenciaron el evento."
            />
          </div>
        </FormSection>

        <FormSection title="Seguimiento" description="Define si requiere seguimiento del equipo y la fecha límite de cierre.">
          <FormGrid columns={2}>
            <CheckboxField
              id="requiere_seguimiento" name="requiere_seguimiento"
              checked={form.requiere_seguimiento} onChange={handleChange}
              label="Requiere seguimiento del equipo"
              description="Aparecerá en la lista de pendientes hasta que se cierre o cancele."
            />
            <TextField
              id="fecha_compromiso_cierre" name="fecha_compromiso_cierre" type="date" label="Fecha compromiso de cierre"
              value={form.fecha_compromiso_cierre} onChange={handleChange}
              error={errors.fecha_compromiso_cierre}
              hint="Opcional. Cuándo el equipo se compromete a resolver este evento."
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Comunicación con la familia" description="Documentación de contacto (no envía notificaciones).">
          <div className="space-y-4">
            <CheckboxField
              id="notificado_familia" name="notificado_familia"
              checked={form.notificado_familia} onChange={handleChange}
              label="Se contactó a la familia"
              description="Marca cuando ya conversaste con la familia. No envía nada — es solo registro."
            />
            {form.notificado_familia && (
              <FormGrid columns={2}>
                <SelectField
                  id="medio_notificacion_familia" name="medio_notificacion_familia" label="Medio utilizado"
                  value={form.medio_notificacion_familia} onChange={handleChange}
                  options={MEDIO_OPTIONS}
                  error={errors.medio_notificacion_familia}
                  required
                  placeholder="Selecciona medio"
                />
                <TextField
                  id="fecha_notificacion_familia" name="fecha_notificacion_familia" type="datetime-local" label="Fecha y hora"
                  value={form.fecha_notificacion_familia} onChange={handleChange}
                  error={errors.fecha_notificacion_familia}
                />
              </FormGrid>
            )}
          </div>
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={() => navigate(isEditing ? `/eventos-adversos/${id}` : "/eventos-adversos")}
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Registrar evento"}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
