import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createResident, updateResident, getResidentById } from "./residentService";
import { validateRut, formatRut, isValidUUID } from "../../utils/validators";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

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

export default function ResidentForm() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const toast     = useToast();
  const isEditing = Boolean(id);

  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(isEditing);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    if (!isValidUUID(id)) {
      toast("ID de residente inválido.", "error");
      navigate("/residents");
      return;
    }
    getResidentById(id)
      .then((data) =>
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
        })
      )
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
      } else {
        await createResident(payload);
        toast("Residente creado correctamente.", "success");
      }
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

  const showEgreso = ["egresado", "fallecido"].includes(form.estado);

  if (loading) return <Loading message="Cargando datos del residente..." />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--color-primary)] hover:underline text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <Field label="Fecha de egreso *" name="fecha_egreso" type="date"
                value={form.fecha_egreso} onChange={handleChange} error={errors.fecha_egreso} />
              <Field label="Motivo de egreso" name="motivo_egreso"
                value={form.motivo_egreso} onChange={handleChange}
                placeholder="Traslado, alta médica, fallecimiento…" />
            </div>
          )}
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] disabled:opacity-50 font-medium"
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
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, name, type = "text", value, onChange, onBlur, required, placeholder, min, max, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] transition-colors ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] bg-white"
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </div>
  );
}
