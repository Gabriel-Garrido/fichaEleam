import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createResident,
  getFamiliarForResidente,
  getResidentById,
  getResidentQuotaUsage,
  removeFamiliarLink,
  updateResident,
} from "./residentService";
import { createStaffUser } from "../team/teamService";
import { formatRut, isValidUUID } from "../../utils/validators";
import { friendlyError } from "../../utils/errorMessages";
import { scrollToFirstError } from "../../utils/formValidation";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";
import {
  ErrorSummary,
  FormSection,
  SelectField,
  SubmitBar,
  TextareaField,
  TextField,
} from "../../components/forms/FormKit";
import { resolveHospitalizationBed } from "../beds/bedsService";
import { getEffectivePlanLimits, isResidentInPlanQuota } from "../payment/planCatalog";
import {
  FAMILY_EMPTY,
  GRUPOS_SANGUINEOS,
  PARENTESCOS,
  RESIDENT_EMPTY,
  residentToForm,
  validateFamilyForm,
  validateResidentForm,
} from "./residentFormSchema";

const OPTIONS = {
  sexo: [["", "Seleccionar"], ["masculino", "Masculino"], ["femenino", "Femenino"], ["otro", "Otro"]],
  estadoCivil: [["", "Seleccionar"], ["soltero", "Soltero/a"], ["casado", "Casado/a"], ["viudo", "Viudo/a"], ["divorciado", "Divorciado/a"], ["otro", "Otro"]],
  dependencia: [
    ["", "Seleccionar"],
    ["leve", "Leve - apoyo ocasional"],
    ["moderado", "Moderado - apoyo parcial"],
    ["severo", "Severo - apoyo constante"],
    ["total", "Total - dependencia completa"],
  ],
  estadoCreate: [["activo", "Activo"], ["hospitalizado", "Hospitalizado"]],
  estadoEdit: [["activo", "Activo"], ["hospitalizado", "Hospitalizado"], ["egresado", "Egresado"], ["fallecido", "Fallecido"]],
};

const IconPerson = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.65Z" />
  </svg>
);

const IconHeart = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.49-2.1-4.5-4.69-4.5-1.93 0-3.6 1.13-4.31 2.73-.72-1.6-2.38-2.73-4.31-2.73C5.1 3.75 3 5.76 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
  </svg>
);

const IconCalendar = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25m10.5-2.25v2.25M3.75 9h16.5M5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25Z" />
  </svg>
);

const IconUsers = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.13a9.34 9.34 0 0 0 6.75-.58 4.13 4.13 0 0 0-7.53-2.5M15 19.13v.1A12.32 12.32 0 0 1 8.62 21a12.32 12.32 0 0 1-6.37-1.77v-.1a6.38 6.38 0 0 1 12.75 0ZM12 6.38a3.38 3.38 0 1 1-6.75 0 3.38 3.38 0 0 1 6.75 0Zm8.25 2.25a2.63 2.63 0 1 1-5.25 0 2.63 2.63 0 0 1 5.25 0Z" />
  </svg>
);

function firstLetter(value) {
  return (value || "?").trim().charAt(0).toUpperCase() || "?";
}

export default function ResidentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { eleam, can } = useAuth();
  const isEditing = Boolean(id);
  const { maxResidents } = getEffectivePlanLimits(eleam);

  const [form, setForm] = useState(RESIDENT_EMPTY);
  const [familyForm, setFamilyForm] = useState(FAMILY_EMPTY);
  const [errors, setErrors] = useState({});
  const [familyErrors, setFamilyErrors] = useState({});
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [savingFamily, setSavingFamily] = useState(false);
  const [originalResident, setOriginalResident] = useState(null);
  const [familiarActual, setFamiliarActual] = useState(null);
  const [familiarLoading, setFamiliarLoading] = useState(false);
  const [showFamilyEditor, setShowFamilyEditor] = useState(false);
  const [hospitalDecision, setHospitalDecision] = useState(null);
  const [createdFamily, setCreatedFamily] = useState(null);
  const [partialResident, setPartialResident] = useState(null);

  const isGmail = familyForm.email.trim().toLowerCase().endsWith("@gmail.com");
  const showEgreso = ["egresado", "fallecido"].includes(form.estado);

  const loadFamiliar = useCallback(async () => {
    if (!isEditing || !isValidUUID(id)) return;
    setFamiliarLoading(true);
    try {
      setFamiliarActual(await getFamiliarForResidente(id));
    } catch {
      setFamiliarActual(null);
    } finally {
      setFamiliarLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    if (!isValidUUID(id)) {
      toast("ID de residente inválido.", "error");
      navigate("/residents");
      return;
    }
    Promise.all([getResidentById(id), getFamiliarForResidente(id).catch(() => null)])
      .then(([resident, familiar]) => {
        setOriginalResident(resident);
        setForm(residentToForm(resident));
        setFamiliarActual(familiar ?? null);
      })
      .catch((err) => toast(friendlyError(err, "No se pudo cargar el residente."), "error"))
      .finally(() => setLoading(false));
  }, [id, isEditing, navigate, toast]);

  const clearError = useCallback((field) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearFamilyError = useCallback((field) => {
    setFamilyErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  }, [clearError]);

  const handleFamilyChange = useCallback((event) => {
    const { name, value } = event.target;
    setFamilyForm((prev) => ({ ...prev, [name]: value }));
    clearFamilyError(name);
  }, [clearFamilyError]);

  const handleRutBlur = useCallback((event) => {
    const value = event.target.value;
    if (!value.trim()) return;
    setForm((prev) => ({ ...prev, rut: formatRut(value) }));
  }, []);

  const validateAll = useCallback(() => {
    const residentResult = validateResidentForm(form, { isEditing });
    const nextErrors = residentResult.errors;
    setErrors(nextErrors);

    let familyResult = { ok: true, data: null, errors: {} };
    if (!isEditing) {
      familyResult = validateFamilyForm(familyForm);
      setFamilyErrors(familyResult.errors);
    }

    const merged = { ...nextErrors, ...Object.fromEntries(Object.entries(familyResult.errors).map(([key, value]) => [`family.${key}`, value])) };
    if (!residentResult.ok || !familyResult.ok) {
      scrollToFirstError(merged);
      return null;
    }

    return { resident: residentResult.data, family: familyResult.data };
  }, [familyForm, form, isEditing]);

  const createFamilyAccess = async (residentId, familyData = familyForm) => {
    const parsed = validateFamilyForm(familyData);
    if (!parsed.ok) {
      setFamilyErrors(parsed.errors);
      scrollToFirstError(Object.fromEntries(Object.entries(parsed.errors).map(([key, value]) => [`family.${key}`, value])));
      throw new Error("Revisa los datos del familiar.");
    }

    return createStaffUser({
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      telefono: parsed.data.telefono,
      parentesco: parsed.data.parentesco,
      rol: "familiar",
      residenteId: residentId,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = validateAll();
    if (!parsed) return;

    setSaving(true);
    try {
      if (maxResidents !== null && isResidentInPlanQuota(parsed.resident)) {
        const used = await getResidentQuotaUsage(isEditing ? id : null);
        if (used >= maxResidents) {
          toast(`El plan permite máximo ${maxResidents} residentes activos u hospitalizados. Egresa o actualiza el plan para continuar.`, "error");
          return;
        }
      }

      if (isEditing) {
        const mustResolve =
          originalResident?.estado !== "hospitalizado" &&
          parsed.resident.estado === "hospitalizado" &&
          Boolean(originalResident?.cama_actual_id);

        if (mustResolve) {
          if (!can("asignar_camas")) {
            toast("No tienes permiso para reservar o liberar camas.", "error");
            return;
          }
          setHospitalDecision({ payload: parsed.resident });
          return;
        }

        await saveEdited(parsed.resident);
        return;
      }

      const newResident = await createResident(parsed.resident);
      try {
        const result = await createFamilyAccess(newResident.id, parsed.family);
        setCreatedFamily({
          nombre: parsed.family.nombre,
          email: result.email ?? parsed.family.email,
          telefono: parsed.family.telefono,
          is_gmail: Boolean(result.is_gmail || result.google_only),
          email_sent: result.email_sent === true,
        });
      } catch (familyError) {
        setFamilyForm(parsed.family);
        setPartialResident({ resident: newResident, family: parsed.family, error: friendlyError(familyError, "No se pudo crear el acceso familiar.") });
        toast("Residente creado. Falta completar el acceso familiar.", "warning");
      }
    } catch (err) {
      toast(
        err?.code === "23505"
          ? "Ya existe un residente con ese RUT en este establecimiento."
          : friendlyError(err, "No se pudo guardar el residente."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  async function saveEdited(payload, hospitalAction = null) {
    setSaving(true);
    try {
      await updateResident(id, payload);
      if (hospitalAction) await resolveHospitalizationBed(id, hospitalAction, null);
      toast("Residente actualizado correctamente.", "success");
      navigate("/residents");
    } catch (err) {
      toast(friendlyError(err, "No se pudo guardar el residente."), "error");
    } finally {
      setSaving(false);
    }
  }

  const handleHospitalDecision = async (action) => {
    if (!hospitalDecision?.payload) return;
    const payload = hospitalDecision.payload;
    setHospitalDecision(null);
    await saveEdited(payload, action);
  };

  const handleRetryFamily = async () => {
    if (!partialResident?.resident?.id) return;
    setSavingFamily(true);
    try {
      const parsed = validateFamilyForm(familyForm);
      if (!parsed.ok) {
        setFamilyErrors(parsed.errors);
        scrollToFirstError(Object.fromEntries(Object.entries(parsed.errors).map(([key, value]) => [`family.${key}`, value])));
        return;
      }
      const result = await createFamilyAccess(partialResident.resident.id, parsed.data);
      setCreatedFamily({
        nombre: parsed.data.nombre,
        email: result.email ?? parsed.data.email,
        telefono: parsed.data.telefono,
        is_gmail: Boolean(result.is_gmail || result.google_only),
        email_sent: result.email_sent === true,
      });
      setPartialResident(null);
    } catch (err) {
      setPartialResident((prev) => ({ ...prev, error: friendlyError(err, "No se pudo crear el acceso familiar.") }));
    } finally {
      setSavingFamily(false);
    }
  };

  const handleSaveFamilyEdit = async () => {
    const parsed = validateFamilyForm(familyForm);
    if (!parsed.ok) {
      setFamilyErrors(parsed.errors);
      scrollToFirstError(Object.fromEntries(Object.entries(parsed.errors).map(([key, value]) => [`family.${key}`, value])));
      return;
    }
    setSavingFamily(true);
    try {
      if (familiarActual) await removeFamiliarLink(id);
      const result = await createFamilyAccess(id, parsed.data);
      toast(
        result.is_gmail || result.google_only
          ? "Familiar creado. Accederá con su cuenta de Google."
          : result.email_sent === true
            ? "Familiar creado. Se envió un enlace de acceso a su correo."
            : "Familiar creado, pero no se pudo enviar el correo.",
        "success",
      );
      setShowFamilyEditor(false);
      setFamilyForm(FAMILY_EMPTY);
      setFamilyErrors({});
      await loadFamiliar();
    } catch (err) {
      toast(friendlyError(err, "No se pudo crear el familiar."), "error");
    } finally {
      setSavingFamily(false);
    }
  };

  const handleUnlinkFamily = async () => {
    if (!familiarActual) return;
    setSavingFamily(true);
    try {
      await removeFamiliarLink(id);
      setFamiliarActual(null);
      toast("Familiar desvinculado.", "success");
    } catch (err) {
      toast(friendlyError(err, "No se pudo desvincular el familiar."), "error");
    } finally {
      setSavingFamily(false);
    }
  };

  const familyForDisplay = useMemo(() => familiarActual?.profiles ?? null, [familiarActual]);

  if (loading) return <Loading message="Cargando datos del residente..." />;

  if (createdFamily) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="bg-emerald-50 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 2.25 2.25L15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Residente y familiar listos</h1>
            <p className="mt-1 text-sm text-slate-600">
              {createdFamily.is_gmail ? "El familiar podrá entrar con Google." : "El familiar quedó vinculado como contacto principal."}
            </p>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{createdFamily.nombre}</p>
              <p className="mt-1 break-all text-slate-600">{createdFamily.email}</p>
              <p className="mt-1 text-slate-600">{createdFamily.telefono}</p>
              {!createdFamily.is_gmail && (
                <p className={`mt-3 text-xs font-medium ${createdFamily.email_sent ? "text-emerald-700" : "text-amber-700"}`}>
                  {createdFamily.email_sent
                    ? "Se envió un enlace de acceso a este correo."
                    : "No se pudo enviar el correo. Puede recuperar acceso desde la pantalla de inicio."}
                </p>
              )}
            </div>
            <Button onClick={() => navigate("/residents")} className="w-full bg-teal-700 text-white hover:bg-teal-800">
              Ir al listado de residentes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (partialResident) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-lg font-bold text-amber-950">Residente creado, falta el familiar</h1>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            {partialResident.resident.nombre} {partialResident.resident.apellido} ya está registrado. Para completar el alta, corrige el acceso familiar y vuelve a intentarlo.
          </p>
          {partialResident.error && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">{partialResident.error}</p>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField id="family_nombre" name="nombre" label="Nombre del familiar" required value={familyForm.nombre} onChange={handleFamilyChange} error={familyErrors.nombre} />
            <SelectField id="family_parentesco" name="parentesco" label="Parentesco" required value={familyForm.parentesco} onChange={handleFamilyChange} options={PARENTESCOS} error={familyErrors.parentesco} />
            <TextField id="family_email" name="email" type="email" label="Correo electrónico" required value={familyForm.email} onChange={handleFamilyChange} error={familyErrors.email} />
            <TextField id="family_telefono" name="telefono" label="Teléfono" required value={familyForm.telefono} onChange={handleFamilyChange} error={familyErrors.telefono} />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" onClick={() => navigate("/residents")} className="border border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
              Terminar después
            </Button>
            <Button type="button" disabled={savingFamily} onClick={handleRetryFamily} className="bg-teal-700 text-white hover:bg-teal-800">
              {savingFamily ? "Creando acceso..." : "Crear acceso familiar"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="tap-highlight-none rounded-lg px-1 text-sm text-slate-500 transition-colors hover:text-teal-700"
          >
            Volver
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-700">Residentes</p>
            <h1 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
              {isEditing ? "Editar residente" : "Nuevo residente"}
            </h1>
            {!isEditing && (
              <p className="mt-1 text-sm text-slate-500">El alta queda completa solo con un familiar vinculado como contacto principal.</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <ErrorSummary errors={{ ...errors, ...familyErrors }} />

          <FormSection icon={<IconPerson />} title="Identificación" description="Datos personales básicos para identificar al residente.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="nombre" name="nombre" label="Nombre" required value={form.nombre} onChange={handleChange} error={errors.nombre} maxLength={120} autoComplete="given-name" />
              <TextField id="apellido" name="apellido" label="Apellido" required value={form.apellido} onChange={handleChange} error={errors.apellido} maxLength={120} autoComplete="family-name" />
              <TextField id="rut" name="rut" label="RUT" value={form.rut} onChange={handleChange} onBlur={handleRutBlur} error={errors.rut} placeholder="12.345.678-9" hint="Opcional. Se formatea automáticamente al salir del campo." />
              <TextField id="fecha_nacimiento" name="fecha_nacimiento" type="date" label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={handleChange} error={errors.fecha_nacimiento} />
              <SelectField id="sexo" name="sexo" label="Sexo" value={form.sexo} onChange={handleChange} options={OPTIONS.sexo} error={errors.sexo} />
              <SelectField id="estado_civil" name="estado_civil" label="Estado civil" value={form.estado_civil} onChange={handleChange} options={OPTIONS.estadoCivil} error={errors.estado_civil} />
              <TextField id="nacionalidad" name="nacionalidad" label="Nacionalidad" value={form.nacionalidad} onChange={handleChange} error={errors.nacionalidad} maxLength={80} />
              <TextField id="prevision" name="prevision" label="Previsión de salud" value={form.prevision} onChange={handleChange} error={errors.prevision} maxLength={120} placeholder="FONASA, ISAPRE..." />
              <div className="sm:col-span-2">
                <TextField id="direccion_anterior" name="direccion_anterior" label="Domicilio previo" value={form.direccion_anterior} onChange={handleChange} error={errors.direccion_anterior} maxLength={300} />
              </div>
            </div>
          </FormSection>

          <FormSection icon={<IconHeart />} title="Información clínica base" description="Las escalas Barthel y Katz se registran después desde la ficha del residente.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextareaField id="diagnostico_principal" name="diagnostico_principal" label="Diagnóstico principal" value={form.diagnostico_principal} onChange={handleChange} error={errors.diagnostico_principal} maxLength={500} rows={3} placeholder="Hipertensión arterial, diabetes mellitus tipo 2..." />
              </div>
              <div className="sm:col-span-2">
                <TextField id="alergias" name="alergias" label="Alergias conocidas" value={form.alergias} onChange={handleChange} error={errors.alergias} placeholder="Penicilina, ibuprofeno..." hint="Separa múltiples alergias con coma. Deja vacío si no hay alergias conocidas." />
              </div>
              <SelectField id="grupo_sanguineo" name="grupo_sanguineo" label="Grupo sanguíneo" value={form.grupo_sanguineo} onChange={handleChange} options={GRUPOS_SANGUINEOS} error={errors.grupo_sanguineo} />
              <SelectField id="nivel_dependencia" name="nivel_dependencia" label="Nivel de dependencia" value={form.nivel_dependencia} onChange={handleChange} options={OPTIONS.dependencia} error={errors.nivel_dependencia} />
            </div>
          </FormSection>

          <FormSection icon={<IconCalendar />} title="Ingreso y estado" description={isEditing ? "Administra cambios de estado y egreso." : "El alta inicial solo admite residentes activos u hospitalizados."}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="fecha_ingreso" name="fecha_ingreso" type="date" label="Fecha de ingreso" required value={form.fecha_ingreso} onChange={handleChange} error={errors.fecha_ingreso} />
              <SelectField id="estado" name="estado" label="Estado" required value={form.estado} onChange={handleChange} options={isEditing ? OPTIONS.estadoEdit : OPTIONS.estadoCreate} error={errors.estado} />
            </div>

            {isEditing && (
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ubicación actual</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                      {form.cama_actual_id ? form.ubicacion_label : "Sin cama asignada"}
                    </p>
                  </div>
                  <Button type="button" onClick={() => navigate("/camas")} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                    Gestionar cama
                  </Button>
                </div>
              </div>
            )}

            {showEgreso && (
              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <TextField id="fecha_egreso" name="fecha_egreso" type="date" label="Fecha de egreso" required value={form.fecha_egreso} onChange={handleChange} error={errors.fecha_egreso} />
                <TextField id="motivo_egreso" name="motivo_egreso" label="Motivo de egreso" required value={form.motivo_egreso} onChange={handleChange} error={errors.motivo_egreso} maxLength={300} />
              </div>
            )}
          </FormSection>

          {!isEditing ? (
            <FormSection icon={<IconUsers />} title="Familiar responsable" description="Este familiar será el contacto principal y tendrá acceso al portal familiar.">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="family_nombre" name="nombre" label="Nombre completo" required value={familyForm.nombre} onChange={handleFamilyChange} error={familyErrors.nombre} maxLength={120} autoComplete="name" />
                <SelectField id="family_parentesco" name="parentesco" label="Parentesco" required value={familyForm.parentesco} onChange={handleFamilyChange} options={PARENTESCOS} error={familyErrors.parentesco} />
                <TextField id="family_email" name="email" type="email" label="Correo electrónico" required value={familyForm.email} onChange={handleFamilyChange} error={familyErrors.email} maxLength={254} inputMode="email" autoComplete="email" hint={isGmail ? "Cuenta Gmail detectada: accederá con Google." : "Recibirá un enlace para configurar su acceso."} />
                <TextField id="family_telefono" name="telefono" label="Teléfono" required value={familyForm.telefono} onChange={handleFamilyChange} error={familyErrors.telefono} maxLength={40} inputMode="tel" autoComplete="tel" placeholder="+56 9 1234 5678" />
              </div>
            </FormSection>
          ) : (
            <FormSection icon={<IconUsers />} title="Familiar vinculado" description="El familiar vinculado reemplaza al contacto de emergencia del residente.">
              {familiarLoading ? (
                <Loading message="Cargando familiar..." />
              ) : familiarActual && !showFamilyEditor ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
                      {firstLetter(familyForDisplay?.nombre || familyForDisplay?.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{familyForDisplay?.nombre ?? "Familiar"}</p>
                      <p className="truncate text-xs text-slate-600">{familyForDisplay?.email ?? "Sin correo"}</p>
                      {familyForDisplay?.telefono && <p className="text-xs text-slate-600">{familyForDisplay.telefono}</p>}
                      {familiarActual.parentesco && (
                        <span className="mt-1 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800">{familiarActual.parentesco}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" disabled={savingFamily} onClick={() => {
                      setFamilyForm({
                        nombre: familyForDisplay?.nombre ?? "",
                        email: "",
                        telefono: familyForDisplay?.telefono ?? "",
                        parentesco: familiarActual.parentesco ?? "",
                      });
                      setShowFamilyEditor(true);
                    }} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                      Cambiar familiar
                    </Button>
                    <Button type="button" disabled={savingFamily} onClick={handleUnlinkFamily} className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50">
                      {savingFamily ? "Desvinculando..." : "Desvincular"}
                    </Button>
                  </div>
                </div>
              ) : !showFamilyEditor ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-900">Este residente no tiene familiar vinculado.</p>
                  <Button type="button" onClick={() => { setFamilyForm(FAMILY_EMPTY); setShowFamilyEditor(true); }} className="mt-3 bg-teal-700 text-white hover:bg-teal-800">
                    Agregar familiar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {familiarActual && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Se desvinculará al familiar actual y se creará uno nuevo.
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField id="family_nombre" name="nombre" label="Nombre completo" required value={familyForm.nombre} onChange={handleFamilyChange} error={familyErrors.nombre} />
                    <SelectField id="family_parentesco" name="parentesco" label="Parentesco" required value={familyForm.parentesco} onChange={handleFamilyChange} options={PARENTESCOS} error={familyErrors.parentesco} />
                    <TextField id="family_email" name="email" type="email" label="Correo electrónico" required value={familyForm.email} onChange={handleFamilyChange} error={familyErrors.email} />
                    <TextField id="family_telefono" name="telefono" label="Teléfono" required value={familyForm.telefono} onChange={handleFamilyChange} error={familyErrors.telefono} />
                  </div>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" disabled={savingFamily} onClick={() => { setShowFamilyEditor(false); setFamilyForm(FAMILY_EMPTY); setFamilyErrors({}); }} className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                      Cancelar
                    </Button>
                    <Button type="button" disabled={savingFamily} onClick={handleSaveFamilyEdit} className="bg-teal-700 text-white hover:bg-teal-800">
                      {savingFamily ? "Guardando..." : "Crear y vincular"}
                    </Button>
                  </div>
                </div>
              )}
            </FormSection>
          )}

          <SubmitBar
            busy={saving}
            submitLabel={isEditing ? "Guardar cambios" : "Crear residente y familiar"}
            busyLabel="Guardando..."
            onCancel={() => navigate(-1)}
          />
        </form>
      </div>

      {hospitalDecision && (
        <Modal isOpen title="¿Qué pasa con la cama asignada?" onClose={() => setHospitalDecision(null)}>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              <strong>{originalResident?.nombre} {originalResident?.apellido}</strong> tiene asignada{" "}
              <span className="font-semibold text-slate-900">{originalResident?.ubicacion_label ?? "una cama"}</span>.
              Al pasar a hospitalización, define si se reserva o libera.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={saving} onClick={() => handleHospitalDecision("reservar")} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left transition-colors hover:bg-indigo-100 disabled:opacity-50">
                <p className="text-sm font-semibold text-indigo-900">Reservar cama</p>
                <p className="mt-1 text-xs leading-snug text-indigo-700">La cama queda bloqueada hasta que el residente vuelva.</p>
              </button>
              <button type="button" disabled={saving} onClick={() => handleHospitalDecision("liberar")} className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-left transition-colors hover:bg-teal-100 disabled:opacity-50">
                <p className="text-sm font-semibold text-teal-900">Liberar cama</p>
                <p className="mt-1 text-xs leading-snug text-teal-700">La cama queda disponible para otro residente.</p>
              </button>
            </div>
            <button type="button" onClick={() => setHospitalDecision(null)} className="w-full py-1 text-sm text-slate-500 hover:text-slate-700">
              Cancelar y volver al formulario
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
