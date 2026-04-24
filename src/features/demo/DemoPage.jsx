import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDemoResidents, addDemoResident,
  getDemoVitalSigns, addDemoVitalSign,
  getDemoObservations, addDemoObservation,
  clearDemoData,
} from "./demoService";

/* ── Constantes ─────────────────────────────────────────── */
const ESTADO_BADGE = {
  activo:        "bg-green-100 text-green-800",
  hospitalizado: "bg-yellow-100 text-yellow-800",
  egresado:      "bg-gray-100 text-gray-700",
  fallecido:     "bg-red-100 text-red-800",
};

const TIPO_LABEL = {
  observacion_general: "General", caida: "Caída", incidente: "Incidente",
  curacion: "Curación", visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento", cambio_posicion: "Cambio posición",
  higiene: "Higiene", alimentacion: "Alimentación",
  eliminacion: "Eliminación", actividad: "Actividad", otro: "Otro",
};

const CONVERSION_TIPS = [
  "Con la versión completa sincronizas los registros de todo tu equipo en tiempo real.",
  "Activa tu cuenta para guardar datos reales y preparar tu próxima fiscalización SEREMI.",
  "Centraliza las fichas de todos tus residentes en un solo lugar, accesible desde cualquier dispositivo.",
  "Con el plan activo, cada funcionario accede con su propio usuario y los registros quedan firmados.",
];

/* ── Banner demo (sticky) ───────────────────────────────── */
function DemoBanner({ onClear }) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm shadow-md">
      <div className="flex items-center gap-2">
        <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">DEMO</span>
        <span>Datos ficticios — la información ingresada se guarda <strong>solo en este navegador</strong>.</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onClear} className="text-white/80 hover:text-white underline text-xs transition-colors">
          Borrar datos
        </button>
        <button
          onClick={() => navigate("/pago")}
          className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
        >
          Activar versión real →
        </button>
      </div>
    </div>
  );
}

/* ── Callout de conversión ───────────────────────────────── */
function ConversionCallout({ tip, className = "" }) {
  const navigate = useNavigate();
  return (
    <div className={`bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3 ${className}`}>
      <div className="shrink-0 w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white text-sm">
        ✦
      </div>
      <div className="flex-1">
        <p className="text-sm text-teal-800">{tip}</p>
        <button
          onClick={() => navigate("/pago")}
          className="text-xs font-semibold text-[var(--color-primary)] hover:underline mt-1"
        >
          Ver planes →
        </button>
      </div>
    </div>
  );
}

/* ── Tabs de navegación ──────────────────────────────────── */
function DemoNav({ tab, setTab }) {
  const tabs = [
    { id: "dashboard",  label: "Dashboard" },
    { id: "residentes", label: "Residentes" },
    { id: "signos",     label: "Signos Vitales" },
    { id: "obs",        label: "Observaciones" },
  ];
  return (
    <div className="bg-white border-b border-gray-200 px-4">
      <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Pestaña: Dashboard ──────────────────────────────────── */
function TabDashboard({ setTab }) {
  const navigate = useNavigate();
  const residents = getDemoResidents();
  const activos = residents.filter((r) => r.estado === "activo").length;
  const hospitalizados = residents.filter((r) => r.estado === "hospitalizado").length;
  const tip = CONVERSION_TIPS[0];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-1">Panel demo — ELEAM Los Aromos</h2>
        <p className="text-teal-100 text-sm">Datos de ejemplo para explorar la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total residentes", value: residents.length, color: "text-gray-800" },
          { label: "Activos",          value: activos,           color: "text-green-600" },
          { label: "Hospitalizados",   value: hospitalizados,    color: "text-yellow-600" },
          { label: "Categorías SEREMI",value: "10",              color: "text-[var(--color-primary)]" },
        ].map(({ label, value, color }, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <ConversionCallout tip={tip} />

      {/* Acciones rápidas */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">Acciones rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "👴", label: "Ver Residentes",    tab: "residentes" },
            { icon: "📊", label: "Signos Vitales",    tab: "signos" },
            { icon: "📋", label: "Observaciones",     tab: "obs" },
            { icon: "📁", label: "Acreditación",      tab: null },
          ].map(({ icon, label, tab }, i) => (
            <button
              key={i}
              onClick={() => tab ? setTab(tab) : navigate("/pago")}
              className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-[var(--color-secondary)] transition-all"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs text-gray-600 text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Pestaña: Residentes ─────────────────────────────────── */
function TabResidentes() {
  const navigate = useNavigate();
  const [residents, setResidents] = useState(getDemoResidents);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({
    nombre: "", apellido: "", rut: "", fecha_nacimiento: "",
    sexo: "", estado: "activo", habitacion: "", cama: "",
    diagnostico_principal: "", nivel_dependencia: "", fecha_ingreso: new Date().toISOString().split("T")[0],
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim()) return;
    const newR = addDemoResident(form);
    setResidents((p) => [...p, newR]);
    setShowForm(false);
    setSaved(true);
    setForm({ nombre: "", apellido: "", rut: "", fecha_nacimiento: "", sexo: "", estado: "activo",
              habitacion: "", cama: "", diagnostico_principal: "", nivel_dependencia: "",
              fecha_ingreso: new Date().toISOString().split("T")[0] });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Residentes</h2>
          <p className="text-sm text-gray-400">{residents.length} registrado{residents.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-button-hover)] transition-colors"
        >
          {showForm ? "Cancelar" : "+ Agregar residente"}
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm animate-slide-in">
          ✓ Residente agregado al demo (guardado en este navegador)
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Nuevo residente (demo)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Nombre *", name: "nombre", required: true },
              { label: "Apellido *", name: "apellido", required: true },
              { label: "RUT", name: "rut", placeholder: "12.345.678-9" },
              { label: "Fecha nacimiento", name: "fecha_nacimiento", type: "date" },
              { label: "Habitación", name: "habitacion" },
              { label: "Cama", name: "cama" },
            ].map(({ label, name, type = "text", placeholder, required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input type={type} name={name} value={form[name]} onChange={handleChange}
                  placeholder={placeholder} required={required}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <select name="estado" value={form.estado} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="activo">Activo</option>
                <option value="hospitalizado">Hospitalizado</option>
                <option value="egresado">Egresado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nivel dependencia</label>
              <select name="nivel_dependencia" value={form.nivel_dependencia} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="">Seleccionar</option>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="severo">Severo</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Diagnóstico principal</label>
              <input name="diagnostico_principal" value={form.diagnostico_principal} onChange={handleChange}
                placeholder="Ej: Hipertensión arterial, Diabetes tipo 2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit"
              className="text-sm px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-button-hover)]">
              Guardar en demo
            </button>
          </div>
        </form>
      )}

      <ConversionCallout tip={CONVERSION_TIPS[2]} />

      <div className="grid gap-3">
        {residents.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-gray-800">{r.apellido}, {r.nombre}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[r.estado] ?? "bg-gray-100 text-gray-600"}`}>
                  {r.estado}
                </span>
              </div>
              <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-0.5">
                {r.rut && <span>RUT: {r.rut}</span>}
                {r.habitacion && <span>Hab. {r.habitacion}{r.cama ? ` · Cama ${r.cama}` : ""}</span>}
                {r.nivel_dependencia && <span>Dep.: {r.nivel_dependencia}</span>}
              </div>
              {r.diagnostico_principal && (
                <p className="text-xs text-gray-400 mt-0.5 italic truncate max-w-sm">{r.diagnostico_principal}</p>
              )}
            </div>
            <button
              onClick={() => navigate("/pago")}
              className="text-xs text-[var(--color-primary)] border border-[var(--color-primary)] px-3 py-1.5 rounded-lg hover:bg-teal-50 whitespace-nowrap transition-colors"
            >
              Activar para datos reales
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Pestaña: Signos Vitales ─────────────────────────────── */
function TabSignos() {
  const residents = getDemoResidents().filter((r) => r.estado === "activo");
  const [records, setRecords] = useState(getDemoVitalSigns);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    residente_id: "", turno: "mañana",
    presion_sistolica: "", presion_diastolica: "", frecuencia_cardiaca: "",
    temperatura: "", saturacion_oxigeno: "", dolor_escala: "0",
    estado_conciencia: "alerta",
  });

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.residente_id) return;
    const entry = addDemoVitalSign({
      ...form,
      presion_sistolica: form.presion_sistolica ? parseInt(form.presion_sistolica) : null,
      presion_diastolica: form.presion_diastolica ? parseInt(form.presion_diastolica) : null,
      frecuencia_cardiaca: form.frecuencia_cardiaca ? parseInt(form.frecuencia_cardiaca) : null,
      temperatura: form.temperatura ? parseFloat(form.temperatura) : null,
      saturacion_oxigeno: form.saturacion_oxigeno ? parseInt(form.saturacion_oxigeno) : null,
      dolor_escala: parseInt(form.dolor_escala),
    });
    setRecords((p) => [entry, ...p]);
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Signos Vitales</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-button-hover)] transition-colors">
          {showForm ? "Cancelar" : "+ Registrar"}
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm animate-slide-in">
          ✓ Registro guardado en el demo
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Registrar signos vitales (demo)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Residente *</label>
              <select name="residente_id" value={form.residente_id} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="">Seleccionar residente...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
              <select name="turno" value={form.turno} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado conciencia</label>
              <select name="estado_conciencia" value={form.estado_conciencia} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="alerta">Alerta</option>
                <option value="somnoliento">Somnoliento/a</option>
                <option value="estuporoso">Estuporoso/a</option>
                <option value="coma">Coma</option>
              </select>
            </div>
            {[
              { label: "P/A Sistólica (mmHg)", name: "presion_sistolica", placeholder: "120" },
              { label: "P/A Diastólica (mmHg)", name: "presion_diastolica", placeholder: "80" },
              { label: "FC (lpm)", name: "frecuencia_cardiaca", placeholder: "72" },
              { label: "Temperatura (°C)", name: "temperatura", placeholder: "36.5", step: "0.1" },
              { label: "SatO₂ (%)", name: "saturacion_oxigeno", placeholder: "97" },
            ].map(({ label, name, placeholder, step }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input type="number" name={name} value={form[name]} onChange={handleChange}
                  placeholder={placeholder} step={step}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Dolor (0-10): <span className="font-bold text-gray-700">{form.dolor_escala}</span>
              </label>
              <input type="range" name="dolor_escala" value={form.dolor_escala} onChange={handleChange}
                min="0" max="10" className="w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="text-sm px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-button-hover)]">
              Guardar en demo
            </button>
          </div>
        </form>
      )}

      <ConversionCallout tip={CONVERSION_TIPS[1]} />

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["Residente", "Fecha/Hora", "P/A", "FC", "Temp.", "SatO₂", "Dolor", "Turno"].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.slice(0, 10).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.residente_nombre}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(r.fecha_hora).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.presion_sistolica && r.presion_diastolica ? `${r.presion_sistolica}/${r.presion_diastolica}` : "—"}
                </td>
                <td className="px-4 py-3 text-center">{r.frecuencia_cardiaca ?? "—"}</td>
                <td className={`px-4 py-3 text-center font-medium ${r.temperatura > 37.5 ? "text-red-600" : "text-gray-700"}`}>
                  {r.temperatura != null ? `${r.temperatura}°` : "—"}
                </td>
                <td className={`px-4 py-3 text-center font-medium ${r.saturacion_oxigeno != null && r.saturacion_oxigeno < 95 ? "text-red-600" : "text-gray-700"}`}>
                  {r.saturacion_oxigeno != null ? `${r.saturacion_oxigeno}%` : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.dolor_escala != null ? (
                    <span className={`font-medium ${r.dolor_escala >= 7 ? "text-red-600" : r.dolor_escala >= 4 ? "text-yellow-600" : "text-green-600"}`}>
                      {r.dolor_escala}/10
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-center capitalize text-gray-400">{r.turno ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Pestaña: Observaciones ──────────────────────────────── */
function TabObservaciones() {
  const residents = getDemoResidents().filter((r) => r.estado !== "fallecido");
  const [records, setRecords] = useState(getDemoObservations);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    residente_id: "", turno: "mañana", tipo: "observacion_general",
    descripcion: "", acciones_tomadas: "", requiere_seguimiento: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.residente_id || !form.descripcion.trim()) return;
    const obs = addDemoObservation(form);
    setRecords((p) => [obs, ...p]);
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Observaciones Diarias</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-button-hover)] transition-colors">
          {showForm ? "Cancelar" : "+ Nueva"}
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm animate-slide-in">
          ✓ Observación guardada en el demo
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Nueva observación (demo)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Residente *</label>
              <select name="residente_id" value={form.residente_id} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="">Seleccionar residente...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{r.apellido}, {r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
              <select name="turno" value={form.turno} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]">
                {Object.entries(TIPO_LABEL).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descripción *</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} required rows={3}
                placeholder="Describa la observación..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Acciones tomadas</label>
              <textarea name="acciones_tomadas" value={form.acciones_tomadas} onChange={handleChange} rows={2}
                placeholder="Acciones realizadas..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="requiere_seguimiento" checked={form.requiere_seguimiento}
                onChange={handleChange} className="w-4 h-4 accent-[var(--color-primary)]" />
              <span className="text-sm text-gray-600">Requiere seguimiento</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="text-sm px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-button-hover)]">
              Guardar en demo
            </button>
          </div>
        </form>
      )}

      <ConversionCallout tip={CONVERSION_TIPS[3]} />

      <div className="grid gap-3">
        {records.slice(0, 10).map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">{r.residente_nombre}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {TIPO_LABEL[r.tipo] ?? r.tipo}
                  </span>
                  {r.requiere_seguimiento && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">⚠ Seguimiento</span>
                  )}
                  <span className="text-xs text-gray-400 capitalize">{r.turno}</span>
                </div>
                <p className="text-sm text-gray-600">{r.descripcion}</p>
                {r.acciones_tomadas && (
                  <p className="text-xs text-gray-400 mt-1 italic">Acciones: {r.acciones_tomadas}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(r.fecha_hora).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────── */
export default function DemoPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [cleared, setCleared] = useState(false);

  const handleClear = () => {
    if (!window.confirm("¿Borrar todos los datos que ingresaste en el demo? Los datos de ejemplo se mantendrán.")) return;
    clearDemoData();
    setCleared((p) => !p); // fuerza re-render de pestañas
    setTab("dashboard");
  };

  const tabContent = {
    dashboard:  <TabDashboard key={`d-${cleared}`} setTab={setTab} />,
    residentes: <TabResidentes key={`r-${cleared}`} />,
    signos:     <TabSignos key={`s-${cleared}`} />,
    obs:        <TabObservaciones key={`o-${cleared}`} />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner onClear={handleClear} />

      {/* Sub-nav del demo */}
      <div className="bg-white border-b border-gray-200 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-12">
          <DemoNav tab={tab} setTab={setTab} />
          <button
            onClick={() => navigate("/")}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-4"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tabContent[tab]}
      </div>

      {/* CTA flotante en móvil */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3">
        <button
          onClick={() => navigate("/pago")}
          className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-bold text-sm"
        >
          Activar versión real →
        </button>
      </div>
    </div>
  );
}
