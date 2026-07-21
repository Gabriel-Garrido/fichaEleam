import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createResident, getResidentById, getResidentQuotaUsage, updateResident } from "./residentService";
import { RESIDENT_EMPTY, GRUPOS_SANGUINEOS, residentToForm, validateResidentForm } from "./residentFormSchema";
import { formatRut, isValidUUID } from "../../utils/validators";
import { friendlyError } from "../../utils/errorMessages";
import { scrollToFirstError } from "../../utils/formValidation";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";
import { FeatureCoach } from "../featureCoach";
import { CheckboxField, ErrorSummary, FormSection, SelectField, SubmitBar, TextareaField, TextField } from "../../components/forms/FormKit";
import { resolveHospitalizationBed } from "../beds/bedsService";
import { getEffectivePlanLimits, isResidentInPlanQuota } from "../payment/planCatalog";

const OPTIONS = {
  sexo: [["", "Seleccionar"], ["masculino", "Masculino"], ["femenino", "Femenino"], ["otro", "Otro"]],
  estadoCivil: [["", "Seleccionar"], ["soltero", "Soltero/a"], ["casado", "Casado/a"], ["viudo", "Viudo/a"], ["divorciado", "Divorciado/a"], ["otro", "Otro"]],
  estadoCreate: [["activo", "Activo"], ["hospitalizado", "Hospitalizado"]],
  estadoEdit: [["activo", "Activo"], ["hospitalizado", "Hospitalizado"], ["egresado", "Egresado"], ["fallecido", "Fallecido"]],
  dependencia: [["", "Sin clasificar"], ["autovalente", "Autovalente"], ["leve", "Dependencia leve"], ["moderado", "Dependencia moderada"], ["severo", "Dependencia severa"], ["total", "Dependencia total"]],
};

const Icon = ({ type }) => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={type === "health" ? "M21 8.25c0-2.49-2.1-4.5-4.69-4.5-1.93 0-3.6 1.13-4.31 2.73-.72-1.6-2.38-2.73-4.31-2.73C5.1 3.75 3 5.76 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" : type === "calendar" ? "M6.75 3v2.25m10.5-2.25v2.25M3.75 9h16.5M5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25Z" : "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.65Z"} />
  </svg>
);

export default function ResidentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { eleam, can } = useAuth();
  const isEditing = Boolean(id);
  const [form, setForm] = useState(RESIDENT_EMPTY);
  const [original, setOriginal] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [hospitalDecision, setHospitalDecision] = useState(null);
  const [created, setCreated] = useState(null);
  const { maxResidents } = getEffectivePlanLimits(eleam);
  const canSubmit = isEditing ? can("editar_residentes") : can("crear_residentes");
  const showEgreso = ["egresado", "fallecido"].includes(form.estado);

  useEffect(() => {
    if (!canSubmit) {
      toast("No tienes permiso para realizar esta acción.", "error");
      navigate("/residents", { replace: true });
    }
  }, [canSubmit, navigate, toast]);

  useEffect(() => {
    if (!isEditing || !canSubmit) return;
    if (!isValidUUID(id)) {
      toast("ID de residente inválido.", "error");
      navigate("/residents", { replace: true });
      return;
    }
    getResidentById(id)
      .then((resident) => { setOriginal(resident); setForm(residentToForm(resident)); })
      .catch((error) => toast(friendlyError(error, "No se pudo cargar el residente."), "error"))
      .finally(() => setLoading(false));
  }, [canSubmit, id, isEditing, navigate, toast]);

  const clearError = useCallback((field) => setErrors((current) => {
    const next = { ...current };
    delete next[field];
    return next;
  }), []);

  const change = useCallback((event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    clearError(name);
  }, [clearError]);

  const changeBoolean = useCallback((event) => {
    const { name, checked } = event.target;
    setForm((current) => ({ ...current, [name]: checked }));
    clearError(name);
  }, [clearError]);

  const saveEdit = async (payload, bedAction = null) => {
    setSaving(true);
    try {
      await updateResident(id, payload);
      if (bedAction) await resolveHospitalizationBed(id, bedAction, null);
      toast("Residente actualizado.", "success");
      navigate(`/residents/${id}`);
    } catch (error) {
      toast(friendlyError(error, "No se pudo guardar el residente."), "error");
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const result = validateResidentForm(form, { isEditing });
    setErrors(result.errors);
    if (!result.ok) { scrollToFirstError(result.errors); return; }

    setSaving(true);
    try {
      if (maxResidents !== null && isResidentInPlanQuota(result.data)) {
        const used = await getResidentQuotaUsage(isEditing ? id : null);
        if (used >= maxResidents) {
          toast(`El plan permite máximo ${maxResidents} residentes activos u hospitalizados.`, "error");
          return;
        }
      }

      if (isEditing) {
        const needsBedDecision = original?.estado !== "hospitalizado" && result.data.estado === "hospitalizado" && Boolean(original?.cama_actual_id);
        if (needsBedDecision) {
          if (!can("asignar_camas")) { toast("No tienes permiso para modificar la cama.", "error"); return; }
          setHospitalDecision(result.data);
          return;
        }
        await saveEdit(result.data);
      } else {
        const resident = await createResident(result.data);
        setCreated(resident);
        toast("Residente creado.", "success");
      }
    } catch (error) {
      toast(error?.code === "23505" ? "Ya existe un residente con ese RUT." : friendlyError(error, "No se pudo guardar el residente."), "error");
    } finally {
      setSaving(false);
    }
  };

  const errorCount = useMemo(() => Object.keys(errors).length, [errors]);
  if (!canSubmit) return null;
  if (loading) return <Loading message="Cargando residente..." />;

  if (created) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-3xl border border-emerald-100 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <h1 className="mt-4 text-xl font-bold text-slate-950">Residente creado</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">La carpeta de {created.nombre} {created.apellido} está lista. Continúa con ingreso DS20, evaluaciones y plan de cuidado.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2"><Button onClick={() => navigate("/establecimiento/camas")} className="border border-slate-200 bg-white text-slate-700">Asignar cama</Button><Button onClick={() => navigate(`/residents/${created.id}?tab=ds20`)} className="bg-teal-700 text-white">Completar ingreso DS20</Button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <FeatureCoach featureId={isEditing ? "residents-edit" : "residents-new"} standalone />
      <button type="button" onClick={() => navigate(-1)} className="mb-4 text-sm font-semibold text-teal-700 hover:underline">← Volver</button>
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Residentes</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">{isEditing ? "Editar residente" : "Nuevo residente"}</h1><p className="mt-2 text-sm text-slate-600">Solo pedimos la información necesaria para crear la carpeta personal. El resto se completa desde su ficha.</p></div>

      <form onSubmit={submit} noValidate className="space-y-4">
        {errorCount > 0 && <ErrorSummary errors={errors} />}
        <FormSection icon={<Icon />} title="Identificación" description="Solo los datos necesarios para reconocer a la persona.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="nombre" name="nombre" label="Nombre" required value={form.nombre} onChange={change} error={errors.nombre} maxLength={120} />
            <TextField id="apellido" name="apellido" label="Apellido" required value={form.apellido} onChange={change} error={errors.apellido} maxLength={120} />
            <TextField id="rut" name="rut" label="RUT" value={form.rut} onChange={change} onBlur={(event) => event.target.value.trim() && setForm((current) => ({ ...current, rut: formatRut(event.target.value) }))} error={errors.rut} placeholder="12.345.678-9" />
            <TextField id="fecha_nacimiento" name="fecha_nacimiento" type="date" label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={change} error={errors.fecha_nacimiento} />
            <SelectField id="sexo" name="sexo" label="Sexo" value={form.sexo} onChange={change} options={OPTIONS.sexo} error={errors.sexo} />
          </div>
          <details open={Boolean(errors.estado_civil || errors.nacionalidad || errors.prevision || errors.grupo_sanguineo || errors.direccion_anterior) || undefined} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Antecedentes administrativos opcionales</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField id="estado_civil" name="estado_civil" label="Estado civil" value={form.estado_civil} onChange={change} options={OPTIONS.estadoCivil} error={errors.estado_civil} />
              <TextField id="nacionalidad" name="nacionalidad" label="Nacionalidad" value={form.nacionalidad} onChange={change} error={errors.nacionalidad} />
              <TextField id="prevision" name="prevision" label="Previsión de salud" value={form.prevision} onChange={change} error={errors.prevision} placeholder="FONASA, ISAPRE..." />
              <SelectField id="grupo_sanguineo" name="grupo_sanguineo" label="Grupo sanguíneo" value={form.grupo_sanguineo} onChange={change} options={GRUPOS_SANGUINEOS} error={errors.grupo_sanguineo} />
              <div className="sm:col-span-2"><TextField id="direccion_anterior" name="direccion_anterior" label="Domicilio previo" value={form.direccion_anterior} onChange={change} error={errors.direccion_anterior} /></div>
            </div>
          </details>
        </FormSection>

        <FormSection icon={<Icon type="health" />} title="Antecedentes clínicos" description="Información inicial para orientar el cuidado.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><TextareaField id="diagnostico_principal" name="diagnostico_principal" label="Diagnóstico principal" value={form.diagnostico_principal} onChange={change} error={errors.diagnostico_principal} rows={3} /></div>
            <div className="sm:col-span-2"><TextField id="alergias" name="alergias" label="Alergias conocidas" value={form.alergias} onChange={change} error={errors.alergias} hint="Separa varias alergias con coma." /></div>
            <SelectField id="nivel_dependencia" name="nivel_dependencia" label="Nivel de dependencia" value={form.nivel_dependencia} onChange={change} options={OPTIONS.dependencia} error={errors.nivel_dependencia} hint="Puede quedar pendiente hasta aplicar la valoración." />
            <div className="sm:col-span-2"><CheckboxField id="condicion_salud_grave" name="condicion_salud_grave" label="Requiere revisión por condición de salud grave" checked={form.condicion_salud_grave} onChange={changeBoolean} error={errors.condicion_salud_grave} /></div>
            {form.condicion_salud_grave && <div className="sm:col-span-2"><TextareaField id="condicion_salud_grave_detalle" name="condicion_salud_grave_detalle" label="Detalle" value={form.condicion_salud_grave_detalle} onChange={change} error={errors.condicion_salud_grave_detalle} rows={3} /></div>}
          </div>
        </FormSection>

        <FormSection icon={<Icon type="calendar" />} title="Ingreso y estado" description="Fecha de ingreso y situación actual.">
          <div className="grid gap-4 sm:grid-cols-2"><TextField id="fecha_ingreso" name="fecha_ingreso" type="date" label="Fecha de ingreso" required value={form.fecha_ingreso} onChange={change} error={errors.fecha_ingreso} /><SelectField id="estado" name="estado" label="Estado" required value={form.estado} onChange={change} options={isEditing ? OPTIONS.estadoEdit : OPTIONS.estadoCreate} error={errors.estado} /></div>
          {isEditing && <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-slate-500">Ubicación actual</p><p className="mt-1 text-sm font-semibold text-slate-900">{form.cama_actual_id ? form.ubicacion_label : "Sin cama asignada"}</p></div><Button type="button" onClick={() => navigate("/establecimiento/camas")} className="border border-slate-200 bg-white text-slate-700">Gestionar cama</Button></div>}
          {showEgreso && <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2"><TextField id="fecha_egreso" name="fecha_egreso" type="date" label="Fecha de egreso" required value={form.fecha_egreso} onChange={change} error={errors.fecha_egreso} /><TextField id="motivo_egreso" name="motivo_egreso" label="Motivo" required value={form.motivo_egreso} onChange={change} error={errors.motivo_egreso} /></div>}
        </FormSection>

        <SubmitBar busy={saving} submitLabel={isEditing ? "Guardar cambios" : "Crear residente"} busyLabel="Guardando..." helperText={!isEditing ? "Luego completarás los antecedentes normativos desde la ficha." : null} onCancel={() => navigate(-1)} />
      </form>

      <Modal isOpen={Boolean(hospitalDecision)} title="¿Qué pasa con la cama asignada?" onClose={() => setHospitalDecision(null)}>
        <p className="text-sm leading-6 text-slate-600">Al pasar a hospitalización puedes reservar la cama para el residente o liberarla para otra persona.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button onClick={() => { const payload = hospitalDecision; setHospitalDecision(null); saveEdit(payload, "reservar"); }} className="border border-amber-200 bg-amber-50 text-amber-800">Reservar cama</Button><Button onClick={() => { const payload = hospitalDecision; setHospitalDecision(null); saveEdit(payload, "liberar"); }} className="bg-teal-700 text-white">Liberar cama</Button></div>
      </Modal>
    </div>
  );
}
