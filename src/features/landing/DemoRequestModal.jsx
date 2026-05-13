import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabaseConfig";
import { validateEmail } from "../../utils/validators";
import { trackEvent } from "./landingAnalytics";

const CARGOS = ["Director/a", "Administrador/a", "Encargado/a", "Prof. de salud", "Otro"];
const RESIDENTES_OPTS = ["Menos de 15", "15 a 24", "25 a 34", "35 o más"];

function getUtms() {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source:   p.get("utm_source")   ?? null,
      utm_medium:   p.get("utm_medium")   ?? null,
      utm_campaign: p.get("utm_campaign") ?? null,
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

export default function DemoRequestModal({ isOpen, onClose, defaultCta = null }) {
  const [form, setForm] = useState({
    nombre: "", cargo: "", eleam_nombre: "",
    email: "", telefono: "", num_residentes: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ nombre: "", cargo: "", eleam_nombre: "", email: "", telefono: "", num_residentes: "" });
      setErrors({});
      setStatus("idle");
      trackEvent("form_view", "demo_request_modal", defaultCta);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultCta]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  function validate() {
    const errs = {};
    if (!form.nombre.trim())       errs.nombre = "Requerido";
    if (!form.cargo)               errs.cargo = "Selecciona tu cargo";
    if (!form.eleam_nombre.trim()) errs.eleam_nombre = "Requerido";
    if (!validateEmail(form.email)) errs.email = "Email no válido";
    if (!form.telefono.trim())     errs.telefono = "Requerido";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStatus("submitting");
    try {
      const utms = getUtms();
      const { error } = await supabase.from("demo_leads").insert({
        nombre:        form.nombre.trim(),
        cargo:         form.cargo,
        eleam_nombre:  form.eleam_nombre.trim(),
        email:         form.email.trim().toLowerCase(),
        telefono:      form.telefono.trim(),
        num_residentes: form.num_residentes || null,
        pagina_origen: window.location.pathname,
        referrer:      document.referrer || null,
        ...utms,
      });
      if (error) throw error;
      trackEvent("form_submit", "demo_request_modal", defaultCta);
      setStatus("success");
    } catch {
      setErrorMsg("Hubo un error al enviar. Intenta nuevamente.");
      setStatus("error");
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 id="modal-title" className="text-xl font-bold">Solicitar Demo Gratuito</h2>
              <p className="text-teal-100 text-sm mt-1">
                Te enviamos tu enlace personalizado en menos de 24 horas.
              </p>
            </div>
            <button type="button"
              onClick={onClose}
              className="text-teal-200 hover:text-white ml-4 mt-1"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {status === "success" ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">¡Solicitud recibida!</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              En menos de 24 horas te enviaremos el enlace para acceder a tu demo personalizado de FichaEleam.
            </p>
            <button type="button"
              onClick={onClose}
              className="mt-6 bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nombre completo *
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  value={form.nombre}
                  onChange={set("nombre")}
                  placeholder="María González"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                    errors.nombre ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cargo *</label>
                <select
                  value={form.cargo}
                  onChange={set("cargo")}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white ${
                    errors.cargo ? "border-red-400" : "border-slate-300"
                  }`}
                >
                  <option value="">Selecciona...</option>
                  {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.cargo && <p className="text-red-500 text-xs mt-1">{errors.cargo}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre del ELEAM / Residencia *
              </label>
              <input
                type="text"
                value={form.eleam_nombre}
                onChange={set("eleam_nombre")}
                placeholder="Residencia Los Arrayanes"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                  errors.eleam_nombre ? "border-red-400" : "border-slate-300"
                }`}
              />
              {errors.eleam_nombre && <p className="text-red-500 text-xs mt-1">{errors.eleam_nombre}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="tu@residencia.cl"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                    errors.email ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={set("telefono")}
                  placeholder="+56 9 XXXX XXXX"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                    errors.telefono ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                N° de residentes (opcional)
              </label>
              <select
                value={form.num_residentes}
                onChange={set("num_residentes")}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">Selecciona...</option>
                {RESIDENTES_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {status === "error" && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {status === "submitting" ? "Enviando..." : "Solicitar Demo Gratuito"}
            </button>

            <p className="text-center text-xs text-slate-400">
              Sin compromiso · Respuesta en menos de 24 horas
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
