import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import { ErrorSummary } from "../../components/forms/FormKit";
import useSessionFormDraft from "../../hooks/useSessionFormDraft";
import { scrollToFirstError } from "../../utils/formValidation";
import { isSupabaseConfigured } from "../../services/supabaseConfig";
import { trackEvent } from "./landingAnalytics";
import { getLandingContext } from "./landingContext";
import { normalizeDemoLeadForm, validateDemoLeadForm } from "./demoLeadUtils";
import { requestDemoLead } from "./landingService";

const CARGOS = ["Director/a", "Administrador/a", "Encargado/a", "Prof. de salud", "Otro"];
const RESIDENTES_OPTS = ["Menos de 15", "15 a 24", "25 a 34", "35 o más"];
const DEMO_FORM_INITIAL = {
  nombre: "",
  cargo: "",
  eleam_nombre: "",
  email: "",
  telefono: "",
  num_residentes: "",
};

export default function DemoRequestModal({ isOpen, onClose, defaultCta = null }) {
  const navigate = useNavigate();
  const [form, setForm, resetFormDraft] = useSessionFormDraft("fe_demo_request_draft", DEMO_FORM_INITIAL);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [demoResult, setDemoResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setStatus("idle");
      setDemoResult(null);
      trackEvent("form_view", "demo_request_modal", defaultCta);
    }
  }, [isOpen, defaultCta]);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  function validate() {
    return validateDemoLeadForm(form);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      scrollToFirstError(errs);
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorMsg("No pudimos conectar con el servidor. Intenta nuevamente en unos minutos.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const payload = normalizeDemoLeadForm(form, getLandingContext());
      const data = await requestDemoLead(payload);
      trackEvent("form_submit", "demo_request_modal", defaultCta);
      setDemoResult(data ?? null);
      resetFormDraft();
      setStatus("success");
    } catch (error) {
      const raw = String(error?.message || "").toLowerCase();
      setErrorMsg(
        raw.includes("network") || raw.includes("fetch")
          ? "No pudimos enviar la solicitud por un problema de conexión. Revisa tu internet e intenta nuevamente."
          : "No pudimos registrar la solicitud. Verifica los datos e intenta nuevamente.",
      );
      setStatus("error");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledById="modal-title"
      showCloseButton={false}
      backdropClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70"
      panelClassName="max-w-lg p-0 rounded-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[95vh]"
    >
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 id="modal-title" className="font-display text-2xl font-semibold tracking-tight">Solicitar demo gratis</h2>
              <p className="text-teal-100 text-sm mt-1">
                Revisaremos tu solicitud y te avisaremos cuando el acceso esté habilitado.
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
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {demoResult?.account_approved ? "Ya tienes una cuenta" : "¡Solicitud enviada!"}
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {demoResult?.account_approved
                ? "Este correo ya tiene una cuenta demo habilitada. Inicia sesión o recupera el acceso si no recuerdas la contraseña."
                : demoResult?.duplicate
                  ? "Ya teníamos tu solicitud registrada. Actualizamos tus datos y te contactaremos en menos de 24 horas."
                  : "Recibimos tu solicitud. Revisaremos los datos de tu ELEAM y te contactaremos en menos de 24 horas para habilitar tu demo con 30 días de prueba."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {demoResult?.account_approved && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/login");
                  }}
                  className="bg-teal-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-700"
                >
                  Ir a iniciar sesión
                </button>
              )}
              <button type="button"
                onClick={onClose}
                className="border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
            <ErrorSummary errors={errors} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="demo-nombre" className="block text-xs font-semibold text-slate-600 mb-1">
                  Nombre completo *
                </label>
                <input
                  id="demo-nombre"
                  type="text"
                  name="nombre"
                  autoComplete="name"
                  maxLength={120}
                  value={form.nombre}
                  onChange={set("nombre")}
                  placeholder="María González"
                  aria-invalid={errors.nombre ? "true" : undefined}
                  aria-describedby={errors.nombre ? "demo-nombre-error" : undefined}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${
                    errors.nombre ? "border-rose-400" : "border-slate-300"
                  }`}
                />
                {errors.nombre && <p id="demo-nombre-error" className="text-rose-600 text-xs mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <label htmlFor="demo-cargo" className="block text-xs font-semibold text-slate-600 mb-1">Cargo *</label>
                <select
                  id="demo-cargo"
                  name="cargo"
                  value={form.cargo}
                  onChange={set("cargo")}
                  aria-invalid={errors.cargo ? "true" : undefined}
                  aria-describedby={errors.cargo ? "demo-cargo-error" : undefined}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-white ${
                    errors.cargo ? "border-rose-400" : "border-slate-300"
                  }`}
                >
                  <option value="">Selecciona...</option>
                  {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.cargo && <p id="demo-cargo-error" className="text-rose-600 text-xs mt-1">{errors.cargo}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="demo-eleam_nombre" className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre del ELEAM / Residencia *
              </label>
              <input
                id="demo-eleam_nombre"
                type="text"
                name="eleam_nombre"
                autoComplete="organization"
                maxLength={160}
                value={form.eleam_nombre}
                onChange={set("eleam_nombre")}
                placeholder="Residencia Los Arrayanes"
                aria-invalid={errors.eleam_nombre ? "true" : undefined}
                aria-describedby={errors.eleam_nombre ? "demo-eleam_nombre-error" : undefined}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${
                  errors.eleam_nombre ? "border-rose-400" : "border-slate-300"
                }`}
              />
              {errors.eleam_nombre && <p id="demo-eleam_nombre-error" className="text-rose-600 text-xs mt-1">{errors.eleam_nombre}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="demo-email" className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input
                  id="demo-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  value={form.email}
                  onChange={set("email")}
                  placeholder="tu@residencia.cl"
                  aria-invalid={errors.email ? "true" : undefined}
                  aria-describedby={errors.email ? "demo-email-error" : undefined}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${
                    errors.email ? "border-rose-400" : "border-slate-300"
                  }`}
                />
                {errors.email && <p id="demo-email-error" className="text-rose-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="demo-telefono" className="block text-xs font-semibold text-slate-600 mb-1">
                  Teléfono *
                </label>
                <input
                  id="demo-telefono"
                  type="tel"
                  name="telefono"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={40}
                  value={form.telefono}
                  onChange={set("telefono")}
                  placeholder="+56 9 XXXX XXXX"
                  aria-invalid={errors.telefono ? "true" : undefined}
                  aria-describedby={errors.telefono ? "demo-telefono-error" : undefined}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${
                    errors.telefono ? "border-rose-400" : "border-slate-300"
                  }`}
                />
                {errors.telefono && <p id="demo-telefono-error" className="text-rose-600 text-xs mt-1">{errors.telefono}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="demo-num_residentes" className="block text-xs font-semibold text-slate-600 mb-1">
                N° de residentes (opcional)
              </label>
              <select
                id="demo-num_residentes"
                name="resident-count"
                value={form.num_residentes}
                onChange={set("num_residentes")}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-white"
              >
                <option value="">Selecciona...</option>
                {RESIDENTES_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {status === "error" && (
              <p role="alert" className="text-rose-700 text-sm bg-rose-50 rounded-xl p-3">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {status === "submitting" ? "Enviando..." : "Solicitar demo gratis"}
            </button>

            <p className="text-center text-xs text-slate-400">
              Sin compromiso · Te responderemos desde el equipo FichaEleam
            </p>
          </form>
        )}
    </Modal>
  );
}
