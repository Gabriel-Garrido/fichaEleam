import React, { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "../../services/supabaseConfig";
import { trackEvent } from "./landingAnalytics";
import { requestDemoLead } from "./landingService";
import {
  buildWhatsAppUrl,
  normalizeWhatsAppLeadForm,
  validateWhatsAppLeadForm,
} from "./whatsAppLeadUtils";

function WhatsAppIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function getUtms() {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_campaign: p.get("utm_campaign") ?? null,
      utm_medium: p.get("utm_medium") ?? null,
    };
  } catch {
    return { utm_campaign: null, utm_medium: null };
  }
}

export default function WhatsAppLeadModal({ isOpen, onClose, source = "floating" }) {
  const [form, setForm] = useState({ nombre: "", eleam_nombre: "", email: "", telefono: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ nombre: "", eleam_nombre: "", email: "", telefono: "" });
      setErrors({});
      setStatus("idle");
      setErrorMsg("");
      trackEvent("form_view", "whatsapp_lead_modal", source);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, source]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validateWhatsAppLeadForm(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setStatus("submitting");
    setErrorMsg("");

    const utms = getUtms();
    const context = {
      ...utms,
      pagina_origen: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? (document.referrer || null) : null,
    };

    try {
      if (isSupabaseConfigured) {
        const payload = normalizeWhatsAppLeadForm(form, context);
        await requestDemoLead(payload);
      }
      trackEvent("form_submit", "whatsapp_lead_modal", source);
    } catch {
      // Si falla guardar el lead, igual abrimos WhatsApp para no perder el contacto.
      setErrorMsg("Guardamos tu mensaje pero no pudimos registrar el contacto. Continuamos a WhatsApp.");
    }

    const url = buildWhatsAppUrl(form, undefined, source);
    setStatus("success");
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (!isOpen) return null;

  const inputClass = (field) =>
    `w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${
      errors[field] ? "border-rose-400" : "border-slate-300"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-t-2xl p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <WhatsAppIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 id="whatsapp-modal-title" className="text-lg font-bold leading-tight">
                  Chatea con nuestro equipo
                </h2>
                <p className="text-emerald-50 text-xs mt-0.5">
                  Te respondemos en menos de 1 hora hábil
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 -mr-1 -mt-1 rounded-xl hover:bg-white/10"
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {status === "success" ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <WhatsAppIcon className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">¡Te llevamos a WhatsApp!</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Si tu navegador bloqueó la apertura, toca el botón para chatear con nosotros.
              </p>
              {errorMsg && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  {errorMsg}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={buildWhatsAppUrl(form, undefined, source)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                onClick={() => trackEvent("cta_click", "whatsapp_lead_open_fallback", source)}
              >
                <WhatsAppIcon className="w-4 h-4" />
                Abrir WhatsApp
              </a>
              <button
                type="button"
                onClick={onClose}
                className="border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-5 space-y-3.5">
            <p className="text-xs text-slate-500 leading-relaxed">
              Completa estos datos y abriremos WhatsApp con tu mensaje listo para enviar.
            </p>

            <div>
              <label htmlFor="wa-nombre" className="block text-xs font-semibold text-slate-600 mb-1">
                Tu nombre *
              </label>
              <input
                ref={firstInputRef}
                id="wa-nombre"
                type="text"
                value={form.nombre}
                onChange={set("nombre")}
                placeholder="María González"
                autoComplete="name"
                aria-invalid={errors.nombre ? "true" : undefined}
                aria-describedby={errors.nombre ? "wa-nombre-error" : undefined}
                className={inputClass("nombre")}
              />
              {errors.nombre && <p id="wa-nombre-error" className="text-rose-600 text-xs mt-1">{errors.nombre}</p>}
            </div>

            <div>
              <label htmlFor="wa-eleam" className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre del ELEAM *
              </label>
              <input
                id="wa-eleam"
                type="text"
                value={form.eleam_nombre}
                onChange={set("eleam_nombre")}
                placeholder="Residencia Los Arrayanes"
                autoComplete="organization"
                aria-invalid={errors.eleam_nombre ? "true" : undefined}
                aria-describedby={errors.eleam_nombre ? "wa-eleam-error" : undefined}
                className={inputClass("eleam_nombre")}
              />
              {errors.eleam_nombre && <p id="wa-eleam-error" className="text-rose-600 text-xs mt-1">{errors.eleam_nombre}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="wa-email" className="block text-xs font-semibold text-slate-600 mb-1">
                  Correo *
                </label>
                <input
                  id="wa-email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="tu@residencia.cl"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={errors.email ? "true" : undefined}
                  aria-describedby={errors.email ? "wa-email-error" : undefined}
                  className={inputClass("email")}
                />
                {errors.email && <p id="wa-email-error" className="text-rose-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="wa-telefono" className="block text-xs font-semibold text-slate-600 mb-1">
                  Teléfono *
                </label>
                <input
                  id="wa-telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={set("telefono")}
                  placeholder="+56 9 XXXX XXXX"
                  autoComplete="tel"
                  inputMode="tel"
                  aria-invalid={errors.telefono ? "true" : undefined}
                  aria-describedby={errors.telefono ? "wa-telefono-error" : undefined}
                  className={inputClass("telefono")}
                />
                {errors.telefono && <p id="wa-telefono-error" className="text-rose-600 text-xs mt-1">{errors.telefono}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4" />
              {status === "submitting" ? "Abriendo..." : "Abrir WhatsApp"}
            </button>

            <p className="text-center text-[11px] text-slate-400 leading-snug">
              Te llevamos a WhatsApp con tu mensaje listo. Tus datos quedan registrados para
              que el equipo te haga seguimiento.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
