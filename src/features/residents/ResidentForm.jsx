import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createResident, updateResident, getResidentById } from "./residentService";
import Button from "../../components/Button";
import Loading from "../../components/Loading";

const INITIAL = {
  nombre: "",
  apellido: "",
  rut: "",
  fecha_nacimiento: "",
  sexo: "",
  nacionalidad: "Chilena",
  estado_civil: "",
  direccion_anterior: "",
  nombre_contacto: "",
  telefono_contacto: "",
  parentesco_contacto: "",
  prevision: "",
  diagnostico_principal: "",
  alergias: "",
  grupo_sanguineo: "",
  fecha_ingreso: new Date().toISOString().split("T")[0],
  habitacion: "",
  cama: "",
  estado: "activo",
  nivel_dependencia: "",
  indice_barthel: "",
};

function ResidentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      getResidentById(id)
        .then((data) => {
          setForm({
            ...data,
            alergias: Array.isArray(data.alergias) ? data.alergias.join(", ") : "",
            fecha_nacimiento: data.fecha_nacimiento ?? "",
            fecha_ingreso: data.fecha_ingreso ?? new Date().toISOString().split("T")[0],
          });
        })
        .catch((err) => setError("Error al cargar residente: " + err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        alergias: form.alergias
          ? form.alergias.split(",").map((a) => a.trim()).filter(Boolean)
          : [],
        indice_barthel: form.indice_barthel !== "" ? parseInt(form.indice_barthel) : null,
      };
      if (isEditing) {
        await updateResident(id, payload);
      } else {
        await createResident(payload);
      }
      navigate("/residents");
    } catch (err) {
      setError("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Cargando datos..." />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--color-primary)] hover:underline text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">
          {isEditing ? "Editar Residente" : "Nuevo Residente"}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Datos personales */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
            Datos Personales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} required />
            <Field label="Apellido *" name="apellido" value={form.apellido} onChange={handleChange} required />
            <Field label="RUT" name="rut" placeholder="12.345.678-9" value={form.rut} onChange={handleChange} />
            <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} />
            <SelectField label="Sexo" name="sexo" value={form.sexo} onChange={handleChange}
              options={[["", "Seleccionar"], ["masculino", "Masculino"], ["femenino", "Femenino"], ["otro", "Otro"]]} />
            <Field label="Nacionalidad" name="nacionalidad" value={form.nacionalidad} onChange={handleChange} />
            <SelectField label="Estado civil" name="estado_civil" value={form.estado_civil} onChange={handleChange}
              options={[["", "Seleccionar"], ["soltero", "Soltero/a"], ["casado", "Casado/a"], ["viudo", "Viudo/a"], ["divorciado", "Divorciado/a"], ["otro", "Otro"]]} />
            <Field label="Previsión" name="prevision" placeholder="FONASA A / ISAPRE / etc." value={form.prevision} onChange={handleChange} />
          </div>
        </section>

        {/* Contacto */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
            Contacto de Emergencia
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre contacto" name="nombre_contacto" value={form.nombre_contacto} onChange={handleChange} />
            <Field label="Teléfono contacto" name="telefono_contacto" type="tel" value={form.telefono_contacto} onChange={handleChange} />
            <Field label="Parentesco" name="parentesco_contacto" value={form.parentesco_contacto} onChange={handleChange} />
            <Field label="Dirección anterior" name="direccion_anterior" value={form.direccion_anterior} onChange={handleChange} />
          </div>
        </section>

        {/* Información clínica */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
            Información Clínica
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Diagnóstico principal" name="diagnostico_principal" value={form.diagnostico_principal} onChange={handleChange} />
            </div>
            <Field label="Alergias (separar con coma)" name="alergias" placeholder="Penicilina, Ibuprofeno..." value={form.alergias} onChange={handleChange} />
            <Field label="Grupo sanguíneo" name="grupo_sanguineo" placeholder="A+, O-, AB+..." value={form.grupo_sanguineo} onChange={handleChange} />
            <SelectField label="Nivel de dependencia" name="nivel_dependencia" value={form.nivel_dependencia} onChange={handleChange}
              options={[["", "Seleccionar"], ["leve", "Leve"], ["moderado", "Moderado"], ["severo", "Severo"], ["total", "Total"]]} />
            <Field label="Índice de Barthel (0-100)" name="indice_barthel" type="number" min="0" max="100" value={form.indice_barthel} onChange={handleChange} />
          </div>
        </section>

        {/* Ingreso */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
            Datos de Ingreso
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha de ingreso *" name="fecha_ingreso" type="date" value={form.fecha_ingreso} onChange={handleChange} required />
            <SelectField label="Estado *" name="estado" value={form.estado} onChange={handleChange}
              options={[["activo", "Activo"], ["hospitalizado", "Hospitalizado"], ["egresado", "Egresado"], ["fallecido", "Fallecido"]]} />
            <Field label="Habitación" name="habitacion" value={form.habitacion} onChange={handleChange} />
            <Field label="Cama" name="cama" value={form.cama} onChange={handleChange} />
          </div>
        </section>

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] transition-all disabled:opacity-50"
          >
            {saving ? "Guardando..." : isEditing ? "Actualizar" : "Crear Residente"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type = "text", value, onChange, required, placeholder, min, max }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
      />
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </div>
  );
}

export default ResidentForm;
