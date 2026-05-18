import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createResident, updateResident, getResidentById,
  getFamiliarForResidente, removeFamiliarLink,
} from "./residentService";
import { createStaffUser } from "../team/teamService";
import { validateRut, formatRut, isValidUUID, validateEmail } from "../../utils/validators";
import { friendlyError } from "../../utils/errorMessages";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

const PARENTESCOS = [
  ["", "Seleccionar"],
  ["hijo/a", "Hijo/a"],
  ["conyuge", "Cónyuge / Pareja"],
  ["hermano/a", "Hermano/a"],
  ["nieto/a", "Nieto/a"],
  ["sobrino/a", "Sobrino/a"],
  ["otro", "Otro"],
];

const EMPTY = {
  nombre: "", apellido: "", rut: "",
  fecha_nacimiento: "", sexo: "", nacionalidad: "Chilena", estado_civil: "",
  direccion_anterior: "",
  nombre_contacto: "", telefono_contacto: "", parentesco_contacto: "",
  prevision: "", diagnostico_principal: "", alergias: "", grupo_sanguineo: "",
  fecha_ingreso: new Date().toISOString().split("T")[0],
  habitacion: "", cama: "",
  estado: "activo", nivel_dependencia: "", indice_barthel: "",
  escala_katz: "", fecha_egreso: "", motivo_egreso: "",
};

const FAMILIAR_EMPTY = { nombre: "", email: "", parentesco: "" };

export default function ResidentForm() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const toast     = useToast();
  const { eleam } = useAuth();
  const isEditing = Boolean(id);

  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(isEditing);
  const [saving,  setSaving]  = useState(false);

  // Familiar — creación inline
  const [familiarEnabled, setFamiliarEnabled] = useState(false);
  const [familiarForm, setFamiliarForm] = useState(FAMILIAR_EMPTY);
  const [familiarErrors, setFamiliarErrors] = useState({});
  // Familiar — edición (modo edit)
  const [familiarActual, setFamiliarActual] = useState(null);
  const [familiarLoading, setFamiliarLoading] = useState(false);
  const [showFamiliarEdit, setShowFamiliarEdit] = useState(false);
  const [savingFamiliar, setSavingFamiliar] = useState(false);
  // Contraseña generada tras crear familiar
  const [familiarCreado, setFamiliarCreado] = useState(null);

  const loadFamiliar = useCallback(async () => {
    if (!isEditing || !isValidUUID(id)) return;
    setFamiliarLoading(true);
    try {
      const data = await getFamiliarForResidente(id);
      setFamiliarActual(data);
    } catch {
      // no bloquear la carga del formulario
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
    Promise.all([
      getResidentById(id),
      getFamiliarForResidente(id).catch(() => null),
    ]).then(([data, familiar]) => {
      setForm({
        ...EMPTY,
        ...data,
        alergias:        Array.isArray(data.alergias) ? data.alergias.join(", ") : "",
        fecha_nacimiento: data.fecha_nacimiento ?? "",
        fecha_ingreso:   data.fecha_ingreso ?? new Date().toISOString().split("T")[0],
        indice_barthel:  data.indice_barthel ?? "",
        escala_katz:     data.escala_katz ?? "",
        fecha_egreso:    data.fecha_egreso ?? "",
        motivo_egreso:   data.motivo_egreso ?? "",
      });
      setFamiliarActual(familiar ?? null);
    })
      .catch(() => toast("No se pudo cargar el residente.", "error"))
      .finally(() => setLoading(false));
  }, [id, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleRutBlur = () => {
    if (form.rut) setForm((prev) => ({ ...prev, rut: formatRut(prev.rut) }));
  };

  const handleFamiliarChange = (e) => {
    const { name, value } = e.target;
    setFamiliarForm((prev) => ({ ...prev, [name]: value }));
    if (familiarErrors[name]) setFamiliarErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())   e.nombre       = "El nombre es obligatorio.";
    if (!form.apellido.trim()) e.apellido      = "El apellido es obligatorio.";
    if (form.rut && !validateRut(form.rut)) e.rut = "RUT inválido.";
    if (!form.fecha_ingreso)   e.fecha_ingreso = "La fecha de ingreso es obligatoria.";
    if (
      form.indice_barthel !== "" &&
      (isNaN(form.indice_barthel) || form.indice_barthel < 0 || form.indice_barthel > 100)
    ) {
      e.indice_barthel = "Debe ser un número entre 0 y 100.";
    }
    const egresoEstados = ["egresado", "fallecido"];
    if (egresoEstados.includes(form.estado) && !form.fecha_egreso) {
      e.fecha_egreso = "La fecha de egreso es obligatoria para este estado.";
    }
    // Validar campos del familiar si está habilitado
    if (!isEditing && familiarEnabled) {
      if (!familiarForm.nombre.trim()) e.familiar_nombre = "El nombre del familiar es obligatorio.";
      if (!familiarForm.email.trim())  e.familiar_email  = "El correo es obligatorio.";
      else if (!validateEmail(familiarForm.email)) e.familiar_email = "Correo inválido.";
    }
    return e;
  };

  const validateFamiliarEdit = () => {
    const e = {};
    if (!familiarForm.nombre.trim()) e.familiar_nombre = "El nombre es obligatorio.";
    if (!familiarForm.email.trim())  e.familiar_email  = "El correo es obligatorio.";
    else if (!validateEmail(familiarForm.email)) e.familiar_email = "Correo inválido.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        alergias: form.alergias
          ? form.alergias.split(",").map((a) => a.trim()).filter(Boolean)
          : [],
        indice_barthel: form.indice_barthel !== "" ? parseInt(form.indice_barthel, 10) : null,
        escala_katz:    form.escala_katz.trim() || null,
        fecha_egreso:   form.fecha_egreso || null,
        motivo_egreso:  form.motivo_egreso.trim() || null,
      };

      if (isEditing) {
        await updateResident(id, payload);
        toast("Residente actualizado.", "success");
        navigate("/residents");
        return;
      }

      // Crear residente nuevo
      const newResident = await createResident(payload);

      // Si se llenó la sección familiar, crear el usuario
      if (familiarEnabled && familiarForm.nombre.trim() && familiarForm.email.trim()) {
        try {
          const result = await createStaffUser({
            nombre:      familiarForm.nombre.trim(),
            email:       familiarForm.email.trim().toLowerCase(),
            rol:         "familiar",
            residenteId: newResident.id,
          });
          setFamiliarCreado({
            nombre:        familiarForm.nombre.trim(),
            email:         result.email ?? familiarForm.email.trim().toLowerCase(),
            temp_password: result.temp_password,
            is_gmail:      !!(result.is_gmail || result.google_only),
          });
          // La pantalla de contraseña se muestra antes de navegar
          return;
        } catch (err) {
          // El residente ya fue creado; avisamos pero no revertimos
          toast(
            `Residente creado. No se pudo crear el familiar: ${err.message || "Error desconocido"}`,
            "error"
          );
        }
      }

      toast("Residente creado correctamente.", "success");
      navigate("/residents");
    } catch (err) {
      const msg =
        err?.code === "23505"
          ? "Ya existe un residente con ese RUT en este establecimiento."
          : "No se pudo guardar el residente.";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Guardar familiar desde el modo edición
  const handleSaveFamiliarEdit = async () => {
    const errs = validateFamiliarEdit();
    if (Object.keys(errs).length) { setFamiliarErrors(errs); return; }
    if (!eleam?.id) { toast("No se pudo obtener el ELEAM.", "error"); return; }
    setSavingFamiliar(true);
    try {
      if (familiarActual) {
        await removeFamiliarLink(id);
      }
      const result = await createStaffUser({
        nombre:      familiarForm.nombre.trim(),
        email:       familiarForm.email.trim().toLowerCase(),
        rol:         "familiar",
        residenteId: id,
      });
      toast(
        result.temp_password
          ? `Familiar creado. Contraseña temporal: ${result.temp_password}`
          : "Familiar creado. El familiar accederá con su cuenta de Google.",
        "success"
      );
      setShowFamiliarEdit(false);
      setFamiliarForm(FAMILIAR_EMPTY);
      setFamiliarErrors({});
      await loadFamiliar();
    } catch (err) {
      toast(friendlyError(err, "No se pudo crear el familiar. Verifica los datos e intenta de nuevo."), "error");
    } finally {
      setSavingFamiliar(false);
    }
  };

  const handleUnlinkFamiliar = async () => {
    if (!familiarActual) return;
    setSavingFamiliar(true);
    try {
      await removeFamiliarLink(id);
      setFamiliarActual(null);
      toast("Familiar desvinculado.", "success");
    } catch (err) {
      toast(friendlyError(err, "No se pudo desvincular el familiar. Intenta de nuevo."), "error");
    } finally {
      setSavingFamiliar(false);
    }
  };

  const showEgreso = ["egresado", "fallecido"].includes(form.estado);
  const isGmail    = familiarForm.email.toLowerCase().endsWith("@gmail.com");

  // ── Pantalla de contraseña temporal (solo en creación con familiar) ──────
  if (familiarCreado) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Residente y familiar creados</h2>
          <p className="text-sm text-slate-500 mb-6">
            {familiarCreado.is_gmail
              ? <>Familiar vinculado — <strong>{familiarCreado.nombre}</strong> accederá con su cuenta de Google.</>
              : <>Comparte estas credenciales con <strong>{familiarCreado.nombre}</strong>:</>
            }
          </p>

          {familiarCreado.temp_password ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
              <p className="text-xs text-amber-700 font-semibold mb-3">
                Guarda esta contraseña — no se mostrará de nuevo
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 w-20 shrink-0">Correo:</span>
                  <code className="font-mono text-slate-800 bg-white border border-amber-200 rounded px-2 py-0.5 flex-1">
                    {familiarCreado.email}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 w-20 shrink-0">Contraseña:</span>
                  <code className="font-mono text-xl tracking-widest text-slate-800 bg-white border border-amber-200 rounded px-2 py-0.5 flex-1 select-all">
                    {familiarCreado.temp_password}
                  </code>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-3">
                El familiar deberá cambiarla en su primer acceso.
              </p>
            </div>
          ) : (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-left mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-sky-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-sky-700 font-semibold">Acceso con Google</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 w-20 shrink-0">Correo:</span>
                <code className="font-mono text-slate-800 bg-white border border-sky-200 rounded px-2 py-0.5 flex-1">
                  {familiarCreado.email}
                </code>
              </div>
              <p className="text-xs text-sky-600 mt-3">
                El familiar iniciará sesión con el botón "Continuar con Google" usando esta dirección.
              </p>
            </div>
          )}
          <Button
            onClick={() => navigate("/residents")}
            className="bg-teal-700 text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-teal-800"
          >
            Continuar al listado →
          </Button>
        </div>
      </div>
    );
  }

  if (loading) return <Loading message="Cargando datos del residente..." />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-teal-700 hover:underline text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-teal-700">
          {isEditing ? "Editar Residente" : "Nuevo Residente"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Datos personales */}
        <Card title="Datos Personales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre *"   name="nombre"   value={form.nombre}   onChange={handleChange} error={errors.nombre} />
            <Field label="Apellido *" name="apellido" value={form.apellido} onChange={handleChange} error={errors.apellido} />
            <Field
              label="RUT" name="rut" value={form.rut} onChange={handleChange}
              onBlur={handleRutBlur} placeholder="12.345.678-9" error={errors.rut}
            />
            <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date"
              value={form.fecha_nacimiento} onChange={handleChange} />
            <SelectField label="Sexo" name="sexo" value={form.sexo} onChange={handleChange}
              options={[["","Seleccionar"],["masculino","Masculino"],["femenino","Femenino"],["otro","Otro"]]} />
            <Field label="Nacionalidad" name="nacionalidad" value={form.nacionalidad} onChange={handleChange} />
            <SelectField label="Estado civil" name="estado_civil" value={form.estado_civil} onChange={handleChange}
              options={[["","Seleccionar"],["soltero","Soltero/a"],["casado","Casado/a"],["viudo","Viudo/a"],["divorciado","Divorciado/a"],["otro","Otro"]]} />
            <Field label="Previsión" name="prevision" placeholder="FONASA A / ISAPRE…"
              value={form.prevision} onChange={handleChange} />
          </div>
        </Card>

        {/* Contacto de emergencia */}
        <Card title="Contacto de Emergencia">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre"        name="nombre_contacto"     value={form.nombre_contacto}     onChange={handleChange} />
            <Field label="Teléfono"      name="telefono_contacto"   type="tel" value={form.telefono_contacto} onChange={handleChange} />
            <Field label="Parentesco"    name="parentesco_contacto" value={form.parentesco_contacto} onChange={handleChange} />
            <Field label="Dirección anterior" name="direccion_anterior" value={form.direccion_anterior} onChange={handleChange} />
          </div>
        </Card>

        {/* Información clínica */}
        <Card title="Información Clínica">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Diagnóstico principal" name="diagnostico_principal"
                value={form.diagnostico_principal} onChange={handleChange} />
            </div>
            <Field label="Alergias (separar con coma)" name="alergias"
              value={form.alergias} onChange={handleChange} placeholder="Penicilina, Ibuprofeno…" />
            <Field label="Grupo sanguíneo" name="grupo_sanguineo" placeholder="A+, O−, AB+…"
              value={form.grupo_sanguineo} onChange={handleChange} />
            <SelectField label="Nivel de dependencia" name="nivel_dependencia"
              value={form.nivel_dependencia} onChange={handleChange}
              options={[["","Seleccionar"],["leve","Leve"],["moderado","Moderado"],["severo","Severo"],["total","Total"]]} />
            <Field label="Índice de Barthel (0–100)" name="indice_barthel" type="number"
              min="0" max="100" value={form.indice_barthel} onChange={handleChange}
              error={errors.indice_barthel} />
            <Field label="Escala Katz" name="escala_katz" placeholder="A / B / C…"
              value={form.escala_katz} onChange={handleChange} />
          </div>
        </Card>

        {/* Datos de ingreso */}
        <Card title="Datos de Ingreso y Estado">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha de ingreso *" name="fecha_ingreso" type="date"
              value={form.fecha_ingreso} onChange={handleChange} error={errors.fecha_ingreso} />
            <SelectField label="Estado *" name="estado" value={form.estado} onChange={handleChange}
              options={[["activo","Activo"],["hospitalizado","Hospitalizado"],["egresado","Egresado"],["fallecido","Fallecido"]]} />
            <Field label="Habitación" name="habitacion" value={form.habitacion} onChange={handleChange} />
            <Field label="Cama"       name="cama"       value={form.cama}       onChange={handleChange} />
          </div>

          {showEgreso && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
              <Field label="Fecha de egreso *" name="fecha_egreso" type="date"
                value={form.fecha_egreso} onChange={handleChange} error={errors.fecha_egreso} />
              <Field label="Motivo de egreso" name="motivo_egreso"
                value={form.motivo_egreso} onChange={handleChange}
                placeholder="Traslado, alta médica, fallecimiento…" />
            </div>
          )}
        </Card>

        {/* ── Sección familiar ─────────────────────────────────────────── */}
        {!isEditing ? (
          /* MODO CREACIÓN: checkbox para agregar familiar ahora */
          <Card title="Acceso para Familiar">
            <label className="flex items-start gap-3 cursor-pointer mb-1">
              <input
                type="checkbox"
                checked={familiarEnabled}
                onChange={(e) => {
                  setFamiliarEnabled(e.target.checked);
                  if (!e.target.checked) { setFamiliarForm(FAMILIAR_EMPTY); setFamiliarErrors({}); }
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-200"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">Agregar acceso para un familiar ahora</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Opcional. Admins y funcionarios pueden crear familiares vinculados a residentes activos.
                </p>
              </div>
            </label>

            {familiarEnabled && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre del familiar *" name="nombre"
                  value={familiarForm.nombre} onChange={handleFamiliarChange}
                  error={errors.familiar_nombre} />
                <SelectField label="Parentesco" name="parentesco"
                  value={familiarForm.parentesco} onChange={handleFamiliarChange}
                  options={PARENTESCOS} />
                <div className="sm:col-span-2">
                  <Field label="Correo electrónico *" name="email" type="email"
                    value={familiarForm.email} onChange={handleFamiliarChange}
                    placeholder="familiar@correo.cl" error={errors.familiar_email} />
                  {isGmail && (
                    <p className="text-xs text-sky-600 mt-1">
                      Google funcionará solo después de que esta cuenta quede creada con este mismo correo.
                    </p>
                  )}
                </div>
                <p className="sm:col-span-2 text-xs text-slate-400">
                  Se generará una contraseña temporal que podrás compartir con el familiar. Deberá cambiarla en su primer acceso.
                </p>
              </div>
            )}
          </Card>
        ) : (
          /* MODO EDICIÓN: mostrar o gestionar familiar vinculado */
          <Card title="Familiar Vinculado">
            {familiarLoading ? (
              <Loading message="Cargando familiar..." />
            ) : familiarActual && !showFamiliarEdit ? (
              <div>
                <div className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {(familiarActual.profiles?.nombre ?? familiarActual.profiles?.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {familiarActual.profiles?.nombre ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{familiarActual.profiles?.email ?? "—"}</p>
                    {familiarActual.parentesco && (
                      <p className="text-xs text-slate-400">{familiarActual.parentesco}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFamiliarForm({
                        nombre: familiarActual.profiles?.nombre ?? "",
                        email:  "",
                        parentesco: familiarActual.parentesco ?? "",
                      });
                      setShowFamiliarEdit(true);
                    }}
                    className="text-sm text-teal-700 hover:underline font-medium"
                    disabled={savingFamiliar}
                  >
                    Cambiar familiar
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlinkFamiliar}
                    className="text-sm text-rose-600 hover:underline"
                    disabled={savingFamiliar}
                  >
                    {savingFamiliar ? "Desvinculando…" : "Desvincular"}
                  </button>
                </div>
              </div>
            ) : !familiarActual && !showFamiliarEdit ? (
              <div>
                <p className="text-sm text-slate-400 mb-3">Sin familiar vinculado.</p>
                <button
                  type="button"
                  onClick={() => { setFamiliarForm(FAMILIAR_EMPTY); setShowFamiliarEdit(true); }}
                  className="text-sm text-teal-700 hover:underline font-medium"
                >
                  + Agregar familiar
                </button>
              </div>
            ) : (
              /* Formulario de creación/cambio de familiar */
              <div className="space-y-4">
                {familiarActual && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Se desvinculará al familiar actual y se creará uno nuevo con las credenciales indicadas.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nombre del familiar *" name="nombre"
                    value={familiarForm.nombre} onChange={handleFamiliarChange}
                    error={familiarErrors.familiar_nombre} />
                  <SelectField label="Parentesco" name="parentesco"
                    value={familiarForm.parentesco} onChange={handleFamiliarChange}
                    options={PARENTESCOS} />
                  <div className="sm:col-span-2">
                    <Field label="Correo electrónico *" name="email" type="email"
                      value={familiarForm.email} onChange={handleFamiliarChange}
                      placeholder="familiar@correo.cl" error={familiarErrors.familiar_email} />
                    {isGmail && (
                      <p className="text-xs text-sky-600 mt-1">
                        Google funcionará solo después de que esta cuenta quede creada con este mismo correo.
                      </p>
                    )}
                  </div>
                  <p className="sm:col-span-2 text-xs text-slate-400">
                    Se generará una contraseña temporal. El familiar deberá cambiarla en su primer acceso.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => { setShowFamiliarEdit(false); setFamiliarForm(FAMILIAR_EMPTY); setFamiliarErrors({}); }}
                    disabled={savingFamiliar}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 text-sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveFamiliarEdit}
                    disabled={savingFamiliar}
                    className="px-4 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 text-sm font-medium disabled:opacity-50"
                  >
                    {savingFamiliar ? "Guardando…" : "Crear y vincular familiar"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50 font-medium"
          >
            {saving ? "Guardando…" : isEditing ? "Actualizar" : "Crear Residente"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ─── Subcomponentes de formulario ─────────────────────────── */

function Card({ title, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, name, type = "text", value, onChange, onBlur, required, placeholder, min, max, error }) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        id={name}
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={errorId}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-colors ${
          error ? "border-rose-400 bg-rose-50" : "border-slate-300"
        }`}
      />
      {error && <p id={errorId} className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <select
        id={name}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-white"
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </div>
  );
}
